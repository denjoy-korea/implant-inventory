import { supabase } from './supabaseClient';
import { FunctionsError } from '@supabase/supabase-js';
import { DbHospital, DbProfile, Hospital, DEFAULT_WORK_DAYS, MemberPermissions, UserRole, ClinicRole, VendorContact, BillingProgram } from '../types';
import { dbToHospital, decryptProfile } from './mappers';
import { encryptPatientInfo } from './cryptoUtils';

// C-4: hospitals.phone 평문 감지 헬퍼
function isPlainHospitalPhone(v: string | null): v is string {
  if (!v) return false;
  return !v.startsWith('ENCv2:') && !v.startsWith('ENC:');
}

// C-4: 기존 평문 phone 백그라운드 lazy 암호화 — 실패해도 서비스 중단 없음
async function lazyEncryptHospitalPhone(hospitalId: string, plainPhone: string): Promise<void> {
  try {
    const encPhone = await encryptPatientInfo(plainPhone);
    await supabase.from('hospitals').update({ phone: encPhone }).eq('id', hospitalId);
  } catch (e) {
    console.warn('[lazyEncryptHospitalPhone] 암호화 실패:', hospitalId, e);
  }
}

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
    const hospital = data as DbHospital;

    // C-4 lazy encrypt: 평문 phone 감지 시 백그라운드 암호화 (기존 데이터 자동 마이그레이션)
    if (isPlainHospitalPhone(hospital.phone)) {
      void lazyEncryptHospitalPhone(hospital.id, hospital.phone);
    }

    return hospital;
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
      onboardingFlags: 0,
      billingProgram: null,
    }));
  },

  /** 병원 ID로 단건 조회 */
  async getHospitalById(hospitalId: string): Promise<Hospital | null> {
    const baseSelect = 'id, name, master_admin_id, created_at, work_days, onboarding_flags';
    const selectWithProgram = `${baseSelect}, billing_program`;

    let { data, error } = await supabase
      .from('hospitals')
      .select(selectWithProgram)
      .eq('id', hospitalId)
      .single();

    // 롤아웃 중 migration 미적용 환경 대응: billing_program 컬럼이 없어도 기본 정보는 조회
    if (error && (error.code === '42703' || /billing_program/i.test(error.message || ''))) {
      const fallback = await supabase
        .from('hospitals')
        .select(baseSelect)
        .eq('id', hospitalId)
        .single();
      data = fallback.data ? { ...fallback.data, billing_program: null } : null;
      error = fallback.error;
    }

    if (error || !data) return null;
    return dbToHospital(data as DbHospital);
  },

  /** 병원 청구프로그램 설정 */
  async updateBillingProgram(hospitalId: string, billingProgram: BillingProgram): Promise<void> {
    const { error } = await supabase
      .from('hospitals')
      .update({ billing_program: billingProgram })
      .eq('id', hospitalId);

    if (error) {
      console.error('[hospitalService] updateBillingProgram failed:', error);
      if (error.code === '42703' || /billing_program/i.test(error.message || '')) {
        throw new Error('DB에 billing_program 컬럼이 없습니다. 최신 마이그레이션을 먼저 적용해주세요.');
      }
      throw new Error('청구프로그램 저장에 실패했습니다.');
    }
  },

  /** 온보딩 플래그 OR 업데이트 (fire-and-forget 용) */
  async updateOnboardingFlags(hospitalId: string, flags: number): Promise<void> {
    await supabase
      .from('hospitals')
      .update({ onboarding_flags: flags })
      .eq('id', hospitalId);
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

  /** 병원 구성원 목록 조회 (active 멤버) — PII 복호화 포함 */
  async getMembers(hospitalId: string): Promise<DbProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'active');

    if (error) return [];
    return Promise.all((data as DbProfile[]).map(decryptProfile));
  },

  /** 가입 대기 멤버 조회 — PII 복호화 포함 */
  async getPendingMembers(hospitalId: string): Promise<DbProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'pending');

    if (error) return [];
    return Promise.all((data as DbProfile[]).map(decryptProfile));
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
  async inviteMember(email: string, name: string, hospitalId: string, clinicRole: ClinicRole): Promise<{ inviteUrl: string; token: string }> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('로그인이 필요합니다.');

    const { data, error } = await supabase.functions.invoke('invite-member', {
      body: { email, name, hospitalId, clinicRole, siteUrl: window.location.origin },
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (error) {
      let message = '초대 링크 생성에 실패했습니다.';
      try {
        if (error instanceof FunctionsError && error.context) {
          const ctx = error.context as Response;
          // Response body may only be read once; clone to be safe
          const cloned = ctx.clone ? ctx.clone() : ctx;
          const body = await cloned.json();
          if (body?.error) message = body.error;
          else if (body?.message) message = body.message;
        } else if (error.message && error.message !== 'Edge Function returned a non-2xx status code') {
          message = error.message;
        }
      } catch (parseErr) {
        console.warn('[inviteMember] failed to parse error body:', parseErr);
      }
      console.error('[inviteMember] error:', error);
      throw new Error(message);
    }
    if (data?.error) throw new Error(data.error);
    return { inviteUrl: data.inviteUrl, token: data.token };
  },

  /** 초대 대기 중인 초대 목록 조회 */
  async getInvitedMembers(hospitalId: string): Promise<{ id: string; email: string; name: string; clinic_role: ClinicRole | null; created_at: string; expires_at: string }[]> {
    const { data, error } = await supabase
      .from('member_invitations')
      .select('id, email, name, clinic_role, created_at, expires_at')
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

  /** readonly 상태 멤버 조회 — PII 복호화 포함 */
  async getReadonlyMembers(hospitalId: string): Promise<DbProfile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('hospital_id', hospitalId)
      .eq('status', 'readonly');

    if (error) return [];
    return Promise.all((data as DbProfile[]).map(decryptProfile));
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
    const { decryptPatientInfo } = await import('./cryptoUtils');
    return decryptPatientInfo(profile.email);
  },

  /** 구성원 방출 + 계정 삭제 (Edge Function 호출) */
  async kickMember(targetUserId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('kick-member', {
      body: { targetUserId },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    if (error) {
      try {
        const errBody = error instanceof FunctionsError ? await error.context?.json?.() : null;
        throw new Error(errBody?.error || '방출에 실패했습니다.');
      } catch (e) {
        if (e instanceof Error) throw e;
      }
      throw new Error('방출에 실패했습니다.');
    }
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

  /** 구성원 세부 권한 업데이트 */
  async updateMemberPermissions(userId: string, permissions: MemberPermissions): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ permissions })
      .eq('id', userId);

    if (error) {
      console.error('[hospitalService] updateMemberPermissions failed:', error);
      throw new Error('권한 저장에 실패했습니다.');
    }
  },

  /** 구성원 역할 업데이트 (dental_staff ↔ staff 등) */
  async updateMemberRole(userId: string, role: UserRole): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', userId);

    if (error) {
      console.error('[hospitalService] updateMemberRole failed:', error);
      throw new Error('역할 저장에 실패했습니다.');
    }
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

  /** 재고에 사용된 제조사 목록 (중복 제거, 정렬)
   * 보험임플란트, 수술중교환_ 말머리 제조사는 제외 */
  async getDistinctManufacturers(hospitalId: string): Promise<string[]> {
    const { data } = await supabase
      .from('inventory')
      .select('manufacturer')
      .eq('hospital_id', hospitalId);
    const all = (data || []).map((d: Record<string, unknown>) => d.manufacturer as string);
    return [...new Set(all)]
      .filter(m => m !== '보험임플란트' && !m.startsWith('수술중교환_'))
      .sort();
  },

  /** 거래처 연락처 전체 조회 */
  async getVendorContacts(hospitalId: string): Promise<VendorContact[]> {
    const { data, error } = await supabase
      .from('vendor_contacts')
      .select('*')
      .eq('hospital_id', hospitalId)
      .order('manufacturer');
    if (error) return [];
    return (data || []).map((row: Record<string, unknown>) => ({
      id: row.id as string,
      hospitalId: row.hospital_id as string,
      manufacturer: row.manufacturer as string,
      repName: row.rep_name as string | null,
      phone: row.phone as string | null,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    }));
  },

  /** 거래처 연락처 등록/수정 (upsert) */
  async upsertVendorContact(
    hospitalId: string,
    manufacturer: string,
    repName: string,
    phone: string
  ): Promise<VendorContact | null> {
    const { data, error } = await supabase
      .from('vendor_contacts')
      .upsert(
        {
          hospital_id: hospitalId,
          manufacturer,
          rep_name: repName || null,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'hospital_id,manufacturer' }
      )
      .select()
      .single();
    if (error) {
      console.error('[hospitalService] upsertVendorContact failed:', error);
      return null;
    }
    return {
      id: data.id,
      hospitalId: data.hospital_id,
      manufacturer: data.manufacturer,
      repName: data.rep_name,
      phone: data.phone,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  },

  /** 거래처 연락처 삭제 */
  async deleteVendorContact(id: string): Promise<void> {
    const { error } = await supabase.from('vendor_contacts').delete().eq('id', id);
    if (error) throw new Error('삭제에 실패했습니다.');
  },
};
