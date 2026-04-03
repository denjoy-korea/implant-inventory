import React from 'react';

interface FourPillarsSectionProps {
  onGoToContact: () => void;
  onOpenInventorySolution: () => void;
}

const FourPillarsSection: React.FC<FourPillarsSectionProps> = ({
  onGoToContact,
  onOpenInventorySolution,
}) => {
  const pillars = [
    {
      short: 'EDU',
      title: '실전 교육',
      description: '임상 지식부터 병원 운영 데이터 활용까지 — 현장에서 바로 적용할 수 있는 강의와 매뉴얼을 제공합니다.',
      badge: null,
      highlight: false,
      action: onGoToContact,
      actionLabel: '강의 알아보기',
    },
    {
      short: 'CONS',
      title: '병원 컨설팅',
      description: '운영 비효율을 구조적으로 진단하고, 병원 상황에 맞는 시스템 도입 우선순위를 함께 세웁니다.',
      badge: '추천',
      highlight: true,
      action: onGoToContact,
      actionLabel: '컨설팅 알아보기',
    },
    {
      short: 'SOL',
      title: '디지털 솔루션',
      description: '재고관리, HR, 보험청구까지 — 병원 운영을 바꾸는 솔루션이 각자의 랜딩에서 깊게 전환을 담당합니다.',
      badge: 'LIVE',
      highlight: false,
      action: onOpenInventorySolution,
      actionLabel: '솔루션 보기',
    },
    {
      short: 'COMM',
      title: '성장 커뮤니티',
      description: '같은 목표를 가진 치과 의료진들이 경험을 나누고 함께 성장하는 동료 네트워크입니다.',
      badge: null,
      highlight: false,
      action: onGoToContact,
      actionLabel: '커뮤니티 참여하기',
    },
  ];

  return (
    <section id="home-pillars" className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-20">
          <p className="text-sm text-indigo-500 font-medium mb-2">FOUR PILLARS</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 text-gray-800">
            <span className="gradient-text-purple">DenJOY</span>가 치과 의료진과
            <span className="block">함께하는 네 가지 방법</span>
          </h2>
          <p className="text-xl text-gray-500 max-w-3xl mx-auto leading-relaxed">
            교육으로 성장하고, 컨설팅으로 방향을 잡고, 솔루션으로 운영을 바꾸고, 커뮤니티로 함께 나아갑니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {pillars.map((pillar, i) => (
            <div
              key={i}
              onClick={pillar.action}
              className={`group h-full cursor-pointer transition-all duration-300 ${
                pillar.highlight
                  ? 'rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-600 p-8 text-white shadow-xl shadow-indigo-500/20 hover:-translate-y-1 hover:shadow-2xl hover:shadow-indigo-500/30 ring-2 ring-indigo-300/50'
                  : 'card-premium glow-box hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 hover:border-indigo-200'
              }`}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`${pillar.highlight ? 'w-14 h-14 rounded-2xl bg-white/15 text-white' : 'text-indigo-500'} flex items-center justify-center text-sm font-black tracking-[0.2em] group-hover:scale-110 transition-transform`}>
                  {pillar.short}
                </div>
                {pillar.badge && (
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    pillar.highlight
                      ? 'bg-white/20 text-white'
                      : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {pillar.badge}
                  </span>
                )}
              </div>
              <h3 className={`text-xl font-semibold mb-3 ${pillar.highlight ? 'text-white' : 'text-gray-800'}`}>
                {pillar.title}
              </h3>
              <p className={`leading-relaxed mb-4 ${pillar.highlight ? 'text-indigo-100' : 'text-gray-500'}`}>
                {pillar.description}
              </p>
              {pillar.highlight && (
                <p className="text-xs text-indigo-200 mb-4">메인 홈페이지에서 구조를 이해하고 필요한 솔루션으로 진입합니다.</p>
              )}
              <div className={`flex items-center gap-2 text-sm font-medium transition-colors duration-200 ${
                pillar.highlight ? 'text-indigo-200 group-hover:text-white' : 'text-indigo-500 group-hover:text-indigo-600'
              }`}>
                <span>{pillar.actionLabel}</span>
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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

export default FourPillarsSection;
