
import React, { useCallback, useEffect, useState } from 'react';
import { PlanType, BillingCycle, DbBillingHistory, PLAN_NAMES, PLAN_PRICING } from '../types';
import { useToast } from '../hooks/useToast';
import { planService } from '../services/planService';
import { supabase } from '../services/supabaseClient';
import { contactService } from '../services/contactService';
import { pageViewService } from '../services/pageViewService';
import PricingPaymentModal from './pricing/PricingPaymentModal';
import PricingTrialConsentModal from './pricing/PricingTrialConsentModal';
import PricingWaitlistModal from './pricing/PricingWaitlistModal';
import SectionNavigator from './SectionNavigator';
import PublicInfoFooter from './shared/PublicInfoFooter';
import {
  SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT,
  TRIAL_OFFER_LABEL,
  TRIAL_DATA_DELETION_POLICY_TEXT,
} from '../utils/trialPolicy';

interface PricingPageProps {
  onGetStarted: (plan?: PlanType) => void;
  currentPlan?: PlanType;
  isLoggedIn?: boolean;
  hospitalName?: string;
  userName?: string;
  userPhone?: string;
  onSelectPlan?: (plan: PlanType, billing: BillingCycle) => void;
  onRequestPayment?: (plan: PlanType, billing: BillingCycle, contactName: string, contactPhone: string, paymentMethod: 'card' | 'transfer', receiptType?: 'cash_receipt' | 'tax_invoice') => Promise<boolean>;
  pendingPayment?: DbBillingHistory | null;
  onCancelPayment?: (billingId: string) => void;
  daysUntilExpiry?: number;
  onContact?: () => void;
  onGoToValue?: () => void;
}

interface Plan {
  name: string;
  description: string;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  highlight: boolean;
  cta: string;
  features: string[];
  limit: number;
  tag?: string;
}

const plans: Plan[] = [
  {
    name: 'Free',
    description: '소규모 치과를 위한 기본 플랜',
    monthlyPrice: 0,
    yearlyPrice: 0,
    highlight: false,
    cta: '무료로 시작하기',
    limit: 100,
    features: [
      '재고 품목 최대 100개',
      '수술 기록 3개월 보관',
      '수술기록 월 1회 업로드',
      '기본 재고 현황 대시보드',
      '엑셀 업로드/다운로드',
      '1명 사용자',
    ],
  },
  {
    name: 'Basic',
    description: '개인 사용자를 위한 합리적 플랜',
    monthlyPrice: 29000,
    yearlyPrice: 23000,
    highlight: false,
    cta: TRIAL_OFFER_LABEL,
    limit: 80,
    tag: '개인용',
    features: [
      '재고 품목 최대 200개',
      '수술 기록 6개월 보관',
      '수술기록 상시 업로드',
      '기본 재고 현황 대시보드',
      '브랜드별 소모량 분석',
      '1명 사용자',
    ],
  },
  {
    name: 'Plus',
    description: '성장하는 치과를 위한 추천 플랜',
    monthlyPrice: 69000,
    yearlyPrice: 55000,
    highlight: true,
    cta: TRIAL_OFFER_LABEL,
    limit: 50,
    tag: '치과의원',
    features: [
      '재고 품목 최대 500개',
      '수술 기록 12개월 보관',
      '수술기록 상시 업로드',
      '고급 분석 대시보드',
      '자동 재고 알림',
      '브랜드별 소모량 분석',
      '최대 5명 사용자',
      '이메일 지원',
    ],
  },
  {
    name: 'Business',
    description: '대형 치과 및 네트워크를 위한 플랜',
    monthlyPrice: 129000,
    yearlyPrice: 103000,
    highlight: false,
    cta: TRIAL_OFFER_LABEL,
    limit: 20,
    tag: '치과의원, 치과병원',
    features: [
      '재고 품목 무제한',
      '수술 기록 24개월 보관',
      '수술기록 상시 업로드',
      'AI 기반 수요 예측',
      '원클릭 발주 시스템',
      '거래처 관리',
      '사용자 무제한',
      '우선 지원 (채팅 + 전화)',
    ],
  },
];

