import React, { useState } from 'react';
import { DayOfWeekStat, DayInsight, CHART_FOCUS_CLASS } from './shared';

interface Props {
  dayOfWeekStats: DayOfWeekStat[];
  dayInsight: DayInsight | null;
  mounted: boolean;
}

export default function DayOfWeekChart({ dayOfWeekStats, dayInsight, mounted }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const svgW = 280, svgH = 260;
  const pad = { l: 30, r: 10, t: 10, b: 28 };
  const plotW = svgW - pad.l - pad.r;
  const plotH = svgH - pad.t - pad.b;
  const maxDow = Math.max(...dayOfWeekStats.map(d => d.count), 1);
  const niceDowMax = Math.ceil(maxDow / 5) * 5;
  const colW = plotW / 7;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setHoveredIdx(prev => prev === null ? 0 : Math.min(prev + 1, 6));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setHoveredIdx(prev => prev === null ? 6 : Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setHoveredIdx(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-l-[3px] border-l-indigo-300 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">요일별 식립 패턴</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Weekly Pattern</p>
      </div>
      <svg viewBox={`0 0 ${svgW} ${svgH}`} className={`flex-1 ${CHART_FOCUS_CLASS}`}
        preserveAspectRatio="xMidYMid meet" style={{ touchAction: 'manipulation' }}
        role="img" aria-label="요일별 식립 건수 컬럼 차트"
        tabIndex={0} onKeyDown={handleKeyDown}
        onBlur={() => setHoveredIdx(null)}>
        {[0, 1, 2, 3, 4, 5].map(i => {
          const val = Math.round((niceDowMax / 5) * i);
          const y = pad.t + plotH - (val / niceDowMax) * plotH;
          return (
            <g key={i}>
              <line x1={pad.l} y1={y} x2={svgW - pad.r} y2={y} stroke="#eef2f6" strokeWidth={1} />
              <text x={pad.l - 6} y={y + 3} textAnchor="end" fontSize={9} fontWeight={400} fill="#94a3b8">{val}</text>
            </g>
          );
        })}
        {dayOfWeekStats.map((d, i) => {
          const x = pad.l + i * colW + colW * 0.2;
          const w = colW * 0.6;
          const h = (d.count / niceDowMax) * plotH;
          const y = pad.t + plotH - h;
          const isWeekend = i === 0 || i === 6;
          const isHovered = hoveredIdx === i;
          return (
            <g key={i}>
              <rect x={pad.l + i * colW} y={pad.t} width={colW} height={plotH + pad.b}
                fill="transparent" className="cursor-pointer"
                onPointerEnter={() => setHoveredIdx(i)}
                onPointerLeave={() => setHoveredIdx(null)} />
              <rect x={x} y={mounted ? y : pad.t + plotH} width={w} height={mounted ? Math.max(h, 0) : 0} rx={3}
                fill={isWeekend ? '#e2e8f0' : '#4F46E5'}
                opacity={isHovered ? 1 : (isWeekend ? 1 : 0.85)}
                style={{ transition: `transform 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, height 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, y 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms, opacity 0.2s` }} />
              {d.count > 0 && (
                <text x={x + w / 2} y={(mounted ? y : pad.t + plotH) - 4} textAnchor="middle"
                  fontSize={9} fontWeight={isHovered ? 600 : 500} fill={isWeekend ? '#94a3b8' : '#475569'}
                  style={{ transition: `opacity 0.7s cubic-bezier(0.16,1,0.3,1) ${i * 60}ms` }}>{d.count}</text>
              )}
              <text x={pad.l + i * colW + colW / 2} y={svgH - pad.b + 14} textAnchor="middle"
                fontSize={10} fontWeight={isHovered ? 500 : 400} fill={isWeekend ? '#F43F5E' : '#94a3b8'}>{d.name}</text>
            </g>
          );
        })}
      </svg>
      {dayInsight && (
        <div className="mt-3 px-1 space-y-0.5">
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400 font-medium">피크 요일</span>
            <span className="font-semibold text-indigo-600">{dayInsight.peakDay.name} ({dayInsight.peakDay.count}건)</span>
            <span className="text-slate-300 mx-0.5">|</span>
            <span className="text-slate-400 font-medium">비수기</span>
            <span className="font-semibold text-slate-500">{dayInsight.lowDay.name} ({dayInsight.lowDay.count}건)</span>
          </div>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="text-slate-400 font-medium">평일 vs 주말</span>
            <span className="font-semibold text-slate-600">{dayInsight.weekdayTotal}건 : {dayInsight.weekendTotal}건</span>
            <span className="text-slate-400">({Math.round((dayInsight.weekdayTotal / (dayInsight.weekdayTotal + dayInsight.weekendTotal || 1)) * 100)}% : {Math.round((dayInsight.weekendTotal / (dayInsight.weekdayTotal + dayInsight.weekendTotal || 1)) * 100)}%)</span>
          </div>
        </div>
      )}
    </div>
  );
}
