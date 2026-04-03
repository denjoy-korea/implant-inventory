import React from 'react';

interface SolutionShowcaseSectionProps {
  onOpenInventorySolution: () => void;
  onGoToContact: () => void;
  onNavigate?: (view: string) => void;
}

interface SolutionCard {
  title: string;
  description: string;
  tag: string;
  badge: string | null;
  badgeColor: string;
  iconColor: string;
  iconBg: string;
  borderHover: string;
  onClick: () => void;
  icon: React.ReactNode;
}

const SolutionShowcaseSection: React.FC<SolutionShowcaseSectionProps> = ({
  onOpenInventorySolution,
  onGoToContact,
  onNavigate,
}) => {
  const solutions: SolutionCard[] = [
    {
      title: '임플란트 재고관리',
      description:
        '사용량 기반 안전재고 자동 설정, 발주 목록 자동 생성, 재고 실사까지. 덴트웹 연동으로 보험 청구 데이터도 수집합니다.',
      tag: '재고관리',
      badge: 'LIVE',
      badgeColor: 'bg-green-50 text-green-700 border-green-200',
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-50',
      borderHover: 'hover:border-indigo-200 hover:shadow-indigo-100/50',
      onClick: onOpenInventorySolution,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      ),
    },
    {
      title: 'HR 솔루션',
      description:
        '근태 관리, 직원 계약, 교육 이력까지. 병원 인사관리 전반을 체계화하는 솔루션입니다.',
      tag: '인사관리',
      badge: '준비중',
      badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50',
      borderHover: 'hover:border-emerald-200 hover:shadow-emerald-100/50',
      onClick: onGoToContact,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      title: '병원 컨설팅',
      description:
        '운영 문제를 구조화하고, 병원 상황에 맞는 시스템 도입 우선순위를 함께 정리합니다.',
      tag: '컨설팅',
      badge: null,
      badgeColor: '',
      iconColor: 'text-violet-500',
      iconBg: 'bg-violet-50',
      borderHover: 'hover:border-violet-200 hover:shadow-violet-100/50',
      onClick: onNavigate ? () => onNavigate('consulting') : onGoToContact,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
    },
    {
      title: '보험 서비스',
      description:
        '보험 임플란트 청구 동향 분석, 누락 항목 점검, 2단계 청구 데이터 관리까지 지원합니다.',
      tag: '보험청구',
      badge: '준비중',
      badgeColor: 'bg-slate-100 text-slate-500 border-slate-200',
      iconColor: 'text-amber-500',
      iconBg: 'bg-amber-50',
      borderHover: 'hover:border-amber-200 hover:shadow-amber-100/50',
      onClick: onGoToContact,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
    },
  ];

  return (
    <section id="home-solutions" className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 mb-6">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" aria-hidden="true" />
            <span className="text-sm text-green-700 font-medium">첫 번째 솔루션 운영 중</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4 text-gray-800">
            병원의 문제마다
            <span className="block gradient-text-purple">전용 솔루션이 있습니다.</span>
          </h2>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            DenJOY는 재고관리부터 시작해 HR, 컨설팅, 보험청구까지
            치과 운영 전반을 디지털로 지원합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {solutions.map((sol) => (
            <div
              key={sol.title}
              onClick={sol.onClick}
              className={`card-premium glow-box group cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${sol.borderHover} p-7`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${sol.iconBg} ${sol.iconColor} group-hover:scale-110 transition-transform`}>
                  {sol.icon}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-400 bg-gray-50 border border-gray-200 px-2.5 py-1 rounded-full">
                    {sol.tag}
                  </span>
                  {sol.badge && (
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${sol.badgeColor}`}>
                      {sol.badge}
                    </span>
                  )}
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{sol.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-5">{sol.description}</p>
              <div className={`flex items-center gap-2 text-sm font-semibold transition-colors duration-200 ${sol.badge === 'LIVE' ? 'text-indigo-500 group-hover:text-indigo-600' : 'text-gray-400'}`}>
                <span>{sol.badge === 'LIVE' ? '솔루션 자세히 보기' : '출시 알림 신청'}</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SolutionShowcaseSection;
