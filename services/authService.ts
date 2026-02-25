import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';
import { DbProfile, TrustedDevice, UserRole, PlanType } from '../types';
import { encryptPatientInfo, decryptPatientInfo, hashPatientInfo } from './cryptoUtils';
import { decryptProfile } from './mappers';
import { normalizeBetaInviteCode } from '../utils/betaSignupPolicy';

/** 평문 여부 확인 (ENCv2/ENC v1 접두사 없으면 평문) */
const isPlain = (v: string | null | undefined): boolean =>
  !!v && !v.startsWith('ENCv2:') && !v.startsWith('ENC:');

// H-5: 동일 profile.id에 대한 중복 동시 호출 방지 (race condition → 이중 암호화 시도)
const _lazyEncryptInFlight = new Set<string>();

// H-7: Slack 알림에서 PII 마스킹 헬퍼
function maskNameForLog(name: string): string {
  if (!name) return '***';
  return name[0] + '**';
}
function maskEmailForLog(email: string): string {
  const atIdx = email.lastIndexOf('@');
  if (atIdx <= 0) return '***@***.***';
  const local = email.slice(0, atIdx);
  const domain = email.slice(atIdx + 1);
  const masked = local.length <= 1
    ? local
    : local[0] + '*'.repeat(Math.min(local.length - 1, 3));
  return `${masked}@${domain}`;
}

