import React from 'react';
import LegalModal from './shared/LegalModal';
import { User, UserRole, Hospital, PlanType, PLAN_PRICING } from '../types';
import { formatPhone } from './auth/authSignupConfig';
import AuthSignupPlanSelect from './auth/AuthSignupPlanSelect';
import AuthSignupRoleSelect from './auth/AuthSignupRoleSelect';
import AuthFormToast from './auth/AuthFormToast';
import AuthInviteScreen from './auth/AuthInviteScreen';
import AuthLoginScreen from './auth/AuthLoginScreen';
import AuthSignupDentistScreen from './auth/AuthSignupDentistScreen';
import AuthSignupStaffScreen from './auth/AuthSignupStaffScreen';
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
    promoCode, setPromoCode,
    promoVerified,
    verifiedCodeType,
    promoModalOpen, setPromoModalOpen,
    promoChecking,
    promoError,
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
    openPromoModal,
    handleVerifyPromoCode,
    handleSubmit,
  } = useAuthForm({ type, onSuccess, inviteInfo, onMfaRequired, initialPlan });

  // ── Plan Selection Screen ── (플랜 선택은 가입 후 별도 진행 — 즉시 role_selection으로 스킵)
  if (type === 'signup' && step === 'plan_select') {
    setStep('role_selection');
    return null;
  }

  // Render Role Selection Screen
  if (type === 'signup' && step === 'role_selection') {
    return (
      <AuthSignupRoleSelect
        onSelectRole={handleRoleSelect}
        onBack={onSwitch}
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
        <AuthFormToast toast={toast} />
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

  function renderPromoModal() {
    if (type !== 'signup' || !promoModalOpen) return null;
    return (
      <div className="fixed inset-0 z-[340] bg-black/60 backdrop-blur-[1px] flex items-center justify-center p-4" onClick={() => setPromoModalOpen(false)}>
        <div className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden" onClick={(event) => event.stopPropagation()}>
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="text-base font-black text-slate-900">제휴/프로모션 코드 입력</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              제휴 채널이나 프로모션을 통해 받은 코드가 있으면 입력해주세요. 가입 시 할인 혜택이 자동 적용됩니다.
            </p>
          </div>
          <form onSubmit={handleVerifyPromoCode} className="px-5 py-4 space-y-3">
            <label className="block text-xs font-bold text-slate-600">제휴/프로모션 코드</label>
            <input
              value={promoCode}
              onChange={(event) => setPromoCode(event.target.value.toUpperCase())}
              placeholder="예: PARTNER-채널-코드"
              autoFocus
              className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-semibold tracking-wide focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
            {promoError && (
              <p className="text-xs text-rose-600 font-medium">{promoError}</p>
            )}
            <div className="pt-1 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPromoModalOpen(false)}
                className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-700"
              >
                닫기
              </button>
              <button
                type="submit"
                disabled={promoChecking}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {promoChecking ? '확인 중...' : '코드 확인'}
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
      <AuthInviteScreen
        inviteInfo={inviteInfo}
        onSwitch={onSwitch}
        inputClass={inputClass}
        errorBanner={renderAuthErrorBanner()}
        onSubmit={(event) => handleInviteSubmit(event)}
        password={password}
        onPasswordChange={setPassword}
        passwordConfirm={passwordConfirm}
        onPasswordConfirmChange={setPasswordConfirm}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        showPasswordConfirm={showPasswordConfirm}
        onToggleShowPasswordConfirm={() => setShowPasswordConfirm((prev) => !prev)}
        passwordHints={renderPwHints()}
        isSubmitting={isSubmitting}
        toast={toast}
      />
    );
  }

  const handleForgotPassword = async () => {
    if (!email) {
      showToast('이메일을 먼저 상단에 입력해주세요.', 'error');
      return;
    }
    const result = await authService.resetPassword(email);
    if (result.success) {
      setResetEmailSent(true);
      setErrorStatus(null);
      showToast(`비밀번호 재설정 이메일을 ${email}로 발송했습니다.`, 'success');
      return;
    }
    showToast(result.error || '이메일 발송에 실패했습니다.', 'error');
  };

  const handleGoogleLogin = async () => {
    const result = await authService.signInWithSocial('google');
    if (!result.success) showToast(result.error || 'Google 로그인에 실패했습니다.', 'error');
  };

  const handleKakaoLogin = async () => {
    const result = await authService.signInWithSocial('kakao');
    if (!result.success) showToast(result.error || '카카오 로그인에 실패했습니다.', 'error');
  };

  const handleFindEmailByPhone = async () => {
    if (!findPhone) return;
    const result = await authService.findEmailByPhone(findPhone);
    if (result.success && result.email) {
      setFoundEmail(result.email);
      return;
    }
    setFoundEmail(null);
    showToast(result.error || '계정을 찾을 수 없습니다.', 'error');
  };

  const handleToggleFindId = () => {
    setShowFindId(!showFindId);
    setFoundEmail(null);
    setFindPhone('');
  };

  // ── Login Form (2-column) ──
  if (type === 'login') {
    return (
      <AuthLoginScreen
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        isSubmitting={isSubmitting}
        onSubmit={(event) => handleSubmit(event)}
        onForgotPassword={handleForgotPassword}
        onGoogleLogin={handleGoogleLogin}
        onKakaoLogin={handleKakaoLogin}
        showFindId={showFindId}
        onToggleFindId={handleToggleFindId}
        findPhone={findPhone}
        onFindPhoneChange={(value) => setFindPhone(formatPhone(value))}
        onFindEmailByPhone={handleFindEmailByPhone}
        foundEmail={foundEmail}
        onSwitch={onSwitch}
        inputClass={inputClass}
        errorBanner={renderAuthErrorBanner()}
        toast={toast}
      />
    );
  }

  // ── Staff Signup (2-column) ──
  if (type === 'signup' && userType === 'staff') {
    return (
      <>
        <AuthSignupStaffScreen
          inputClass={inputClass}
          errorBanner={renderAuthErrorBanner()}
          onSubmit={(event) => handleSubmit(event)}
          onBackToRoleSelection={() => setStep('role_selection')}
          onSwitchLogin={onSwitch}
          name={name}
          onNameChange={setName}
          phone={phone}
          onPhoneChange={(value) => setPhone(formatPhone(value))}
          email={email}
          onEmailChange={setEmail}
          password={password}
          onPasswordChange={setPassword}
          passwordConfirm={passwordConfirm}
          onPasswordConfirmChange={setPasswordConfirm}
          showPassword={showPassword}
          onToggleShowPassword={() => setShowPassword((prev) => !prev)}
          showPasswordConfirm={showPasswordConfirm}
          onToggleShowPasswordConfirm={() => setShowPasswordConfirm((prev) => !prev)}
          passwordHints={renderPwHints()}
          signupSource={signupSource}
          onSignupSourceChange={setSignupSource}
          promoVerified={promoVerified}
          promoCode={promoCode}
          onOpenPromoModal={openPromoModal}
          verifiedCodeType={verifiedCodeType}
          agreedToTerms={agreedToTerms}
          onAgreedToTermsChange={setAgreedToTerms}
          agreedToPrivacy={agreedToPrivacy}
          onAgreedToPrivacyChange={setAgreedToPrivacy}
          onShowTerms={() => setShowLegalType('terms')}
          onShowPrivacy={() => setShowLegalType('privacy')}
          isSubmitting={isSubmitting}
        />
        <AuthFormToast toast={toast} />
        {renderPromoModal()}
        {showLegalType && <LegalModal type={showLegalType} onClose={() => setShowLegalType(null)} />}
      </>
    );
  }

  // ── Dentist Signup (2-column layout) ──
  return (
    <>
      <AuthSignupDentistScreen
        inputClass={inputClass}
        errorBanner={renderAuthErrorBanner()}
        onSubmit={(event) => handleSubmit(event)}
        onBackToRoleSelection={() => setStep('role_selection')}
        onSwitchLogin={onSwitch}
        hospitalName={hospitalName}
        onHospitalNameChange={setHospitalName}
        phone={phone}
        onPhoneChange={(value) => setPhone(formatPhone(value))}
        bizFile={bizFile}
        onBizFileChange={setBizFile}
        onClearBizFile={() => setBizFile(null)}
        name={name}
        onNameChange={setName}
        email={email}
        onEmailChange={setEmail}
        password={password}
        onPasswordChange={setPassword}
        passwordConfirm={passwordConfirm}
        onPasswordConfirmChange={setPasswordConfirm}
        showPassword={showPassword}
        onToggleShowPassword={() => setShowPassword((prev) => !prev)}
        showPasswordConfirm={showPasswordConfirm}
        onToggleShowPasswordConfirm={() => setShowPasswordConfirm((prev) => !prev)}
        passwordHints={renderPwHints()}
        signupSource={signupSource}
        onSignupSourceChange={setSignupSource}
        promoVerified={promoVerified}
        promoCode={promoCode}
        onOpenPromoModal={openPromoModal}
        verifiedCodeType={verifiedCodeType}
        agreedToTerms={agreedToTerms}
        onAgreedToTermsChange={setAgreedToTerms}
        agreedToPrivacy={agreedToPrivacy}
        onAgreedToPrivacyChange={setAgreedToPrivacy}
        onShowTerms={() => setShowLegalType('terms')}
        onShowPrivacy={() => setShowLegalType('privacy')}
        isSubmitting={isSubmitting}
      />
      <AuthFormToast toast={toast} />
      {renderPromoModal()}
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
