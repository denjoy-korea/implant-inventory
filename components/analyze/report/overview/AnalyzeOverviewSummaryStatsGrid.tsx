import React from 'react';
import type { AnalysisReport } from '../../../../types';

interface AnalyzeOverviewSummaryStatsGridProps {
  summary: AnalysisReport['summary'];
}

const AnalyzeOverviewSummaryStatsGrid: React.FC<AnalyzeOverviewSummaryStatsGridProps> = ({ summary }) => {
  return (
    <div className="mt-12 grid grid-cols-3 md:grid-cols-6 gap-4">
      {[
        { label: '전체 품목', value: summary.totalFixtureItems },
        { label: '사용 품목', value: summary.activeItems },
        { label: '매칭 품목', value: summary.usedItems },
        { label: 'Dead Stock', value: summary.deadStockItems },
        { label: '미등록 품목', value: summary.surgeryOnlyItems },
        { label: '표기 변형', value: summary.nameVariants },
      ].map((item, index) => (
        <div key={index} className="bg-slate-800/60 backdrop-blur-sm rounded-2xl py-4 px-2 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-colors shadow-lg">
          <div className="text-3xl font-black text-white tabular-nums drop-shadow-md">{item.value}</div>
          <div className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

export default AnalyzeOverviewSummaryStatsGrid;