/** DB 트리거가 생성한 평문 profile PII를 암호화하여 저장 (fire-and-forget) */
async function lazyEncryptProfile(profile: DbProfile): Promise<void> {
  // H-5: 이미 진행 중인 암호화 작업이 있으면 건너뜀
  if (_lazyEncryptInFlight.has(profile.id)) return;
  _lazyEncryptInFlight.add(profile.id);
  // H-4: 복호화 실패 플래그가 있으면 placeholder 값('사용자' 등)으로 DB를 덮어쓰지 않도록 차단
  if (profile._decryptFailed) {
    console.error('[lazyEncryptProfile] _decryptFailed=true인 profile 쓰기 차단:', profile.id);
    _lazyEncryptInFlight.delete(profile.id);
    return;
  }
  try {
    const updates: Record<string, string | null> = {};
    const tasks: Promise<void>[] = [];

    if (isPlain(profile.name)) {
      tasks.push(encryptPatientInfo(profile.name).then((enc) => { updates.name = enc; }));
    }
    if (isPlain(profile.email)) {
      tasks.push(
        Promise.all([encryptPatientInfo(profile.email), hashPatientInfo(profile.email)])
          .then(([enc, hash]) => { updates.email = enc; updates.email_hash = hash; }),
      );
    } else if (profile.email && !profile.email_hash) {
      // 이미 암호화됐지만 hash 누락 — 복호화 후 해시만 보정
      tasks.push(
        decryptPatientInfo(profile.email).then(async (plain) => {
          if (plain && !plain.startsWith('ENCv2:') && !plain.startsWith('ENC:')) {
            updates.email_hash = await hashPatientInfo(plain);
          }
        }),
      );
    }
    if (isPlain(profile.phone)) {
      tasks.push(
        Promise.all([encryptPatientInfo(profile.phone!), hashPatientInfo(profile.phone!)])
          .then(([enc, hash]) => { updates.phone = enc; updates.phone_hash = hash; }),
      );
    } else if (profile.phone && !profile.phone_hash) {
      // 이미 암호화됐지만 hash 누락 — 복호화 후 해시만 보정
      tasks.push(
        decryptPatientInfo(profile.phone).then(async (plain) => {
          if (plain && !plain.startsWith('ENCv2:') && !plain.startsWith('ENC:')) {
            updates.phone_hash = await hashPatientInfo(plain);
          }
        }),
      );
    }

    await Promise.all(tasks);
    if (Object.keys(updates).length > 0) {
      await supabase.from('profiles').update(updates).eq('id', profile.id);
    }
  } catch (e) {
    console.warn('[authService] lazyEncryptProfile failed:', e);
  } finally {
    _lazyEncryptInFlight.delete(profile.id); // H-5: 완료 후 in-flight 해제
  }
}

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
  betaInviteCode?: string;
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
    const { email, password, name, role, hospitalName, phone, bizFile, signupSource, trialPlan, betaInviteCode } = params;
    if (role === 'admin') {
      return { success: false, error: '운영자 계정은 직접 가입할 수 없습니다.' };
    }

    const signupRole: Exclude<UserRole, 'admin'> =
      role === 'master' || role === 'dental_staff' || role === 'staff'
        ? role
        : 'staff';

    // 이전 세션의 _pending_hospital_setup이 남아 있으면 SIGNED_IN 핸들러가 잘못 실행되므로 제거
    localStorage.removeItem('_pending_hospital_setup');

    const userMetadata: Record<string, string> = {
      name,
      role: signupRole,
      phone: phone || '',
    };
    const normalizedBetaInviteCode = normalizeBetaInviteCode(betaInviteCode || '');
    if (normalizedBetaInviteCode) {
      userMetadata.beta_invite_code = normalizedBetaInviteCode;
    } else if (import.meta.env.DEV) {
      const devFallbackInviteCode = normalizeBetaInviteCode((import.meta.env.VITE_DEV_BETA_INVITE_CODE as string | undefined) || '');
      if (devFallbackInviteCode) {
        userMetadata.beta_invite_code = devFallbackInviteCode;
      }
    }

    if (import.meta.env.DEV) {
      const devBypassToken = String((import.meta.env.VITE_DEV_SIGNUP_BYPASS_TOKEN as string | undefined) || '').trim();
      if (devBypassToken) {
        userMetadata.beta_dev_bypass_token = devBypassToken;
      }
    }

    // 1. Supabase Auth 회원가입
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: userMetadata,
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
      // 이메일 인증 완료 후 병원/워크스페이스 생성을 위한 정보 임시 저장
      const pendingSetup: Record<string, string> = {
        role: signupRole,
        name,
        phone: phone || '',
      };
      if (signupRole === 'master' && hospitalName) {
        pendingSetup.hospitalName = hospitalName;
      }
      if (trialPlan && trialPlan !== 'free') {
        pendingSetup.trialPlan = trialPlan;
      }
      localStorage.setItem('_pending_hospital_setup', JSON.stringify(pendingSetup));

      // 슬랙 가입 알림 (fire-and-forget) — H-7: PII 마스킹 후 전송
      (async () => {
        try {
          await supabase.functions.invoke('notify-signup', {
            body: {
              name: maskNameForLog(name),
              email: maskEmailForLog(email),
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

    // 2. 전화번호 / 가입경로 profiles에 저장 (phone은 최초 저장 시 암호화)
    const profileUpdates: Record<string, any> = {};
    if (phone) {
      try {
        const [encPhone, phoneHash] = await Promise.all([
          encryptPatientInfo(phone),
          hashPatientInfo(phone),
        ]);
        profileUpdates.phone = encPhone;
        profileUpdates.phone_hash = phoneHash;
      } catch (e) {
        // H-3: 암호화 실패 시 평문 저장 없이 계속 진행 — lazy encrypt가 이후 처리
        console.warn('[authService] signUp: phone encryption failed, skipping:', e);
      }
    }
    if (signupSource) profileUpdates.signup_source = signupSource;
    if (Object.keys(profileUpdates).length > 0) {
      await supabase.from('profiles').update(profileUpdates).eq('id', userId);
    }

    // 3. Master(치과 회원) - 병원 생성
    if (signupRole === 'master' && hospitalName) {
      // C-4: hospitals.phone — profileUpdates.phone 재사용 (M-3: 이중 암호화 호출 제거)
      const encHospitalPhone = profileUpdates.phone ?? null;
      const { data: hospital, error: hospError } = await supabase
        .from('hospitals')
        .insert({
          name: hospitalName,
          master_admin_id: userId,
          phone: encHospitalPhone,
        })
        .select()
        .single();

      if (hospError) {
        console.error('[authService] Hospital creation failed:', hospError);
        return { success: false, error: '병원 등록에 실패했습니다.' };
      }

      // 3. Profile에 hospital_id 연결 (SECURITY DEFINER RPC로 RLS 우회)
      const { data: linked, error: profileError } = await supabase.rpc('setup_profile_hospital', {
        p_hospital_id: hospital.id,
      });
      if (profileError) {
        console.error('[authService] Profile hospital link (RPC) failed:', profileError);
      } else if (!linked) {
        console.warn('[authService] setup_profile_hospital returned false (already linked or permission denied)');
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
      // C-4: hospitals.phone — profileUpdates.phone 재사용 (M-3: 이중 암호화 호출 제거)
      const encWorkspacePhone = profileUpdates.phone ?? null;
      const { data: workspace, error: wsError } = await supabase
        .from('hospitals')
        .insert({
          name: `${name}의 워크스페이스`,
          master_admin_id: userId,
          phone: encWorkspacePhone,
        })
        .select()
        .single();

      if (wsError) {
        console.error('[authService] Personal workspace creation failed:', wsError);
        return { success: false, error: '개인 워크스페이스 생성에 실패했습니다.' };
      }

      // 개인 워크스페이스 소유자는 master_admin_id이므로 role도 'master'로 업데이트
      // SECURITY DEFINER RPC로 RLS 우회 (role 변경 포함)
      const { data: linked, error: profileError } = await supabase.rpc('setup_profile_hospital', {
        p_hospital_id: workspace.id,
        p_new_role: 'master',
      });
      if (profileError) {
        console.error('[authService] Profile workspace link (RPC) failed:', profileError);
      } else if (!linked) {
        console.warn('[authService] setup_profile_hospital (staff) returned false');
      }

      // 유료 플랜 선택 시 트라이얼 즉시 시작 (profile 의존 없이 workspace.id 직접 사용)
      if (trialPlan && trialPlan !== 'free') {
        await this._startTrialForHospital(workspace.id, trialPlan);
      }
    }

    // 5. 슬랙 가입 알림 (fire-and-forget) — H-7: PII 마스킹 후 전송
    (async () => {
      try {
        await supabase.functions.invoke('notify-signup', {
          body: {
            name: maskNameForLog(name),
            email: maskEmailForLog(email),
            role: signupRole,
            hospitalName: signupRole === 'master' ? hospitalName : undefined,
            signupSource: signupSource || undefined,
          },
        });
      } catch {
        // 알림 실패는 무시
      }
    })();

    // 6. 프로필 조회 + PII 암호화 — hospital_id가 설정될 때까지 재시도 (최대 5회 × 400ms)
    for (let i = 0; i < 5; i++) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (profileData?.hospital_id) {
        await lazyEncryptProfile(profileData as DbProfile);
        return { success: true, profile: await decryptProfile(profileData as DbProfile) };
      }
      await new Promise(r => setTimeout(r, 400));
    }
    return { success: true };
  },

  /** 전화번호로 이메일(아이디) 찾기 — 해시 조회 우선, 평문 폴백 */
  async findEmailByPhone(phone: string): Promise<{ success: boolean; email?: string; error?: string }> {
    const phoneHash = await hashPatientInfo(phone.trim());

    // 1차: 해시 컬럼으로 조회 (암호화된 레코드)
    let emailRaw: string | null = null;
    const { data: hashResult } = await supabase
      .from('profiles')
      .select('email')
      .eq('phone_hash', phoneHash)
      .maybeSingle();

    if (hashResult) {
      emailRaw = await decryptPatientInfo(hashResult.email);
    } else {
      // 2차: 평문 폴백 (암호화 전 레거시 레코드)
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('phone', phone)
        .maybeSingle();
      if (error || !data) {
        return { success: false, error: '해당 전화번호로 등록된 계정을 찾을 수 없습니다.' };
      }
      emailRaw = data.email;
    }

    if (!emailRaw) return { success: false, error: '해당 전화번호로 등록된 계정을 찾을 수 없습니다.' };

    // 이메일 일부 마스킹 (abc@gmail.com → a**@gmail.com)
    // W-7/W-8 fix: @ 없는 값이나 local 길이 0에서 undefined 반환하는 버그 방어
    const atIdx = emailRaw.lastIndexOf('@');
    if (atIdx <= 0) {
      // @ 이 없거나 맨 앞인 경우 — 데이터 손상, 안전하게 마스킹
      return { success: true, email: '***@***.***' };
    }
    const local = emailRaw.slice(0, atIdx);
    const domain = emailRaw.slice(atIdx + 1);
    const masked = local.length === 1
      ? local[0]                                                         // 1글자: 그대로
      : local.length <= 3
        ? local[0] + '*'.repeat(local.length - 1)                       // 2~3글자: 첫 글자만 노출
        : local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]; // 4글자+: 첫·끝 노출
    return { success: true, email: `${masked}@${domain}` };
  },

  /** 이메일 존재 여부 확인 — 해시 조회 우선, 평문 폴백 */
  async checkEmailExists(email: string): Promise<boolean> {
    const emailHash = await hashPatientInfo(email.trim());

    // 1차: 해시 컬럼
    const { data: hashResult } = await supabase
      .from('profiles')
      .select('id')
      .eq('email_hash', emailHash)
      .maybeSingle();
    if (hashResult) return true;

    // 2차: 평문 폴백 (레거시)
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
      const token = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
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

  /** RPC로 프로필 조회 (RLS 우회, SECURITY DEFINER) — 읽기 시 PII 복호화 + lazy 암호화 */
  async getProfileById(_userId?: string): Promise<DbProfile | null> {
    const { data, error } = await supabase.rpc('get_my_profile');

    if (error) {
      console.error('[authService] getProfileById failed:', error);
      return null;
    }
    const profile = data as DbProfile;

    // 평문 PII 또는 hash 누락 시 백그라운드에서 암호화/보정
    if (
      isPlain(profile.name) ||
      isPlain(profile.email) ||
      isPlain(profile.phone) ||
      (profile.email && !profile.email_hash) ||
      (profile.phone && !profile.phone_hash)
    ) {
      void lazyEncryptProfile(profile);
    }

    return decryptProfile(profile);
  },

  /** 비밀번호 재설정 이메일 발송 */
  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** 프로필 업데이트 — name·phone은 암호화 후 저장 */
  async updateProfile(updates: Partial<DbProfile>): Promise<DbProfile | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // 클라이언트에서 role/status/hospital_id 변경을 시도해도 무시
    const safeUpdates: Record<string, string | null> = {};
    if (typeof updates.name === 'string') {
      safeUpdates.name = await encryptPatientInfo(updates.name);
    }
    if ('phone' in updates) {
      if (updates.phone) {
        const [encPhone, phoneHash] = await Promise.all([
          encryptPatientInfo(updates.phone),
          hashPatientInfo(updates.phone),
        ]);
        safeUpdates.phone = encPhone;
        safeUpdates.phone_hash = phoneHash;
      } else {
        safeUpdates.phone = null;
        safeUpdates.phone_hash = null;
      }
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

    return decryptProfile(data as DbProfile);
  },

  /** 탈퇴 사유 저장 + 슬랙 알림 (fire-and-forget, 계정 삭제 전 호출) */
  async saveWithdrawalReason(reason: string, reasonDetail?: string): Promise<void> {
    try {
      // getUser()는 네트워크 요청으로 토큰 검증 — 403/오류 시 세션에서 userId 추출로 폴백
      const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
      const { data: { session } } = await supabase.auth.getSession();
      const userId = user?.id ?? session?.user?.id;
      const userEmail = user?.email ?? session?.user?.email ?? '';
      if (!userId) return;
      await supabase.from('withdrawal_reasons').insert({
        user_id: userId,
        email: userEmail,
        reason,
        reason_detail: reasonDetail || null,
      });
      // 슬랙 알림 (fire-and-forget)
      supabase.functions.invoke('notify-withdrawal', {
        body: { email: userEmail, reasons: reason, reasonDetail },
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

  /**
   * 이메일 인증 완료 후 병원/워크스페이스 생성 (이메일 인증 ON 경로)
   * SIGNED_IN 이벤트 핸들러에서 hospitalId가 없을 때 호출.
   * @returns 생성된 hospitalId 또는 null
   */
  async createHospitalForEmailConfirmed(userId: string): Promise<string | null> {
    const raw = localStorage.getItem('_pending_hospital_setup');
    if (!raw) return null;

    let pendingSetup: Record<string, string>;
    try {
      pendingSetup = JSON.parse(raw);
    } catch {
      localStorage.removeItem('_pending_hospital_setup');
      return null;
    }

    // 사용 후 즉시 제거 (중복 실행 방지)
    localStorage.removeItem('_pending_hospital_setup');
    localStorage.removeItem('_pending_trial_plan'); // 이중 트라이얼 방지

    const { role, hospitalName, name, phone, trialPlan } = pendingSetup;

    // 전화번호 암호화 후 profile 업데이트
    const profileUpdates: Record<string, string | null> = {};
    if (phone) {
      try {
        const [encPhone, phoneHash] = await Promise.all([
          encryptPatientInfo(phone),
          hashPatientInfo(phone),
        ]);
        profileUpdates.phone = encPhone;
        profileUpdates.phone_hash = phoneHash;
      } catch (e) {
        console.warn('[authService] createHospitalForEmailConfirmed: phone encryption failed:', e);
      }
    }
    if (Object.keys(profileUpdates).length > 0) {
      await supabase.from('profiles').update(profileUpdates).eq('id', userId);
    }

    try {
      const encPhone = profileUpdates.phone ?? null;

      if (role === 'master' && hospitalName) {
        const { data: hospital, error } = await supabase
          .from('hospitals')
          .insert({ name: hospitalName, master_admin_id: userId, phone: encPhone })
          .select()
          .single();

        if (error || !hospital) {
          console.error('[authService] createHospitalForEmailConfirmed: hospital creation failed:', error);
          return null;
        }

        await supabase.rpc('setup_profile_hospital', { p_hospital_id: hospital.id });

        if (trialPlan && trialPlan !== 'free') {
          await this._startTrialForHospital(hospital.id, trialPlan as PlanType);
        }
        return hospital.id;
      }

      if (role === 'staff') {
        const { data: workspace, error } = await supabase
          .from('hospitals')
          .insert({ name: `${name}의 워크스페이스`, master_admin_id: userId, phone: encPhone })
          .select()
          .single();

        if (error || !workspace) {
          console.error('[authService] createHospitalForEmailConfirmed: workspace creation failed:', error);
          return null;
        }

        await supabase.rpc('setup_profile_hospital', { p_hospital_id: workspace.id, p_new_role: 'master' });

        if (trialPlan && trialPlan !== 'free') {
          await this._startTrialForHospital(workspace.id, trialPlan as PlanType);
        }
        return workspace.id;
      }

      return null;
    } catch (e) {
      console.error('[authService] createHospitalForEmailConfirmed failed:', e);
      return null;
    }
  },

  /** 회원 탈퇴 (DB 함수로 auth.users 완전 삭제) */
  async deleteAccount(): Promise<{ success: boolean; error?: string }> {
    try {
      // 세션 갱신: 탈퇴 시 JWT가 만료된 경우 auth.uid() = NULL → P0001 방지
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        return { success: false, error: '세션이 만료되었습니다. 다시 로그인 후 탈퇴해 주세요.' };
      }

      // RPC: 병원/워크스페이스 + 관련 데이터 + auth.users 삭제
      const { error } = await supabase.rpc('delete_my_account');
      if (error) {
        console.error('[authService] deleteAccount RPC failed:', error);
        return { success: false, error: error.message || '회원 탈퇴에 실패했습니다.' };
      }

      // dentweb_ 관련 localStorage 정리
      Object.keys(localStorage)
        .filter(key => key.startsWith('dentweb_'))
        .forEach(key => localStorage.removeItem(key));

      // 로컬 세션 정리
      // auth.users가 이미 삭제된 경우 signOut이 에러를 반환해도 UX는 성공으로 처리한다.
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        console.warn('[authService] deleteAccount signOut warning:', signOutError);
      }
      return { success: true };
    } catch (error) {
      console.error('[authService] deleteAccount failed:', error);
      const message = error instanceof Error ? error.message : '회원 탈퇴에 실패했습니다.';
      return { success: false, error: message };
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
      const newToken = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
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
    const token = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
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

  /** 현재 사용자의 마지막 로그인 시각 (auth.users.last_sign_in_at) */
  async getLastSignInAt(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.last_sign_in_at ?? null;
  },

  // ── 소셜 로그인 / 계정 연동 ────────────────────────────────

  /** 소셜 로그인 (로그인 페이지에서 사용) */
  async signInWithSocial(provider: 'google' | 'kakao'): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** 소셜 계정 연동 (프로필 보안 탭에서 사용) */
  async linkSocialProvider(provider: 'google' | 'kakao'): Promise<{ success: boolean; error?: string }> {
    // 연동 완료 후 보안 탭으로 복귀하기 위해 쿼리 파라미터 전달
    const redirectTo = `${window.location.origin}?link_success=${provider}`;
    const { error } = await supabase.auth.linkIdentity({
      provider,
      options: { redirectTo },
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** 소셜 계정 연동 해제 */
  async unlinkSocialProvider(identityId: string): Promise<{ success: boolean; error?: string }> {
    const { data: identitiesData, error: listError } = await supabase.auth.getUserIdentities();
    if (listError || !identitiesData) return { success: false, error: listError?.message ?? '연동 정보를 불러올 수 없습니다.' };
    const identity = identitiesData.identities.find(i => i.id === identityId);
    if (!identity) return { success: false, error: '연동 계정을 찾을 수 없습니다.' };
    const { error } = await supabase.auth.unlinkIdentity(identity);
    if (error) return { success: false, error: error.message };
    return { success: true };
  },

  /** 연동된 소셜 계정 목록 조회 */
  async getLinkedIdentities(): Promise<{ id: string; provider: string }[]> {
    const { data, error } = await supabase.auth.getUserIdentities();
    if (error || !data) return [];
    return data.identities
      .filter(i => i.provider !== 'email')
      .map(i => ({ id: i.id, provider: i.provider }));
  },
};
