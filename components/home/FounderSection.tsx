import React from 'react';

interface FounderSectionProps {
  onGoToContact: () => void;
}

const FounderSection: React.FC<FounderSectionProps> = ({ onGoToContact }) => {
  const FOUNDER_BADGES = ['치과 현장 경험 기반', '교육 · 컨설팅 · 솔루션 연결', '브랜드 메인 홈페이지 설계'];

  return (
    <section className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="card-premium glow-box">
          <div className="flex flex-col md:flex-row items-center gap-10">
            <div className="shrink-0">
              <div className="w-44 h-44 rounded-full overflow-hidden bg-gradient-to-br from-indigo-100 to-indigo-100 p-6 flex items-center justify-center border-4 border-white shadow-lg">
                <img
                  src="/denjoy_logo_full.png"
                  alt="DenJOY"
                  className="w-full h-full object-contain"
                />
              </div>
            </div>
            <div>
              <p className="text-sm text-indigo-500 font-medium mb-2">FOUNDER</p>
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
                DenJOY는 브랜드를 먼저 설명하고, <br/>
                <span className="text-indigo-600">솔루션은 각자 따로 세웁니다.</span>
              </h3>

              <div className="flex flex-wrap gap-2 mb-6">
                {FOUNDER_BADGES.map((badge, i) => (
                  <span key={i} className="px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-600 text-sm font-bold border border-indigo-100">
                    {badge}
                  </span>
                ))}
              </div>

              <p className="text-gray-500 leading-relaxed text-sm sm:text-base mb-6">
                메인 홈페이지에서는 DenJOY가 무엇을 하는지, 왜 여러 솔루션이 필요한지, 각 서비스가 어떻게 연결되는지를 먼저 설명합니다. 실제 전환은 각각의 솔루션 랜딩페이지에서 일어나도록 분리하는 빙식이 DenJOY에 가장 잘 맞습니다.
              </p>

              <button onClick={onGoToContact} className="inline-flex items-center gap-2 text-indigo-500 font-semibold hover:text-indigo-600 transition-colors">
                구조 상담하기
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FounderSection;
