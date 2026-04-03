import React from 'react';

interface MicroCommitmentSectionProps {
  onGoToContact: () => void;
  onOpenInventorySolution: () => void;
}

const MicroCommitmentSection: React.FC<MicroCommitmentSectionProps> = ({
  onGoToContact,
  onOpenInventorySolution,
}) => {
  const MICRO_COMMITS = [
    {
      title: '무료 상담',
      description: '운영 문제와 도입 방향을 먼저 논의합니다. 비용 없이 30분 컨설팅으로 시작하세요.',
      action: '상담 신청하기',
      onClick: onGoToContact,
    },
    {
      title: '솔루션 체험',
      description: '임플란트 재고관리 솔루션을 직접 둘러보세요. 실제 기능과 도입 효과를 확인할 수 있습니다.',
      action: '솔루션 보기',
      onClick: onOpenInventorySolution,
    },
    {
      title: '강의 문의',
      description: '임상 지식부터 데이터 도구 활용까지 — 병원에서 바로 쓸 수 있는 강의를 문의하세요.',
      action: '강의 문의하기',
      onClick: onGoToContact,
    },
  ];

  return (
    <section className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-5xl mx-auto px-6 lg:px-8 text-center">
        <p className="text-sm text-indigo-500 font-medium mb-2">NEXT STEP</p>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-800">
          지금 바로 시작할 수 있는
          <span className="block gradient-text-purple">첫 번째 발걸음</span>
        </h2>
        <p className="text-lg text-gray-500 mb-10 max-w-3xl mx-auto leading-relaxed">
          상담, 솔루션 체험, 강의 문의 — 어떤 경로든 DenJOY와 함께하는 첫 단계입니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {MICRO_COMMITS.map((item, i) => (
            <div key={i} onClick={item.onClick} className="card-premium glow-box p-7 group h-full cursor-pointer hover:scale-[1.02] transition-transform duration-300 text-left">
              <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-slate-900 text-white mb-5 transition-transform group-hover:bg-indigo-600">
                <span className="font-bold text-lg">{item.title.slice(0, 1)}</span>
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-gray-500 text-sm mb-5 leading-relaxed">{item.description}</p>
              <span className="text-indigo-500 text-sm font-bold group-hover:text-indigo-600 transition-colors inline-flex items-center gap-1">
                {item.action} 
                <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MicroCommitmentSection;
