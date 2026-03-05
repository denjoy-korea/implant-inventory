import React from 'react';
import { Toast } from '../../hooks/useToast';
import AuthFormToast from './AuthFormToast';

interface AuthLoginScreenProps {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  isSubmitting: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onForgotPassword: () => void | Promise<void>;
  onGoogleLogin: () => void | Promise<void>;
  onKakaoLogin: () => void | Promise<void>;
  showFindId: boolean;
  onToggleFindId: () => void;
  findPhone: string;
  onFindPhoneChange: (value: string) => void;
  onFindEmailByPhone: () => void | Promise<void>;
  foundEmail: string | null;
  onSwitch: () => void;
  inputClass: string;
  errorBanner: React.ReactNode;
  toast: Toast | null;
}

const AuthLoginScreen: React.FC<AuthLoginScreenProps> = ({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  showPassword,
  onToggleShowPassword,
  isSubmitting,
  onSubmit,
  onForgotPassword,
  onGoogleLogin,
  onKakaoLogin,
  showFindId,
  onToggleFindId,
  findPhone,
  onFindPhoneChange,
  onFindEmailByPhone,
  foundEmail,
  onSwitch,
  inputClass,
  errorBanner,
  toast,
}) => {
  return (
    <>
      <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/80 backdrop-blur-sm relative">
        <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[950px] min-h-[640px] bg-white rounded-[2rem] shadow-2xl shadow-indigo-900/5 ring-1 ring-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5 relative z-10">
          {/* Left Panel - Branding */}
          <div className="md:col-span-2 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-violet-600/20 blur-3xl" />
            <div className="absolute inset-0 noise-bg opacity-20 mix-blend-overlay" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                  </svg>
                </div>
                <span className="text-xl font-bold tracking-tight">DenJOY</span>
              </div>
              <h2 className="text-[28px] font-black leading-snug mb-4 tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                  임플란트 재고관리,
                  <br />
                  이제 스마트하게.
                </span>
              </h2>
              <p className="text-indigo-200 text-sm leading-relaxed font-medium">
                덴트웹 연동 기반의
                <br />
                자동화된 재고관리 시스템
              </p>
            </div>

            <div className="relative z-10 space-y-3 mt-8">
              {[
                { icon: '📊', text: '실시간 재고 현황' },
                { icon: '🔗', text: '덴트웹 자동 연동' },
                { icon: '📦', text: '원클릭 발주 시스템' },
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-3.5 bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl px-4 py-3 group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <span className="text-sm text-indigo-100 font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
              <p className="text-xs text-indigo-300/60 font-medium tracking-wide">14개 제조사 데이터 기본 적용</p>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="md:col-span-3 p-10 lg:p-14 flex flex-col justify-center bg-white relative">
            <div className="mb-10">
              <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight">로그인</h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">계정 정보를 입력해주세요.</p>
            </div>

            {errorBanner}

            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">아이디 (이메일)</label>
                <input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => onEmailChange(event.target.value)} className={inputClass} placeholder="example@clinic.com" required />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">비밀번호</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={(event) => onPasswordChange(event.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" required />
                  <button type="button" tabIndex={-1} onClick={onToggleShowPassword} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
                <div className="mt-2 text-right">
                  <button type="button" onClick={onForgotPassword} className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors">
                    비밀번호를 잊으셨나요?
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="relative w-full h-14 bg-slate-900 text-white font-bold rounded-xl mt-4 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group shadow-lg shadow-slate-900/10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <span className="relative flex items-center justify-center gap-2 text-[15px]">{isSubmitting ? '로그인 중...' : '로그인 시작하기'}</span>
              </button>
            </form>

            {/* 소셜 로그인 */}
            <div className="mt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-[12px] font-medium text-slate-400 whitespace-nowrap">또는</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>
              <div className="flex flex-col gap-2.5">
                <button
                  type="button"
                  onClick={onGoogleLogin}
                  className="relative w-full h-12 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google로 로그인
                </button>
                <button
                  type="button"
                  onClick={onKakaoLogin}
                  className="relative w-full h-12 flex items-center justify-center gap-3 bg-[#FEE500] border border-[#FEE500] rounded-xl text-[14px] font-semibold text-[#191919] hover:bg-[#F5DC00] hover:border-[#F5DC00] transition-all active:scale-[0.98] shadow-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.48 3 2 6.6 2 11c0 2.82 1.7 5.3 4.27 6.79l-1.09 4.05a.3.3 0 00.44.33L10.1 19.5A11.3 11.3 0 0012 19.6c5.52 0 10-3.6 10-8.04C22 6.6 17.52 3 12 3z" />
                  </svg>
                  카카오로 로그인
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
                이미 가입하셨나요? 로그인 후 <span className="font-semibold text-slate-500">프로필 → 보안</span> 탭에서
                <br />
                Google·카카오 계정을 연동하면 다음부터 간편 로그인할 수 있습니다.
              </p>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button type="button" onClick={onToggleFindId} className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-colors">
                아이디(이메일) 찾기
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
                    onChange={(event) => onFindPhoneChange(event.target.value)}
                    placeholder="010-0000-0000"
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-200 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                  />
                  <button type="button" onClick={onFindEmailByPhone} className="px-4 py-2 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors">
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

            <div className="mt-8 pt-6 text-center">
              <p className="text-[13px] text-slate-500">
                아직 계정이 없으신가요?{' '}
                <button onClick={onSwitch} className="font-bold text-indigo-600 hover:text-indigo-700 transition-colors underline underline-offset-4">
                  무료 회원가입
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
      <AuthFormToast toast={toast} />
    </>
  );
};

export default AuthLoginScreen;
