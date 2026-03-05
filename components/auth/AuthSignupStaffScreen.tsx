import React from 'react';

interface AuthSignupStaffScreenProps {
  inputClass: string;
  errorBanner: React.ReactNode;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void | Promise<void>;
  onBackToRoleSelection: () => void;
  onSwitchLogin: () => void;
  name: string;
  onNameChange: (value: string) => void;
  phone: string;
  onPhoneChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  passwordConfirm: string;
  onPasswordConfirmChange: (value: string) => void;
  showPassword: boolean;
  onToggleShowPassword: () => void;
  showPasswordConfirm: boolean;
  onToggleShowPasswordConfirm: () => void;
  passwordHints: React.ReactNode;
  signupSource: string;
  onSignupSourceChange: (value: string) => void;
  isBetaInviteRequired: boolean;
  betaInviteVerified: boolean;
  betaInviteCode: string;
  betaInviteEndDateText: string;
  onOpenBetaInviteModal: () => void;
  agreedToTerms: boolean;
  onAgreedToTermsChange: (checked: boolean) => void;
  agreedToPrivacy: boolean;
  onAgreedToPrivacyChange: (checked: boolean) => void;
  onShowTerms: () => void;
  onShowPrivacy: () => void;
  isSubmitting: boolean;
}

const AuthSignupStaffScreen: React.FC<AuthSignupStaffScreenProps> = ({
  inputClass,
  errorBanner,
  onSubmit,
  onBackToRoleSelection,
  onSwitchLogin,
  name,
  onNameChange,
  phone,
  onPhoneChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  passwordConfirm,
  onPasswordConfirmChange,
  showPassword,
  onToggleShowPassword,
  showPasswordConfirm,
  onToggleShowPasswordConfirm,
  passwordHints,
  signupSource,
  onSignupSourceChange,
  isBetaInviteRequired,
  betaInviteVerified,
  betaInviteCode,
  betaInviteEndDateText,
  onOpenBetaInviteModal,
  agreedToTerms,
  onAgreedToTermsChange,
  agreedToPrivacy,
  onAgreedToPrivacyChange,
  onShowTerms,
  onShowPrivacy,
  isSubmitting,
}) => {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/80 backdrop-blur-sm relative">
      <div className="absolute top-20 right-10 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[950px] min-h-[640px] bg-white rounded-[2rem] shadow-2xl shadow-emerald-900/5 ring-1 ring-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5 relative z-10">
        {/* Left Panel - Branding */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-emerald-950 to-teal-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-teal-500/20 blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-emerald-500/20 blur-3xl" />
          <div className="absolute inset-0 noise-bg opacity-20 mix-blend-overlay" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">DenJOY</span>
            </div>
            <h2 className="text-[28px] font-black leading-snug mb-4 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-teal-200">
                개인 담당자로
                <br />
                시작하세요.
              </span>
            </h2>
            <p className="text-emerald-200 text-sm leading-relaxed font-medium">
              독립적인 데이터 공간에서
              <br />
              나만의 재고를 관리하세요.
            </p>
          </div>

          <div className="relative z-10 space-y-3 mt-8">
            {[
              { icon: '👤', text: '개인 전용 데이터 공간' },
              { icon: '📦', text: '독립적인 재고 관리' },
              { icon: '🔒', text: '나만의 보안 환경' },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3.5 bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl px-4 py-3 group">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                  <span className="text-sm">{item.icon}</span>
                </div>
                <span className="text-[13px] text-emerald-100 font-medium">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
            <button onClick={onBackToRoleSelection} className="text-[13px] text-emerald-300/80 hover:text-white transition-colors flex items-center gap-1.5 font-medium tracking-wide">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              유형 다시 선택
            </button>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="md:col-span-3 p-10 lg:p-14 flex flex-col justify-center bg-white relative">
          <div className="mb-8">
            <h2 className="text-[26px] font-extrabold text-slate-900 tracking-tight">개인 회원가입 (담당자)</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">본인 정보를 입력해주세요.</p>
          </div>

          {errorBanner}

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  이름 <span className="text-rose-400">*</span>
                </label>
                <input type="text" name="name" autoComplete="name" value={name} onChange={(event) => onNameChange(event.target.value)} className={inputClass} placeholder="실명 입력" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  연락처 <span className="text-rose-400">*</span>
                </label>
                <input type="tel" name="phone" autoComplete="tel" value={phone} onChange={(event) => onPhoneChange(event.target.value)} className={inputClass} placeholder="010-0000-0000" required />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                아이디 (이메일) <span className="text-rose-400">*</span>
              </label>
              <input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(event) => onEmailChange(event.target.value)} className={inputClass} placeholder="example@clinic.com" required />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  비밀번호 <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" value={password} onChange={(event) => onPasswordChange(event.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" required />
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
                  <input type={showPasswordConfirm ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" value={passwordConfirm} onChange={(event) => onPasswordConfirmChange(event.target.value)} className={`${inputClass} pr-10 ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`} placeholder="비밀번호 재입력" required />
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
                {passwordConfirm && password !== passwordConfirm && <p className="text-xs text-rose-500 mt-1">비밀번호가 일치하지 않습니다.</p>}
              </div>
            </div>
            {passwordHints}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                가입경로 <span className="text-rose-400">*</span>
              </label>
              <select value={signupSource} onChange={(event) => onSignupSourceChange(event.target.value)} className={inputClass}>
                <option value="">선택 안 함</option>
                <option value="지인 소개">지인 소개</option>
                <option value="인스타그램">인스타그램</option>
                <option value="스레드">스레드</option>
                <option value="유튜브">유튜브</option>
                <option value="네이버 검색">네이버 검색</option>
                <option value="네이버 카페">네이버 카페</option>
                <option value="구글 검색">구글 검색</option>
                <option value="학회/세미나">학회/세미나</option>
                <option value="기타">기타</option>
              </select>
            </div>
            {isBetaInviteRequired && (
              <div className={`rounded-xl border px-3 py-2.5 ${betaInviteVerified ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
                <div className="flex items-start justify-between gap-2">
                  <p className={`text-xs font-semibold leading-relaxed ${betaInviteVerified ? 'text-emerald-700' : 'text-amber-700'}`}>
                    베타 가입 기간으로 초대 코드 확인이 필요합니다.
                    {!betaInviteVerified && ' 가입완료를 누르면 코드 확인 창이 열립니다.'}
                  </p>
                  <button
                    type="button"
                    onClick={onOpenBetaInviteModal}
                    className={`text-[11px] font-bold underline underline-offset-2 ${betaInviteVerified ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-700 hover:text-amber-800'}`}
                  >
                    {betaInviteVerified ? '코드 재확인' : '코드 입력'}
                  </button>
                </div>
                <p className={`mt-1 text-[11px] ${betaInviteVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {betaInviteVerified ? `확인 완료 코드: ${betaInviteCode}` : `코드 필수 기간: ${betaInviteEndDateText}까지`}
                </p>
              </div>
            )}
            {/* 개인정보보호법 §15: 수집·이용 동의 체크박스 */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreedToTerms} onChange={(event) => onAgreedToTermsChange(event.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  <span className="text-rose-400">*</span>{' '}
                  <button type="button" onClick={onShowTerms} className="text-emerald-700 hover:underline font-medium">이용약관</button>에 동의합니다
                </span>
              </label>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreedToPrivacy} onChange={(event) => onAgreedToPrivacyChange(event.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-600">
                  <span className="text-rose-400">*</span>{' '}
                  <button type="button" onClick={onShowPrivacy} className="text-emerald-700 hover:underline font-medium">개인정보 처리방침</button>에 동의합니다
                </span>
              </label>
              <p className="ml-7 text-xs text-slate-500 leading-relaxed">서비스 안정성 및 보안 패치를 위한 앱 업데이트 고지가 포함될 수 있습니다.</p>
            </div>
            <button type="submit" disabled={isSubmitting || !agreedToTerms || !agreedToPrivacy} className="relative w-full h-14 bg-slate-900 text-white font-bold rounded-xl mt-4 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group shadow-lg shadow-slate-900/10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
              <span className="relative flex items-center justify-center gap-2 text-[15px]">{isSubmitting ? '처리 중...' : '가입완료'}</span>
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100/80 flex items-center justify-between">
            <button onClick={onBackToRoleSelection} className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              이전으로
            </button>
            <button onClick={onSwitchLogin} className="text-[13px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
              이미 계정이 있으신가요? <span className="underline underline-offset-4">로그인</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSignupStaffScreen;
