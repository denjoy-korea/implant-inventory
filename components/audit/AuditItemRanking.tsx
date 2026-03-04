import React from 'react';
import { ItemRankingEntry } from './utils/auditReportUtils';

interface Props {
  items: ItemRankingEntry[];
}

const AuditItemRanking: React.FC<Props> = ({ items }) => {
  if (items.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-black text-slate-900 mb-1">품목별 불일치 랭킹</p>
        <p className="text-xs text-slate-400 mt-6">불일치 이력이 없습니다.</p>
      </div>
    );
  }

  const maxCount = items[0].mismatchCount;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-black text-slate-900">품목별 불일치 랭킹</p>
        <p className="text-[11px] font-semibold text-slate-400">누적 상위 {items.length}종</p>
      </div>
      <div className="flex flex-col gap-2.5">
        {items.map((item, idx) => {
          const pct = maxCount > 0 ? (item.mismatchCount / maxCount) * 100 : 0;
          const rankColor = idx === 0 ? 'text-rose-600' : idx === 1 ? 'text-orange-500' : idx === 2 ? 'text-amber-500' : 'text-slate-400';
          return (
            <div key={item.key} className="flex items-center gap-3">
              <span className={`text-xs font-black w-4 text-right tabular-nums shrink-0 ${rankColor}`}>{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <p className="text-[11px] font-bold text-slate-800 truncate">
                    {item.brand} {(!item.size || item.size === '기타') ? '' : item.size}
                  </p>
                  <p className="text-[11px] font-black text-rose-600 tabular-nums shrink-0 ml-2">{item.mismatchCount}회</p>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-rose-400 to-rose-500 transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">{item.manufacturer} · 누적 오차 {item.totalDiff}개</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AuditItemRanking;
