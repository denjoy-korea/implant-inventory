import React from 'react';

interface AnalyzeMatchingSummaryCardsProps {
  totalUnmatched: number;
  totalFixtureOnly: number;
  totalSurgeryOnly: number;
}

const AnalyzeMatchingSummaryCards: React.FC<AnalyzeMatchingSummaryCardsProps> = ({
  totalUnmatched,
  totalFixtureOnly,
  totalSurgeryOnly,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      <div className="bg-slate-50 rounded-3xl p-6 text-center shadow-inner border border-slate-100">
        <div className="text-4xl font-black text-slate-800 mb-1">{totalUnmatched}</div>
        <div className="text-xs font-bold text-slate-500 uppercase tracking-widest">총 불일치 건수</div>
      </div>
      <div className="bg-blue-50/50 rounded-3xl p-6 text-center border border-blue-100 hover:shadow-lg hover:shadow-blue-900/5 transition-all">
        <div className="text-4xl font-black text-blue-600 mb-1">{totalFixtureOnly}</div>
        <div className="text-xs font-bold text-blue-500 uppercase tracking-widest">수술기록 누락 (Dead Stock 후보)</div>
      </div>
      <div className="bg-amber-50/50 rounded-3xl p-6 text-center border border-amber-100 hover:shadow-lg hover:shadow-amber-900/5 transition-all">
        <div className="text-4xl font-black text-amber-600 mb-1">{totalSurgeryOnly}</div>
        <div className="text-xs font-bold text-amber-500 uppercase tracking-widest">재고등록 누락 (미등록 사용)</div>
      </div>
    </div>
  );
};

export default AnalyzeMatchingSummaryCards;
