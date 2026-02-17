import React, { useState, useMemo } from 'react';
import { MonthlyDatum, TrendlineData, smoothLine, smoothArea, CHART_FOCUS_CLASS } from './shared';

type SeriesKey = '식립' | '청구' | '수술중 FAIL';

const SERIES_OPTIONS: { key: SeriesKey; label: string; color: string }[] = [
  { key: '식립', label: '식립', color: '#4F46E5' },
  { key: '수술중 FAIL', label: '페일', color: '#F43F5E' },
  { key: '청구', label: '보험', color: '#0EA5E9' },
];

interface Props {
  monthlyData: MonthlyDatum[];
  monthlyAvgPlacement: number;
  trendline: TrendlineData | null;
  mounted: boolean;
}

export default function PlacementTrendChart({ monthlyData, mounted }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [activeKey, setActiveKey] = useState<SeriesKey>('식립');
  const activeOption = SERIES_OPTIONS.find(s => s.key === activeKey)!;
  const color = activeOption.color;

  const W = 700, H = 260;
  const pad = { l: 48, r: 20, t: 25, b: 55 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const count = monthlyData.length;
  const maxVal = Math.max(1, ...monthlyData.map(d => d[activeKey]));
  const niceMax = Math.ceil(maxVal / 5) * 5;

  const avg = useMemo(() => {
    if (monthlyData.length === 0) return 0;
    const total = monthlyData.reduce((sum, d) => sum + d[activeKey], 0);
    return Number((total / monthlyData.length).toFixed(1));
  }, [monthlyData, activeKey]);

  const trendline = useMemo(() => {
    if (monthlyData.length < 2) return null;
    const n = monthlyData.length;
    const yVals = monthlyData.map(d => d[activeKey]);
    const xVals = monthlyData.map((_, i) => i);
    const sumX = xVals.reduce((a, b) => a + b, 0);
    const sumY = yVals.reduce((a, b) => a + b, 0);
    const sumXY = xVals.reduce((a, x, i) => a + x * yVals[i], 0);
    const sumXX = xVals.reduce((a, x) => a + x * x, 0);
    const denom = n * sumXX - sumX * sumX;
    if (denom === 0) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }, [monthlyData, activeKey]);

  const linePoints = useMemo(() => monthlyData.map((d, i) => {
    const x = pad.l + (count > 1 ? (i / (count - 1)) * plotW : plotW / 2);
    const y = pad.t + plotH - (d[activeKey] / niceMax) * plotH;
    return { x, y, value: d[activeKey], month: d.month };
  }), [monthlyData, activeKey, count, plotW, plotH, pad.l, pad.t, niceMax]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredIdx(prev => prev === null ? 0 : Math.min(prev + 1, count - 1));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredIdx(prev => prev === null ? count - 1 : Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setHoveredIdx(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-l-[3px] border-l-sky-500 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">추세 분석</h3>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Trend Analysis</p>
        </div>
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
          {SERIES_OPTIONS.map(s => (
            <button key={s.key}
              onClick={() => { setActiveKey(s.key); setHoveredIdx(null); }}
              className={`inline-flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-200 ${
                activeKey === s.key
                  ? 'bg-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
              style={activeKey === s.key ? { color: s.color } : undefined}>
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: s.color, opacity: activeKey === s.key ? 1 : 0.4 }} />
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-dot-grid rounded-lg" style={{ overflowX: 'auto', overflowY: 'visible' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className={CHART_FOCUS_CLASS}
          style={{ minWidth: Math.max(400, count * 55), overflow: 'visible', touchAction: 'manipulation' }}
          role="img" aria-label={`월별 ${activeOption.label} 건수 추세 라인 차트`}
          tabIndex={0} onKeyDown={handleKeyDown}
          onPointerLeave={() => setHoveredIdx(null)}
          onBlur={() => setHoveredIdx(null)}>
          <defs>
            <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
            <filter id="trendLineShadow" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={color} floodOpacity="0.25" />
            </filter>
            <filter id="trendTooltipShadow">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
            </filter>
          </defs>
          {/* Y grid */}
          {Array.from({ length: 6 }, (_, i) => Math.round((niceMax / 5) * i)).map(tick => {
            const y = pad.t + plotH - (tick / niceMax) * plotH;
            return (
              <g key={tick}>
                <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#eef2f6" strokeWidth={1} />
                <text x={pad.l - 10} y={y + 4} textAnchor="end" fontSize={10} fontWeight={400} fill="#94a3b8">{tick}</text>
              </g>
            );
          })}
          {/* Average line */}
          {avg > 0 && (() => {
            const avgY = pad.t + plotH - (avg / niceMax) * plotH;
            return (
              <g>
                <line x1={pad.l} y1={avgY} x2={W - pad.r} y2={avgY} stroke="#94a3b8" strokeWidth={1} strokeDasharray="6 4" />
                <text x={W - pad.r + 4} y={avgY + 3} fill="#94a3b8" fontSize={9} fontWeight={500}>avg {avg}</text>
              </g>
            );
          })()}
          {/* Area fill */}
          {linePoints.length >= 2 && (
            <path d={smoothArea(linePoints, pad.t + plotH)} fill="url(#trendAreaGrad)"
              opacity={mounted ? 1 : 0} style={{ transition: 'opacity 0.8s ease' }} />
          )}
          {/* Main line */}
          {linePoints.length >= 2 && (() => {
            const pathD = smoothLine(linePoints);
            return (
              <path d={pathD} fill="none" stroke={color} strokeWidth={3} filter="url(#trendLineShadow)"
                strokeLinecap="round" strokeLinejoin="round"
                strokeDasharray={2000} strokeDashoffset={mounted ? 0 : 2000}
                style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            );
          })()}
          {/* Trendline */}
          {trendline && linePoints.length >= 2 && (() => {
            const firstX = linePoints[0].x;
            const lastX = linePoints[linePoints.length - 1].x;
            const y1Val = trendline.intercept;
            const y2Val = trendline.slope * (linePoints.length - 1) + trendline.intercept;
            const ty1 = pad.t + plotH - (Math.max(0, y1Val) / niceMax) * plotH;
            const ty2 = pad.t + plotH - (Math.max(0, y2Val) / niceMax) * plotH;
            const label = trendline.slope >= 0 ? `↗ +${trendline.slope.toFixed(1)}/월` : `↘ ${trendline.slope.toFixed(1)}/월`;
            return (
              <g opacity={mounted ? 0.6 : 0} style={{ transition: 'opacity 1s ease 1s' }}>
                <line x1={firstX} y1={ty1} x2={lastX} y2={ty2} stroke="#94a3b8" strokeWidth={1.5} strokeDasharray="8 4" />
                <text x={lastX + 6} y={ty2 + 3} fill="#94a3b8" fontSize={8} fontWeight={500}>{label}</text>
              </g>
            );
          })()}
          {/* Hover hit areas */}
          {linePoints.map((p, i) => {
            const halfGap = count > 1 ? plotW / (count - 1) / 2 : plotW / 2;
            return (
              <rect key={`hover-${i}`} x={p.x - halfGap} y={pad.t} width={halfGap * 2} height={plotH + pad.b}
                fill="transparent" className="cursor-pointer"
                onPointerEnter={() => setHoveredIdx(i)} />
            );
          })}
          {/* Crosshair */}
          {hoveredIdx !== null && linePoints[hoveredIdx] && (
            <line x1={linePoints[hoveredIdx].x} y1={pad.t} x2={linePoints[hoveredIdx].x} y2={pad.t + plotH}
              stroke="#e2e8f0" strokeWidth={1} strokeDasharray="4 3" />
          )}
          {/* Data points */}
          {linePoints.map((p, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r={isHovered ? 8 : 0} fill={color} opacity={isHovered ? 0.1 : 0}
                  className="transition-[r,opacity] duration-200" />
                <circle cx={p.x} cy={p.y} r={isHovered ? 6 : 4} fill="white" stroke={color} strokeWidth={2.5}
                  className="transition-[r] duration-150" />
                <circle cx={p.x} cy={p.y} r={2} fill={color} />
              </g>
            );
          })}
          {/* X labels */}
          {linePoints.map((p, i) => (
            <text key={i} x={p.x} y={H - pad.b + 20} textAnchor="middle"
              fontSize={10} fontWeight={hoveredIdx === i ? 500 : 400} fill={hoveredIdx === i ? '#334155' : '#94a3b8'}>
              {monthlyData[i]?.month.substring(2)}
            </text>
          ))}
          {/* Tooltip */}
          {hoveredIdx !== null && linePoints[hoveredIdx] && (() => {
            const p = linePoints[hoveredIdx];
            const tooltipW = 100;
            const tooltipH = 24;
            const tx = Math.min(Math.max(tooltipW / 2, p.x), W - tooltipW / 2);
            const above = p.y - 36 >= 0;
            const ty = above ? p.y - 36 : p.y + 12;
            return (
              <g style={{ pointerEvents: 'none' }}>
                <rect x={tx - tooltipW / 2} y={ty} width={tooltipW} height={tooltipH} rx={4} fill="#1e293b" opacity={0.95} filter="url(#trendTooltipShadow)" />
                <text x={tx} y={ty + 16} textAnchor="middle" fill="white" fontSize={10} fontWeight={600}>{p.month}: {p.value}건</text>
              </g>
            );
          })()}
        </svg>
      </div>
    </div>
  );
}