const comparisonCategories = [
  {
    name: '기본 기능',
    features: [
      { label: '재고 품목 수', values: ['100개', '200개', '500개', '무제한'] },
      { label: '수술 기록 보관', values: ['3개월', '6개월', '12개월', '24개월'] },
      { label: '수술기록 업로드', desc: '수술기록 엑셀 업로드 빈도 제한', values: ['월 1회', '상시', '상시', '상시'] },
      { label: '엑셀 업로드/다운로드', values: [true, true, true, true] },
      { label: '대시보드', values: ['기본', '기본', '고급', '고급'] },
    ],
  },
  {
    name: '재고 관리',
    features: [
      { label: '실시간 재고 현황', values: [true, true, true, true] },
      { label: '자동 재고 알림', values: [false, false, true, true] },
      { label: '거래처 관리', desc: '자동 발주를 위한 거래처 정보 및 연락처 관리', values: [false, false, false, true] },
      { label: '원클릭 발주 시스템', values: [false, false, false, true] },
      { label: 'AI 수요 예측', values: [false, false, false, true] },
    ],
  },
  {
    name: '데이터 분석',
    features: [
      { label: '브랜드별 소모량 분석', values: [true, true, true, true] },
      { label: '월간 리포트', values: [false, false, true, true] },
      { label: '연간 리포트', values: [false, false, false, true] },
    ],
  },
  {
    name: '협업',
    features: [
      { label: '사용자 수', values: ['1명', '3명', '5명', '무제한'] },
      { label: '역할별 권한 관리', desc: '원장/매니저/스탭 등 역할에 따라 메뉴 접근 및 데이터 수정 권한을 구분', values: [false, false, true, true] },
    ],
  },
  {
    name: '보안',
    features: [
      { label: '데이터 암호화', values: [true, true, true, true] },
      { label: '감사 로그', values: [false, false, false, true] },
    ],
  },
  {
    name: '지원',
    features: [
      { label: '커뮤니티 지원', values: [true, true, true, true] },
      { label: '이메일 지원', values: [false, false, true, true] },
      { label: '우선 지원 (채팅 + 전화)', values: [false, false, false, true] },
    ],
  },
];

const faqs = [
  {
    q: '무료 플랜에서 유료 플랜으로 업그레이드하면 데이터가 유지되나요?',
    a: '네, 기존 데이터는 모두 그대로 유지됩니다. 업그레이드 즉시 추가 기능을 사용하실 수 있습니다.',
  },
  {
    q: `${TRIAL_OFFER_LABEL} 기간 중 결제가 되나요?`,
    a: '아닙니다. 체험 기간 동안은 결제가 발생하지 않으며, 체험 종료 후 유료 전환 의사를 확인한 뒤에만 결제가 진행됩니다. 카드 정보 없이도 체험 가능합니다.',
  },
  {
    q: '연간 결제 시 할인 혜택이 있나요?',
    a: '네, 연간 결제 시 월 결제 대비 약 20% 할인된 가격으로 이용 가능합니다. Plus 플랜 기준 월 69,000원에서 55,000원으로 할인됩니다.',
  },
  {
    q: '개인용과 의원/병원용의 차이는 무엇인가요?',
    a: '개인용(Basic)은 1인 원장님이나 전담 실장님 등 개인 사용자를 위한 플랜으로, 기본 대시보드와 브랜드별 분석, 상시 업로드를 제공합니다. 의원/병원용(Plus/Business)은 다수의 구성원이 함께 쓰는 플랜으로 고급 분석 대시보드, 자동 재고 알림, 역할별 권한 관리 등 확장된 협업 기능이 포함됩니다.',
  },
  {
    q: '어떤 청구 프로그램을 지원하나요?',
    a: '현재는 덴트웹(DentWeb)에서 내보낸 엑셀 파일만 지원합니다. 원클릭 등 다른 청구 프로그램은 추후 업데이트를 통해 지원할 예정입니다.',
  },
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '사용 일수에 비례하여 환불 처리됩니다. 연간 결제도 잔여 일수 기준으로 환불 가능하며, 환불 이후에는 Free 플랜 정책(한도 초과 데이터 읽기 전용)에 따라 서비스가 전환됩니다.',
  },
  {
    q: '결제 기간이 만료되어 갱신하지 못하면 어떻게 되나요?',
    a: '결제 만료 시 즉시 Free 플랜으로 전환됩니다. 기존 데이터는 모두 보존되지만, Free 한도(100개)를 초과하는 재고 데이터는 읽기 전용이 됩니다. 언제든 재결제하시면 모든 기능이 즉시 복원됩니다.',
  },
  {
    q: '데이터 보안과 개인정보는 어떻게 관리되나요?',
    a: '모든 데이터는 AES-256 암호화되어 안전하게 저장되며, 개인정보보호법에 따라 처리됩니다. 수술 기록에 포함된 환자 정보는 암호화된 상태로 보관되며, 2년 경과 후 자동 파기됩니다.',
  },
  {
    q: '어떤 결제 수단을 지원하나요?',
    a: '신용카드, 체크카드, 계좌이체를 지원합니다. 월간·연간 결제 모두 세금계산서 발행이 가능합니다.',
  },
  {
    q: '사용자 추가나 변경은 어떻게 하나요?',
    a: 'Plus 플랜은 최대 5명, Business 플랜은 무제한으로 사용자를 추가할 수 있습니다. 관리자 계정에서 사용자 초대 및 권한 설정이 가능하며, 언제든 변경하실 수 있습니다.',
  },
];

