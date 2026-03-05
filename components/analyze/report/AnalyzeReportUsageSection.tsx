import React from 'react';
import type { AnalysisReport } from '../../../types';
import { BarChart, DonutChart } from '../AnalyzeCharts';

interface AnalyzeReportUsageSectionProps {
  usagePatterns: AnalysisReport['usagePatterns'];
}

const AnalyzeReportUsageSection: React.FC<AnalyzeReportUsageSectionProps> = ({ usagePatterns }) => {
  const totalUsage = usagePatterns.fixtureUsageCount + usagePatterns.insuranceClaimCount + usagePatterns.failUsageCount;
  const monthlyAvgUsage = usagePatterns.periodMonths > 0 ? (totalUsage / usagePatterns.periodMonths).toFixed(1) : '0';

  return (
    <section className="py-20 bg-slate-50 border-t border-slate-100">
      <div className="max-w-4xl mx-auto px-6">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">수술 기록 분석 리포트</h2>
          <p className="text-slate-500 font-medium whitespace-pre-line">
            {`최근 ${usagePatterns.periodMonths}개월간의 수술 데이터에서 파악된 임플란트 소모 및 사용 패턴입니다.\n정밀한 발주 시기 예측과 재고 최적화에 활용할 수 있습니다.`}
          </p>
        </div>

        {/* Surgery & Implant Stats */}
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
              <span className="text-3xl font-black text-slate-900">{totalUsage}</span>
              <span className="text-base font-bold text-slate-400">개</span>
              <span className="text-sm text-slate-400">(월평균 {monthlyAvgUsage}개)</span>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Top Used Items */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg shadow-slate-200/50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">TOP 사용 품목 (Best 5)</h3>
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md">핵심 관리 대상</span>
            </div>
            {usagePatterns.topUsedItems.length > 0 ? (
              <BarChart
                items={usagePatterns.topUsedItems.slice(0, 5).map(t => ({
                  label: `${t.manufacturer} ${t.brand} ${t.size}`.trim(),
                  value: t.count,
                }))}
                maxValue={Math.max(...usagePatterns.topUsedItems.map(t => t.count))}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <svg className="w-10 h-10 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>
                <p className="text-sm font-medium">수술기록 데이터가 부족합니다.</p>
              </div>
            )}
          </div>

          {/* Manufacturer Distribution */}
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg shadow-slate-200/50">
            <h3 className="text-sm font-black text-slate-800 mb-8 uppercase tracking-widest">제조사별 소모 비중</h3>
            <DonutChart data={usagePatterns.manufacturerDistribution} />
          </div>
        </div>
      </div>
    </section>
  );
};

export default AnalyzeReportUsageSection;
