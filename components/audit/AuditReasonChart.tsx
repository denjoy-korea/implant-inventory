import React from 'react';
import { ReasonStat } from './utils/auditReportUtils';

interface Props {
  stats: ReasonStat[];
}

const COLORS = ['#6366f1', '#f43f5e', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

const AuditReasonChart: React.FC<Props> = ({ stats }) => {
  if (stats.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-black text-slate-900 mb-1">불일치 사유 분석</p>
        <p className="text-xs text-slate-400 mt-6">사유 데이터가 없습니다.</p>
      </div>
    );
  }

  const total = stats.reduce((s, r) => s + r.count, 0);
  const maxCount = stats[0].count;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-black text-slate-900">불일치 사유 분석</p>
        <p className="text-[11px] font-semibold text-slate-400">총 {total}건</p>
      </div>
      <div className="flex flex-col gap-3">
        {stats.map((r, i) => {
          const pct = maxCount > 0 ? (r.count / maxCount) * 100 : 0;
          const totalPct = total > 0 ? Math.round((r.count / total) * 100) : 0;
          const color = COLORS[i % COLORS.length];
          return (
            <div key={r.reason}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span className="text-[11px] font-bold text-slate-700">{r.reason}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black tabular-nums" style={{ color }}>{r.count}건</span>
                  <span className="text-[10px] text-slate-400 tabular-nums w-8 text-right">{totalPct}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditReasonChart;