const formatPrice = (price: number) => {
  return price.toLocaleString('ko-KR');
};

const CheckIcon = () => (
  <svg className="w-5 h-5 text-indigo-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon = () => (
  <svg className="w-5 h-5 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const PricingPage: React.FC<PricingPageProps> = ({ onGetStarted, currentPlan, isLoggedIn, hospitalName, userName, userPhone, onSelectPlan, onRequestPayment, pendingPayment, onCancelPayment, daysUntilExpiry, onContact, onGoToValue }) => {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [contactName, setContactName] = useState(userName || '');
  const [contactPhone, setContactPhone] = useState(userPhone || '');
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

  const finderQuestions = [
    {
      q: '주간 임플란트 수술 건수는?',
      options: [
        { label: '주 5건 미만', value: 'under5', sub: '소규모 치과' },
        { label: '주 5~15건', value: '5to15', sub: '일반 규모' },
        { label: '주 15~30건', value: '15to30', sub: '활발한 치과' },
        { label: '주 30건 이상', value: 'over30', sub: '대형 치과' },
      ],
    },
    {
      q: '함께 사용하는 팀 규모는?',
      options: [
        { label: '나 혼자', value: '1', sub: '개인 사용' },
        { label: '2~3명', value: '2to3', sub: '소규모 팀' },
        { label: '4~5명', value: '4to5', sub: '중규모 팀' },
        { label: '6명 이상', value: '6plus', sub: '대규모 팀' },
      ],
    },
    {
      q: '가장 필요한 기능은?',
      options: [
        { label: '기본 재고 관리', value: 'basic', sub: '품목 등록·조회' },
        { label: '브랜드별 분석', value: 'analysis', sub: '소모 패턴 파악' },
        { label: '자동 재고 알림', value: 'alert', sub: '부족 알림·월간 리포트' },
        { label: 'AI 발주 자동화', value: 'ai', sub: '원클릭 발주·AI 예측' },
      ],
    },
  ];

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

  const planResultColors: Record<string, { bg: string; border: string; badge: string; text: string }> = {
    Free: { bg: 'bg-slate-50', border: 'border-slate-200', badge: 'bg-slate-100 text-slate-700', text: 'text-slate-700' },
    Basic: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700', text: 'text-blue-700' },
    Plus: { bg: 'bg-indigo-50', border: 'border-indigo-300', badge: 'bg-indigo-600 text-white', text: 'text-indigo-700' },
    Business: { bg: 'bg-purple-50', border: 'border-purple-300', badge: 'bg-purple-600 text-white', text: 'text-purple-700' },
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

  // 결제 모달 오픈 계측
  useEffect(() => {
    if (!selectedPlan || selectedPlan === 'free') return;
    pageViewService.trackEvent(
      'pricing_payment_modal_open',
      { plan: selectedPlan, billing_cycle: isYearly ? 'yearly' : 'monthly' },
      'pricing',
    );
  }, [isYearly, selectedPlan]);

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
    } catch {
      showToast('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
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
      setPaymentRequestError('결제 요청 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 도입 상담으로 전환해 주세요.');
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

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      <SectionNavigator sections={[
        { id: 'pp-hero', label: '소개' },
        { id: 'pp-plans', label: '요금제' },
        { id: 'pp-compare', label: '비교' },
        { id: 'pp-faq', label: 'FAQ' },
      ]} />

      {/* Payment Pending Banner */}
      {pendingPayment && (
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-sm font-bold text-amber-800">
                {pendingPayment.plan.toUpperCase()} 플랜 결제 대기 중
              </span>
              <span className="text-xs text-amber-600">
                ({new Date(pendingPayment.created_at).toLocaleDateString('ko-KR')} 요청)
              </span>
            </div>
            {onCancelPayment && (
              <button
                onClick={() => onCancelPayment(pendingPayment.id)}
                className="text-xs text-amber-600 hover:text-amber-800 font-bold underline"
              >
                결제 취소
              </button>
            )}
          </div>
        </div>
      )}

      {/* Expiry Warning Banner */}
      {daysUntilExpiry !== undefined && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && currentPlan !== 'free' && (
        <div className="bg-rose-50 border-b border-rose-200 px-6 py-3">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span className="text-sm font-bold text-rose-700">
              플랜 만료까지 {daysUntilExpiry}일 남았습니다. 갱신하지 않으면 Free 플랜으로 전환됩니다.
            </span>
          </div>
        </div>
      )}

      {/* Hero — 손실 회피 + 앵커링 */}
      <section id="pp-hero" className="pt-24 pb-10 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-50"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-50"></div>
        </div>
        <div className="max-w-3xl mx-auto px-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            {/* 사회적 증명 배지 — 30곳 이상일 때만 표시 */}
            {hospitalCount !== null && hospitalCount >= 30 && (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-bold text-emerald-700">{hospitalCount}곳의 치과에서 사용 중</span>
              </div>
            )}

            {/* 손실 회피: 지금 손해를 먼저 보여주기 */}
            <div className="bg-rose-50 border border-rose-200 rounded-2xl px-6 py-4">
              <p className="text-sm font-bold text-rose-700">
                💸 엑셀 재고 관리를 계속하면 매달 <span className="text-rose-600 text-base">최소 12만원</span> 이상 손해보고 계신 겁니다
              </p>
              <p className="text-xs text-rose-400 mt-1">직원 시급 15,000원 × 월 8시간 엑셀 작업 기준</p>
            </div>
          </div>

          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 mb-5 leading-tight">
            그 비용의 <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 animate-pulse-glow">4분의 1</span>로<br />
            전부 해결하세요
          </h1>
          <p className="text-base md:text-lg text-slate-500 max-w-xl mx-auto leading-relaxed mb-3">
            월 29,000원 — <strong className="text-slate-700">하루 967원</strong>이면 충분합니다.
          </p>
          {/* 앵커링: 일 단위 프레이밍 */}
          <p className="text-xs text-slate-400 mb-8 font-medium">자판기 음료 한 캔보다 저렴한 금액으로 재고 관리의 모든 고민을 해결하세요</p>

          {/* 도입효과 보기 버튼 */}
          <div className="relative group inline-block">
            <div className="absolute -inset-1 bg-gradient-to-r from-slate-400 to-slate-300 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
            <button
              onClick={() => onGoToValue?.()}
              className="relative inline-flex items-center gap-2 px-7 py-3.5 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-xl hover:-translate-y-1 active:scale-95 overflow-hidden z-10"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              도입효과 보기
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* 사회적 증명 + 제로 리스크 배너 */}
      <section className="max-w-3xl mx-auto px-6 pb-10 w-full">
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: '🛡️', title: TRIAL_OFFER_LABEL, desc: '카드 등록 없이\n체험 후 결정' },
            { icon: '🔓', title: '언제든 해지', desc: '약정·위약금 없음\n즉시 해지 가능' },
            { icon: '💾', title: '구독 시 데이터 유지', desc: '유료 해지 후 Free 전환 시\n기존 데이터 유지' },
          ].map((item, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-xl p-4 text-center shadow-sm">
              <div className="text-xl mb-1.5">{item.icon}</div>
              <p className="text-xs font-black text-slate-800 mb-1">{item.title}</p>
              <p className="text-xs text-slate-400 whitespace-pre-line leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          <p className="text-[11px] text-slate-500">* {TRIAL_DATA_DELETION_POLICY_TEXT}</p>
          <p className="text-[11px] text-slate-500">{SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT}</p>
        </div>
      </section>

      {/* Plan Finder */}
      <div className="max-w-2xl mx-auto px-6 pb-10 w-full">
        {!showFinder ? (
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-1000 animate-pulse-glow z-0"></div>
            <button
              onClick={() => setShowFinder(true)}
              className="w-full relative overflow-hidden rounded-2xl group transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-300 z-10"
            >
              {/* 그라디언트 배경 */}
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700" />
              {/* 반짝이는 shine 효과 */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-transparent via-white/10 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[200%] transition-transform duration-700" />

              <div className="relative px-6 py-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    🎯
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-base font-black text-white">나에게 맞는 요금제 찾기</p>
                      <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">30초</span>
                    </div>
                    <p className="text-xs text-indigo-200">3가지 질문만 답하면 딱 맞는 플랜을 추천해드려요</p>
                    {/* 플랜 미리보기 도트 */}
                    <div className="flex items-center gap-1.5 mt-2">
                      {['Free', 'Basic', 'Plus', 'Business'].map((p) => (
                        <span key={p} className="text-[10px] text-white/60 bg-white/10 px-2 py-0.5 rounded-full">{p}</span>
                      ))}
                      <span className="text-[10px] text-indigo-300">중 추천</span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <svg className="w-4 h-4 text-white group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          </div>
        ) : (
          <div className="bg-white border border-indigo-100 rounded-2xl p-6 shadow-lg shadow-indigo-50">
            {finderResult ? (
              // 결과 화면
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xl">✨</span>
                  <p className="text-sm font-black text-slate-800">추천 플랜이 나왔어요!</p>
                </div>
                {(() => {
                  const c = planResultColors[finderResult];
                  const plan = plans.find(p => p.name === finderResult)!;
                  const price = plan.monthlyPrice;
                  return (
                    <div className={`${c.bg} ${c.border} border rounded-xl p-5 mb-4`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-black px-2.5 py-1 rounded-full ${c.badge}`}>{finderResult}</span>
                          <span className={`text-sm font-bold ${c.text}`}>{plan.description}</span>
                        </div>
                        <span className="text-lg font-black text-slate-900">
                          {price === 0 ? '무료' : `${formatPrice(price!)}원/월`}
                        </span>
                      </div>
                      <ul className="space-y-1.5">
                        {plan.features.slice(0, 4).map((f, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-slate-600">
                            <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                            </svg>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      resetFinder();
                      setShowFinder(false);
                      // 해당 플랜으로 스크롤
                      setTimeout(() => {
                        document.getElementById(`plan-${finderResult.toLowerCase()}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }, 100);
                    }}
                    className="flex-1 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-colors text-sm"
                  >
                    {finderResult} 플랜 자세히 보기
                  </button>
                  <button onClick={resetFinder} className="px-4 py-2.5 text-sm text-slate-400 hover:text-slate-600 border border-slate-200 rounded-xl transition-colors">
                    다시 하기
                  </button>
                </div>
              </div>
            ) : (
              // 질문 화면
              <div>
                {/* 진행 표시 */}
                <div className="flex items-center gap-2 mb-5">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= finderStep ? 'bg-indigo-500' : 'bg-slate-100'}`} />
                  ))}
                  <span className="text-xs text-slate-400 ml-1">{finderStep + 1}/3</span>
                </div>
                <p className="text-sm font-black text-slate-800 mb-4">{finderQuestions[finderStep].q}</p>
                <div className="grid grid-cols-2 gap-2">
                  {finderQuestions[finderStep].options.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleFinderAnswer(opt.value)}
                      className="flex flex-col items-start p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all text-left group"
                    >
                      <span className="text-sm font-bold text-slate-800 group-hover:text-indigo-700">{opt.label}</span>
                      <span className="text-xs text-slate-400 mt-0.5">{opt.sub}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => { resetFinder(); setShowFinder(false); }} className="mt-4 w-full text-xs text-slate-300 hover:text-slate-500 transition-colors">
                  닫기
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Billing Toggle */}
      <div id="pp-plans" className="flex justify-center items-center gap-4 pb-12">
        <span className={`text-sm font-bold ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>월간 결제</span>
        <button
          type="button"
          onClick={() => setIsYearly(!isYearly)}
          role="switch"
          aria-checked={isYearly}
          aria-label="연간 결제 전환"
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isYearly ? 'bg-indigo-600' : 'bg-slate-300'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isYearly ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-bold ${isYearly ? 'text-slate-900' : 'text-slate-400'}`}>
          연간 결제
        </span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors duration-300 ${isYearly ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-50 border-slate-200'
          }`}>
          20% 할인
        </span>
      </div>

      {/* 가용성 조회 실패 배너 */}
      {availabilityError && (
        <div className="max-w-2xl mx-auto px-6 pb-4 w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-center gap-2 text-sm text-amber-700">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span>플랜 가용성 확인이 지연되고 있습니다. 실제 신청 가능 여부와 다를 수 있어요.</span>
            </div>
            <div className="flex items-center gap-3 self-end sm:self-auto">
              <button onClick={loadAvailability} className="text-xs font-bold text-amber-700 hover:text-amber-900 whitespace-nowrap underline">
                다시 시도
              </button>
              {onContact && (
                <button
                  onClick={onContact}
                  className="text-xs font-bold text-amber-700 hover:text-amber-900 whitespace-nowrap underline"
                >
                  문의하기
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Plan Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const planKey = plan.name.toLowerCase() as PlanType;
            const isSoldOut = planAvailability[planKey] === false;
            return (
              <div key={plan.name} className="relative h-full flex flex-col group">
                {plan.highlight && !isSoldOut && (
                  <div className="absolute -inset-0.5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-3xl blur opacity-30 group-hover:opacity-60 transition duration-1000 animate-pulse-glow z-0"></div>
                )}
                <div
                  id={`plan-${planKey}`}
                  className={`relative rounded-3xl p-7 flex flex-col h-full transition-all duration-300 z-10 ${isSoldOut
                    ? 'bg-slate-50 border-2 border-dashed border-slate-200 opacity-80'
                    : plan.highlight
                      ? 'bg-gradient-to-b from-indigo-600 to-indigo-700 text-white shadow-2xl scale-[1.02] border border-indigo-400/50 hover:scale-[1.04]'
                      : finderResult === plan.name
                        ? 'bg-white border-2 border-indigo-400 shadow-xl ring-2 ring-indigo-200'
                        : 'bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-indigo-200 hover:shadow-indigo-100'
                    }`}
                >
                  {isSoldOut && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-rose-500 text-white text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                        품절
                      </span>
                    </div>
                  )}
                  {!isSoldOut && plan.highlight && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 flex flex-col items-center">
                      <span className="absolute -inset-1 bg-amber-400 rounded-full blur opacity-40 animate-pulse-glow z-0"></span>
                      <span className="bg-gradient-to-r from-amber-300 to-yellow-400 text-yellow-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg relative z-10 border border-yellow-200/50">
                        추천 플랜
                      </span>
                    </div>
                  )}
                  {isLoggedIn && currentPlan === plan.name.toLowerCase() && (
                    <div className="absolute -top-3.5 right-4">
                      <span className="bg-emerald-500 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg">
                        현재
                      </span>
                    </div>
                  )}

                  <div className="mb-5">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3 className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {plan.name}
                      </h3>
                      {plan.tag && plan.tag.split(',').map((t, idx) => (
                        <span key={idx} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.highlight
                          ? 'bg-white/20 text-white'
                          : t.trim() === '개인용'
                            ? 'bg-teal-50 text-teal-600 border border-teal-200'
                            : 'bg-violet-50 text-violet-600 border border-violet-200'
                          }`}>
                          {t.trim()}
                        </span>
                      ))}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.highlight
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                        }`}>
                        한정 {plan.limit}곳
                      </span>
                    </div>
                    <p className={`text-xs whitespace-nowrap ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>
                      {plan.description}
                    </p>
                  </div>

                  <div className="mb-5 min-h-[72px]">
                    {price !== null ? (
                      <div className="flex items-end gap-1">
                        <span className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                          {formatPrice(price)}
                        </span>
                        <span className={`text-sm font-medium mb-0.5 ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>
                          원/월
                        </span>
                      </div>
                    ) : (
                      <div className={`text-3xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        별도 협의
                      </div>
                    )}
                    {isYearly && plan.monthlyPrice !== null && plan.monthlyPrice > 0 && (
                      <p className={`text-xs mt-1 ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>
                        월간 결제 시 {formatPrice(plan.monthlyPrice)}원/월
                      </p>
                    )}
                    {price !== null && price > 0 && (
                      <p className={`text-xs mt-0.5 ${plan.highlight ? 'text-indigo-300' : 'text-slate-400'}`}>
                        VAT 별도
                      </p>
                    )}
                  </div>

                  {isSoldOut ? (
                    <div className="mb-6 space-y-2">
                      <div className="w-full py-2.5 rounded-xl font-bold text-xs bg-rose-50 text-rose-500 border border-rose-200 text-center">
                        현재 수용 한도 도달
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            pageViewService.trackEvent('pricing_waitlist_button_click', { plan: planKey }, 'pricing');
                            setWaitlistPlan({ key: planKey, name: plan.name });
                          }}
                          className="w-full py-3 rounded-xl font-bold text-sm bg-slate-900 text-white hover:bg-slate-700 transition-colors shadow-sm"
                        >
                          대기 신청하기 →
                        </button>
                        {onContact && (
                          <button
                            type="button"
                            onClick={onContact}
                            className="w-full py-3 rounded-xl font-bold text-sm border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                          >
                            도입 상담하기
                          </button>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 text-center">자리가 나면 가장 먼저 안내해드려요</p>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (isLoggedIn && currentPlan === planKey) return;
                        pageViewService.trackEvent(
                          'pricing_plan_select',
                          {
                            plan: planKey,
                            billing_cycle: isYearly ? 'yearly' : 'monthly',
                            is_logged_in: Boolean(isLoggedIn),
                          },
                          'pricing',
                        );
                        if (isLoggedIn) {
                          if (planKey === 'free' && onSelectPlan) {
                            onSelectPlan(planKey, 'monthly');
                          } else {
                            setPaymentRequestError(null);
                            setSelectedPlan(planKey);
                          }
                        } else {
                          if (plan.cta === TRIAL_OFFER_LABEL) {
                            setTrialConsented(false);
                            setTrialConsentPlan({ key: planKey, name: plan.name });
                          } else {
                            onGetStarted(planKey);
                          }
                        }
                      }}
                      disabled={(isLoggedIn && currentPlan === planKey) || pendingPayment?.plan === planKey}
                      className={`relative w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 mb-6 overflow-hidden z-10 group/btn ${(isLoggedIn && currentPlan === planKey) || pendingPayment?.plan === planKey
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : plan.highlight
                          ? 'bg-white text-indigo-600 hover:text-indigo-700 hover:shadow-xl hover:shadow-white/20 active:scale-95 border border-transparent hover:border-indigo-100'
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md hover:shadow-xl active:scale-95'
                        }`}
                    >
                      {!((isLoggedIn && currentPlan === planKey) || pendingPayment?.plan === planKey) && (
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
                      )}
                      {isLoggedIn && currentPlan === planKey
                        ? '현재 플랜'
                        : pendingPayment?.plan === planKey
                          ? '결제 대기 중...'
                          : isLoggedIn && currentPlan && currentPlan !== 'free' && planKey === 'free'
                            ? '다운그레이드'
                            : plan.cta}
                    </button>
                  )}

                  <ul className="space-y-2.5 flex-1">
                    {plan.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2.5">
                        <svg
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-indigo-200' : 'text-indigo-600'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`text-sm leading-snug ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section id="pp-compare" className="py-24 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase mb-2">Compare Plans</h2>
            <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">상세 기능 비교</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-4 pr-6 w-[220px]"></th>
                  {planNames.map((name, i) => (
                    <th
                      key={name}
                      className={`text-center py-4 px-3 text-sm font-bold ${i === 2 ? 'text-indigo-600' : 'text-slate-700'
                        }`}
                    >
                      <div className="flex flex-col items-center gap-1">
                        <span>{name}</span>
                        {i === 1 && (
                          <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full border border-teal-200">팀용</span>
                        )}
                        {i === 2 && (
                          <span className="text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">추천</span>
                        )}
                        {i === 2 && (
                          <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200">치과의원</span>
                        )}
                        {i === 3 && (
                          <div className="flex gap-1">
                            <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200">치과의원</span>
                            <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200">치과병원</span>
                          </div>
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonCategories.map((cat) => (
                  <React.Fragment key={cat.name}>
                    <tr>
                      <td
                        colSpan={5}
                        className="pt-8 pb-3 text-sm font-bold text-slate-900 uppercase tracking-wider"
                      >
                        {cat.name}
                      </td>
                    </tr>
                    {cat.features.map((feat, fi) => (
                      <tr key={fi} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 pr-6">
                          <div className="text-sm text-slate-600">{feat.label}</div>
                          {'desc' in feat && feat.desc && (
                            <div className="text-xs text-slate-400 mt-0.5">{feat.desc}</div>
                          )}
                        </td>
                        {feat.values.map((val, vi) => (
                          <td key={vi} className="py-3.5 px-3 text-center">
                            {typeof val === 'boolean' ? (
                              val ? <span className="inline-flex justify-center"><CheckIcon /></span> : <span className="inline-flex justify-center"><XIcon /></span>
                            ) : (
                              <span className={`text-sm font-medium ${vi === 2 ? 'text-indigo-600' : 'text-slate-700'}`}>
                                {val}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 실제 후기 — 사회적 증명 */}
      <section className="py-16 bg-white border-t border-slate-100">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest mb-8">도입한 치과들의 실제 반응</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { quote: '"덴트웹 데이터 정리에 매주 2시간씩 쓰던 게 사라졌어요. 재고 파악이 한눈에 되니까 발주 실수도 확 줄었습니다."', name: '김OO 원장', loc: '서울 · 치과의원', plan: 'Plus 사용 중' },
              { quote: '"여러 브랜드 재고를 한 곳에서 보니까 너무 편해요. 브랜드별로 소모 패턴이 달라서 발주 타이밍도 훨씬 정확해졌어요."', name: '이OO 실장', loc: '부산 · 치과의원', plan: 'Basic 사용 중' },
              { quote: '"솔직히 이 금액에 이 기능이면 안 쓸 이유가 없어요. 엑셀로 하루 걸리던 게 3초면 끝나거든요."', name: '최OO 원장', loc: '인천 · 치과의원', plan: 'Plus 사용 중' },
            ].map((t, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed mb-5">{t.quote}</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-xs">{t.name.charAt(0)}</div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.loc}</p>
                    </div>
                  </div>
                  <span className="text-xs bg-indigo-50 text-indigo-600 font-bold px-2.5 py-1 rounded-full">{t.plan}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-400">
            * 후기 내용은 사용자 공개 동의 기준으로 게시되며, 성과 표현은 병원별 운영 방식에 따라 달라질 수 있습니다.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="pp-faq" className="py-24 bg-slate-50">
        <div className="max-w-3xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase mb-2">FAQ</h2>
            <p className="text-3xl font-extrabold text-slate-900 sm:text-4xl">자주 묻는 질문</p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden transition-shadow hover:shadow-md"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  id={`pricing-faq-trigger-${i}`}
                  aria-expanded={openFaq === i}
                  aria-controls={`pricing-faq-panel-${i}`}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-sm font-bold text-slate-800 pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180' : ''
                      }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  id={`pricing-faq-panel-${i}`}
                  role="region"
                  aria-labelledby={`pricing-faq-trigger-${i}`}
                  className={`overflow-hidden transition-all duration-300 ${openFaq === i ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                  <p className="px-6 pb-6 text-sm text-slate-500 leading-relaxed">{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section id="pp-cta" className="py-20 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-4">임플란트 재고 관리,<br />지금 바로 시작하세요</h2>
          <p className="text-slate-400 text-lg mb-8">덴트웹 엑셀만 업로드하면 끝. 무료 플랜으로 부담 없이 체험해 보세요.</p>
          <button
            onClick={() => onGetStarted('free')}
            className="px-8 py-4 bg-white text-slate-900 text-lg font-bold rounded-2xl shadow-2xl hover:shadow-white/20 hover:-translate-y-1 transition-all duration-300"
          >
            무료로 시작하기
          </button>
        </div>
      </section>

      <PublicInfoFooter showLegalLinks />

      <PricingTrialConsentModal
        plan={trialConsentPlan}
        consented={trialConsented}
        onToggleConsented={setTrialConsented}
        onClose={() => setTrialConsentPlan(null)}
        onConfirm={handleTrialConfirm}
      />

      <PricingPaymentModal
        selectedPlan={selectedPlan}
        isYearly={isYearly}
        hospitalName={hospitalName}
        contactName={contactName}
        contactPhone={contactPhone}
        paymentMethod={paymentMethod}
        receiptType={receiptType}
        isSubmitting={isSubmitting}
        requestError={paymentRequestError}
        onDismiss={() => {
          setSelectedPlan(null);
          setPaymentRequestError(null);
        }}
        onCancel={resetPaymentForm}
        onContactNameChange={setContactName}
        onContactPhoneChange={setContactPhone}
        onPaymentMethodChange={setPaymentMethod}
        onReceiptTypeChange={setReceiptType}
        onSubmit={handlePaymentSubmit}
        onRequestConsultation={onContact}
        onRecommendAlternativePlan={handleRecommendAlternativePlan}
      />

      <PricingWaitlistModal
        plan={waitlistPlan}
        name={waitlistName}
        email={waitlistEmail}
        submitting={waitlistSubmitting}
        onClose={() => setWaitlistPlan(null)}
        onNameChange={setWaitlistName}
        onEmailChange={setWaitlistEmail}
        onSubmit={handleWaitlistSubmit}
      />

      {toast && (
        <div className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] xl:bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default PricingPage;
