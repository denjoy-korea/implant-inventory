import { useState, useEffect, useCallback } from 'react';
import { PlanType, BillingCycle } from '../types';
import { useToast } from './useToast';
import { planService } from '../services/planService';
import { supabase } from '../services/supabaseClient';
import { contactService } from '../services/contactService';
import { pageViewService } from '../services/pageViewService';

interface UsePricingPageParams {
  onGetStarted: (plan?: PlanType) => void;
  onSelectPlan?: (plan: PlanType, billing: BillingCycle) => void;
  onRequestPayment?: (plan: PlanType, billing: BillingCycle, contactName: string, contactPhone: string, paymentMethod: 'card' | 'transfer', receiptType?: 'cash_receipt' | 'tax_invoice') => Promise<boolean>;
  userName?: string;
  userPhone?: string;
}

export function usePricingPage({
  onGetStarted,
  onSelectPlan,
  onRequestPayment,
  userName,
  userPhone,
}: UsePricingPageParams) {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [contactName, setContactName] = useState(userName || '');
  const [contactPhone, setContactPhone] = useState(userPhone || '');

  // Props가 비동기로 도착할 때(로그인 완료 후) 폼 초기값 동기화
  useEffect(() => { if (userName) setContactName(prev => prev || userName); }, [userName]);
  useEffect(() => { if (userPhone) setContactPhone(prev => prev || userPhone); }, [userPhone]);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [receiptType, setReceiptType] = useState<'cash_receipt' | 'tax_invoice'>('cash_receipt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentRequestError, setPaymentRequestError] = useState<string | null>(null);
  const { toast, showToast } = useToast();

  // 비로그인 무료 체험 동의 모달
  const [trialConsentPlan, setTrialConsentPlan] = useState<{ key: PlanType; name: string } | null>(null);
  const [trialConsented, setTrialConsented] = useState(false);
  const [planAvailability, setPlanAvailability] = useState<Record<string, boolean>>({});
  const [availabilityError, setAvailabilityError] = useState(false);

  // 대기 신청 모달
  const [waitlistPlan, setWaitlistPlan] = useState<{ key: string; name: string } | null>(null);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);

  const [hospitalCount, setHospitalCount] = useState<number | null>(null);

  // 요금제 추천 퀴즈
  const [showFinder, setShowFinder] = useState(false);
  const [finderStep, setFinderStep] = useState(0);
  const [finderAnswers, setFinderAnswers] = useState<string[]>([]);
  const [finderResult, setFinderResult] = useState<string | null>(null);

  const getFinderRecommendation = (answers: string[]): string => {
    const [surgeries, team, feature] = answers;
    if (surgeries === 'over30' || team === '6plus' || feature === 'ai') return 'Business';
    if (surgeries === '15to30' || team === '4to5' || feature === 'alert') return 'Plus';
    if (surgeries === '5to15' || team === '2to3' || feature === 'analysis') return 'Basic';
    return 'Free';
  };

  const handleFinderAnswer = (value: string) => {
    const next = [...finderAnswers, value];
    if (finderStep < 2) {
      setFinderAnswers(next);
      setFinderStep(finderStep + 1);
    } else {
      setFinderAnswers(next);
      setFinderResult(getFinderRecommendation(next));
    }
  };

  const resetFinder = () => {
    setFinderStep(0);
    setFinderAnswers([]);
    setFinderResult(null);
  };

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const loadAvailability = () => {
    setAvailabilityError(false);
    planService.getPlanAvailability()
      .then(av => setPlanAvailability(av))
      .catch(() => setAvailabilityError(true));
  };
  useEffect(() => { loadAvailability(); }, []);

  // 대기신청 모달 오픈 계측
  useEffect(() => {
    if (waitlistPlan) {
      pageViewService.trackEvent('pricing_waitlist_modal_open', { plan: waitlistPlan.key }, 'pricing');
    }
  }, [waitlistPlan]);

  // 결제 모달 오픈 계측 — selectedPlan 변경 시에만 발화
  // (isYearly를 deps에 포함하면 월/연 토글마다 중복 발화하므로 제외)
  useEffect(() => {
    if (!selectedPlan || selectedPlan === 'free') return;
    pageViewService.trackEvent(
      'pricing_payment_modal_open',
      { plan: selectedPlan, billing_cycle: isYearly ? 'yearly' : 'monthly' },
      'pricing',
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlan]);

  const handleWaitlistSubmit = async () => {
    if (!waitlistPlan || !waitlistEmail.trim() || !waitlistName.trim()) return;
    setWaitlistSubmitting(true);
    pageViewService.trackEvent('pricing_waitlist_submit_start', { plan: waitlistPlan.key }, 'pricing');
    pageViewService.trackEvent('waitlist_submit_start', { plan: waitlistPlan.key, source: 'pricing' }, 'pricing');
    try {
      await contactService.submit({
        hospital_name: '-',
        contact_name: waitlistName.trim(),
        email: waitlistEmail.trim(),
        phone: '-',
        weekly_surgeries: '-',
        inquiry_type: `plan_waitlist_${waitlistPlan.key}`,
        content: `${waitlistPlan.name} 플랜 대기 신청`,
      });
      pageViewService.trackEvent('pricing_waitlist_submit_success', { plan: waitlistPlan.key }, 'pricing');
      pageViewService.trackEvent('waitlist_submit', { plan: waitlistPlan.key, source: 'pricing' }, 'pricing');
      setWaitlistPlan(null);
      setWaitlistName('');
      setWaitlistEmail('');
      showToast('대기 신청이 완료되었습니다. 자리가 나면 가장 먼저 연락드릴게요!', 'success');
    } catch (error) {
      pageViewService.trackEvent('pricing_waitlist_submit_error', { plan: waitlistPlan.key }, 'pricing');
      pageViewService.trackEvent('waitlist_submit_error', { plan: waitlistPlan.key, source: 'pricing' }, 'pricing');
      const message =
        error instanceof Error && error.message
          ? error.message
          : '대기 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      showToast(message, 'error');
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  const resetPaymentForm = useCallback(() => {
    setSelectedPlan(null);
    setContactName(userName || '');
    setContactPhone(userPhone || '');
    setPaymentMethod('card');
    setReceiptType('cash_receipt');
    setPaymentRequestError(null);
  }, [userName, userPhone]);

  const handleRecommendAlternativePlan = useCallback(() => {
    setSelectedPlan(null);
    setFinderResult('Free');
    window.setTimeout(() => {
      document.getElementById('plan-free')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, []);

  const handleTrialConfirm = useCallback((planKey: PlanType) => {
    setTrialConsentPlan(null);
    onGetStarted(planKey);
  }, [onGetStarted]);

  const handlePaymentSubmit = useCallback(async () => {
    if (!selectedPlan || selectedPlan === 'free') return;
    if (!contactName.trim() || !contactPhone.trim()) {
      showToast('담당자 이름과 연락처를 모두 입력해주세요.', 'error');
      return;
    }

    pageViewService.trackEvent(
      'pricing_payment_request_start',
      { plan: selectedPlan, billing_cycle: isYearly ? 'yearly' : 'monthly', payment_method: paymentMethod },
      'pricing',
    );
    setIsSubmitting(true);
    setPaymentRequestError(null);
    try {
      if (onRequestPayment) {
        const ok = await onRequestPayment(
          selectedPlan,
          isYearly ? 'yearly' : 'monthly',
          contactName.trim(),
          contactPhone.trim(),
          paymentMethod,
          paymentMethod === 'transfer' ? receiptType : undefined,
        );
        if (ok) {
          pageViewService.trackEvent(
            'pricing_payment_request_success',
            { plan: selectedPlan, billing_cycle: isYearly ? 'yearly' : 'monthly', payment_method: paymentMethod },
            'pricing',
          );
          resetPaymentForm();
        } else {
          pageViewService.trackEvent(
            'pricing_payment_request_error',
            {
              plan: selectedPlan,
              billing_cycle: isYearly ? 'yearly' : 'monthly',
              payment_method: paymentMethod,
              reason: 'request_rejected',
            },
            'pricing',
          );
          setPaymentRequestError('결제 요청이 접수되지 않았습니다. 도입 상담 또는 다른 플랜으로 먼저 시작하실 수 있습니다.');
        }
      } else if (onSelectPlan) {
        onSelectPlan(selectedPlan, isYearly ? 'yearly' : 'monthly');
        pageViewService.trackEvent(
          'pricing_payment_request_success',
          { plan: selectedPlan, billing_cycle: isYearly ? 'yearly' : 'monthly', payment_method: paymentMethod, via: 'plan_select' },
          'pricing',
        );
        resetPaymentForm();
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : '결제 요청 중 오류가 발생했습니다.';
      showToast(errMsg, 'error');
      pageViewService.trackEvent(
        'pricing_payment_request_error',
        {
          plan: selectedPlan,
          billing_cycle: isYearly ? 'yearly' : 'monthly',
          payment_method: paymentMethod,
          reason: 'exception',
        },
        'pricing',
      );
      setPaymentRequestError(errMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    contactName,
    contactPhone,
    isYearly,
    onRequestPayment,
    onSelectPlan,
    paymentMethod,
    receiptType,
    resetPaymentForm,
    selectedPlan,
    showToast,
  ]);

  useEffect(() => {
    supabase.from('hospitals').select('id', { count: 'exact', head: true })
      .then(({ count }) => { if (count !== null) setHospitalCount(count); }, () => { });
  }, []);

  const planNames = ['Free', 'Basic', 'Plus', 'Business'];

  return {
    isYearly, setIsYearly,
    openFaq, setOpenFaq,
    selectedPlan, setSelectedPlan,
    contactName, setContactName,
    contactPhone, setContactPhone,
    paymentMethod, setPaymentMethod,
    receiptType, setReceiptType,
    isSubmitting,
    paymentRequestError, setPaymentRequestError,
    toast, showToast,
    trialConsentPlan, setTrialConsentPlan,
    trialConsented, setTrialConsented,
    planAvailability,
    availabilityError,
    loadAvailability,
    waitlistPlan, setWaitlistPlan,
    waitlistName, setWaitlistName,
    waitlistEmail, setWaitlistEmail,
    waitlistSubmitting,
    hospitalCount,
    showFinder, setShowFinder,
    finderStep, setFinderStep,
    finderAnswers, setFinderAnswers,
    finderResult, setFinderResult,
    handleFinderAnswer,
    resetFinder,
    handleWaitlistSubmit,
    resetPaymentForm,
    handleRecommendAlternativePlan,
    handleTrialConfirm,
    handlePaymentSubmit,
    planNames,
  };
}
