import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbSurgeryRecord, ExcelRow } from '../types';
import { excelRowToDbSurgery } from './mappers';
import { hashPatientInfo, decryptPatientInfo } from './cryptoUtils';

export const surgeryService = {
  /** 수술기록 목록 조회 — 날짜 범위 필터 지원 (서버사이드) */
  async getSurgeryRecords(opts?: {
    fromDate?: string; // 'YYYY-MM-DD'
    toDate?: string;   // 'YYYY-MM-DD'
    limit?: number;
  }): Promise<DbSurgeryRecord[]> {
    let query = supabase
      .from('surgery_records')
      .select('*')
      .order('date', { ascending: false });

    if (opts?.fromDate) query = query.gte('date', opts.fromDate);
    if (opts?.toDate)   query = query.lte('date', opts.toDate);
    if (opts?.limit)    query = query.limit(opts.limit);

    const { data, error } = await query;

    if (error) {
      console.error('[surgeryService] Fetch failed:', error);
      return [];
    }
    return data as DbSurgeryRecord[];
  },

  /**
   * 엑셀 파싱 후 수술기록 일괄 저장 — 중복 방지 포함
   *
   * 중복 판별 기준: date | patient_info_hash | classification | brand | size | tooth_number
   * - patient_info_hash가 없는 레코드(028 마이그레이션 전)는 patient_info를 즉석 복호화 후 해시 생성
   * → 이미 같은 레코드가 존재하면 skip, 없는 것만 insert
   * → 반환값: { inserted, skipped } 건수
   */
  async bulkInsertFromExcel(
    parsedRows: ExcelRow[],
    hospitalId: string
  ): Promise<{ records: DbSurgeryRecord[]; inserted: number; skipped: number }> {
    if (parsedRows.length === 0) return { records: [], inserted: 0, skipped: 0 };

    const dbRows = await Promise.all(parsedRows.map(row => excelRowToDbSurgery(row, hospitalId)));

    // ── 서버에서 같은 날짜 범위 기존 레코드 조회 (중복 체크용)
    const dates = dbRows
      .map(r => r.date)
      .filter((d): d is string => !!d);
    const minDate = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : null;
    const maxDate = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;

    let existingKeys = new Set<string>();
    if (minDate && maxDate) {
      // patient_info_hash가 null인 레코드(백필 전)를 위해 patient_info도 함께 조회
      const { data: existing } = await supabase
        .from('surgery_records')
        .select('date, patient_info, patient_info_hash, classification, brand, size, tooth_number')
        .eq('hospital_id', hospitalId)
        .gte('date', minDate)
        .lte('date', maxDate);

      if (existing) {
        // hash가 없는 레코드는 patient_info를 복호화 후 즉석 해시 생성
        const keys = await Promise.all(
          (existing as Pick<DbSurgeryRecord, 'date' | 'patient_info' | 'patient_info_hash' | 'classification' | 'brand' | 'size' | 'tooth_number'>[])
            .map(async r => {
              let hash = r.patient_info_hash ?? '';
              if (!hash && r.patient_info) {
                // 백필 전 레코드: 복호화 후 해시 생성 (중복 체크용, DB에 저장하지 않음)
                try {
                  const plain = await decryptPatientInfo(r.patient_info);
                  hash = await hashPatientInfo(plain);
                } catch {
                  hash = '';
                }
              }
              return `${r.date}|${hash}|${r.classification}|${r.brand ?? ''}|${r.size ?? ''}|${r.tooth_number ?? ''}`;
            })
        );
        existingKeys = new Set(keys);
      }
    }

    // ── 중복 필터링 (환자정보 해시 포함)
    const newRows = dbRows.filter(r => {
      const key = `${r.date}|${r.patient_info_hash ?? ''}|${r.classification}|${r.brand ?? ''}|${r.size ?? ''}|${r.tooth_number ?? ''}`;
      return !existingKeys.has(key);
    });

    const skipped = dbRows.length - newRows.length;

    if (newRows.length === 0) {
      return { records: [], inserted: 0, skipped };
    }

    // ── 배치 insert (Supabase 최대 1000건)
    const BATCH_SIZE = 500;
    const results: DbSurgeryRecord[] = [];

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      const batch = newRows.slice(i, i + BATCH_SIZE);
      const { data, error } = await supabase
        .from('surgery_records')
        .insert(batch)
        .select();

      if (error) {
        console.error(`[surgeryService] Batch insert failed (batch ${i / BATCH_SIZE}):`, error);
        continue;
      }
      if (data) results.push(...(data as DbSurgeryRecord[]));
    }

    return { records: results, inserted: results.length, skipped };
  },

  /** 수술기록 셀 수정 */
  async updateRecord(
    id: string,
    updates: Partial<DbSurgeryRecord>
  ): Promise<DbSurgeryRecord | null> {
    const { data, error } = await supabase
      .from('surgery_records')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[surgeryService] Update failed:', error);
      return null;
    }
    return data as DbSurgeryRecord;
  },

  /** FAIL 교환 완료 처리 (classification 변경) */
  async markFailExchanged(recordIds: string[]): Promise<boolean> {
    if (recordIds.length === 0) return true;

    const { error } = await supabase
      .from('surgery_records')
      .update({ classification: 'FAIL 교환완료' })
      .in('id', recordIds);

    if (error) {
      console.error('[surgeryService] markFailExchanged failed:', error);
      return false;
    }
    return true;
  },

  /** 마지막 수술기록 업로드 일시 조회 (병원별) */
  async getLastUploadDate(hospitalId: string): Promise<Date | null> {
    const { data, error } = await supabase
      .from('surgery_records')
      .select('created_at')
      .eq('hospital_id', hospitalId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return new Date(data.created_at);
  },

  /**
   * Realtime 구독 — INSERT / UPDATE / DELETE 이벤트 모두 처리
   *
   * - INSERT: 새 수술기록 실시간 반영
   * - UPDATE: classification 변경(FAIL 교환완료 처리 등) 실시간 반영
   * - DELETE: 삭제된 레코드 실시간 제거
   */
  subscribeToChanges(
    hospitalId: string,
    callback: (payload: RealtimePostgresChangesPayload<DbSurgeryRecord>) => void
  ) {
    return supabase
      .channel(`surgery-changes-${hospitalId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'surgery_records',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'surgery_records',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'surgery_records',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .subscribe();
  },

  /**
   * 기존 레코드 중 patient_info_hash가 null인 것들을 백필
   * (028 마이그레이션 이전에 저장된 데이터 대상)
   * 한 번만 실행되면 이후 신규 데이터는 insert 시 hash가 포함됨
   */
  async backfillPatientInfoHash(hospitalId: string): Promise<number> {
    // hash가 없는 레코드만 조회
    const { data, error } = await supabase
      .from('surgery_records')
      .select('id, patient_info')
      .eq('hospital_id', hospitalId)
      .is('patient_info_hash', null)
      .not('patient_info', 'is', null)
      .limit(500);

    if (error || !data || data.length === 0) return 0;

    let patched = 0;
    for (const row of data) {
      try {
        const plainText = await decryptPatientInfo(row.patient_info!);
        const hash = await hashPatientInfo(plainText);
        const { error: updateError } = await supabase
          .from('surgery_records')
          .update({ patient_info_hash: hash })
          .eq('id', row.id);
        if (!updateError) patched++;
      } catch {
        console.warn(`[backfill] Failed to hash record ${row.id}`);
      }
    }

    console.log(`[backfill] patient_info_hash: ${patched}/${data.length} records patched`);
    return patched;
  },
};
