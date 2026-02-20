
import React, { useState, useEffect } from 'react';
import { PlanType, BillingCycle, DbBillingHistory, PLAN_NAMES, PLAN_PRICING } from '../types';
import { useToast } from '../hooks/useToast';
import { planService } from '../services/planService';

interface PricingPageProps {
  onGetStarted: () => void;
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
    description: '소규모 팀을 위한 합리적 플랜',
    monthlyPrice: 29000,
    yearlyPrice: 23000,
    highlight: false,
    cta: '14일 무료 체험',
    limit: 80,
    tag: '팀용',
    features: [
      '재고 품목 최대 200개',
      '수술 기록 6개월 보관',
      '수술기록 상시 업로드',
      '기본 재고 현황 대시보드',
      '브랜드별 소모량 분석',
      '최대 3명 사용자',
    ],
  },
  {
    name: 'Plus',
    description: '성장하는 치과를 위한 추천 플랜',
    monthlyPrice: 69000,
    yearlyPrice: 55000,
    highlight: true,
    cta: '14일 무료 체험',
    limit: 50,
    tag: '기업용',
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
    cta: '14일 무료 체험',
    limit: 20,
    tag: '기업용',
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
    q: '14일 무료 체험 기간 중 결제가 되나요?',
    a: '아닙니다. 체험 기간 동안은 결제가 발생하지 않으며, 체험 종료 후 유료 전환 의사를 확인한 뒤에만 결제가 진행됩니다. 카드 정보 없이도 체험 가능합니다.',
  },
  {
    q: '연간 결제 시 할인 혜택이 있나요?',
    a: '네, 연간 결제 시 월 결제 대비 약 20% 할인된 가격으로 이용 가능합니다. Plus 플랜 기준 월 69,000원에서 55,000원으로 할인됩니다.',
  },
  {
    q: '팀용과 기업용의 차이는 무엇인가요?',
    a: '팀용(Basic)은 3명까지 사용 가능한 소규모 팀 플랜으로, 기본 대시보드와 브랜드별 분석, 상시 업로드를 제공합니다. 기업용(Plus/Business)은 고급 분석 대시보드, 자동 재고 알림, 역할별 권한 관리 등 확장된 협업 기능이 포함됩니다.',
  },
  {
    q: '어떤 청구 프로그램을 지원하나요?',
    a: '현재는 덴트웹(DentWeb)에서 내보낸 엑셀 파일만 지원합니다. 원클릭 등 다른 청구 프로그램은 추후 업데이트를 통해 지원할 예정입니다.',
  },
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '사용 일수에 비례하여 환불 처리됩니다. 연간 결제의 경우에도 잔여 일수에 비례하여 환불해 드립니다. 환불 시 기존 데이터는 모두 삭제되며 복구가 불가하오니 신중하게 결정해 주세요.',
  },
  {
    q: '결제 기간이 만료되어 갱신하지 못하면 어떻게 되나요?',
    a: '결제 만료 시 즉시 Free 플랜으로 전환됩니다. 기존 데이터는 모두 보존되지만, Free 한도(100개)를 초과하는 재고 데이터는 읽기 전용이 됩니다. 언제든 재결제하시면 모든 기능이 즉시 복원됩니다.',
  },
  {
    q: '데이터 보안과 개인정보는 어떻게 관리되나요?',
    a: '모든 데이터는 암호화되어 안전하게 저장되며, 개인정보보호법에 따라 처리됩니다. 환자 정보는 서버에 저장되지 않으며, 수술 기록과 재고 데이터만 관리합니다.',
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

const PricingPage: React.FC<PricingPageProps> = ({ onGetStarted, currentPlan, isLoggedIn, hospitalName, userName, userPhone, onSelectPlan, onRequestPayment, pendingPayment, onCancelPayment, daysUntilExpiry, onContact }) => {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
  const [contactName, setContactName] = useState(userName || '');
  const [contactPhone, setContactPhone] = useState(userPhone || '');
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [receiptType, setReceiptType] = useState<'cash_receipt' | 'tax_invoice'>('cash_receipt');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast, showToast } = useToast();

  // 비로그인 14일 무료 체험 동의 모달
  const [trialConsentPlan, setTrialConsentPlan] = useState<{ key: PlanType; name: string; features: string[] } | null>(null);
  const [trialConsented, setTrialConsented] = useState(false);
  const [planAvailability, setPlanAvailability] = useState<Record<string, boolean>>({});

  useEffect(() => { window.scrollTo(0, 0); }, []);
  useEffect(() => {
    planService.getPlanAvailability().then(av => setPlanAvailability(av)).catch(() => {});
  }, []);

  const planNames = ['Free', 'Basic', 'Plus', 'Business'];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
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

      {/* Hero */}
      <section className="pt-24 pb-12 text-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-50"></div>
          <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-100 rounded-full mix-blend-multiply filter blur-[100px] opacity-50"></div>
        </div>
        <div className="max-w-4xl mx-auto px-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 border border-indigo-100 mb-6">
            <span className="text-sm font-bold text-indigo-600">Pricing</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6 leading-tight">
            모든 치과를 위한<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">하나의 도구</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
            치과 규모에 맞는 요금제를 선택하세요.<br />
            모든 플랜은 핵심 기능을 포함하며, 언제든 업그레이드할 수 있습니다.
          </p>
        </div>
      </section>

      {/* Billing Toggle */}
      <div className="flex justify-center items-center gap-4 pb-12">
        <span className={`text-sm font-bold ${!isYearly ? 'text-slate-900' : 'text-slate-400'}`}>월간 결제</span>
        <button
          onClick={() => setIsYearly(!isYearly)}
          className={`relative w-14 h-7 rounded-full transition-colors duration-300 ${isYearly ? 'bg-indigo-600' : 'bg-slate-300'}`}
        >
          <div className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 ${isYearly ? 'translate-x-7' : 'translate-x-0'}`} />
        </button>
        <span className={`text-sm font-bold ${isYearly ? 'text-slate-900' : 'text-slate-400'}`}>
          연간 결제
        </span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border transition-colors duration-300 ${
          isYearly ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : 'text-slate-400 bg-slate-50 border-slate-200'
        }`}>
          20% 할인
        </span>
      </div>

      {/* Plan Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            const planKey = plan.name.toLowerCase() as PlanType;
            const isSoldOut = planAvailability[planKey] === false;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-7 flex flex-col h-full transition-all duration-300 ${
                  isSoldOut
                    ? 'bg-slate-50 border-2 border-dashed border-slate-200 opacity-80'
                    : plan.highlight
                      ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02] ring-2 ring-indigo-600 hover:scale-[1.05] hover:shadow-3xl'
                      : 'bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-2 hover:border-indigo-300 hover:ring-1 hover:ring-indigo-200'
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
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                      추천
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
                    {plan.tag && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        plan.highlight
                          ? 'bg-white/20 text-white'
                          : plan.tag === '개인용'
                            ? 'bg-teal-50 text-teal-600 border border-teal-200'
                            : 'bg-violet-50 text-violet-600 border border-violet-200'
                      }`}>
                        {plan.tag}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      plan.highlight
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
                </div>

                {isSoldOut ? (
                  <div className="mb-6 space-y-2">
                    <div className="w-full py-3 rounded-xl font-bold text-sm bg-slate-100 text-slate-400 cursor-not-allowed text-center">
                      현재 가입 불가
                    </div>
                    <p className="text-xs text-slate-500 text-center leading-relaxed">
                      해당 플랜은 현재 수용 한도에 도달했습니다.<br />
                      <button type="button" onClick={() => onContact ? onContact() : undefined} className="text-indigo-500 font-bold hover:underline">문의하기</button>를 통해 대기 신청해 주세요.
                    </p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      if (isLoggedIn && currentPlan === planKey) return;
                      if (isLoggedIn) {
                        if (planKey === 'free' && onSelectPlan) {
                          onSelectPlan(planKey, 'monthly');
                        } else {
                          setSelectedPlan(planKey);
                        }
                      } else {
                        if (plan.cta === '14일 무료 체험') {
                          setTrialConsented(false);
                          setTrialConsentPlan({ key: planKey, name: plan.name, features: plan.features });
                        } else {
                          onGetStarted();
                        }
                      }
                    }}
                    disabled={(isLoggedIn && currentPlan === planKey) || pendingPayment?.plan === planKey}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 mb-6 ${
                      (isLoggedIn && currentPlan === planKey) || pendingPayment?.plan === planKey
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : plan.highlight
                          ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg'
                          : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                    }`}
                  >
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
            );
          })}
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-24 bg-white">
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
                      className={`text-center py-4 px-3 text-sm font-bold ${
                        i === 2 ? 'text-indigo-600' : 'text-slate-700'
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
                        {(i === 2 || i === 3) && (
                          <span className="text-[10px] bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full border border-violet-200">기업용</span>
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

      {/* FAQ Section */}
      <section className="py-24 bg-slate-50">
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
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="text-sm font-bold text-slate-800 pr-4">{faq.q}</span>
                  <svg
                    className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform duration-300 ${
                      openFaq === i ? 'rotate-180' : ''
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
                  className={`overflow-hidden transition-all duration-300 ${
                    openFaq === i ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'
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
      <section className="py-20 bg-slate-900 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="max-w-3xl mx-auto px-6 relative z-10">
          <h2 className="text-3xl md:text-4xl font-black mb-4">임플란트 재고 관리,<br />지금 바로 시작하세요</h2>
          <p className="text-slate-400 text-lg mb-8">덴트웹 엑셀만 업로드하면 끝. 무료 플랜으로 부담 없이 체험해 보세요.</p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-slate-900 text-lg font-bold rounded-2xl shadow-2xl hover:shadow-white/20 hover:-translate-y-1 transition-all duration-300"
          >
            무료로 시작하기
          </button>
        </div>
      </section>

      {/* Footer - 기업정보 */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 px-6">
        <div className="max-w-4xl mx-auto text-xs text-slate-400 leading-relaxed">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-500 mb-1">디앤조이(DenJOY)</p>
              <p>대표: 맹준호 | 사업자등록번호: 528-22-01076</p>
              <p>이메일: admin@denjoy.info</p>
            </div>
            <p className="md:text-right text-slate-300">&copy; {new Date().getFullYear()} DenJOY. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 14일 무료 체험 동의 모달 */}
      {trialConsentPlan && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => setTrialConsentPlan(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{trialConsentPlan.name}</span>
                <span className="text-indigo-200 text-xs">플랜</span>
              </div>
              <h3 className="text-lg font-bold">14일 무료 체험 시작</h3>
              <p className="text-indigo-200 text-sm mt-0.5">카드 정보 없이 바로 체험할 수 있습니다</p>
            </div>

            <div className="p-6 space-y-5">
              {/* 선택 플랜 기능 목록 */}
              <div className="bg-indigo-50 rounded-xl p-4">
                <p className="text-xs font-bold text-indigo-700 mb-2.5 uppercase tracking-wider">체험 기간 중 이용 가능한 기능</p>
                <ul className="space-y-1.5">
                  {trialConsentPlan.features.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-700">
                      <svg className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 데이터 삭제 경고 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-amber-700">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="text-sm font-bold">체험 종료 후 안내</span>
                </div>
                <ul className="space-y-1 text-xs text-amber-700 pl-6 list-disc">
                  <li>14일 무료 체험이 종료됩니다.</li>
                  <li>종료 후 <strong>15일 이내에 유료 구독을 시작하지 않으면</strong>, 업로드하신 모든 데이터(재고, 수술기록 등)가 자동으로 삭제됩니다.</li>
                  <li>구독 시작 시 데이터는 그대로 유지됩니다.</li>
                </ul>
              </div>

              {/* 동의 체크박스 */}
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={trialConsented}
                  onChange={e => setTrialConsented(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <span className="text-sm text-slate-700 leading-relaxed">
                  위 내용을 확인하였으며, 체험 종료 후 미구독 시 데이터가 삭제될 수 있음에 동의합니다.
                </span>
              </label>

              {/* 버튼 */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setTrialConsentPlan(null)}
                  className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors"
                >
                  취소
                </button>
                <button
                  disabled={!trialConsented}
                  onClick={() => {
                    if (!trialConsented) return;
                    localStorage.setItem('denjoy_pending_trial', trialConsentPlan.key);
                    setTrialConsentPlan(null);
                    onGetStarted();
                  }}
                  className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                    trialConsented
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  동의하고 가입하기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Confirmation Modal */}
      {selectedPlan && selectedPlan !== 'free' && (
        <div className="fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4" onClick={() => !isSubmitting && setSelectedPlan(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
              <h3 className="text-lg font-bold">결제 안내</h3>
              <p className="text-indigo-200 text-sm mt-1">
                {PLAN_NAMES[selectedPlan]} 플랜으로 변경합니다
              </p>
            </div>

            <div className="p-6 space-y-5">
              {/* Plan Summary */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">플랜</span>
                  <span className="text-sm font-bold text-slate-800">{PLAN_NAMES[selectedPlan]}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">결제 주기</span>
                  <span className="text-sm font-bold text-slate-800">{isYearly ? '연간 결제' : '월간 결제'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-500">월 요금</span>
                  <span className="text-sm font-bold text-slate-800">
                    {formatPrice(isYearly ? PLAN_PRICING[selectedPlan].yearlyPrice : PLAN_PRICING[selectedPlan].monthlyPrice)}원/월
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-bold text-slate-700">결제 금액</span>
                  <span className="text-lg font-black text-indigo-600">
                    {formatPrice(
                      isYearly
                        ? PLAN_PRICING[selectedPlan].yearlyPrice * 12
                        : PLAN_PRICING[selectedPlan].monthlyPrice
                    )}원
                  </span>
                </div>
                {isYearly && (
                  <p className="text-xs text-emerald-600 text-right">
                    월간 대비 {formatPrice((PLAN_PRICING[selectedPlan].monthlyPrice - PLAN_PRICING[selectedPlan].yearlyPrice) * 12)}원 절약
                  </p>
                )}
              </div>

              {hospitalName && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1">병원명</label>
                  <p className="text-sm font-medium text-slate-800 bg-slate-50 rounded-lg px-3 py-2">{hospitalName}</p>
                </div>
              )}

              {/* Payment Method */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-2">결제 방법 *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      paymentMethod === 'card'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                    신용카드
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('transfer')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-bold transition-all ${
                      paymentMethod === 'transfer'
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    계좌이체
                  </button>
                </div>
              </div>

              {/* Receipt Type - only for bank transfer */}
              {paymentMethod === 'transfer' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-2">증빙 서류 *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setReceiptType('cash_receipt')}
                      className={`px-4 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                        receiptType === 'cash_receipt'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      현금영수증
                    </button>
                    <button
                      type="button"
                      onClick={() => setReceiptType('tax_invoice')}
                      className={`px-4 py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                        receiptType === 'tax_invoice'
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      세금계산서
                    </button>
                  </div>
                </div>
              )}

              {/* Contact Info */}
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">담당자 이름 *</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={e => setContactName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">연락처 (결제 문자 수신) *</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={e => setContactPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {paymentMethod === 'card'
                  ? '결제 요청 후 입력하신 연락처로 카드결제 안내 문자가 발송됩니다. 문자 내 링크를 통해 결제를 완료하시면 플랜이 즉시 활성화됩니다.'
                  : '결제 요청 후 입력하신 연락처로 계좌이체 안내 문자가 발송됩니다. 입금 확인 후 플랜이 활성화되며, 증빙 서류가 발행됩니다.'}
              </p>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => { setSelectedPlan(null); setContactName(userName || ''); setContactPhone(userPhone || ''); setPaymentMethod('card'); setReceiptType('cash_receipt'); }}
                  disabled={isSubmitting}
                  className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    if (!contactName.trim() || !contactPhone.trim()) {
                      showToast('담당자 이름과 연락처를 모두 입력해주세요.', 'error');
                      return;
                    }
                    setIsSubmitting(true);
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
                          setSelectedPlan(null);
                          setContactName(userName || '');
                          setContactPhone(userPhone || '');
                          setPaymentMethod('card');
                          setReceiptType('cash_receipt');
                        }
                      } else if (onSelectPlan) {
                        onSelectPlan(selectedPlan, isYearly ? 'yearly' : 'monthly');
                        setSelectedPlan(null);
                        setContactName(userName || '');
                        setContactPhone(userPhone || '');
                        setPaymentMethod('card');
                        setReceiptType('cash_receipt');
                      }
                    } catch {
                      showToast('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  disabled={isSubmitting || !contactName.trim() || !contactPhone.trim()}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '처리 중...' : paymentMethod === 'card' ? '카드결제 요청' : '계좌이체 요청'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default PricingPage;
