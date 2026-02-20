import React, { useState } from 'react';
import { MonthlyDatum, BAR_SERIES, CHART_FOCUS_CLASS } from './shared';

interface Props {
  monthlyData: MonthlyDatum[];
  mounted: boolean;
  onMonthClick?: (month: string) => void;
  selectedMonth?: string | null;
}

export default function MonthlyTrendChart({ monthlyData, mounted, onMonthClick, selectedMonth }: Props) {
  const [hoveredBarGroup, setHoveredBarGroup] = useState<number | null>(null);

  const W = 700, H = 300;
  const pad = { l: 48, r: 20, t: 25, b: 55 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const groupCount = monthlyData.length;
  const groupW = groupCount > 0 ? plotW / groupCount : 0;
  const barW = Math.min(22, groupW * 0.24);
  const barGap = 3;
  const maxVal = Math.max(1, ...monthlyData.flatMap(d => [d['식립'], d['청구'], d['수술중 FAIL']]));
  const niceMax = Math.ceil(maxVal / 5) * 5;
  const yTicks = Array.from({ length: 6 }, (_, i) => Math.round((niceMax / 5) * i));

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredBarGroup(prev => prev === null ? 0 : Math.min(prev + 1, groupCount - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredBarGroup(prev => prev === null ? groupCount - 1 : Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setHoveredBarGroup(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-l-[3px] border-l-indigo-500 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">월별 추세</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Monthly Trend</p>
          {onMonthClick && (
            <p className="text-[10px] text-indigo-400 font-medium mt-1 flex items-center gap-1">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5" /></svg>
              월 클릭 시 해당 월 KPI 상세보기
            </p>
          )}
        </div>
        <div className="flex items-center gap-5">
          {BAR_SERIES.map(s => (
            <div key={s.key} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-[11px] font-medium text-slate-400">{s.key}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="chart-dot-grid rounded-lg" style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className={CHART_FOCUS_CLASS}
          style={{ minWidth: Math.max(500, groupCount * 65), overflow: 'visible', touchAction: 'manipulation' }}
          role="img" aria-label="월별 식립, 청구, 수술중 FAIL 건수 추이 바 차트"
          tabIndex={0} onKeyDown={handleKeyDown}
          onPointerLeave={() => setHoveredBarGroup(null)}
          onBlur={() => setHoveredBarGroup(null)}>
          <defs>
            <filter id="bar-tooltip-shadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
            </filter>
          </defs>
          {/* Y grid + labels */}
          {yTicks.map(tick => {
            const y = pad.t + plotH - (tick / niceMax) * plotH;
            return (
              <g key={tick}>
                <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#eef2f6" strokeWidth={1} />
                <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize={10} fontWeight={400} fill="#94a3b8">{tick}</text>
              </g>
            );
          })}
          {/* Bars */}
          {monthlyData.map((d, i) => {
            const groupX = pad.l + i * groupW + groupW / 2;
            const isHovered = hoveredBarGroup === i;
            const isSelected = selectedMonth === d.month;
            const hasSelection = selectedMonth != null;
            const isDimmed = hasSelection && !isSelected && !isHovered;

            return (
              <g key={d.month} className="transition-opacity duration-300" style={{ opacity: isDimmed ? 0.3 : 1 }}>
                <rect x={pad.l + i * groupW} y={pad.t} width={groupW} height={plotH + pad.b}
                  fill="transparent" className={`cursor-pointer transition-colors ${isHovered || isSelected ? 'opacity-100' : 'opacity-0'}`}
                  onPointerEnter={() => setHoveredBarGroup(i)}
                  onClick={() => onMonthClick?.(d.month)} />
                {(isHovered || isSelected) && (
                  <rect x={pad.l + i * groupW + 4} y={pad.t - 4} width={groupW - 8} height={plotH + 20} rx={6} fill={onMonthClick ? "rgba(79, 70, 229, 0.04)" : "#F1F5F9"} className={onMonthClick ? "cursor-pointer" : ""} onClick={() => onMonthClick?.(d.month)} />
                )}
                {(isHovered || isSelected) && (
                  <line x1={groupX} y1={pad.t} x2={groupX} y2={pad.t + plotH} stroke={isSelected ? "#818cf8" : "#CBD5E1"} strokeWidth={isSelected ? 1.5 : 1} strokeDasharray="4 4" />
                )}
                {BAR_SERIES.map((s, si) => {
                  const val = d[s.key];
                  const h = (val / niceMax) * plotH;
                  const x = groupX - (BAR_SERIES.length * barW + (BAR_SERIES.length - 1) * barGap) / 2 + si * (barW + barGap);
                  const y = pad.t + plotH - h;
                  return (
                    <g key={s.key}>
                      <rect x={x} y={y} width={barW} height={Math.max(0, h)} rx={3} fill={s.color}
                        opacity={isHovered ? 1 : 0.8}
                        className="transition-opacity duration-200"
                        style={{
                          transformOrigin: `${x + barW / 2}px ${pad.t + plotH}px`,
                          animation: mounted ? `bar-grow 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 60 + si * 30}ms both` : 'none',
                        }} />
                      {isHovered && val > 0 && (
                        <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize={9} fontWeight={500} fill="#475569">{val}</text>
                      )}
                    </g>
                  );
                })}
                <text x={groupX} y={H - pad.b + 24} textAnchor="middle"
                  fontSize={10} fontWeight={isHovered || isSelected ? 600 : 400} fill={isSelected ? '#4f46e5' : isHovered ? '#334155' : '#94a3b8'}>
                  {d.month.substring(2)}
                </text>
              </g>
            );
          })}
          {/* Tooltip — positioned inside chart area */}
          {hoveredBarGroup !== null && monthlyData[hoveredBarGroup] && (() => {
            const d = monthlyData[hoveredBarGroup];
            const groupX = pad.l + hoveredBarGroup * groupW + groupW / 2;
            const tooltipW = 130;
            const tooltipH = 68;
            const tx = Math.min(Math.max(tooltipW / 2, groupX), W - tooltipW / 2);
            const ty = pad.t + 2;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tx - tooltipW / 2} y={ty} width={tooltipW} height={tooltipH} rx={8} fill="#1e293b" opacity={0.95} filter="url(#bar-tooltip-shadow)" />
                <text x={tx} y={ty + 16} textAnchor="middle" fill="#94a3b8" fontSize={9} fontWeight={500}>{d.month}</text>
                {BAR_SERIES.map((s, si) => (
                  <g key={s.key}>
                    <rect x={tx - tooltipW / 2 + 10} y={ty + 24 + si * 15} width={6} height={6} rx={1} fill={s.color} />
                    <text x={tx - tooltipW / 2 + 20} y={ty + 31 + si * 15} fill="#cbd5e1" fontSize={9} fontWeight={400}>{s.key}</text>
                    <text x={tx + tooltipW / 2 - 10} y={ty + 31 + si * 15} textAnchor="end" fill="white" fontSize={9} fontWeight={500}>{d[s.key]}건</text>
                  </g>
                ))}
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
