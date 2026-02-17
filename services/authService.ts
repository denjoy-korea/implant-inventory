import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { DbProfile, UserRole } from '../types';

interface SignupParams {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  hospitalName?: string;
  phone?: string;
  bizFile?: File;
}

interface AuthResult {
  success: boolean;
  error?: string;
  profile?: DbProfile;
}

export const authService = {
  /** 이메일/비밀번호 회원가입 */
  async signUp(params: SignupParams): Promise<AuthResult> {
    const { email, password, name, role, hospitalName, phone, bizFile } = params;
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

    // 2. 전화번호 profiles에 저장
    if (phone) {
      await supabase
        .from('profiles')
        .update({ phone })
        .eq('id', userId);
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

      // 4. 사업자등록증 업로드 (선택)
      if (bizFile) {
        const fileExt = bizFile.name.split('.').pop();
        const filePath = `${userId}/biz-doc.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('biz-documents')
          .upload(filePath, bizFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from('biz-documents')
            .getPublicUrl(filePath);

          await supabase
            .from('hospitals')
            .update({ biz_file_url: urlData.publicUrl })
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
    }

    // 5. 프로필 조회 (userId로 직접 조회 + 재시도)
    for (let i = 0; i < 3; i++) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (profileData) return { success: true, profile: profileData as DbProfile };
      await new Promise(r => setTimeout(r, 500));
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
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  /** 로그아웃 */
  async signOut(): Promise<void> {
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

  /** 비밀번호 검증 (현재 세션에 영향 없음) */
  async verifyPassword(email: string, password: string): Promise<boolean> {
    const tempClient = createClient(
      import.meta.env.VITE_SUPABASE_URL || '',
      import.meta.env.VITE_SUPABASE_ANON_KEY || '',
      { auth: { persistSession: false } }
    );

    const { error } = await tempClient.auth.signInWithPassword({ email, password });
    return !error;
  },

  /** Auth 상태 변경 리스너 */
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },
};
