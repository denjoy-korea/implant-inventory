
import { useState, useEffect } from 'react';
import { User, PlanType, PLAN_NAMES } from '../types';
import { getErrorMessage } from '../utils/errors';
import { planService } from '../services/planService';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { dbToUser } from '../services/mappers';
import { useToast } from './useToast';
import { pageViewService } from '../services/pageViewService';
import { SIGNUP_PLANS } from '../components/auth/authSignupConfig';
import { TRIAL_OFFER_LABEL } from '../utils/trialPolicy';
import { useWaitlistForm } from './useWaitlistForm';
import { usePromoCodeVerification } from './usePromoCodeVerification';

export interface InviteInfo {
  token: string;
  email: string;
  name: string;
  hospitalName: string;
}

export type SignupStep = 'role_selection' | 'plan_select' | 'form_input' | 'email_sent';
export type UserType = 'dentist' | 'staff';
type AuthErrorCode = 'network' | 'permission' | 'invite' | 'validation' | 'unknown';
export interface AuthErrorStatus {
  message: string;
  code: AuthErrorCode;
  canRetry: boolean;
  showContact: boolean;
}

const AUTH_ERROR_KO: Record<string, string> = {
  'invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'invalid email or password': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'email not confirmed': '이메일 인증이 완료되지 않았습니다. 받은 메일함을 확인해주세요.',
  'user already registered': '이미 가입된 이메일입니다.',
  'email rate limit exceeded': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  'invalid email': '이메일 형식이 올바르지 않습니다.',
  'unable to validate email address: invalid format': '이메일 형식이 올바르지 않습니다.',
  'password should be at least 6 characters': '비밀번호는 6자 이상이어야 합니다.',
  'signups not allowed for this instance': '현재 회원가입이 불가능합니다.',
  'token has expired or is invalid': '링크가 만료되었거나 유효하지 않습니다.',
  'otp expired': '인증 코드가 만료되었습니다.',
  'invalid otp': '인증 코드가 올바르지 않습니다.',
  'for security purposes, you can only request this once every 60 seconds': '보안을 위해 60초 후 다시 시도해주세요.',
  'too many requests': '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  'database error saving new user': '회원가입 처리 중 저장 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

export function toAuthErrorStatus(message: string): AuthErrorStatus {
  const normalized = message.toLowerCase();
  const translated = AUTH_ERROR_KO[normalized] ?? message;
  const isNetwork = /network|fetch|timeout|timed out|연결|네트워크/.test(normalized);
  const isPermission = /permission|forbidden|권한|unauthorized|denied/.test(normalized);
  const isInvite = /invite|초대|토큰|만료/.test(normalized);
  const isValidation = /비밀번호|이메일|입력|형식|필수|일치하지/.test(normalized);

  const code: AuthErrorCode = isNetwork
    ? 'network'
    : isPermission
      ? 'permission'
      : isInvite
        ? 'invite'
        : isValidation
          ? 'validation'
          : 'unknown';

  return {
    message: translated,
    code,
    canRetry: code === 'network' || code === 'permission' || code === 'invite' || code === 'unknown',
    showContact: code === 'permission' || code === 'invite' || code === 'unknown',
  };
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return email;
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local.slice(-1)}@${domain}`;
}

interface UseAuthFormParams {
  type: 'login' | 'signup' | 'invite';
  onSuccess: (user: User) => void;
  inviteInfo?: InviteInfo;
  onMfaRequired?: (email: string) => void;
  initialPlan?: PlanType;
}

export function useAuthForm({ type, onSuccess, inviteInfo, onMfaRequired, initialPlan }: UseAuthFormParams) {
  const [step, setStep] = useState<SignupStep>('plan_select');
  const [userType, setUserType] = useState<UserType | null>(null);

  const savedEmail = type === 'login' ? (localStorage.getItem('dentweb_remember_email') ?? '') : '';
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [phone, setPhone] = useState('');
  const [signupSource, setSignupSource] = useState('');
  const [bizFile, setBizFile] = useState<File | null>(null);
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [rememberEmail, setRememberEmail] = useState(savedEmail !== '');
  const [errorStatus, setErrorStatus] = useState<AuthErrorStatus | null>(null);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const [pendingTrialPlan, setPendingTrialPlan] = useState<PlanType | null>(null);
  const [trialConsented, setTrialConsented] = useState(false);
  const [planAvailability, setPlanAvailability] = useState<Record<string, boolean>>({});
  const [showFindId, setShowFindId] = useState(false);

  const [findPhone, setFindPhone] = useState('');
  const [foundEmail, setFoundEmail] = useState<string | null>(null);

  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
  const [showLegalType, setShowLegalType] = useState<'terms' | 'privacy' | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  // Compose sub-hooks
  const promo = usePromoCodeVerification({ showToast });
  const waitlist = useWaitlistForm({ showToast, showLegalType });

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  useEffect(() => {
    if (type === 'invite' && inviteInfo) {
      setEmail(inviteInfo.email);
      setName(inviteInfo.name);
    }
  }, [type, inviteInfo]);

  useEffect(() => {
    if (type === 'signup') {
      planService.getPlanAvailability().then(av => setPlanAvailability(av)).catch(() => { });
    }
  }, [type]);

  useEffect(() => {
    if (type !== 'signup' || !initialPlan) return;
    const planInfo = SIGNUP_PLANS.find(p => p.key === initialPlan);
    if (!planInfo) return;
    if (!planInfo.trial) {
      setStep('role_selection');
    } else {
      setPendingTrialPlan(initialPlan);
      setTrialConsented(false);
    }
  }, [type, initialPlan]);

  // Type-change cleanup effect
  useEffect(() => {
    if (type === 'invite') return;
    setErrorStatus(null);
    setStep('plan_select');
    setUserType(null);
    setEmail('');
    setPassword('');
    setName('');
    setHospitalName('');
    setPhone('');
    setBizFile(null);
    setPasswordConfirm('');
    promo.resetPromoState();
  }, [type]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteInfo) return;
    setErrorStatus(null);
    pageViewService.trackEvent('auth_start', { mode: 'invite' }, 'signup');

    const pwRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,}$/;
    if (!pwRegex.test(password)) {
      setErrorStatus(toAuthErrorStatus('비밀번호는 8자 이상, 대문자·소문자·숫자·특수문자를 모두 포함해야 합니다.'));
      pageViewService.trackEvent('auth_error', { mode: 'invite', reason: 'password_policy' }, 'signup');
      return;
    }
    if (password !== passwordConfirm) {
      setErrorStatus(toAuthErrorStatus('비밀번호가 일치하지 않습니다.'));
      pageViewService.trackEvent('auth_error', { mode: 'invite', reason: 'password_mismatch' }, 'signup');
      return;
    }

    setIsSubmitting(true);
    try {
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
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email: inviteInfo.email,
            password,
          });
          if (signInError || !signInData.user) {
            setErrorStatus(toAuthErrorStatus('이미 등록된 이메일입니다. 비밀번호를 다시 확인해주세요.'));
            pageViewService.trackEvent('auth_error', { mode: 'invite', reason: 'already_registered_signin_failed' }, 'signup');
            setIsSubmitting(false);
            return;
          }
          userId = signInData.user.id;
        } else {
          setErrorStatus(toAuthErrorStatus(authError.message));
          pageViewService.trackEvent('auth_error', { mode: 'invite', reason: 'signup_error', message: authError.message }, 'signup');
          setIsSubmitting(false);
          return;
        }
      } else if (!authData.user) {
        setErrorStatus(toAuthErrorStatus('계정 생성에 실패했습니다.'));
        pageViewService.trackEvent('auth_error', { mode: 'invite', reason: 'missing_user_after_signup' }, 'signup');
        setIsSubmitting(false);
        return;
      } else {
        userId = authData.user.id;
      }

      await new Promise(r => setTimeout(r, 800));

      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const { data: acceptData, error: acceptError } = await supabase.functions.invoke('accept-invite', {
        body: { token: inviteInfo.token, userId },
        headers: currentSession ? { Authorization: `Bearer ${currentSession.access_token}` } : undefined,
      });

      if (acceptError || acceptData?.error) {
        let msg = '초대 수락 처리에 실패했습니다.';
        if (acceptData?.error) {
          msg = acceptData.error;
        } else if (acceptError && acceptError.message && acceptError.message !== 'Edge Function returned a non-2xx status code') {
          msg = acceptError.message;
        }
        setErrorStatus(toAuthErrorStatus(msg));
        pageViewService.trackEvent('auth_error', { mode: 'invite', reason: 'accept_invite_failed', message: msg }, 'signup');
        setIsSubmitting(false);
        return;
      }

      await authService.signIn(inviteInfo.email, password);
      pageViewService.trackEvent('auth_complete', { mode: 'invite' }, 'signup');
      window.location.reload();
    } catch (err: unknown) {
      setErrorStatus(toAuthErrorStatus(getErrorMessage(err, '오류가 발생했습니다.')));
      pageViewService.trackEvent(
        'auth_error',
        { mode: 'invite', reason: 'unexpected', message: getErrorMessage(err, '오류가 발생했습니다.') },
        'signup',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRoleSelect = (selectedType: UserType) => {
    setUserType(selectedType);
    setStep('form_input');
  };

  const maybeStartTrialForSignup = async (user: User): Promise<void> => {
    if (type !== 'signup') return;
    if (!pendingTrialPlan || pendingTrialPlan === 'free') return;
    if (!user.hospitalId) return;

    const started = await planService.startTrial(user.hospitalId, pendingTrialPlan);
    if (started) {
      showToast(`${PLAN_NAMES[pendingTrialPlan]} ${TRIAL_OFFER_LABEL}이 시작되었습니다.`, 'success');
      return;
    }

    showToast('무료 체험 시작에 실패했습니다. 다시 시도해 주세요.', 'error');
  };

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
        setErrorStatus(toAuthErrorStatus('비밀번호는 8자 이상, 대문자·소문자·숫자·특수문자를 모두 포함해야 합니다.'));
        return;
      }

      if (password !== passwordConfirm) {
        setErrorStatus(toAuthErrorStatus('비밀번호가 일치하지 않습니다.'));
        return;
      }

      if (userType === 'dentist' && !hospitalName) { showToast('병원명을 입력해주세요.', 'error'); return; }
      if (!agreedToTerms || !agreedToPrivacy) {
        showToast('이용약관 및 개인정보 처리방침에 동의해주세요.', 'error');
        return;
      }
      pageViewService.trackEvent(
        'auth_start',
        { mode: 'signup', user_type: userType ?? null, has_trial_plan: Boolean(pendingTrialPlan) },
        'signup',
      );

      if (pendingTrialPlan && pendingTrialPlan !== 'free') {
        localStorage.setItem('_pending_trial_plan', pendingTrialPlan);
      }

      setIsSubmitting(true);
      const result = await authService.signUp({
        email,
        password,
        name,
        role: userType === 'dentist' ? 'master' : 'staff',
        hospitalName: userType === 'dentist' ? hospitalName : undefined,
        phone: phone || undefined,
        bizFile: userType === 'dentist' ? bizFile || undefined : undefined,
        signupSource: signupSource || undefined,
        trialPlan: (pendingTrialPlan && pendingTrialPlan !== 'free') ? pendingTrialPlan : undefined,
        promoCode: promo.promoVerified ? promo.promoCode : undefined,
      });
      setIsSubmitting(false);

      if (!result.success) {
        localStorage.removeItem('_pending_trial_plan');
        setErrorStatus(toAuthErrorStatus(result.error || '회원가입에 실패했습니다.'));
        pageViewService.trackEvent('auth_error', { mode: 'signup', reason: result.error || 'signup_failed' }, 'signup');
        return;
      }

      if (result.emailConfirmationRequired) {
        setResendCooldown(60);
        setStep('email_sent');
        pageViewService.trackEvent('auth_email_sent', { mode: 'signup' }, 'signup');
        return;
      }

      if (result.profile) {
        const signedUpUser = dbToUser(result.profile);
        await maybeStartTrialForSignup(signedUpUser);
        localStorage.removeItem('_pending_trial_plan');
        pageViewService.trackEvent('auth_complete', { mode: 'signup', user_role: signedUpUser.role }, 'signup');
        onSuccess(signedUpUser);
      } else {
        if (pendingTrialPlan && pendingTrialPlan !== 'free') {
          const freshProfile = await authService.getCurrentProfile().catch(() => null);
          if (freshProfile?.hospital_id) {
            await planService.startTrial(freshProfile.hospital_id, pendingTrialPlan).catch(() => null);
          }
        }
        localStorage.removeItem('_pending_trial_plan');
        pageViewService.trackEvent('auth_complete', { mode: 'signup', note: 'reload_fallback' }, 'signup');
        window.location.reload();
      }

    } else {
      if (!email || !password) {
        showToast('아이디와 비밀번호를 입력해주세요.', 'error');
        return;
      }

      pageViewService.trackEvent('auth_start', { mode: 'login' }, 'login');
      setIsSubmitting(true);
      const result = await authService.signIn(email, password);

      if (!result.success) {
        setIsSubmitting(false);
        setErrorStatus(toAuthErrorStatus(result.error || '로그인에 실패했습니다.'));
        pageViewService.trackEvent('auth_error', { mode: 'login', reason: result.error || 'login_failed' }, 'login');
        return;
      }

      try {
        const profile = await Promise.race([
          authService.getProfileById(),
          new Promise<null>(resolve => setTimeout(() => resolve(null), 8_000)),
        ]);
        if (profile?.mfa_enabled) {
          const isTrusted = await authService.checkTrustedDevice();
          if (!isTrusted) {
            setIsSubmitting(false);
            pageViewService.trackEvent('auth_mfa_required', { mode: 'login' }, 'login');
            if (onMfaRequired) {
              onMfaRequired(email);
            } else {
              window.location.reload();
            }
            return;
          }
        }
      } catch (e) {
        console.warn('[AuthForm] MFA check failed, proceeding normally:', e);
      }

      setIsSubmitting(false);
      pageViewService.trackEvent('auth_complete', { mode: 'login' }, 'login');
      if (rememberEmail) {
        localStorage.setItem('dentweb_remember_email', email);
      } else {
        localStorage.removeItem('dentweb_remember_email');
      }
      window.location.reload();
    }
  };

  return {
    // state
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
    promoCode: promo.promoCode, setPromoCode: promo.setPromoCode,
    promoVerified: promo.promoVerified,
    verifiedCodeType: promo.verifiedCodeType,
    promoModalOpen: promo.promoModalOpen, setPromoModalOpen: promo.setPromoModalOpen,
    promoChecking: promo.promoChecking,
    promoError: promo.promoError,
    pendingTrialPlan, setPendingTrialPlan,
    trialConsented, setTrialConsented,
    planAvailability,
    showFindId, setShowFindId,
    waitlistPlan: waitlist.waitlistPlan, setWaitlistPlan: waitlist.setWaitlistPlan,
    waitlistName: waitlist.waitlistName, setWaitlistName: waitlist.setWaitlistName,
    waitlistEmail: waitlist.waitlistEmail, setWaitlistEmail: waitlist.setWaitlistEmail,
    waitlistAgreed: waitlist.waitlistAgreed, setWaitlistAgreed: waitlist.setWaitlistAgreed,
    waitlistSubmitting: waitlist.waitlistSubmitting,
    waitlistDialogRef: waitlist.waitlistDialogRef,
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
    // handlers
    handleWaitlistSubmit: waitlist.handleWaitlistSubmit,
    handleInviteSubmit,
    handleRoleSelect,
    openPromoModal: promo.openPromoModal,
    handleVerifyPromoCode: promo.handleVerifyPromoCode,
    handleSubmit,
  };
}
