import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { DbProfile, TrustedDevice, UserRole, PlanType } from '../types';

const TRUSTED_DEVICE_TOKEN_KEY = 'dentweb_trusted_device_token';

interface SignupParams {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  hospitalName?: string;
  phone?: string;
  bizFile?: File;
  signupSource?: string;
  trialPlan?: PlanType;
}

interface AuthResult {
  success: boolean;
  error?: string;
  profile?: DbProfile;
  emailConfirmationRequired?: boolean;
}

export const authService = {
  /** 이메일/비밀번호 회원가입 */
  async signUp(params: SignupParams): Promise<AuthResult> {
    const { email, password, name, role, hospitalName, phone, bizFile, signupSource, trialPlan } = params;
    if (role === 'admin') {
      return { success: false, error: '운영자 계정은 직접 가입할 수 없습니다.' };
    }

    const signupRole: Exclude<UserRole, 'admin'> =
      role === 'master' || role === 'dental_staff' || role === 'staff'
        ? role
        : 'staff';

    // 1. Supabase Auth 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role: signupRole, phone: phone || '' },
        emailRedirectTo: window.location.origin,
      },
    });

    if (authError) {
      return {
        success: false,
        error: authError.message === 'User already registered'
          ? '이미 등록된 이메일입니다.'
          : authError.message,
      };
    }

    if (!authData.user) {
      return { success: false, error: '회원가입에 실패했습니다.' };
    }

    const userId = authData.user.id;

    // 이메일 인증 대기 상태 (Supabase "Confirm email" ON)
    if (!authData.session) {
      // 슬랙 가입 알림 (fire-and-forget)
      (async () => {
        try {
          await supabase.functions.invoke('notify-signup', {
            body: {
              name,
              email,
              role: signupRole,
              hospitalName: signupRole === 'master' ? hospitalName : undefined,
              signupSource: signupSource || undefined,
            },
          });
        } catch {
          // 알림 실패는 무시
        }
      })();
      return { success: true, emailConfirmationRequired: true };
    }

    // 2. 전화번호 / 가입경로 profiles에 저장
    const profileUpdates: Record<string, any> = {};
    if (phone) profileUpdates.phone = phone;
    if (signupSource) profileUpdates.signup_source = signupSource;
    if (Object.keys(profileUpdates).length > 0) {
      await supabase.from('profiles').update(profileUpdates).eq('id', userId);
    }

    // 3. Master(치과 회원) - 병원 생성
    if (signupRole === 'master' && hospitalName) {
      const { data: hospital, error: hospError } = await supabase
        .from('hospitals')
        .insert({
          name: hospitalName,
          master_admin_id: userId,
          phone: phone || null,
        })
        .select()
        .single();

      if (hospError) {
        console.error('[authService] Hospital creation failed:', hospError);
        return { success: false, error: '병원 등록에 실패했습니다.' };
      }

      // 3. Profile에 hospital_id 연결
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ hospital_id: hospital.id })
        .eq('id', userId);

      if (profileError) {
        console.error('[authService] Profile update failed:', profileError);
      }

      // 3-1. 유료 플랜 선택 시 트라이얼 즉시 시작 (profile 의존 없이 hospital.id 직접 사용)
      if (trialPlan && trialPlan !== 'free') {
        await this._startTrialForHospital(hospital.id, trialPlan);
      }

      // 4. 사업자등록증 업로드 (선택)
      if (bizFile) {
        const fileExt = bizFile.name.split('.').pop();
        const filePath = `${userId}/biz-doc.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('biz-documents')
          .upload(filePath, bizFile, { upsert: true });

        if (uploadError) {
          console.error('[authService] Biz file upload failed:', uploadError);
        } else {
          // private bucket 기준: URL 대신 안정적인 "bucket/path" 참조값 저장
          await supabase
            .from('hospitals')
            .update({ biz_file_url: `biz-documents/${filePath}` })
            .eq('id', hospital.id);
        }
      }
    }

    // 4. Staff(개인 회원/담당자) - 개인 워크스페이스 생성
    if (signupRole === 'staff') {
      const { data: workspace, error: wsError } = await supabase
        .from('hospitals')
        .insert({
          name: `${name}의 워크스페이스`,
          master_admin_id: userId,
          phone: phone || null,
        })
        .select()
        .single();

      if (wsError) {
        console.error('[authService] Personal workspace creation failed:', wsError);
        return { success: false, error: '개인 워크스페이스 생성에 실패했습니다.' };
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ hospital_id: workspace.id })
        .eq('id', userId);

      if (profileError) {
        console.error('[authService] Profile workspace link failed:', profileError);
      }

      // 유료 플랜 선택 시 트라이얼 즉시 시작 (profile 의존 없이 workspace.id 직접 사용)
      if (trialPlan && trialPlan !== 'free') {
        await this._startTrialForHospital(workspace.id, trialPlan);
      }
    }

    // 5. 슬랙 가입 알림 (fire-and-forget)
    (async () => {
      try {
        await supabase.functions.invoke('notify-signup', {
          body: {
            name,
            email,
            role: signupRole,
            hospitalName: signupRole === 'master' ? hospitalName : undefined,
            signupSource: signupSource || undefined,
          },
        });
      } catch {
        // 알림 실패는 무시
      }
    })();

    // 6. 프로필 조회 — hospital_id가 설정될 때까지 재시도 (최대 5회 × 400ms)
    for (let i = 0; i < 5; i++) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (profileData?.hospital_id) return { success: true, profile: profileData as DbProfile };
      await new Promise(r => setTimeout(r, 400));
    }
    return { success: true };
  },

  /** 전화번호로 이메일(아이디) 찾기 */
  async findEmailByPhone(phone: string): Promise<{ success: boolean; email?: string; error?: string }> {
    const { data, error } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('phone', phone)
      .maybeSingle();

    if (error || !data) {
      return { success: false, error: '해당 전화번호로 등록된 계정을 찾을 수 없습니다.' };
    }

    // 이메일 일부 마스킹 (abc@gmail.com → a**@gmail.com)
    const [local, domain] = data.email.split('@');
    const masked = local.length <= 2
      ? local[0] + '*'.repeat(local.length - 1)
      : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1];
    return { success: true, email: `${masked}@${domain}` };
  },

  /** 이메일 존재 여부 확인 */
  async checkEmailExists(email: string): Promise<boolean> {
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    return !!data;
  },

  /** 로그인 */
  async signIn(email: string, password: string): Promise<AuthResult> {
    let authError: Error | null = null;
    try {
      const { error } = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('네트워크 응답이 없습니다. 잠시 후 다시 시도해주세요.')), 10_000)
        ),
      ]);
      authError = error;
    } catch (e) {
      return { success: false, error: e instanceof Error ? e.message : '로그인 중 오류가 발생했습니다.' };
    }

    if (authError) {
      return { success: false, error: authError.message };
    }

    // 세션 토큰 발급 및 저장 (중복 로그인 차단용)
    // RPC 실패/지연 시 stale 토큰으로 인한 false 로그아웃 방지 — 먼저 기존 토큰 제거
    localStorage.removeItem('dentweb_session_token');
    try {
      const token = crypto.randomUUID();
      await Promise.race([
        supabase.rpc('set_session_token', { p_token: token }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5_000)),
      ]);
      localStorage.setItem('dentweb_session_token', token);
    } catch (tokenError) {
      console.warn('[authService] session token setup failed:', tokenError);
      // localStorage는 이미 비워짐 → validateSessionToken이 true 반환
    }

    return { success: true };
  },

  /** 로그아웃 */
  async signOut(): Promise<void> {
    localStorage.removeItem('dentweb_session_token');
    await supabase.auth.signOut();
  },

  /** 현재 세션 조회 */
  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  /** 현재 사용자 프로필 조회 (RPC 사용) */
  async getCurrentProfile(): Promise<DbProfile | null> {
    return this.getProfileById();
  },

  /** RPC로 프로필 조회 (RLS 우회, SECURITY DEFINER) */
  async getProfileById(_userId?: string): Promise<DbProfile | null> {
    const { data, error } = await supabase.rpc('get_my_profile');

    if (error) {
      console.error('[authService] getProfileById failed:', error);
      return null;
    }
    return data as DbProfile;
  },

  /** 비밀번호 재설정 이메일 발송 */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** 프로필 업데이트 */
  async updateProfile(updates: Partial<DbProfile>): Promise<DbProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 클라이언트에서 role/status/hospital_id 변경을 시도해도 무시
    const safeUpdates: Partial<Pick<DbProfile, 'name' | 'phone'>> = {};
    if (typeof updates.name === 'string') {
      safeUpdates.name = updates.name;
    }
    if ('phone' in updates) {
      safeUpdates.phone = updates.phone ?? null;
    }
    if (Object.keys(safeUpdates).length === 0) {
      return this.getProfileById();
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(safeUpdates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[authService] Profile update failed:', error);
      return null;
    }

    return data as DbProfile;
  },

  /** 탈퇴 사유 저장 + 슬랙 알림 (fire-and-forget, 계정 삭제 전 호출) */
  async saveWithdrawalReason(reason: string, reasonDetail?: string): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('withdrawal_reasons').insert({
        user_id: user.id,
        email: user.email || '',
        reason,
        reason_detail: reasonDetail || null,
      });
      // 슬랙 알림 (fire-and-forget)
      supabase.functions.invoke('notify-withdrawal', {
        body: { email: user.email || '', reasons: reason, reasonDetail },
      }).catch(() => {});
    } catch (err) {
      console.warn('[authService] saveWithdrawalReason failed:', err);
    }
  },

  /** 가입 시 트라이얼 시작 (hospital.id를 직접 받아 profile 의존 없이 실행) */
  async _startTrialForHospital(hospitalId: string, plan: PlanType): Promise<void> {
    // RPC 시도 (p_plan 파라미터 지원)
    const { error } = await supabase.rpc('start_hospital_trial', {
      p_hospital_id: hospitalId,
      p_plan: plan,
    });
    if (!error) return;

    // RPC 실패 시 직접 업데이트로 fallback (permission error, PGRST202 등 모든 케이스)
    console.warn('[authService] Trial RPC failed, using fallback:', error.code, error.message);
    const { error: fbErr } = await supabase
      .from('hospitals')
      .update({ plan, trial_started_at: new Date().toISOString(), trial_used: false })
      .eq('id', hospitalId)
      .is('trial_started_at', null);
    if (fbErr) console.error('[authService] Trial start fallback failed:', fbErr);
  },

  /** 회원 탈퇴 (DB 함수로 auth.users 완전 삭제) */
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      // RPC: 병원/워크스페이스 + 관련 데이터 + auth.users 삭제
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        console.error('[authService] deleteAccount RPC failed:', error);
        return { success: false, error: '회원 탈퇴에 실패했습니다.' };
      }

      // dentweb_ 관련 localStorage 정리
      Object.keys(localStorage)
        .filter(key => key.startsWith('dentweb_'))
        .forEach(key => localStorage.removeItem(key));

      // 로컬 세션 정리
      await supabase.auth.signOut();
      return { success: true };
    } catch (error) {
      console.error('[authService] deleteAccount failed:', error);
      return { success: false, error: '회원 탈퇴에 실패했습니다.' };
    }
  },

  /** Auth 상태 변경 리스너 */
  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  // ── MFA (이메일 OTP 2차 인증) ──────────────────────────────

  /** OTP 이메일 발송 */
  async sendMfaOtp(email: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** OTP 검증 + 세션 토큰 재발급 */
  async verifyMfaOtp(email: string, token: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) return { success: false, error: error.message };
    // verifyOtp이 Supabase 세션을 교체하므로 중복 로그인 차단 토큰도 재발급
    try {
      const newToken = crypto.randomUUID();
      await supabase.rpc('set_session_token', { p_token: newToken });
      localStorage.setItem('dentweb_session_token', newToken);
    } catch (e) {
      console.warn('[authService] session token reissue after OTP failed:', e);
    }
    return { success: true };
  },

  /** 현재 기기가 신뢰 기기인지 확인 */
  async checkTrustedDevice(): Promise<boolean> {
    const token = localStorage.getItem(TRUSTED_DEVICE_TOKEN_KEY);
    if (!token) return false;
    try {
      const { data, error } = await supabase.rpc('check_trusted_device', { p_token: token });
      if (error || !data) {
        localStorage.removeItem(TRUSTED_DEVICE_TOKEN_KEY);
        return false;
      }
      return !!data;
    } catch {
      return false;
    }
  },

  /** 현재 기기를 신뢰 기기로 등록 (30일) */
  async registerTrustedDevice(deviceName?: string): Promise<void> {
    const token = crypto.randomUUID();
    const name = deviceName
      || `${navigator.platform} · ${new Date().toLocaleDateString('ko-KR')}`;
    try {
      await supabase.rpc('register_trusted_device', { p_token: token, p_device_name: name });
      localStorage.setItem(TRUSTED_DEVICE_TOKEN_KEY, token);
    } catch (error) {
      console.warn('[authService] registerTrustedDevice failed:', error);
    }
  },

  /** MFA 활성화/비활성화 토글 */
  async toggleMfa(enabled: boolean): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc('toggle_mfa_enabled', { p_enabled: enabled });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** 신뢰 기기 목록 조회 */
  async getTrustedDevices(): Promise<TrustedDevice[]> {
    const { data, error } = await supabase.rpc('get_trusted_devices');
    if (error || !data) return [];
    return (data as { id: string; device_name: string | null; created_at: string; expires_at: string }[]).map(d => ({
      id: d.id,
      deviceName: d.device_name,
      createdAt: d.created_at,
      expiresAt: d.expires_at,
    }));
  },

  /** 신뢰 기기 제거 */
  async removeTrustedDevice(id: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.rpc('remove_trusted_device', { p_id: id });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** 이메일 인증 메일 재전송 */
  async resendConfirmationEmail(email: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },
};
