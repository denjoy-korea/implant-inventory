import { supabase } from './supabaseClient';
import { DbHospital, DbProfile, Hospital } from '../types';
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
    }));
  },

  /** 병원 ID로 단건 조회 */
  async getHospitalById(hospitalId: string): Promise<Hospital | null> {
    const { data, error } = await supabase
      .from('hospitals')
      .select('id, name, master_admin_id, created_at')
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
  async inviteMember(email: string, name: string, hospitalId: string): Promise<void> {
    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { email, name, hospitalId },
    });

    if (error) throw new Error('초대 이메일 발송에 실패했습니다.');
    if (data?.error) throw new Error(data.error);
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
};
