import React from 'react';

const AnalyzeOverviewCriteriaSection: React.FC = () => {
  return (
    <section className="py-8 bg-white border-b border-slate-100">
      <div className="max-w-4xl mx-auto px-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">분석 기준</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
          {[
            { name: '교환 항목 분리 관리', pts: 15, desc: '재고 목록에 교환 픽스처 별도 분류 여부' },
            { name: '보험청구 2단계 구분', pts: 15, desc: '픽스쳐 목록 + 수술기록 양쪽 보험임플란트 구분' },
            { name: '수술기록→재고 매칭률', pts: 25, desc: '수술에 사용된 품목이 재고 목록에 등록되어 있는지' },
            { name: '재고→수술기록 활용률', pts: 20, desc: '등록된 재고가 실제 수술에 사용되고 있는지' },
            { name: '데이터 표기 일관성', pts: 15, desc: '같은 제조사/브랜드의 명칭 통일 여부' },
            { name: '사이즈 포맷 일관성', pts: 10, desc: '같은 브랜드 내 사이즈 표기법 통일 여부' },
          ].map((criteria, index) => (
            <div key={index} className="flex items-baseline gap-2 py-1.5">
              <span className="text-xs font-bold text-indigo-500 tabular-nums w-8 flex-shrink-0">{criteria.pts}점</span>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-700">{criteria.name}</span>
                <p className="text-[11px] text-slate-400 leading-tight">{criteria.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AnalyzeOverviewCriteriaSection;
