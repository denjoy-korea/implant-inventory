import React from 'react';

const AnalyzeMatchingPerfectState: React.FC = () => {
  return (
    <div className="text-center py-16 bg-gradient-to-b from-emerald-50 to-white rounded-3xl border border-emerald-100 shadow-xl shadow-emerald-900/5">
      <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 animate-bounce">
        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <p className="text-xl text-emerald-800 font-black mb-2 tracking-tight">완벽합니다! 모든 데이터가 일치합니다.</p>
      <p className="text-sm text-emerald-600/80 font-medium">재고 누수 없이 매우 우수하게 관리되고 있습니다.</p>
    </div>
  );
};

export default AnalyzeMatchingPerfectState;
