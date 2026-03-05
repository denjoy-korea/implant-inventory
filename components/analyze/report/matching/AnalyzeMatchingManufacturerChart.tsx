import React from 'react';
import type { MatchingEntry } from './matchingTypes';

interface AnalyzeMatchingManufacturerChartProps {
  entries: MatchingEntry[];
}

const AnalyzeMatchingManufacturerChart: React.FC<AnalyzeMatchingManufacturerChartProps> = ({ entries }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-xl shadow-slate-200/40">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">제조사별 불일치 비중 (Top)</h3>
      </div>

      <div className="space-y-4">
        {entries.map((entry) => (
          <div key={entry.manufacturer}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-700">{entry.manufacturer}</span>
              <span className="text-xs font-bold text-slate-400">{entry.total}건</span>
            </div>
            <div className="flex gap-1 h-7">
              {entry.counts.fixtureOnly > 0 && (
                <div
                  className="bg-blue-400 rounded-md flex items-center justify-center transition-all duration-700"
                  style={{ width: `${Math.max(entry.fixturePercent, 4)}%` }}
                >
                  <span className="text-[10px] font-bold text-white">{entry.counts.fixtureOnly}</span>
                </div>
              )}
              {entry.counts.surgeryOnly > 0 && (
                <div
                  className="bg-amber-400 rounded-md flex items-center justify-center transition-all duration-700"
                  style={{ width: `${Math.max(entry.surgeryPercent, 4)}%` }}
                >
                  <span className="text-[10px] font-bold text-white">{entry.counts.surgeryOnly}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm bg-blue-400"></span>
          <span className="text-slate-500">재고목록만 (Dead Stock 후보)</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="w-3 h-3 rounded-sm bg-amber-400"></span>
          <span className="text-slate-500">수술기록만 (미등록 품목)</span>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeMatchingManufacturerChart;
