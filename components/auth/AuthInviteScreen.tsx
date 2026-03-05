import React from 'react';
import { InviteInfo } from '../../hooks/useAuthForm';
import { Toast } from '../../hooks/useToast';
import AuthFormToast from './AuthFormToast';

interface AuthInviteScreenProps {
  inviteInfo: InviteInfo;
  onSwitch: () => void;
  inputClass: string;
  errorBanner: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  password: string;
  onPasswordChange: (value: string) => void;
  passwordConfirm: string;
  onPasswordConfirmChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  showPasswordConfirm: boolean;
  onToggleShowPasswordConfirm: () => void;
  passwordHints: React.ReactNode;
  isSubmitting: boolean;
  toast: Toast | null;
}

const AuthInviteScreen: React.FC<AuthInviteScreenProps> = ({
  inviteInfo,
  onSwitch,
  inputClass,
  errorBanner,
  onSubmit,
  password,
  onPasswordChange,
  passwordConfirm,
  onPasswordConfirmChange,
  showPassword,
  onToggleShowPassword,
  showPasswordConfirm,
  onToggleShowPasswordConfirm,
  passwordHints,
  isSubmitting,
  toast,
}) => {
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
                  {inviteInfo.hospitalName}에
                  <br />
                  초대되었습니다.
                </h2>
                <p className="text-indigo-200 text-sm leading-relaxed">
                  비밀번호를 설정하면
                  <br />
                  즉시 팀에 합류할 수 있습니다.
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

            {errorBanner}

            <form onSubmit={onSubmit} className="space-y-5">
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
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    비밀번호 <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      name="new-password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(event) => onPasswordChange(event.target.value)}
                      className={`${inputClass} pr-10`}
                      placeholder="••••••••"
                      required
                      autoFocus
                    />
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
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    비밀번호 확인 <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordConfirm ? 'text' : 'password'}
                      name="confirm-password"
                      autoComplete="new-password"
                      value={passwordConfirm}
                      onChange={(event) => onPasswordConfirmChange(event.target.value)}
                      className={`${inputClass} pr-10 ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`}
                      placeholder="비밀번호 재입력"
                      required
                    />
                    <button type="button" tabIndex={-1} onClick={onToggleShowPasswordConfirm} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPasswordConfirm ? (
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
                  {passwordConfirm && password !== passwordConfirm && (
                    <p className="text-xs text-rose-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>
              </div>
              {passwordHints}

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
      <AuthFormToast toast={toast} />
    </>
  );
};

export default AuthInviteScreen;
