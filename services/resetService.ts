import { supabase } from './supabaseClient';
import { DbResetRequest } from '../types';

export const resetService = {
  /** 초기화 요청 생성 (병원 master) */
  async requestReset(hospitalId: string, reason: string): Promise<DbResetRequest | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('data_reset_requests')
      .insert({
        hospital_id: hospitalId,
        requested_by: user.id,
        reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('[resetService] requestReset failed:', error);
      return null;
    }
    return data as DbResetRequest;
  },

  /** 현재 병원의 활성 요청 조회 (pending 또는 scheduled) */
  async getActiveRequest(hospitalId: string): Promise<DbResetRequest | null> {
    const { data, error } = await supabase
      .from('data_reset_requests')
      .select('*')
      .eq('hospital_id', hospitalId)
      .in('status', ['pending', 'scheduled'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('[resetService] getActiveRequest failed:', error);
      return null;
    }
    return data as DbResetRequest | null;
  },

  /** 요청 취소 (신청자 — scheduled 상태만) */
  async cancelRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase
      .from('data_reset_requests')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('status', 'scheduled');

    if (error) {
      console.error('[resetService] cancelRequest failed:', error);
      return false;
    }
    return true;
  },

  /** 전체 대기 요청 목록 (admin용) */
  async getAllRequests(): Promise<DbResetRequest[]> {
    const { data, error } = await supabase
      .from('data_reset_requests')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[resetService] getAllRequests failed:', error);
      return [];
    }
    return data as DbResetRequest[];
  },

  /** 즉시 초기화 승인 (admin) */
  async approveImmediate(requestId: string, hospitalId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // 1. 데이터 삭제 RPC
    const { error: rpcError } = await supabase.rpc('admin_reset_hospital_data', {
      p_hospital_id: hospitalId,
    });

    if (rpcError) {
      console.error('[resetService] RPC failed:', rpcError);
      return false;
    }

    // 2. 요청 상태 업데이트
    const { error } = await supabase
      .from('data_reset_requests')
      .update({
        status: 'completed',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('[resetService] approveImmediate status update failed:', error);
    }

    // 3. 신청자 프로필 상태를 일시정지로 변경
    await this.pauseRequester(requestId);

    return true;
  },

  /** 7일 후 초기화 승인 (admin) */
  async approveScheduled(requestId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + 7);

    const { error } = await supabase
      .from('data_reset_requests')
      .update({
        status: 'scheduled',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
        scheduled_at: scheduledAt.toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('[resetService] approveScheduled failed:', error);
      return false;
    }
    return true;
  },

  /** 거절 (admin) */
  async rejectRequest(requestId: string): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase
      .from('data_reset_requests')
      .update({
        status: 'rejected',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (error) {
      console.error('[resetService] rejectRequest failed:', error);
      return false;
    }
    return true;
  },

  /** 요청 레코드 삭제 (admin — 테스트 데이터 정리용) */
  async deleteRequest(requestId: string): Promise<boolean> {
    const { error } = await supabase
      .from('data_reset_requests')
      .delete()
      .eq('id', requestId);

    if (error) {
      console.error('[resetService] deleteRequest failed:', error);
      return false;
    }
    return true;
  },

  /** 예약된 초기화 체크 및 실행 (로그인 시 호출) */
  async checkScheduledReset(hospitalId: string): Promise<boolean> {
    const req = await this.getActiveRequest(hospitalId);
    if (!req || req.status !== 'scheduled' || !req.scheduled_at) return false;

    const scheduledTime = new Date(req.scheduled_at).getTime();
    if (Date.now() < scheduledTime) return false;

    // 기한 도래 → 실행
    const { error: rpcError } = await supabase.rpc('admin_reset_hospital_data', {
      p_hospital_id: hospitalId,
    });

    if (rpcError) {
      console.error('[resetService] scheduled reset RPC failed:', rpcError);
      return false;
    }

    await supabase
      .from('data_reset_requests')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', req.id);

    // 신청자 프로필 상태를 일시정지로 변경
    await this.pauseRequester(req.id);

    return true;
  },

  /** 신청자 프로필을 paused 상태로 변경 */
  async pauseRequester(requestId: string): Promise<void> {
    const { data: req } = await supabase
      .from('data_reset_requests')
      .select('requested_by')
      .eq('id', requestId)
      .single();

    if (req?.requested_by) {
      await supabase
        .from('profiles')
        .update({ status: 'paused' })
        .eq('id', req.requested_by);
    }
  },

  /** 일시정지 해제 (사용 재개) */
  async resumeAccount(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);

    if (error) {
      console.error('[resetService] resumeAccount failed:', error);
      return false;
    }
    return true;
  },

  /** 플랜 취소 (free로 전환 + 사용 재개) */
  async cancelPlanAndResume(userId: string, hospitalId: string): Promise<boolean> {
    const { error: planError } = await supabase
      .from('hospitals')
      .update({
        plan: 'free',
        plan_expires_at: null,
        billing_cycle: null,
      })
      .eq('id', hospitalId);

    if (planError) {
      console.error('[resetService] cancelPlan failed:', planError);
      return false;
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);

    if (profileError) {
      console.error('[resetService] resume after cancel failed:', profileError);
      return false;
    }
    return true;
  },
};
