import React from 'react';

const PAIN_POINTS = [
  {
    title: '재고 파악 지연',
    pain: '수술 전에 재고가 있는지 다시 확인하느라 현장이 흔들리는 문제',
    tag: '재고관리',
  },
  {
    title: '보험청구 누락',
    pain: '누락 여부를 사람이 일일이 점검하다 보니 청구 손실이 반복되는 문제',
    tag: '보험청구',
  },
  {
    title: 'HR 기준 부재',
    pain: '근태, 계약, 교육 기준이 병원마다 달라 운영이 흔들리는 문제',
    tag: '인사관리',
  },
  {
    title: '대표 의존 운영',
    pain: '원장이나 실장 한 명이 빠지면 프로세스가 멈춰버리는 구조',
    tag: '운영시스템',
  },
];

const PainPointsSection: React.FC = () => {
  return (
    <section className="py-24 relative">
      <div className="section-divider mb-24" />
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-12 animate-fade-in-up">
          <p className="text-sm text-rose-500 font-medium mb-3">PAIN POINTS</p>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-800 mb-4">
            치과 운영이 힘든 이유는,
            <span className="block text-red-500">문제가 하나가 아니기 때문입니다.</span>
          </h2>
          <p className="text-gray-500 text-base md:text-lg max-w-3xl mx-auto">
            재고, 보험청구, 인사관리, 대표 의존 운영 — DenJOY는 이 모든 문제에 대응하는 솔루션을 제공합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {PAIN_POINTS.map((item, index) => (
            <div
              key={item.title}
              className="card-premium glow-box hover:border-rose-200 hover:shadow-rose-100/50 hover:-translate-y-1 transition-all duration-300"
            >
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm mb-4">
                {String(index + 1).padStart(2, '0')}
              </div>
              <h3 className="text-lg font-bold text-gray-800 mb-2">{item.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">{item.pain}</p>
              <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full border border-rose-100">
                {item.tag}
              </span>
            </div>
          ))}
        </div>

        <div className="text-center mt-10">
          <p className="text-lg text-gray-600">
            이 중 하나라도 해당된다면, <span className="text-indigo-600 font-semibold">DenJOY의 교육, 컨설팅, 솔루션이 구체적인 해결책이 될 수 있습니다.</span>
          </p>
        </div>
      </div>
    </section>
  );
};

export default PainPointsSection;
