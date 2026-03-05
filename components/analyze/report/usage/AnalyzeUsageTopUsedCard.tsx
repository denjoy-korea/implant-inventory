import React from 'react';
import type { UsagePatterns } from './usageTypes';
import { BarChart } from '../../AnalyzeCharts';

interface AnalyzeUsageTopUsedCardProps {
  topUsedItems: UsagePatterns['topUsedItems'];
}

const AnalyzeUsageTopUsedCard: React.FC<AnalyzeUsageTopUsedCardProps> = ({ topUsedItems }) => {
  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-lg shadow-slate-200/50">
      <div className="flex items-center justify-between mb-8">
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">TOP 사용 품목 (Best 5)</h3>
        <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-bold rounded-md">핵심 관리 대상</span>
      </div>
      {topUsedItems.length > 0 ? (
        <BarChart
          items={topUsedItems.slice(0, 5).map((item) => ({
            label: `${item.manufacturer} ${item.brand} ${item.size}`.trim(),
            value: item.count,
          }))}
          maxValue={Math.max(...topUsedItems.map((item) => item.count))}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-10 text-slate-400">
          <svg className="w-10 h-10 mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" /></svg>
          <p className="text-sm font-medium">수술기록 데이터가 부족합니다.</p>
        </div>
      )}
    </div>
  );
};

export default AnalyzeUsageTopUsedCard;
