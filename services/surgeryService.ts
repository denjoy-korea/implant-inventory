import { supabase } from './supabaseClient';
import { DbSurgeryRecord, ExcelRow } from '../types';
import { excelRowToDbSurgery } from './mappers';

export const surgeryService = {
  /** 수술기록 목록 조회 (병원별 RLS) */
  async getSurgeryRecords(): Promise<DbSurgeryRecord[]> {
    const { data, error } = await supabase
      .from('surgery_records')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('[surgeryService] Fetch failed:', error);
      return [];
    }
    return data as DbSurgeryRecord[];
  },

  /** 엑셀 파싱 후 수술기록 일괄 저장 */
  async bulkInsertFromExcel(
    parsedRows: ExcelRow[],
    hospitalId: string
  ): Promise<DbSurgeryRecord[]> {
    if (parsedRows.length === 0) return [];

    const dbRows = await Promise.all(parsedRows.map(row => excelRowToDbSurgery(row, hospitalId)));

    // Supabase는 한 번에 최대 1000건까지 insert 가능
    const BATCH_SIZE = 500;
    const results: DbSurgeryRecord[] = [];

    for (let i = 0; i < dbRows.length; i += BATCH_SIZE) {
      const batch = dbRows.slice(i, i + BATCH_SIZE);
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

    return results;
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

  /** Realtime 구독 */
  subscribeToChanges(
    hospitalId: string,
    callback: (payload: any) => void
  ) {
    return supabase
      .channel('surgery-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'surgery_records',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .subscribe();
  },
};
