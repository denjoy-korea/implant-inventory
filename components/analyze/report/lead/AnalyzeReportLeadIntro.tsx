import React from 'react';

const AnalyzeReportLeadIntro: React.FC = () => {
  return (
    <div className="text-center mb-6">
      <div className="w-12 h-12 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-3">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-1">분석 결과를 저장하고 다음 단계를 받아보세요</h3>
      <p className="text-sm text-slate-500">최소 입력(이메일)만으로 결과 저장이 가능합니다.</p>
    </div>
  );
};

export default AnalyzeReportLeadIntro;
