
import React, { useState, useEffect } from 'react';

interface PricingPageProps {
  onGetStarted: () => void;
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
      '재고 품목 최대 50개',
      '수술 기록 3개월 보관',
      '기본 재고 현황 대시보드',
      '엑셀 업로드/다운로드',
      '1명 사용자',
    ],
  },
  {
    name: 'Standard',
    description: '성장하는 치과를 위한 추천 플랜',
    monthlyPrice: 49000,
    yearlyPrice: 39000,
    highlight: true,
    cta: '14일 무료 체험',
    limit: 50,
    features: [
      '재고 품목 최대 500개',
      '수술 기록 12개월 보관',
      '고급 분석 대시보드',
      '자동 재고 알림',
      '브랜드별 소모량 분석',
      '최대 5명 사용자',
      '이메일 지원',
    ],
  },
  {
    name: 'Premium',
    description: '대형 치과 및 네트워크를 위한 플랜',
    monthlyPrice: 99000,
    yearlyPrice: 79000,
    highlight: false,
    cta: '14일 무료 체험',
    limit: 20,
    features: [
      '재고 품목 무제한',
      '수술 기록 무제한 보관',
      'AI 기반 수요 예측',
      '자동 발주 시스템',
      '멀티 지점 관리',
      '사용자 무제한',
      '우선 지원 (채팅 + 전화)',
      'API 연동',
    ],
  },
];

const comparisonCategories = [
  {
    name: '기본 기능',
    features: [
      { label: '재고 품목 수', values: ['50개', '500개', '무제한'] },
      { label: '수술 기록 보관', values: ['3개월', '12개월', '무제한'] },
      { label: '엑셀 업로드/다운로드', values: [true, true, true] },
      { label: '대시보드', values: ['기본', '고급', '고급'] },
    ],
  },
  {
    name: '재고 관리',
    features: [
      { label: '실시간 재고 현황', values: [true, true, true] },
      { label: '자동 재고 알림', values: [false, true, true] },
      { label: '자동 발주 시스템', values: [false, false, true] },
      { label: 'AI 수요 예측', values: [false, false, true] },
    ],
  },
  {
    name: '데이터 분석',
    features: [
      { label: '브랜드별 소모량 분석', values: [false, true, true] },
      { label: '월간 리포트', values: [false, true, true] },
      { label: 'API 연동', values: [false, false, true] },
    ],
  },
  {
    name: '협업',
    features: [
      { label: '사용자 수', values: ['1명', '5명', '무제한'] },
      { label: '멀티 지점 관리', desc: '하나의 계정으로 여러 지점의 재고를 통합 조회하고 지점별 개별 관리', values: [false, false, true] },
      { label: '역할별 권한 관리', desc: '원장/매니저/스탭 등 역할에 따라 메뉴 접근 및 데이터 수정 권한을 구분', values: [false, true, true] },
    ],
  },
  {
    name: '보안',
    features: [
      { label: '데이터 암호화', values: [true, true, true] },
      { label: '감사 로그', values: [false, false, true] },
    ],
  },
  {
    name: '지원',
    features: [
      { label: '커뮤니티 지원', values: [true, true, true] },
      { label: '이메일 지원', values: [false, true, true] },
      { label: '우선 지원 (채팅 + 전화)', values: [false, false, true] },
    ],
  },
];

