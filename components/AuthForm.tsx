import React from 'react';
import LegalModal from './shared/LegalModal';
import { User, UserRole, Hospital, PlanType, PLAN_PRICING } from '../types';
import { formatPhone } from './auth/authSignupConfig';
import AuthSignupPlanSelect from './auth/AuthSignupPlanSelect';
import AuthSignupRoleSelect from './auth/AuthSignupRoleSelect';
import { authService } from '../services/authService';
import { useAuthForm, InviteInfo, maskEmail } from '../hooks/useAuthForm';

interface AuthFormProps {
  type: 'login' | 'signup' | 'invite';
  onSuccess: (user: User) => void;
  onSwitch: () => void;
  onContact?: () => void;
  /** invite 모드에서 사전 로드된 초대 정보 */
  inviteInfo?: InviteInfo;
  /** MFA 필요 시 호출 (email 전달) */
  onMfaRequired?: (email: string) => void;
  /** PricingPage 에서 플랜 선택 후 넘어온 경우 자동 플랜 선택 */
  initialPlan?: PlanType;
}

const AuthForm: React.FC<AuthFormProps> = ({ type, onSuccess, onSwitch, onContact, inviteInfo, onMfaRequired, initialPlan }) => {
  const {
    step, setStep,
    userType,
    email, setEmail,
    password, setPassword,
    name, setName,
    hospitalName, setHospitalName,
    phone, setPhone,
    signupSource, setSignupSource,
    bizFile, setBizFile,
    passwordConfirm, setPasswordConfirm,
    rememberEmail, setRememberEmail,
    errorStatus, setErrorStatus,
    resetEmailSent, setResetEmailSent,
    betaInviteCode, setBetaInviteCode,
    betaInviteVerified,
    betaInviteModalOpen, setBetaInviteModalOpen,
    betaInviteChecking,
    betaInviteError,
    betaSignupPolicy,
    isBetaInviteRequired,
    pendingTrialPlan, setPendingTrialPlan,
    trialConsented, setTrialConsented,
    planAvailability,
    showFindId, setShowFindId,
    waitlistPlan, setWaitlistPlan,
    waitlistName, setWaitlistName,
    waitlistEmail, setWaitlistEmail,
    waitlistAgreed, setWaitlistAgreed,
    waitlistSubmitting,
    waitlistDialogRef,
    findPhone, setFindPhone,
    foundEmail, setFoundEmail,
    resendCooldown, setResendCooldown,
    isResending, setIsResending,
    showPassword, setShowPassword,
    showPasswordConfirm, setShowPasswordConfirm,
    agreedToTerms, setAgreedToTerms,
    agreedToPrivacy, setAgreedToPrivacy,
    showLegalType, setShowLegalType,
    isSubmitting,
    toast,
    showToast,
    handleWaitlistSubmit,
    handleInviteSubmit,
    handleRoleSelect,
    openBetaInviteModal,
    handleVerifyBetaInviteCode,
    handleSubmit,
  } = useAuthForm({ type, onSuccess, inviteInfo, onMfaRequired, initialPlan });

  // ── Plan Selection Screen ──
  if (type === 'signup' && isBetaInviteRequired && !betaInviteVerified) {
    return (
      <>
        <div className="flex-1 flex items-center justify-center px-6 py-24 bg-slate-50/70">
          <div className="w-full max-w-[520px] rounded-2xl bg-white border border-slate-200 shadow-xl p-7 sm:p-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 mb-4">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-xs font-bold text-amber-700">베타테스터 가입</span>
            </div>
            <h2 className="text-xl font-black text-slate-900 leading-tight">초대 코드 확인 후 회원가입이 가능합니다.</h2>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">
              베타 기간({betaSignupPolicy.endDateText}까지)에는 운영팀에서 전달받은 초대 코드가 필요합니다.
              <br />
              {betaSignupPolicy.openDateText}부터는 코드 없이 자유롭게 가입할 수 있습니다.
            </p>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={openBetaInviteModal}
                className="w-full h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors"
              >
                베타테스터 코드 입력
              </button>
              <button
                type="button"
                onClick={onSwitch}
                className="w-full h-11 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
              >
                로그인으로 돌아가기
              </button>
            </div>
          </div>
        </div>
        {toast && (
          <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
            {toast.message}
          </div>
        )}
        {renderBetaInviteModal()}
      </>
    );
  }

  // ── Plan Selection Screen ──
  if (type === 'signup' && step === 'plan_select') {
    return (
      <AuthSignupPlanSelect
        planAvailability={planAvailability}
        pendingTrialPlan={pendingTrialPlan}
        trialConsented={trialConsented}
        onSelectPlanWithoutTrial={() => setStep('role_selection')}
        onSelectTrialPlan={(plan) => {
          setPendingTrialPlan(plan);
          setTrialConsented(false);
        }}
        onChangeTrialConsented={setTrialConsented}
        onContinueAfterTrialConsent={() => {
          if (!trialConsented || !pendingTrialPlan) return;
          setStep('role_selection');
        }}
        onSwitchToLogin={onSwitch}
        onRequestWaitlist={(plan) => {
          setWaitlistPlan(plan);
          setWaitlistAgreed(false);
        }}
      />
    );
  }

  // Render Role Selection Screen
  if (type === 'signup' && step === 'role_selection') {
    return (
      <AuthSignupRoleSelect
        onSelectRole={handleRoleSelect}
        onBack={() => setStep('plan_select')}
        onSwitchToLogin={onSwitch}
      />
    );
  }

  // ── Email Sent Screen ──
  if (type === 'signup' && step === 'email_sent') {
    return (
      <>
        <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/50">
          <div className="w-full max-w-[480px] bg-white rounded-2xl shadow-lg border border-slate-100 p-10 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">인증 메일을 확인해주세요</h2>
            <p className="text-slate-500 text-sm mb-1">아래 이메일로 인증 링크를 발송했습니다.</p>
            <p className="text-indigo-600 font-semibold text-sm mb-6">{maskEmail(email)}</p>

            <div className="bg-slate-50 rounded-xl p-4 text-left w-full mb-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                메일함에서 <span className="font-semibold text-slate-700">DenJOY 이메일 인증</span> 메일을 찾아 링크를 클릭하면 자동으로 로그인됩니다. 스팸함도 확인해보세요.
              </p>
            </div>

            <div className="w-full space-y-3">
              <p className="text-xs text-slate-400">메일이 오지 않나요?</p>
              <button
                type="button"
                disabled={isResending || resendCooldown > 0}
                onClick={async () => {
                  setIsResending(true);
                  await authService.resendConfirmationEmail(email);
                  setIsResending(false);
                  setResendCooldown(60);
                }}
                className="w-full h-11 border border-indigo-200 text-indigo-600 font-semibold rounded-xl text-sm hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? '전송 중...' : resendCooldown > 0 ? `재전송 가능 (${resendCooldown}초)` : '인증 메일 재전송'}
              </button>
              <button
                type="button"
                onClick={onSwitch}
                className="w-full text-sm text-slate-400 hover:text-slate-600 transition-colors py-2"
              >
                로그인으로 돌아가기
              </button>
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
        <span key={i} className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full transition-colors ${!password ? 'bg-slate-100 text-slate-400' : c.pass ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
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
  const renderAuthErrorBanner = () => {
    if (!errorStatus) return null;
    return (
      <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium space-y-2">
        <p>{errorStatus.message}</p>
        {(errorStatus.canRetry || (errorStatus.showContact && onContact)) && (
          <div className="flex items-center gap-3 text-xs">
            {errorStatus.canRetry && (
              <button
                type="button"
                onClick={() => setErrorStatus(null)}
                className="font-semibold underline underline-offset-2 hover:text-red-800"
              >
                다시 시도
              </button>
            )}
            {errorStatus.showContact && onContact && (
              <button
                type="button"
                onClick={onContact}
                className="font-semibold underline underline-offset-2 hover:text-red-800"
              >
                문의하기
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  function renderBetaInviteModal() {
    if (type !== 'signup' || !isBetaInviteRequired || !betaInviteModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[340] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setBetaInviteModalOpen(false)}>
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-base font-black text-slate-900">베타테스터 초대 코드 확인</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              베타 기간({betaSignupPolicy.endDateText}까지)에는 운영팀에서 전달받은 초대 코드가 있어야 가입할 수 있습니다.<br />
              {betaSignupPolicy.openDateText}부터는 코드 없이 자유롭게 가입 가능합니다.
            </p>
          </div>
          <form onSubmit={handleVerifyBetaInviteCode} className="px-5 py-4 space-y-3">
            <label className="block text-xs font-bold text-slate-600">초대 코드</label>
            <input
              value={betaInviteCode}
              onChange={(event) => setBetaInviteCode(event.target.value.toUpperCase())}
              placeholder="예: BETA-ABCD-EF12"
              autoFocus
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold tracking-wide focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {betaInviteError && (
              <p className="text-xs text-rose-600 font-medium">{betaInviteError}</p>
            )}
            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBetaInviteModalOpen(false)}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={betaInviteChecking}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {betaInviteChecking ? '확인 중...' : '코드 확인'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

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

              {renderAuthErrorBanner()}

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
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        name="new-password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`${inputClass} pr-10`}
                        placeholder="••••••••"
                        required
                        autoFocus
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 확인 <span className="text-rose-400">*</span></label>
                    <div className="relative">
                      <input
                        type={showPasswordConfirm ? 'text' : 'password'}
                        name="confirm-password"
                        autoComplete="new-password"
                        value={passwordConfirm}
                        onChange={(e) => setPasswordConfirm(e.target.value)}
                        className={`${inputClass} pr-10 ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`}
                        placeholder="비밀번호 재입력"
                        required
                      />
                      <button type="button" tabIndex={-1} onClick={() => setShowPasswordConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPasswordConfirm ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
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
                    임플란트 재고관리,<br />이제 스마트하게.
                  </span>
                </h2>
                <p className="text-indigo-200 text-sm leading-relaxed font-medium">
                  덴트웹 연동 기반의<br />자동화된 재고관리 시스템
                </p>
              </div>

              <div className="relative z-10 space-y-3 mt-8">
                {[
                  { icon: '📊', text: '실시간 재고 현황' },
                  { icon: '🔗', text: '덴트웹 자동 연동' },
                  { icon: '📦', text: '원클릭 발주 시스템' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3.5 bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl px-4 py-3 group">
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

              {renderAuthErrorBanner()}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">아이디 (이메일)</label>
                  <input type="email" name="email" autoComplete="email" spellCheck={false} value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="example@clinic.com" required />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">비밀번호</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" required />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                  <div className="mt-2 text-right">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!email) { showToast('이메일을 먼저 상단에 입력해주세요.', 'error'); return; }
                        const result = await authService.resetPassword(email);
                        if (result.success) {
                          setResetEmailSent(true);
                          setErrorStatus(null);
                          showToast(`비밀번호 재설정 이메일을 ${email}로 발송했습니다.`, 'success');
                        } else {
                          showToast(result.error || '이메일 발송에 실패했습니다.', 'error');
                        }
                      }}
                      className="text-[13px] font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      비밀번호를 잊으셨나요?
                    </button>
                  </div>
                </div>
<button type="submit" disabled={isSubmitting} className="relative w-full h-14 bg-slate-900 text-white font-bold rounded-xl mt-4 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group shadow-lg shadow-slate-900/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  <span className="relative flex items-center justify-center gap-2 text-[15px]">
                    {isSubmitting ? '로그인 중...' : '로그인 시작하기'}
                  </span>
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
                    onClick={async () => {
                      const result = await authService.signInWithSocial('google');
                      if (!result.success) showToast(result.error || 'Google 로그인에 실패했습니다.', 'error');
                    }}
                    className="relative w-full h-12 flex items-center justify-center gap-3 bg-white border border-slate-200 rounded-xl text-[14px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-[0.98] shadow-sm"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google로 로그인
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await authService.signInWithSocial('kakao');
                      if (!result.success) showToast(result.error || '카카오 로그인에 실패했습니다.', 'error');
                    }}
                    className="relative w-full h-12 flex items-center justify-center gap-3 bg-[#FEE500] border border-[#FEE500] rounded-xl text-[14px] font-semibold text-[#191919] hover:bg-[#F5DC00] hover:border-[#F5DC00] transition-all active:scale-[0.98] shadow-sm"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 3C6.48 3 2 6.6 2 11c0 2.82 1.7 5.3 4.27 6.79l-1.09 4.05a.3.3 0 00.44.33L10.1 19.5A11.3 11.3 0 0012 19.6c5.52 0 10-3.6 10-8.04C22 6.6 17.52 3 12 3z"/>
                    </svg>
                    카카오로 로그인
                  </button>
                </div>
                <p className="mt-3 text-center text-[11px] text-slate-400 leading-relaxed">
                  이미 가입하셨나요? 로그인 후 <span className="font-semibold text-slate-500">프로필 → 보안</span> 탭에서<br />Google·카카오 계정을 연동하면 다음부터 간편 로그인할 수 있습니다.
                </p>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => { setShowFindId(!showFindId); setFoundEmail(null); setFindPhone(''); }}
                  className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                >
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
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                  </div>
                  <span className="text-xl font-bold tracking-tight">DenJOY</span>
                </div>
                <h2 className="text-[28px] font-black leading-snug mb-4 tracking-tight">
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-100 to-teal-200">
                    개인 담당자로<br />시작하세요.
                  </span>
                </h2>
                <p className="text-emerald-200 text-sm leading-relaxed font-medium">
                  독립적인 데이터 공간에서<br />나만의 재고를 관리하세요.
                </p>
              </div>

              <div className="relative z-10 space-y-3 mt-8">
                {[
                  { icon: '👤', text: '개인 전용 데이터 공간' },
                  { icon: '📦', text: '독립적인 재고 관리' },
                  { icon: '🔒', text: '나만의 보안 환경' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-3.5 bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl px-4 py-3 group">
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                      <span className="text-sm">{item.icon}</span>
                    </div>
                    <span className="text-[13px] text-emerald-100 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
                <button onClick={() => setStep('role_selection')} className="text-[13px] text-emerald-300/80 hover:text-white transition-colors flex items-center gap-1.5 font-medium tracking-wide">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
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

              {renderAuthErrorBanner()}

              <form onSubmit={handleSubmit} className="space-y-6">
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
                    <div className="relative">
                      <input type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" required />
                      <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 확인 <span className="text-rose-400">*</span></label>
                    <div className="relative">
                      <input type={showPasswordConfirm ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={`${inputClass} pr-10 ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`} placeholder="비밀번호 재입력" required />
                      <button type="button" tabIndex={-1} onClick={() => setShowPasswordConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                        {showPasswordConfirm ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                      </button>
                    </div>
                    {passwordConfirm && password !== passwordConfirm && (
                      <p className="text-xs text-rose-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                    )}
                  </div>
                </div>
                {renderPwHints()}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">가입경로 <span className="text-rose-400">*</span></label>
                  <select value={signupSource} onChange={(e) => setSignupSource(e.target.value)} className={inputClass}>
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
                        onClick={openBetaInviteModal}
                        className={`text-[11px] font-bold underline underline-offset-2 ${betaInviteVerified ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-700 hover:text-amber-800'}`}
                      >
                        {betaInviteVerified ? '코드 재확인' : '코드 입력'}
                      </button>
                    </div>
                    <p className={`mt-1 text-[11px] ${betaInviteVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {betaInviteVerified ? `확인 완료 코드: ${betaInviteCode}` : `코드 필수 기간: ${betaSignupPolicy.endDateText}까지`}
                    </p>
                  </div>
                )}
                {/* 개인정보보호법 §15: 수집·이용 동의 체크박스 */}
                <div className="space-y-2 pt-3 border-t border-slate-100">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0" />
                    <span className="text-sm text-slate-600">
                      <span className="text-rose-400">*</span>{' '}
                      <button type="button" onClick={() => setShowLegalType('terms')} className="text-emerald-700 hover:underline font-medium">이용약관</button>에 동의합니다
                    </span>
                  </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={agreedToPrivacy} onChange={(e) => setAgreedToPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-emerald-600 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <span className="text-rose-400">*</span>{' '}
                    <button type="button" onClick={() => setShowLegalType('privacy')} className="text-emerald-700 hover:underline font-medium">개인정보 처리방침</button>에 동의합니다
                  </span>
                </label>
                <p className="ml-7 text-xs text-slate-500 leading-relaxed">
                  서비스 안정성 및 보안 패치를 위한 앱 업데이트 고지가 포함될 수 있습니다.
                </p>
              </div>
                <button type="submit" disabled={isSubmitting || !agreedToTerms || !agreedToPrivacy} className="relative w-full h-14 bg-slate-900 text-white font-bold rounded-xl mt-4 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group shadow-lg shadow-slate-900/10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                  <span className="relative flex items-center justify-center gap-2 text-[15px]">
                    {isSubmitting ? '처리 중...' : '가입완료'}
                  </span>
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100/80 flex items-center justify-between">
                <button onClick={() => setStep('role_selection')} className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                  이전으로
                </button>
                <button onClick={onSwitch} className="text-[13px] font-semibold text-slate-500 hover:text-emerald-600 transition-colors">
                  이미 계정이 있으신가요? <span className="underline underline-offset-4">로그인</span>
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
        {renderBetaInviteModal()}
        {showLegalType && <LegalModal type={showLegalType} onClose={() => setShowLegalType(null)} />}
      </>
    );
  }

  // ── Dentist Signup (2-column layout) ──
  return (
    <>
      <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/80 backdrop-blur-sm relative">
        <div className="absolute top-20 left-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[950px] min-h-[640px] bg-white rounded-[2rem] shadow-2xl shadow-indigo-900/5 ring-1 ring-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5 relative z-10">
          {/* Left Panel - Branding */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/20 blur-3xl" />
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
                  치과 회원가입
                </span>
              </h2>
              <p className="text-indigo-200 text-sm leading-relaxed font-medium">
                병원 정보를 등록하고<br />DenJOY 재고관리 시스템을<br />시작하세요.
              </p>
            </div>

            <div className="relative z-10 space-y-3 mt-8">
              {['실시간 재고 현황 대시보드', '수술기록 자동 연동', '스마트 발주 추천'].map((text, i) => (
                <div key={i} className="flex items-center gap-3.5 bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl px-4 py-3 group">
                  <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner flex-shrink-0">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <span className="text-[13px] text-indigo-100 font-medium">{text}</span>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
              <button onClick={() => setStep('role_selection')} className="text-[13px] text-indigo-300/80 hover:text-white transition-colors flex items-center gap-1.5 font-medium tracking-wide">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                유형 다시 선택
              </button>
            </div>
          </div>

          {/* Right Panel - Form */}
          <div className="md:col-span-3 p-10 lg:p-14 flex flex-col justify-center bg-white relative">
            <div className="mb-8">
              <h2 className="text-[26px] font-extrabold text-slate-900 tracking-tight">치과 회원가입</h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">관리자 계정 정보를 입력해주세요.</p>
            </div>

            {renderAuthErrorBanner()}

            <form onSubmit={handleSubmit} className="space-y-6">
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
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} name="new-password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClass} pr-10`} placeholder="••••••••" required />
                    <button type="button" tabIndex={-1} onClick={() => setShowPassword(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                  {renderPwHints()}
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">비밀번호 확인 <span className="text-rose-400">*</span></label>
                  <div className="relative">
                    <input type={showPasswordConfirm ? 'text' : 'password'} name="confirm-password" autoComplete="new-password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className={`${inputClass} pr-10 ${passwordConfirm && password !== passwordConfirm ? 'border-rose-300' : ''}`} placeholder="비밀번호 재입력" required />
                    <button type="button" tabIndex={-1} onClick={() => setShowPasswordConfirm(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPasswordConfirm ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                  {passwordConfirm && password !== passwordConfirm && (
                    <p className="text-[11px] text-rose-500 mt-1">비밀번호가 일치하지 않습니다.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">가입경로 <span className="text-rose-400">*</span></label>
                <select value={signupSource} onChange={(e) => setSignupSource(e.target.value)} className={inputClass}>
                  <option value="">선택 안 함</option>
                  <option value="지인 소개">지인 소개</option>
                  <option value="인스타그램">인스타그램</option>
                  <option value="유튜브">유튜브</option>
                  <option value="네이버 검색">네이버 검색</option>
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
                      onClick={openBetaInviteModal}
                      className={`text-[11px] font-bold underline underline-offset-2 ${betaInviteVerified ? 'text-emerald-700 hover:text-emerald-800' : 'text-amber-700 hover:text-amber-800'}`}
                    >
                      {betaInviteVerified ? '코드 재확인' : '코드 입력'}
                    </button>
                  </div>
                  <p className={`mt-1 text-[11px] ${betaInviteVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {betaInviteVerified ? `확인 완료 코드: ${betaInviteCode}` : `코드 필수 기간: ${betaSignupPolicy.endDateText}까지`}
                  </p>
                </div>
              )}
              {/* 개인정보보호법 §15: 수집·이용 동의 체크박스 */}
              <div className="space-y-2 pt-3 border-t border-slate-100">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-indigo-600 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <span className="text-rose-400">*</span>{' '}
                    <button type="button" onClick={() => setShowLegalType('terms')} className="text-indigo-600 hover:underline font-medium">이용약관</button>에 동의합니다
                  </span>
                </label>
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input type="checkbox" checked={agreedToPrivacy} onChange={(e) => setAgreedToPrivacy(e.target.checked)} className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-indigo-600 flex-shrink-0" />
                  <span className="text-sm text-slate-600">
                    <span className="text-rose-400">*</span>{' '}
                    <button type="button" onClick={() => setShowLegalType('privacy')} className="text-indigo-600 hover:underline font-medium">개인정보 처리방침</button>에 동의합니다
                  </span>
                </label>
                <p className="ml-7 text-xs text-slate-500 leading-relaxed">
                  서비스 안정성 및 보안 패치를 위한 앱 업데이트 고지가 포함될 수 있습니다.
                </p>
              </div>
              <button type="submit" disabled={isSubmitting || !agreedToTerms || !agreedToPrivacy} className="relative w-full h-14 bg-slate-900 text-white font-bold rounded-xl mt-4 hover:bg-slate-800 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group shadow-lg shadow-slate-900/10">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <span className="relative flex items-center justify-center gap-2 text-[15px]">
                  {isSubmitting ? '처리 중...' : '가입완료'}
                </span>
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100/80 flex items-center justify-between">
              <button onClick={() => setStep('role_selection')} className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                이전으로
              </button>
              <button onClick={onSwitch} className="text-[13px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
                이미 계정이 있으신가요? <span className="underline underline-offset-4">로그인</span>
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
      {renderBetaInviteModal()}
      {showLegalType && <LegalModal type={showLegalType} onClose={() => setShowLegalType(null)} />}

      {/* 대기 신청 모달 (P1-2) */}
      {waitlistPlan && (
        <div className="fixed inset-0 bg-black/60 z-[300] flex items-center justify-center p-4" onClick={() => !waitlistSubmitting && setWaitlistPlan(null)}>
          <div
            ref={waitlistDialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-waitlist-title"
            aria-describedby="auth-waitlist-desc"
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
            onKeyDown={event => { if (event.key === 'Escape' && !waitlistSubmitting) setWaitlistPlan(null); }}
          >
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{waitlistPlan.name}</span>
                    <span className="text-slate-300 text-xs">플랜</span>
                  </div>
                  <h3 id="auth-waitlist-title" className="text-base font-bold">대기 신청</h3>
                  <p id="auth-waitlist-desc" className="text-slate-300 text-xs mt-0.5">자리가 나면 가장 먼저 연락드릴게요</p>
                </div>
                <button type="button" onClick={() => !waitlistSubmitting && setWaitlistPlan(null)} aria-label="대기 신청 모달 닫기" className="text-slate-400 hover:text-white transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">이름 *</label>
                <input type="text" value={waitlistName} onChange={e => setWaitlistName(e.target.value)} placeholder="홍길동" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" disabled={waitlistSubmitting} />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5">이메일 *</label>
                <input type="email" value={waitlistEmail} onChange={e => setWaitlistEmail(e.target.value)} placeholder="example@clinic.com" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" disabled={waitlistSubmitting} />
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={waitlistAgreed}
                    onChange={(e) => setWaitlistAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-slate-900 flex-shrink-0"
                  />
                  <span className="text-[11px] text-slate-500 leading-relaxed">제공하신 정보는 대기 순번 안내 연락 목적으로만 사용됩니다.</span>
                </label>
                <div className="mt-1 ml-6 flex items-center gap-2 text-[11px]">
                  <button type="button" onClick={() => setShowLegalType('terms')} className="text-indigo-600 hover:underline">이용약관</button>
                  <span className="text-slate-300">·</span>
                  <button type="button" onClick={() => setShowLegalType('privacy')} className="text-indigo-600 hover:underline">개인정보처리방침</button>
                </div>
                <p className="mt-1 ml-6 text-[11px] text-slate-500 leading-relaxed">
                  서비스 안정성 및 보안 패치를 위한 앱 업데이트 고지가 포함될 수 있습니다.
                </p>
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => !waitlistSubmitting && setWaitlistPlan(null)} disabled={waitlistSubmitting} className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50">취소</button>
                <button type="button" onClick={handleWaitlistSubmit} disabled={waitlistSubmitting || !waitlistName.trim() || !waitlistEmail.trim() || !waitlistAgreed} className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-all bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                  {waitlistSubmitting ? '신청 중...' : '대기 신청하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AuthForm;
