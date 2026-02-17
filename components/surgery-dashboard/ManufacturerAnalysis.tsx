import React, { useState } from 'react';
import { DonutSegment, ManufacturerFailStat, SizeRankStat, CHART_FOCUS_CLASS } from './shared';

const RANK_STYLES = [
  'bg-amber-100 text-amber-700',
  'bg-slate-200 text-slate-600',
  'bg-orange-100 text-orange-600',
  'bg-slate-100 text-slate-500',
  'bg-slate-100 text-slate-500',
];

interface Props {
  manufacturerDonut: DonutSegment[];
  manufacturerFailStats: ManufacturerFailStat[];
  topSizes: SizeRankStat[];
  totalPlacements: number;
  mounted: boolean;
}

export default function ManufacturerAnalysis({ manufacturerDonut, manufacturerFailStats, topSizes, totalPlacements, mounted }: Props) {
  const [hoveredDonut, setHoveredDonut] = useState<number | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const len = manufacturerDonut.length;
    if (len === 0) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredDonut(prev => prev === null ? 0 : (prev + 1) % len);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredDonut(prev => prev === null ? len - 1 : (prev - 1 + len) % len);
    } else if (e.key === 'Escape') {
      setHoveredDonut(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-l-[3px] border-l-indigo-500 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-800">제조사 분석</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Manufacturer Analysis</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-28">
        {/* Donut + Legend */}
        <div className="flex items-center gap-5">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 100 100" className={`w-full h-full transform -rotate-90 ${CHART_FOCUS_CLASS}`}
              role="img" aria-label="제조사별 식립 분포 도넛 차트"
              tabIndex={0} onKeyDown={handleKeyDown}
              onBlur={() => setHoveredDonut(null)}
              style={{ touchAction: 'manipulation' }}>
              {manufacturerDonut.map((d, i) => {
                const isHov = hoveredDonut === i;
                const tx = isHov ? Math.cos(d.midAngle) * 3 : 0;
                const ty = isHov ? Math.sin(d.midAngle) * 3 : 0;
                return (
                  <path key={i} d={d.path} fill="none" stroke={d.color}
                    strokeWidth={isHov ? 12 : 10} strokeLinecap="round"
                    className="cursor-pointer"
                    style={{
                      transform: `translate(${tx}px, ${ty}px)`,
                      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), stroke-width 0.4s cubic-bezier(0.16, 1, 0.3, 1), stroke-dashoffset 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                      strokeDasharray: d.arcLength,
                      strokeDashoffset: mounted ? 0 : d.arcLength,
                      transitionDelay: mounted ? `${i * 100}ms` : '0ms',
                    }}
                    onPointerEnter={() => setHoveredDonut(i)}
                    onPointerLeave={() => setHoveredDonut(null)}
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <p className="text-lg font-semibold text-slate-800 tabular-nums">{totalPlacements}</p>
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            {manufacturerDonut.map((d, i) => (
              <div key={d.name}
                className={`flex items-center justify-between px-2 py-1 rounded-md transition-colors cursor-default ${hoveredDonut === i ? 'bg-slate-50' : ''}`}
                onPointerEnter={() => setHoveredDonut(i)}
                onPointerLeave={() => setHoveredDonut(null)}>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="text-[11px] font-medium text-slate-600 truncate" title={d.name}>{d.name}</span>
                </div>
                <span className="text-[11px] tabular-nums text-slate-500">{d.count} <span className="font-semibold text-slate-700">{Math.round(d.percent * 100)}%</span></span>
              </div>
            ))}
          </div>
        </div>

        {/* TOP 5 Size Ranking */}
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
            사이즈별 TOP 5 / Size Ranking
          </p>
          {topSizes.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">사이즈 데이터 없음</p>
          ) : (
            <div className="space-y-2.5">
              {topSizes.map((item, i) => {
                const pct = totalPlacements > 0 ? Math.round((item.count / totalPlacements) * 100) : 0;
                const label = [item.brand, item.size].filter(Boolean).join(' - ') || '-';
                return (
                  <div key={`${item.brand}|${item.size}`} className="flex items-center gap-2.5">
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${RANK_STYLES[i]}`}>
                      {i + 1}
                    </span>
                    <span className="text-[11px] font-medium text-slate-700 truncate flex-1 min-w-0" title={label}>
                      <span className="font-semibold">{item.brand || '-'}</span>
                      <span className="text-slate-400 mx-1">-</span>
                      <span className="text-slate-500">{item.size || '-'}</span>
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-500 flex-shrink-0">
                      {item.count}건 <span className="font-semibold text-indigo-600">{pct}%</span>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FAIL Rate Bars */}
        <div className="min-w-0">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-3 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
            FAIL률 / Failure Rate
          </p>
          {manufacturerFailStats.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-8">FAIL 데이터 없음</p>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxRate = Math.max(...manufacturerFailStats.map(f => f.failRate), 1);
                return manufacturerFailStats.map((f, i) => {
                  const barPct = Math.round((f.failRate / maxRate) * 100);
                  return (
                    <div key={f.name}>
                      <div className="flex items-center justify-between mb-1 gap-2">
                        <span className="text-[11px] font-medium text-slate-600 truncate min-w-0" title={f.name}>{f.name}</span>
                        <span className="text-[11px] tabular-nums text-slate-500">
                          {f.failCount}건<span className="text-slate-300 mx-0.5">/</span>{f.placeCount}건
                          <span className="font-semibold text-rose-600 ml-1">{f.failRate}%</span>
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-[width] duration-700"
                          style={{
                            width: mounted ? `${barPct}%` : '0%',
                            backgroundColor: '#F43F5E',
                            opacity: 1 - i * 0.15,
                            transitionDelay: `${i * 80}ms`,
                          }} />
                      </div>
                    </div>
                  );
                });
              })()}
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total FAIL</span>
                <span className="text-sm font-semibold text-slate-800 tabular-nums">{manufacturerFailStats.reduce((s, f) => s + f.failCount, 0)}건</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
