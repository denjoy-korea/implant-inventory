import React, { useState, useEffect } from 'react';
import { User, UserRole, Hospital } from '../types';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { dbToUser } from '../services/mappers';
import { useToast } from '../hooks/useToast';

interface InviteInfo {
  token: string;
  email: string;
  name: string;
  hospitalName: string;
}

interface AuthFormProps {
  type: 'login' | 'signup' | 'invite';
  onSuccess: (user: User) => void;
  onSwitch: () => void;
  /** invite 모드에서 사전 로드된 초대 정보 */
  inviteInfo?: InviteInfo;
}

type SignupStep = 'role_selection' | 'form_input';
type UserType = 'dentist' | 'staff';

const formatPhone = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.startsWith('02')) {
    if (digits.length <= 2) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
};

const AuthForm: React.FC<AuthFormProps> = ({ type, onSuccess, onSwitch, inviteInfo }) => {
  const [step, setStep] = useState<SignupStep>('role_selection');
  const [userType, setUserType] = useState<UserType | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [phone, setPhone] = useState('');
  const [bizFile, setBizFile] = useState<File | null>(null);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errorStatus, setErrorStatus] = useState<{ message: string } | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [showFindId, setShowFindId] = useState(false);
  const [findPhone, setFindPhone] = useState('');
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  // invite 모드: 초대 정보 사전 입력
  useEffect(() => {
    if (type === 'invite' && inviteInfo) {
      setEmail(inviteInfo.email);
      setName(inviteInfo.name);
    }
  }, [type, inviteInfo]);

  // Reset state when switching between login/signup
  useEffect(() => {
    if (type === 'invite') return;
    setErrorStatus(null);
    setStep('role_selection');
    setUserType(null);
    setEmail('');
    setPassword('');
    setName('');
    setHospitalName('');
    setPhone('');
    setBizFile(null);
    setPasswordConfirm('');
  }, [type]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInfo) return;
    setErrorStatus(null);

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!pwRegex.test(password)) {
      setErrorStatus({ message: '비밀번호는 8자 이상, 대문자·소문자·숫자·특수문자를 모두 포함해야 합니다.' });
      return;
    }
    if (password !== passwordConfirm) {
      setErrorStatus({ message: '비밀번호가 일치하지 않습니다.' });
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Supabase Auth 계정 생성 (dental_staff 역할)
      let userId: string;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: inviteInfo.email,
        password,
        options: {
          data: { name: inviteInfo.name, role: 'dental_staff' },
        },
      });

      if (authError) {
        if (authError.message === 'User already registered') {
          // 계정은 있지만 병원 미연결 상태 (이전 초대 수락 중 오류로 재시도) → 로그인으로 대체
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: inviteInfo.email,
            password,
          });
          if (signInError || !signInData.user) {
            setErrorStatus({ message: '이미 등록된 이메일입니다. 비밀번호를 다시 확인해주세요.' });
            setIsSubmitting(false);
            return;
          }
          userId = signInData.user.id;
        } else {
          setErrorStatus({ message: authError.message });
          setIsSubmitting(false);
          return;
        }
      } else if (!authData.user) {
        setErrorStatus({ message: '계정 생성에 실패했습니다.' });
        setIsSubmitting(false);
        return;
      } else {
        userId = authData.user.id;
      }

      // 2. Edge Function으로 초대 수락 처리 (hospital_id 연결 + invitation 상태 업데이트)
      const { data: acceptData, error: acceptError } = await supabase.functions.invoke('accept-invite', {
        body: { token: inviteInfo.token, userId },
      });

      if (acceptError || acceptData?.error) {
        setErrorStatus({ message: acceptData?.error || '초대 수락 처리에 실패했습니다.' });
        setIsSubmitting(false);
        return;
      }

      // 3. 자동 로그인
      await authService.signIn(inviteInfo.email, password);
      window.location.reload();
    } catch (err: any) {
      setErrorStatus({ message: err.message || '오류가 발생했습니다.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (selectedType: UserType) => {
    setUserType(selectedType);
    setStep('form_input');
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorStatus(null);

    if (type === 'signup') {
      if (!name || !email || !password) {
        showToast('모든 필드를 입력해주세요.', 'error');
        return;
      }

      const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
      if (!pwRegex.test(password)) {
        setErrorStatus({ message: "비밀번호는 8자 이상, 대문자·소문자·숫자·특수문자를 모두 포함해야 합니다." });
        return;
      }

      if (password !== passwordConfirm) {
        setErrorStatus({ message: "비밀번호가 일치하지 않습니다." });
        return;
      }

      if (userType === 'dentist' && !hospitalName) { showToast('병원명을 입력해주세요.', 'error'); return; }
      if (userType === 'dentist' && !phone) { showToast('연락처를 입력해주세요.', 'error'); return; }
      if (userType === 'dentist' && !bizFile) { showToast('사업자등록증을 첨부해주세요.', 'error'); return; }

      setIsSubmitting(true);
      const result = await authService.signUp({
        email,
        password,
        name,
        role: userType === 'dentist' ? 'master' : 'staff',
        hospitalName: userType === 'dentist' ? hospitalName : undefined,
        phone: phone || undefined,
        bizFile: userType === 'dentist' ? bizFile || undefined : undefined,
      });
      setIsSubmitting(false);

      if (!result.success) {
        setErrorStatus({ message: result.error || '회원가입에 실패했습니다.' });
        return;
      }

      if (result.profile) {
        onSuccess(dbToUser(result.profile));
      } else {
        // profile 없으면 가입 정보로 자동 로그인 시도
        const loginResult = await authService.signIn(email, password);
        if (loginResult.success && loginResult.profile) {
          onSuccess(dbToUser(loginResult.profile));
        } else {
          showToast('회원가입 완료! 로그인해주세요.', 'success');
          onSwitch();
        }
      }

    } else {
      // Login
      if (!email || !password) {
        showToast('아이디와 비밀번호를 입력해주세요.', 'error');
        return;
      }

      setIsSubmitting(true);
      const result = await authService.signIn(email, password);
      setIsSubmitting(false);

      if (!result.success) {
        setErrorStatus({ message: result.error || '로그인에 실패했습니다.' });
        return;
      }

      // 로그인 성공 → 새로고침으로 initSession이 세션 감지 후 대시보드 진입
      window.location.reload();
    }
  };

  // Render Role Selection Screen
  if (type === 'signup' && step === 'role_selection') {
    return (
      <>
      <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/50">
        <div className="w-full max-w-[900px] min-h-[640px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5">
          {/* Left Panel - Branding */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(99,102,241,0.4)_0%,transparent_60%)]" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight">DenJOY</span>
              </div>
              <h2 className="text-[22px] font-bold leading-snug mb-3">
                임플란트 재고관리,<br />이제 스마트하게.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                역할에 맞는 회원 유형을<br />선택하고 시작하세요.
              </p>
            </div>

            <div className="relative z-10 space-y-2.5 mt-8">
              {[
                { icon: '📊', text: '실시간 재고 현황' },
                { icon: '🔗', text: '덴트웹 자동 연동' },
                { icon: '📦', text: '원클릭 발주 시스템' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500">14개 제조사 데이터 기본 적용</p>
            </div>
          </div>

          {/* Right Panel - Selection */}
          <div className="md:col-span-3 p-8 lg:p-10 flex flex-col justify-center">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900">회원 유형 선택</h2>
              <p className="text-sm text-slate-400 mt-1.5">가입하실 유형을 선택해주세요.</p>
            </div>

            <div className="space-y-4">
              {/* Dentist Card */}
              <button
                onClick={() => handleRoleSelect('dentist')}
                className="group w-full bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-500 p-6 text-left transition-all hover:shadow-lg hover:shadow-indigo-500/5 flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900">치과 회원 (관리자)</h3>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">병원 데이터를 생성·관리하고, 스태프에게 권한을 부여합니다.</p>
                </div>
              </button>

              {/* Staff Card */}
              <button
                onClick={() => handleRoleSelect('staff')}
                className="group w-full bg-white rounded-2xl border-2 border-slate-100 hover:border-emerald-500 p-6 text-left transition-all hover:shadow-lg hover:shadow-emerald-500/5 flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900">개인 회원 (담당자)</h3>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">병원 소속 없이 독립적으로 재고를 관리합니다. <span className="text-slate-400 font-medium">개인 전용 데이터 공간이 생성됩니다.</span></p>
                </div>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button onClick={onSwitch} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                이미 계정이 있으신가요? 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── Password requirement checks ──
  const pwChecks = [
    { label: '대문자', pass: /[A-Z]/.test(password) },
    { label: '소문자', pass: /[a-z]/.test(password) },
    { label: '숫자', pass: /\d/.test(password) },
    { label: '특수문자', pass: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password) },
    { label: '8자 이상', pass: password.length >= 8 },
  ];

  const renderPwHints = () => (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {pwChecks.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${
          !password ? 'bg-slate-100 text-slate-400' : c.pass ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
        }`}>
          {password && c.pass ? (
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
          ) : (
            <span className="w-3 h-3 flex items-center justify-center">
              <span className={`w-1 h-1 rounded-full ${!password ? 'bg-slate-300' : 'bg-slate-300'}`} />
            </span>
          )}
          {c.label}
        </span>
      ))}
    </div>
  );

  // ── Shared input style ──
  const inputClass = "w-full h-12 px-4 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500/20 focus-visible:border-indigo-500 outline-none transition-all text-sm placeholder:text-slate-300";

  // ── Invite Accept Form ──
  if (type === 'invite' && inviteInfo) {
    return (
      <>
      <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/50">
        <div className="w-full max-w-[900px] min-h-[640px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5">
          {/* Left Panel */}
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-8 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-[-40px] right-[-40px] w-48 h-48 bg-white/10 rounded-full" />
            <div className="absolute bottom-[-60px] left-[-20px] w-64 h-64 bg-white/5 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-10">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight">DenJOY</span>
              </div>

              <div className="mb-6">
                <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 mb-4">
                  <svg className="w-3.5 h-3.5 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs text-indigo-200 font-semibold">구성원 초대</span>
                </div>
                <h2 className="text-[22px] font-bold leading-snug mb-3">
                  {inviteInfo.hospitalName}에<br />초대되었습니다.
                </h2>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  비밀번호를 설정하면<br />즉시 팀에 합류할 수 있습니다.
                </p>
              </div>

              <div className="bg-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">치과</p>
                    <p className="text-sm font-bold text-white">{inviteInfo.hospitalName}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[10px] text-indigo-300 uppercase tracking-wider font-semibold">수신자</p>
                    <p className="text-sm font-bold text-white">{inviteInfo.name}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
              <p className="text-xs text-indigo-300">본인이 아닐 경우 이 페이지를 닫아주세요.</p>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="md:col-span-3 p-8 lg:p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">계정 설정</h2>
              <p className="text-sm text-slate-400 mt-1.5">비밀번호를 설정하면 팀에 합류됩니다.</p>
            </div>

            {errorStatus && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {errorStatus.message}
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">이름</label>
                <input type="text" value={inviteInfo.name} disabled className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">아이디 (이메일)</label>
                <input type="email" value={inviteInfo.email} disabled className={`${inputClass} bg-slate-50 text-slate-500 cursor-not-allowed`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 <span className="text-rose-400">*</span></label>
                  <input
                    type="password"
                    name="new-password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputClass}
                    placeholder="••••••••"
                    required
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 확인 <span className="text-rose-400">*</span></label>
                  <input
                    type="password"
                    name="confirm-password"
                    autoComplete="new-password"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className={`${inputClass} ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`}
                    placeholder="비밀번호 재입력"
                    required
                  />
                  {passwordConfirm && password !== passwordConfirm && (
                    <p className="text-xs text-rose-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>
              </div>
              {renderPwHints()}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-12 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? '처리 중...' : '초대 수락 및 계정 설정 완료'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button onClick={onSwitch} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                이미 계정이 있으신가요? 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      </>
    );
  }

  // ── Login Form (2-column) ──
  if (type === 'login') {
    return (
      <>
      <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/50">
        <div className="w-full max-w-[900px] min-h-[640px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5">
          {/* Left Panel - Branding */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 to-slate-800 p-8 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(99,102,241,0.3)_0%,transparent_60%)]" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                  </svg>
                </div>
                <span className="text-lg font-bold tracking-tight">DenJOY</span>
              </div>
              <h2 className="text-[22px] font-bold leading-snug mb-3">
                임플란트 재고관리,<br />이제 스마트하게.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                덴트웹 연동 기반의<br />자동화된 재고관리 시스템
              </p>
            </div>

            <div className="relative z-10 space-y-2.5 mt-8">
              {[
                { icon: '📊', text: '실시간 재고 현황' },
                { icon: '🔗', text: '덴트웹 자동 연동' },
                { icon: '📦', text: '원클릭 발주 시스템' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500">14개 제조사 데이터 기본 적용</p>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="md:col-span-3 p-8 lg:p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">로그인</h2>
              <p className="text-sm text-slate-400 mt-1.5">계정 정보를 입력해주세요.</p>
            </div>

            {errorStatus && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {errorStatus.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">아이디 (이메일)</label>
                <input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="example@clinic.com" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호</label>
                <input type="password" name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" required />
                {renderPwHints()}
              </div>
              <button type="submit" disabled={isSubmitting} className="w-full h-12 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div className="mt-4 flex justify-center gap-4 text-xs text-slate-400">
              <button
                type="button"
                onClick={() => { setShowFindId(!showFindId); setFoundEmail(null); setFindPhone(''); }}
                className="hover:text-indigo-600 transition-colors"
              >
                아이디 찾기
              </button>
              <span>|</span>
              <button
                type="button"
                onClick={async () => {
                  if (!email) { showToast('이메일을 먼저 입력해주세요.', 'error'); return; }
                  const result = await authService.resetPassword(email);
                  if (result.success) {
                    setResetEmailSent(true);
                    setErrorStatus({ message: `비밀번호 재설정 이메일을 ${email}로 발송했습니다.` });
                  } else {
                    showToast(result.error || '이메일 발송에 실패했습니다.', 'error');
                  }
                }}
                className="hover:text-indigo-600 transition-colors"
              >
                비밀번호 찾기
              </button>
            </div>

            {showFindId && (
              <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <h4 className="text-sm font-bold text-slate-700 mb-3">전화번호로 아이디 찾기</h4>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={findPhone}
                    onChange={(e) => setFindPhone(formatPhone(e.target.value))}
                    placeholder="010-0000-0000"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!findPhone) return;
                      const result = await authService.findEmailByPhone(findPhone);
                      if (result.success && result.email) {
                        setFoundEmail(result.email);
                      } else {
                        setFoundEmail(null);
                        showToast(result.error || '계정을 찾을 수 없습니다.', 'error');
                      }
                    }}
                    className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors"
                  >
                    찾기
                  </button>
                </div>
                {foundEmail && (
                  <div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
                    <p className="text-sm text-indigo-700">
                      등록된 아이디: <span className="font-bold">{foundEmail}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button onClick={onSwitch} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                계정이 없으신가요? 회원가입
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      </>
    );
  }

  // ── Staff Signup (2-column) ──
  if (type === 'signup' && userType === 'staff') {
    return (
      <>
      <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/50">
        <div className="w-full max-w-[900px] min-h-[640px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5">
          {/* Left Panel - Branding */}
          <div className="md:col-span-2 bg-gradient-to-br from-emerald-600 to-teal-700 p-8 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(255,255,255,0.2)_0%,transparent_60%)]" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2.5 mb-8">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                </div>
                <span className="text-lg font-bold tracking-tight">DenJOY</span>
              </div>
              <h2 className="text-[22px] font-bold leading-snug mb-3">
                개인 담당자로<br />시작하세요.
              </h2>
              <p className="text-emerald-200 text-sm leading-relaxed">
                독립적인 데이터 공간에서<br />나만의 재고를 관리하세요.
              </p>
            </div>

            <div className="relative z-10 space-y-2.5 mt-8">
              {[
                { icon: '👤', text: '개인 전용 데이터 공간' },
                { icon: '📦', text: '독립적인 재고 관리' },
                { icon: '🔒', text: '나만의 보안 환경' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm text-emerald-100">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/20">
              <button onClick={() => setStep('role_selection')} className="text-sm text-emerald-200 hover:text-white transition-colors flex items-center gap-1.5">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                유형 다시 선택
              </button>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="md:col-span-3 p-8 lg:p-10 flex flex-col justify-center">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900">개인 회원가입 (담당자)</h2>
              <p className="text-sm text-slate-400 mt-1.5">본인 정보를 입력해주세요.</p>
            </div>

            {errorStatus && (
              <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {errorStatus.message}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">이름 <span className="text-rose-400">*</span></label>
                  <input type="text" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="실명 입력" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">연락처 <span className="text-rose-400">*</span></label>
                  <input type="tel" name="phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className={inputClass} placeholder="010-0000-0000" required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">아이디 (이메일) <span className="text-rose-400">*</span></label>
                <input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="example@clinic.com" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 <span className="text-rose-400">*</span></label>
                  <input type="password" name="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 확인 <span className="text-rose-400">*</span></label>
                  <input type="password" name="confirm-password" autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={`${inputClass} ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`} placeholder="비밀번호 재입력" required />
                  {passwordConfirm && password !== passwordConfirm && (
                    <p className="text-xs text-rose-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>
              </div>
              {renderPwHints()}
              <button type="submit" disabled={isSubmitting} className="w-full h-12 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed">
                {isSubmitting ? '처리 중...' : '가입완료'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100 text-center">
              <button onClick={onSwitch} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                이미 계정이 있으신가요? 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      </>
    );
  }

  // ── Dentist Signup (2-column layout) ──
  return (
    <>
    <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/50">
      <div className="w-full max-w-[900px] min-h-[640px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5">
        {/* Left Panel - Branding */}
        <div className="md:col-span-2 bg-gradient-to-br from-indigo-600 to-purple-600 p-8 flex flex-col justify-between text-white">
          <div>
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center mb-6">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">치과 회원가입</h2>
            <p className="text-indigo-200 text-sm leading-relaxed">
              병원 정보를 등록하고<br />DenJOY 재고관리 시스템을<br />시작하세요.
            </p>
          </div>

          <div className="space-y-3 mt-8">
            {['실시간 재고 현황 대시보드', '수술기록 자동 연동', '스마트 발주 추천'].map((text, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <svg className="w-4 h-4 text-indigo-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                <span className="text-sm text-indigo-100">{text}</span>
              </div>
            ))}
          </div>

          <div className="mt-8 pt-6 border-t border-white/20">
            <button onClick={() => setStep('role_selection')} className="text-sm text-indigo-200 hover:text-white transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              유형 다시 선택
            </button>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="md:col-span-3 p-8">
          {errorStatus && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
              {errorStatus.message}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Row 1: 병원명 + 연락처 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">치과 병원명 <span className="text-rose-400">*</span></label>
                <input type="text" name="organization" autoComplete="organization" value={hospitalName} onChange={(e) => setHospitalName(e.target.value)} className={inputClass} placeholder="예: 디앤조이치과" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">연락처 <span className="text-rose-400">*</span></label>
                <input type="tel" name="phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} className={inputClass} placeholder="010-0000-0000" required />
              </div>
            </div>

            {/* Row 2: 사업자등록증 */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">사업자등록증 <span className="text-rose-400">*</span></label>
              <div className={`relative w-full border-2 border-dashed rounded-xl p-4 text-center transition-all ${bizFile ? 'border-indigo-300 bg-indigo-50/30' : 'border-slate-200 hover:border-indigo-300'}`}>
                {bizFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                    <span className="text-sm text-indigo-700 font-medium truncate max-w-[200px]">{bizFile.name}</span>
                    <button type="button" onClick={() => setBizFile(null)} aria-label="첨부파일 삭제" className="text-slate-400 hover:text-rose-500">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <label className="cursor-pointer flex flex-col items-center gap-1.5">
                    <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                    <span className="text-sm text-slate-400">이미지 또는 PDF 파일 첨부</span>
                    <input type="file" accept="image/*,.pdf" onChange={(e) => setBizFile(e.target.files?.[0] || null)} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            {/* Row 3: 이름 + 이메일 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">이름 <span className="text-rose-400">*</span></label>
                <input type="text" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="실명 입력" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">아이디 (이메일) <span className="text-rose-400">*</span></label>
                <input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="example@clinic.com" required />
              </div>
            </div>

            {/* Row 4: 비밀번호 + 비밀번호 확인 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 <span className="text-rose-400">*</span></label>
                <input type="password" name="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} placeholder="••••••••" required />
                {renderPwHints()}
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 확인 <span className="text-rose-400">*</span></label>
                <input type="password" name="confirm-password" autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={`${inputClass} ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`} placeholder="비밀번호 재입력" required />
                {passwordConfirm && password !== passwordConfirm && (
                  <p className="text-[11px] text-rose-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                )}
              </div>
            </div>

            <button type="submit" disabled={isSubmitting} className="w-full h-12 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all active:scale-[0.98] mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {isSubmitting ? '처리 중...' : '가입완료'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-slate-100 text-center">
            <button onClick={onSwitch} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </div>
      </div>
    </div>
    {toast && (
      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
        {toast.message}
      </div>
    )}
    </>
  );
};

export default AuthForm;
