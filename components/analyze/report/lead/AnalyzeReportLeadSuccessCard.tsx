import React from 'react';
import type { LeadSuccessCta } from './leadTypes';

interface AnalyzeReportLeadSuccessCardProps {
  leadSuccessCta: LeadSuccessCta;
}

const AnalyzeReportLeadSuccessCard: React.FC<AnalyzeReportLeadSuccessCardProps> = ({ leadSuccessCta }) => {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-xl font-bold text-emerald-900 mb-2">접수 완료: {leadSuccessCta.title}</h3>
      <p className="text-sm text-emerald-700 font-semibold mb-1">처리 예상시간: {leadSuccessCta.eta}</p>
      <p className="text-sm text-emerald-700 mb-6">{leadSuccessCta.detail}</p>
      <button
        onClick={leadSuccessCta.onClick}
        className="inline-flex items-center justify-center px-6 py-3 bg-emerald-700 text-white font-bold rounded-xl hover:bg-emerald-800 transition-colors"
      >
        다음 단계: {leadSuccessCta.ctaLabel}
      </button>
    </div>
  );
};

export default AnalyzeReportLeadSuccessCard;
