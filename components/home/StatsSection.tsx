import React from 'react';
import useCountUp from '../../hooks/useCountUp';

const STATS = [
  { value: 4, suffix: '', label: '서비스 카테고리', sub: '교육 · 컨설팅 · 솔루션 · 커뮤니티' },
  { value: 104, suffix: 'h+', label: '연간 절약 시간', sub: '재고관리 솔루션 도입 병원 기준' },
  { value: 98, suffix: '%', label: '컨설팅 만족도', sub: '도입 병원 운영 개선 체감 기준' },
  { value: 1, suffix: '곳', label: '단일 진입점', sub: 'denjoy.info — 모든 서비스의 시작' },
];

function StatCard({ value, suffix, label, sub }: (typeof STATS)[number]) {
  const { count, ref } = useCountUp(value, 1500);

  return (
    <div ref={ref} className="card-premium text-center p-6">
      <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-teal-600 to-emerald-500 bg-clip-text text-transparent mb-1 whitespace-nowrap">
        {count}{suffix}
      </div>
      <div className="text-sm font-semibold text-gray-700 mb-0.5">{label}</div>
      <div className="text-xs text-gray-400">{sub}</div>
    </div>
  );
}

const StatsSection: React.FC = () => {
  return (
    <section className="py-20 relative">
      <div className="section-divider mb-20" />
      <div className="max-w-5xl mx-auto px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-sm text-indigo-500 font-medium mb-2">STATS</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-800">
            DenJOY의 가치를
            <span className="block gradient-text-purple">숫자로 확인하세요</span>
          </h2>
          <p className="text-base md:text-lg text-gray-500 leading-relaxed max-w-2xl mx-auto mt-4">
            교육, 컨설팅, 솔루션으로 실제 병원 운영을 바꿔온 DenJOY의 현황입니다.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((stat, i) => (
            <StatCard key={i} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
