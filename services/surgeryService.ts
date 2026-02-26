import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbSurgeryRecord, ExcelRow } from '../types';
import { excelRowToDbSurgery } from './mappers';
import { hashPatientInfo, decryptPatientInfo } from './cryptoUtils';
import { getSizeMatchKey } from './sizeNormalizer';

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

  /** 수술 사용량 계산용 경량 조회 (환자정보 제외) */
  async getSurgeryUsageRecords(opts?: {
    fromDate?: string; // 'YYYY-MM-DD'
    toDate?: string;   // 'YYYY-MM-DD'
    limit?: number;
  }): Promise<Array<Pick<DbSurgeryRecord, 'date' | 'classification' | 'manufacturer' | 'brand' | 'size' | 'quantity' | 'surgery_record'>>> {
    let query = supabase
      .from('surgery_records')
      .select('date, classification, manufacturer, brand, size, quantity, surgery_record')
      .order('date', { ascending: false });

    if (opts?.fromDate) query = query.gte('date', opts.fromDate);
    if (opts?.toDate)   query = query.lte('date', opts.toDate);
    if (opts?.limit)    query = query.limit(opts.limit);

    const { data, error } = await query;

    if (error) {
      console.error('[surgeryService] Usage fetch failed:', error);
      return [];
    }
    return (data || []) as Array<Pick<DbSurgeryRecord, 'date' | 'classification' | 'manufacturer' | 'brand' | 'size' | 'quantity' | 'surgery_record'>>;
  },

  /**
   * 엑셀 파싱 후 수술기록 일괄 저장 — 중복 방지 포함
   *
   * 중복 판별 기준: date | patient_info_hash | classification | brand | size(match key) | tooth_number
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
    const buildDedupKey = (r: {
      date: string | null;
      patient_info_hash?: string | null;
      classification?: string | null;
      brand?: string | null;
      size?: string | null;
      tooth_number?: string | null;
      manufacturer?: string | null;
    }, hashOverride?: string) => {
      const sizeKey = getSizeMatchKey(r.size || '', r.manufacturer || '');
      return `${r.date}|${hashOverride ?? r.patient_info_hash ?? ''}|${r.classification ?? ''}|${r.brand ?? ''}|${sizeKey}|${r.tooth_number ?? ''}`;
    };

    // ── 서버에서 같은 날짜 범위 기존 레코드 조회 (중복 체크용)
    // date=null 레코드는 dedup 비교 불가 → 유효 날짜만 범위 산출
    const dates = dbRows
      .map(r => r.date)
      .filter((d): d is string => !!d);
    const minDate = dates.length > 0 ? dates.reduce((a, b) => a < b ? a : b) : null;
    const maxDate = dates.length > 0 ? dates.reduce((a, b) => a > b ? a : b) : null;

    // date=null 레코드: 비교 key를 만들 수 없으므로 항상 insert 대상으로 처리
    // (날짜 없는 레코드는 원본 데이터 이상 → 중복 방지보다 누락 방지 우선)
    const nullDateRows = dbRows.filter(r => !r.date);

    let existingKeys = new Set<string>();
    if (minDate && maxDate) {
      // patient_info_hash가 null인 레코드(백필 전)를 위해 patient_info도 함께 조회
      const { data: existing } = await supabase
        .from('surgery_records')
        .select('date, patient_info, patient_info_hash, classification, manufacturer, brand, size, tooth_number')
        .eq('hospital_id', hospitalId)
        .gte('date', minDate)
        .lte('date', maxDate);

      if (existing) {
        // hash가 없는 레코드는 patient_info를 복호화 후 즉석 해시 생성
        const keys = await Promise.all(
          (existing as Pick<DbSurgeryRecord, 'date' | 'patient_info' | 'patient_info_hash' | 'classification' | 'manufacturer' | 'brand' | 'size' | 'tooth_number'>[])
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
              return buildDedupKey(r, hash);
            })
        );
        existingKeys = new Set(keys);
      }
    }

    // ── 중복 필터링 (환자정보 해시 포함)
    // date=null 레코드는 dedup key 생성 불가 → 중복 체크 없이 항상 insert
    const datedNewRows = dbRows
      .filter(r => !!r.date)
      .filter(r => {
        const key = buildDedupKey(r);
        return !existingKeys.has(key);
      });
    const newRows = [...datedNewRows, ...nullDateRows];

    // skipped = 날짜 있는 레코드 중 중복으로 걸러진 것만 카운트
    // (date=null 레코드는 dedup 대상 아님 → skipped에서 제외)
    const skipped = dbRows.filter(r => !!r.date).length - datedNewRows.length;

    if (newRows.length === 0) {
      return { records: [], inserted: 0, skipped };
    }

    // ── 배치 insert (Supabase 최대 1000건)
    const BATCH_SIZE = 500;
    const INSERT_CONCURRENCY = 3;
    const results: DbSurgeryRecord[] = [];
    const batches: Array<{ index: number; rows: typeof newRows }> = [];

    for (let i = 0; i < newRows.length; i += BATCH_SIZE) {
      batches.push({
        index: i / BATCH_SIZE,
        rows: newRows.slice(i, i + BATCH_SIZE),
      });
    }

    for (let i = 0; i < batches.length; i += INSERT_CONCURRENCY) {
      const wave = batches.slice(i, i + INSERT_CONCURRENCY);
      const waveResults = await Promise.all(
        wave.map(async ({ index, rows }) => {
          const { data, error } = await supabase
            .from('surgery_records')
            .insert(rows)
            .select();

          if (error) {
            console.error(`[surgeryService] Batch insert failed (batch ${index}):`, error);
            return [] as DbSurgeryRecord[];
          }
          return (data as DbSurgeryRecord[]) ?? [];
        })
      );

      waveResults.forEach((batchRows) => {
        if (batchRows.length > 0) results.push(...batchRows);
      });
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
      .update({ classification: '교환완료' })
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
   * - UPDATE: classification 변경(교환완료 처리 등) 실시간 반영
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

  /**
   * FAIL 재고 일괄 초기화
   * 수기 장부로 관리하던 FAIL 픽스쳐를 디지털로 등록합니다.
   * 제조사별 count개의 '수술중교환' 레코드를 생성합니다.
   */
  async bulkInsertFailRecords(
    items: { manufacturer: string; count: number; date: string }[],
    hospitalId: string
  ): Promise<{ success: boolean; totalInserted: number }> {
    const rows: Omit<DbSurgeryRecord, 'id' | 'created_at'>[] = [];
    for (const item of items) {
      for (let i = 0; i < item.count; i++) {
        rows.push({
          hospital_id: hospitalId,
          date: item.date,
          patient_info: null,
          patient_info_hash: null,
          tooth_number: null,
          quantity: 1,
          surgery_record: '[일괄등록]',
          classification: '수술중교환',
          manufacturer: item.manufacturer,
          brand: item.manufacturer,
          size: '기타',
          bone_quality: null,
          initial_fixation: null,
        });
      }
    }
    if (rows.length === 0) return { success: true, totalInserted: 0 };

    const BATCH_SIZE = 500;
    let totalInserted = 0;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const { data, error } = await supabase
        .from('surgery_records')
        .insert(rows.slice(i, i + BATCH_SIZE))
        .select('id');
      if (error) {
        console.error('[surgeryService] bulkInsertFailRecords failed:', error);
        return { success: false, totalInserted };
      }
      totalInserted += data?.length || 0;
    }
    return { success: true, totalInserted };
  },

  /**
   * FAIL 재고 정리 (기존 데이터 → 실제 재고에 맞게 조정)
   * actual < system → 오래된 것부터 차이만큼 '교환완료' 처리
   * actual > system → 차이만큼 신규 '수술중교환' 레코드 생성
   */
  async bulkReconcileFails(
    reconciles: { manufacturer: string; targetCount: number }[],
    hospitalId: string,
    insertDate: string
  ): Promise<{ success: boolean; totalUpdated: number; totalInserted: number }> {
    let totalUpdated = 0;
    let totalInserted = 0;

    for (const { manufacturer, targetCount } of reconciles) {
      const { data: pending, error: fetchError } = await supabase
        .from('surgery_records')
        .select('id')
        .eq('hospital_id', hospitalId)
        .eq('classification', '수술중교환')
        .eq('manufacturer', manufacturer)
        .order('date', { ascending: true });

      if (fetchError) {
        console.error('[surgeryService] bulkReconcileFails fetch failed:', fetchError);
        return { success: false, totalUpdated, totalInserted };
      }

      const pendingCount = pending?.length || 0;
      const gap = pendingCount - targetCount;

      if (gap > 0) {
        // 실제 < 시스템: 오래된 것부터 gap개 교환완료 처리
        const ids = (pending || []).slice(0, gap).map(r => r.id);
        const { error } = await supabase
          .from('surgery_records')
          .update({ classification: '교환완료' })
          .in('id', ids);
        if (error) {
          console.error('[surgeryService] bulkReconcileFails update failed:', error);
          return { success: false, totalUpdated, totalInserted };
        }
        totalUpdated += ids.length;
      } else if (gap < 0) {
        // 실제 > 시스템: 부족분 신규 등록
        const toAdd = Math.abs(gap);
        const newRows = Array.from({ length: toAdd }, () => ({
          hospital_id: hospitalId,
          date: insertDate,
          patient_info: null,
          patient_info_hash: null,
          tooth_number: null,
          quantity: 1,
          surgery_record: '[일괄등록]',
          classification: '수술중교환',
          manufacturer,
          brand: manufacturer,
          size: '기타',
          bone_quality: null,
          initial_fixation: null,
        }));
        const { data, error } = await supabase
          .from('surgery_records')
          .insert(newRows)
          .select('id');
        if (error) {
          console.error('[surgeryService] bulkReconcileFails insert failed:', error);
          return { success: false, totalUpdated, totalInserted };
        }
        totalInserted += data?.length || 0;
      }
    }
    return { success: true, totalUpdated, totalInserted };
  },
};
