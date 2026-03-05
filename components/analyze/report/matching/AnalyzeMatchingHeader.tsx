import React from 'react';

const AnalyzeMatchingHeader: React.FC = () => {
  return (
    <div className="text-center mb-12">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 mb-4 shadow-sm border border-indigo-100">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
        </svg>
      </div>
      <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">수술기록 ↔ 재고목록 매칭 분석</h2>
      <p className="text-slate-500 font-medium">실제 사용된 임플란트가 시스템에 얼마나 잘 등록되어 있는지 확인합니다.</p>
    </div>
  );
};

export default AnalyzeMatchingHeader;
