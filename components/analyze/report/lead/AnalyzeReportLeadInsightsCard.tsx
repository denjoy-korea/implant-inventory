import React from 'react';

interface AnalyzeReportLeadInsightsCardProps {
  quickInsights: string[];
}

const AnalyzeReportLeadInsightsCard: React.FC<AnalyzeReportLeadInsightsCardProps> = ({ quickInsights }) => {
  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-5">
      <p className="text-xs font-bold uppercase tracking-wider text-indigo-500 mb-2">먼저 확인할 핵심 인사이트</p>
      <ul className="space-y-1.5">
        {quickInsights.map((insight, index) => (
          <li key={index} className="text-sm text-indigo-900 font-semibold">
            {index + 1}. {insight}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AnalyzeReportLeadInsightsCard;
