import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import {
  DbReturnRequest,
  DbReturnRequestItem,
  ReturnMutationResult,
  ReturnStatus,
} from '../types';
import { notifyHospitalSlack } from './hospitalSlackService';

async function getReturnStatusById(
  returnId: string
): Promise<{ status: ReturnStatus | null; errored: boolean }> {
  const { data, error } = await supabase
    .from('return_requests')
    .select('status')
    .eq('id', returnId)
    .maybeSingle();

  if (error) {
    console.error('[returnService] Status lookup failed:', error);
    return { status: null, errored: true };
  }

  return {
    status: (data?.status as ReturnStatus | undefined) ?? null,
    errored: false,
  };
}

export const returnService = {
  /** 반품 목록 조회 (return_request_items JOIN) */
  async getReturnRequests(): Promise<
    (DbReturnRequest & { return_request_items: DbReturnRequestItem[] })[]
  > {
    const { data, error } = await supabase
      .from('return_requests')
      .select('*, return_request_items(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[returnService] Fetch failed:', error);
      return [];
    }
    return data as (DbReturnRequest & { return_request_items: DbReturnRequestItem[] })[];
  },

  /** 반품 신청 생성 (return + items 원자적) */
  async createReturnRequest(
    returnData: Omit<DbReturnRequest, 'id' | 'created_at' | 'updated_at'>,
    items: Omit<DbReturnRequestItem, 'id' | 'return_request_id'>[]
  ): Promise<ReturnMutationResult> {
    const { data: returnId, error } = await supabase.rpc('create_return_with_items', {
      p_return: returnData,
      p_items: items,
    });

    if (error) {
      console.error('[returnService] createReturnRequest failed:', error);
      return { ok: false, reason: 'error' };
    }

    if (!returnId) {
      return { ok: false, reason: 'error' };
    }

    if (returnData.hospital_id) {
      notifyHospitalSlack(returnData.hospital_id, 'return_requested', {
        manufacturer: returnData.manufacturer,
        item_count: items.length,
        created_by: returnData.manager,
      });
    }

    return { ok: true };
  },

  /** 반품 상태 업데이트 (picked_up / rejected / requested로 되돌리기) */
  async updateStatus(
    returnId: string,
    status: ReturnStatus,
    expectedCurrentStatus?: ReturnStatus,
    confirmedBy?: string
  ): Promise<ReturnMutationResult> {
    const payload: Record<string, string | null> = { status };
    if (status === 'completed' && confirmedBy) payload.confirmed_by = confirmedBy;
    if (status === 'picked_up') payload.picked_up_date = new Date().toISOString().split('T')[0];
    let query = supabase
      .from('return_requests')
      .update(payload)
      .eq('id', returnId);

    if (expectedCurrentStatus) {
      query = query.eq('status', expectedCurrentStatus);
    }

    const { data, error } = await query.select('id').maybeSingle();

    if (error) {
      console.error('[returnService] Status update failed:', error);
      return { ok: false, reason: 'error' };
    }

    if (data) {
      return { ok: true };
    }

    if (!expectedCurrentStatus) {
      return { ok: false, reason: 'not_found' };
    }

    const { status: currentStatus, errored } = await getReturnStatusById(returnId);
    if (errored) return { ok: false, reason: 'error' };
    if (!currentStatus) return { ok: false, reason: 'not_found' };
    return { ok: false, reason: 'conflict', currentStatus };
  },

  /** 반품 완료 + 재고 차감 (picked_up → completed)
   * @param actualQties - 품목별 실수령 수량 (key: return_request_items.id). 미전달 시 기존 방식
   */
  async completeReturn(
    returnId: string,
    hospitalId: string,
    actualQties?: Record<string, number>
  ): Promise<ReturnMutationResult> {
    // 실수령 수량 저장 (전달된 경우에만)
    if (actualQties && Object.keys(actualQties).length > 0) {
      for (const [itemId, qty] of Object.entries(actualQties)) {
        const { error: updateError } = await supabase
          .from('return_request_items')
          .update({ actual_received_qty: qty })
          .eq('id', itemId);
        if (updateError) {
          console.error('[returnService] actual_received_qty save failed:', updateError);
          return { ok: false, reason: 'error' };
        }
      }
    }

    const { error } = await supabase.rpc('complete_return_and_adjust_stock', {
      p_return_id: returnId,
      p_hospital_id: hospitalId,
    });

    if (error) {
      console.error('[returnService] completeReturn failed:', error);
      if (error.message?.includes('invalid_status_transition')) {
        const { status: currentStatus } = await getReturnStatusById(returnId);
        return { ok: false, reason: 'conflict', currentStatus: currentStatus ?? undefined };
      }
      return { ok: false, reason: 'error' };
    }

    notifyHospitalSlack(hospitalId, 'return_completed', {});

    return { ok: true };
  },

  /** 반품 신청 삭제 (requested 상태만) */
  async deleteReturnRequest(
    returnId: string,
    expectedCurrentStatus?: ReturnStatus
  ): Promise<ReturnMutationResult> {
    let query = supabase
      .from('return_requests')
      .delete()
      .eq('id', returnId);

    if (expectedCurrentStatus) {
      query = query.eq('status', expectedCurrentStatus);
    }

    const { data, error } = await query.select('id').maybeSingle();

    if (error) {
      console.error('[returnService] Delete failed:', error);
      return { ok: false, reason: 'error' };
    }

    if (data) {
      return { ok: true };
    }

    if (!expectedCurrentStatus) {
      return { ok: false, reason: 'not_found' };
    }

    const { status: currentStatus, errored } = await getReturnStatusById(returnId);
    if (errored) return { ok: false, reason: 'error' };
    if (!currentStatus) return { ok: false, reason: 'not_found' };
    return { ok: false, reason: 'conflict', currentStatus };
  },

  /** Realtime 구독 */
  subscribeToChanges(
    hospitalId: string,
    callback: (payload: RealtimePostgresChangesPayload<DbReturnRequest>) => void
  ) {
    return supabase
      .channel(`return-requests-changes-${hospitalId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'return_requests',
        filter: `hospital_id=eq.${hospitalId}`,
      }, callback)
      .subscribe();
  },
};
