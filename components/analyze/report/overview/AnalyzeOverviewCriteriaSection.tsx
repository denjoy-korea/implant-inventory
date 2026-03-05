import React from 'react';
import { ANALYZE_OVERVIEW_CRITERIA_ITEMS } from './overviewContent';

const AnalyzeOverviewCriteriaSection: React.FC = () => {
  return (
    <section className="py-8 bg-white border-b border-slate-100">
      <div className="max-w-4xl mx-auto px-6">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">분석 기준</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
          {ANALYZE_OVERVIEW_CRITERIA_ITEMS.map((criteria, index) => (
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