const faqs = [
  {
    q: '무료 플랜에서 유료 플랜으로 업그레이드하면 데이터가 유지되나요?',
    a: '네, 기존 데이터는 모두 그대로 유지됩니다. 업그레이드 즉시 추가 기능을 사용하실 수 있으며, 다운그레이드 시에도 보관 한도 내 데이터는 보존됩니다.',
  },
  {
    q: '14일 무료 체험 기간 중 결제가 되나요?',
    a: '아닙니다. 체험 기간 동안은 결제가 발생하지 않으며, 체험 종료 후 유료 전환 의사를 확인한 뒤에만 결제가 진행됩니다. 카드 정보 없이도 체험 가능합니다.',
  },
  {
    q: '연간 결제 시 할인 혜택이 있나요?',
    a: '네, 연간 결제 시 월 결제 대비 약 20% 할인된 가격으로 이용 가능합니다. Standard 플랜 기준 월 49,000원에서 39,000원으로 할인됩니다.',
  },
  {
    q: '여러 지점을 운영하고 있는데 어떤 플랜이 적합한가요?',
    a: 'Premium 플랜에서 멀티 지점 관리 기능을 지원합니다. 무제한 사용자와 함께 여러 지점의 재고를 통합 관리할 수 있습니다.',
  },
  {
    q: '기존 시스템(덴트웹 등)과 연동이 가능한가요?',
    a: 'Premium 플랜의 API 연동 기능을 통해 기존 시스템과의 데이터 동기화가 가능합니다.',
  },
  {
    q: '환불 정책은 어떻게 되나요?',
    a: '결제 후 7일 이내 전액 환불이 가능합니다. 연간 결제의 경우 사용 기간을 제외한 잔여 금액에 대해 비례 환불을 지원합니다.',
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

const PricingPage: React.FC<PricingPageProps> = ({ onGetStarted }) => {
  const [isYearly, setIsYearly] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  const planNames = ['Free', 'Standard', 'Premium'];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
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
            치과 규모에 맞는 요금제를 선택하세요. 모든 플랜은 핵심 기능을 포함하며,
            언제든 업그레이드할 수 있습니다.
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
        {isYearly && (
          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            20% 할인
          </span>
        )}
      </div>

      {/* Plan Cards */}
      <section className="max-w-7xl mx-auto px-6 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const price = isYearly ? plan.yearlyPrice : plan.monthlyPrice;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-8 flex flex-col transition-all duration-300 ${
                  plan.highlight
                    ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-200 scale-[1.02] ring-2 ring-indigo-600'
                    : 'bg-white border border-slate-200 shadow-sm hover:shadow-lg'
                }`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-black px-4 py-1.5 rounded-full shadow-lg">
                      추천
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className={`text-lg font-bold ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                      {plan.name}
                    </h3>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      plan.highlight
                        ? 'bg-white/20 text-white'
                        : 'bg-rose-50 text-rose-600 border border-rose-200'
                    }`}>
                      한정 {plan.limit}곳
                    </span>
                  </div>
                  <p className={`text-sm ${plan.highlight ? 'text-indigo-200' : 'text-slate-500'}`}>
                    {plan.description}
                  </p>
                </div>

                <div className="mb-6">
                  {price !== null ? (
                    <div className="flex items-end gap-1">
                      <span className={`text-4xl font-black ${plan.highlight ? 'text-white' : 'text-slate-900'}`}>
                        {formatPrice(price)}
                      </span>
                      <span className={`text-sm font-medium mb-1 ${plan.highlight ? 'text-indigo-200' : 'text-slate-400'}`}>
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

                <button
                  onClick={onGetStarted}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 mb-8 ${
                    plan.highlight
                      ? 'bg-white text-indigo-600 hover:bg-indigo-50 shadow-lg'
                      : 'bg-slate-900 text-white hover:bg-slate-800 shadow-md'
                  }`}
                >
                  {plan.cta}
                </button>

                <ul className="space-y-3 flex-1">
                  {plan.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlight ? 'text-indigo-200' : 'text-indigo-600'}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      <span className={`text-sm ${plan.highlight ? 'text-indigo-100' : 'text-slate-600'}`}>
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
                  <th className="text-left py-4 pr-6 w-[260px]"></th>
                  {planNames.map((name, i) => (
                    <th
                      key={name}
                      className={`text-center py-4 px-4 text-sm font-bold ${
                        i === 1 ? 'text-indigo-600' : 'text-slate-700'
                      }`}
                    >
                      {name}
                      {i === 1 && (
                        <span className="ml-2 text-[10px] bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full">추천</span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {comparisonCategories.map((cat) => (
                  <React.Fragment key={cat.name}>
                    <tr>
                      <td
                        colSpan={4}
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
                          <td key={vi} className="py-3.5 px-4 text-center">
                            {typeof val === 'boolean' ? (
                              val ? <span className="inline-flex justify-center"><CheckIcon /></span> : <span className="inline-flex justify-center"><XIcon /></span>
                            ) : (
                              <span className={`text-sm font-medium ${vi === 1 ? 'text-indigo-600' : 'text-slate-700'}`}>
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
          <h2 className="text-3xl md:text-4xl font-black mb-4">지금 시작할 준비가 되셨나요?</h2>
          <p className="text-slate-400 text-lg mb-8">무료 플랜으로 부담 없이 시작하고, 필요할 때 업그레이드하세요.</p>
          <button
            onClick={onGetStarted}
            className="px-8 py-4 bg-white text-slate-900 text-lg font-bold rounded-2xl shadow-2xl hover:shadow-white/20 hover:-translate-y-1 transition-all duration-300"
          >
            무료로 시작하기
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-slate-400 text-sm">&copy; 2024 Implant Inventory Pro. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Terms of Service</a>
            <a href="#" className="text-slate-400 hover:text-slate-600 text-sm transition-colors">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PricingPage;
