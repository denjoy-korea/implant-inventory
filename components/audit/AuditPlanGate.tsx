import React from 'react';

const AuditPlanGate: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-center p-8">
      <div className="w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <p className="text-base font-bold text-slate-800">실사 이력 분석은 Plus 플랜부터</p>
        <p className="text-sm text-slate-500 mt-1">누적 실사 데이터와 재고 이력을 분석하려면 플랜을 업그레이드하세요.</p>
      </div>
    </div>
  );
};

export default AuditPlanGate;
