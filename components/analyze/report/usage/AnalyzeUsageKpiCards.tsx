import React from 'react';
import type { UsagePatterns, UsageSummaryMetrics } from './usageTypes';

interface AnalyzeUsageKpiCardsProps {
  usagePatterns: UsagePatterns;
  summary: UsageSummaryMetrics;
}

const AnalyzeUsageKpiCards: React.FC<AnalyzeUsageKpiCardsProps> = ({ usagePatterns, summary }) => {
  return (
    <div className="grid grid-cols-2 gap-4 mb-8">
      {/* 수술 건수 */}
      <div className="bg-slate-50 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">수술 건수</h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-black text-slate-900">{usagePatterns.totalSurgeries}</span>
          <span className="text-base font-bold text-slate-400">건</span>
          <span className="text-sm text-slate-400">(월평균 {usagePatterns.monthlyAvgSurgeries}건)</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
              <span className="text-sm text-slate-600">1차 수술 (식립)</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{usagePatterns.primarySurgeries}건</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
              <span className="text-sm text-slate-600">2차 수술 (보험청구)</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{usagePatterns.secondarySurgeries}건</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
              <span className="text-sm text-slate-600">수술중교환</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{usagePatterns.failSurgeries}건</span>
          </div>
        </div>
      </div>

      {/* 임플란트 사용 개수 */}
      <div className="bg-slate-50 rounded-2xl p-5">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">임플란트 사용 개수</h3>
        <div className="flex items-baseline gap-2 mb-3">
          <span className="text-3xl font-black text-slate-900">{summary.totalUsage}</span>
          <span className="text-base font-bold text-slate-400">개</span>
          <span className="text-sm text-slate-400">(월평균 {summary.monthlyAvgUsage}개)</span>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-indigo-500"></span>
              <span className="text-sm text-slate-600">픽스쳐 사용</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{usagePatterns.fixtureUsageCount}개</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-purple-500"></span>
              <span className="text-sm text-slate-600">보험임플란트 청구</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{usagePatterns.insuranceClaimCount}개</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span>
              <span className="text-sm text-slate-600">수술중교환</span>
            </div>
            <span className="text-sm font-bold text-slate-800">{usagePatterns.failUsageCount}개</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyzeUsageKpiCards;
