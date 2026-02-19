import { supabase } from './supabaseClient';
import { DbHospital, DbProfile, Hospital, DEFAULT_WORK_DAYS } from '../types';
import { dbToHospital } from './mappers';

export const hospitalService = {
  /** 현재 사용자의 병원 정보 조회 */
  async getMyHospital(): Promise<DbHospital | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('hospital_id')
      .eq('id', user.id)
      .single();

    if (!profile?.hospital_id) return null;

    const { data, error } = await supabase
      .from('hospitals')
      .select('*')
      .eq('id', profile.hospital_id)
      .single();

    if (error) return null;
    return data as DbHospital;
  },

  /** 병원 검색 (Staff가 가입할 병원 찾기) */
  async searchHospitals(query: string): Promise<Hospital[]> {
    const { data, error } = await supabase
      .rpc('search_hospitals_public', { search_query: query });

    if (error) return [];
    return ((data as Array<{ id: string; name: string; created_at: string }>) || []).map(h => ({
      id: h.id,
      name: h.name,
      masterAdminId: '',
      createdAt: h.created_at,
      workDays: DEFAULT_WORK_DAYS,
    }));
  },

  /** 병원 ID로 단건 조회 */
  async getHospitalById(hospitalId: string): Promise<Hospital | null> {
    const { data, error } = await supabase
      .from('hospitals')
      .select('id, name, master_admin_id, created_at, work_days')
      .eq('id', hospitalId)
      .single();

    if (error || !data) return null;
    return dbToHospital(data as DbHospital);
  },

  /** 병원 가입 요청 (Staff → 병원) */
  async requestJoin(hospitalId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다.');

    const { error } = await supabase
      .from('profiles')
      .update({ hospital_id: hospitalId, status: 'pending' })
      .eq('id', user.id);

    if (error) throw new Error('가입 요청에 실패했습니다.');
  },

  /** 병원 구성원 목록 조회 (active 멤버) */
  async getMembers(hospitalId: string): Promise<DbProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active');

    if (error) return [];
    return data as DbProfile[];
  },

  /** 가입 대기 멤버 조회 */
  async getPendingMembers(hospitalId: string): Promise<DbProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending');

    if (error) return [];
    return data as DbProfile[];
  },

  /** 멤버 승인 */
  async approveMember(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);

    if (error) throw new Error('승인에 실패했습니다.');
  },

  /** 멤버 거절/방출 (hospital_id 제거) */
  async rejectMember(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ hospital_id: null, status: 'pending' })
      .eq('id', userId);

    if (error) throw new Error('거절에 실패했습니다.');
  },

  /** 이메일로 구성원 초대 (Supabase Edge Function 호출) */
  async inviteMember(email: string, name: string, hospitalId: string): Promise<{ inviteUrl: string; token: string }> {
    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { email, name, hospitalId, siteUrl: window.location.origin },
    });

    if (error) {
      // FunctionsHttpError에서 실제 에러 메시지 추출
      try {
        const errBody = await (error as any).context?.json?.();
        throw new Error(errBody?.error || '초대 링크 생성에 실패했습니다.');
      } catch (e) {
        if (e instanceof Error) throw e;
      }
      throw new Error('초대 링크 생성에 실패했습니다.');
    }
    if (data?.error) throw new Error(data.error);
    return { inviteUrl: data.inviteUrl, token: data.token };
  },

  /** 초대 대기 중인 초대 목록 조회 */
  async getInvitedMembers(hospitalId: string): Promise<{ id: string; email: string; name: string; created_at: string; expires_at: string }[]> {
    const { data, error } = await supabase
      .from('member_invitations')
      .select('id, email, name, created_at, expires_at')
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (error) return [];
    return data ?? [];
  },

  /** 초대 취소 (status → expired) */
  async cancelInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('member_invitations')
      .update({ status: 'expired' })
      .eq('id', invitationId);

    if (error) throw new Error('초대 취소에 실패했습니다.');
  },

  /** 초대 삭제 (DB에서 행 완전 삭제) */
  async deleteInvitation(invitationId: string): Promise<void> {
    const { error } = await supabase
      .from('member_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw new Error('초대 삭제에 실패했습니다.');
  },

  /** readonly 상태 멤버 조회 */
  async getReadonlyMembers(hospitalId: string): Promise<DbProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'readonly');

    if (error) return [];
    return data as DbProfile[];
  },

  /** 개별 멤버 readonly → active 전환 */
  async reactivateMember(userId: string): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ status: 'active' })
      .eq('id', userId);

    if (error) throw new Error('멤버 활성화에 실패했습니다.');
  },

  /** 관리자 이메일 조회 (master_admin_id → profiles.email) */
  async getMasterEmail(hospitalId: string): Promise<string | null> {
    const { data: hospital, error: hospError } = await supabase
      .from('hospitals')
      .select('master_admin_id')
      .eq('id', hospitalId)
      .single();

    if (hospError || !hospital?.master_admin_id) return null;

    const { data: profile, error: profError } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', hospital.master_admin_id)
      .single();

    if (profError || !profile?.email) return null;
    return profile.email;
  },

  /** 병원 탈퇴 */
  async leaveHospital(): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다.');

    const { error } = await supabase
      .from('profiles')
      .update({ hospital_id: null, status: 'pending' })
      .eq('id', user.id);

    if (error) throw new Error('병원 탈퇴에 실패했습니다.');
  },

  /**
   * 병원 진료 요일 업데이트 (master만 가능 — RLS: master_update_own_hospital)
   * @param hospitalId 병원 ID
   * @param workDays   진료 요일 배열 [0=일, 1=월, ..., 6=토], 최소 1개
   */
  async updateWorkDays(hospitalId: string, workDays: number[]): Promise<void> {
    if (
      workDays.length === 0 ||
      workDays.some(d => d < 0 || d > 6 || !Number.isInteger(d))
    ) {
      throw new Error('유효하지 않은 진료 요일입니다. (0=일 ~ 6=토, 최소 1개)');
    }

    const { error } = await supabase
      .from('hospitals')
      .update({ work_days: workDays })
      .eq('id', hospitalId);

    if (error) {
      console.error('[hospitalService] updateWorkDays failed:', error);
      throw new Error('진료 요일 저장에 실패했습니다.');
    }
  },
};
