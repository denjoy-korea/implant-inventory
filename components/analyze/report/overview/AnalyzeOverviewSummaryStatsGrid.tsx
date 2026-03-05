import React from 'react';
import type { AnalysisReport } from '../../../../types';
import { ANALYZE_OVERVIEW_SUMMARY_STAT_ITEMS } from './overviewContent';

interface AnalyzeOverviewSummaryStatsGridProps {
  summary: AnalysisReport['summary'];
}

const AnalyzeOverviewSummaryStatsGrid: React.FC<AnalyzeOverviewSummaryStatsGridProps> = ({ summary }) => {
  return (
    <div className="mt-12 grid grid-cols-3 md:grid-cols-6 gap-4">
      {ANALYZE_OVERVIEW_SUMMARY_STAT_ITEMS.map((item, index) => (
        <div key={index} className="bg-slate-800/60 backdrop-blur-sm rounded-2xl py-4 px-2 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600 transition-colors shadow-lg">
          <div className="text-3xl font-black text-white tabular-nums drop-shadow-md">{summary[item.key]}</div>
          <div className="text-[11px] text-slate-400 mt-1.5 font-bold uppercase tracking-wider">{item.label}</div>
        </div>
      ))}
    </div>
  );
};

export default AnalyzeOverviewSummaryStatsGrid;
