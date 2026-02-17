import React, { useState } from 'react';
import { ToothAnalysisData, ToothHeatmapData } from './shared';

interface Props {
  toothAnalysis: ToothAnalysisData;
  toothHeatmap: ToothHeatmapData;
  mounted: boolean;
}

function getToothInfo(n: number): { jaw: string; position: string; name: string } {
  const tens = Math.floor(n / 10);
  const ones = n % 10;
  const jaw = tens <= 2 ? '상악' : '하악';
  const side = tens === 1 || tens === 4 ? '우측' : '좌측';
  const names: Record<number, string> = {
    1: '중절치', 2: '측절치', 3: '견치', 4: '제1소구치',
    5: '제2소구치', 6: '제1대구치', 7: '제2대구치',
  };
  const position = ones <= 3 ? '전치부' : '구치부';
  return { jaw: `${jaw} ${side}`, position, name: names[ones] || '' };
}

function ToothCell({ n, count, maxCount }: { n: number; count: number; maxCount: number }) {
  const [hovered, setHovered] = useState(false);
  const intensity = count > 0 ? Math.max(0.15, count / maxCount) : 0;
  const info = getToothInfo(n);
  const isUpper = Math.floor(n / 10) <= 2;

  return (
    <div className="relative aspect-square"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}>
      <div className={`w-full h-full rounded-md flex flex-col items-center justify-center cursor-default transition-transform duration-150 ${hovered && count > 0 ? 'scale-110 z-10' : ''}`}
        style={{ backgroundColor: count > 0 ? `rgba(79, 70, 229, ${intensity})` : '#f1f5f9' }}
        role="gridcell" aria-label={`치아 #${n}: ${count}건 식립`}>
        <span className={`text-[9px] leading-none font-medium ${intensity > 0.5 ? 'text-white' : 'text-slate-400'}`}>{n}</span>
        <span className={`text-[10px] leading-none font-bold mt-0.5 ${count > 0 ? (intensity > 0.5 ? 'text-white' : 'text-indigo-600') : 'text-transparent'}`}>{count || '\u00B7'}</span>
      </div>
      {hovered && (
        <div className={`absolute left-1/2 -translate-x-1/2 z-30 pointer-events-none ${isUpper ? 'top-full mt-1.5' : 'bottom-full mb-1.5'}`}
          style={{ minWidth: '100px' }}>
          {!isUpper && (
            <>
              <div className="bg-slate-800 text-white rounded-lg px-2.5 py-1.5 text-center shadow-lg">
                <p className="text-[10px] font-semibold whitespace-nowrap">#{n} {info.name}</p>
                <p className="text-[9px] text-slate-300 whitespace-nowrap">{info.jaw} {'\u00B7'} {info.position}</p>
                <p className="text-[11px] font-bold mt-0.5 tabular-nums">{count}건 식립</p>
              </div>
              <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mt-1" />
            </>
          )}
          {isUpper && (
            <>
              <div className="w-2 h-2 bg-slate-800 rotate-45 mx-auto -mb-1" />
              <div className="bg-slate-800 text-white rounded-lg px-2.5 py-1.5 text-center shadow-lg">
                <p className="text-[10px] font-semibold whitespace-nowrap">#{n} {info.name}</p>
                <p className="text-[9px] text-slate-300 whitespace-nowrap">{info.jaw} {'\u00B7'} {info.position}</p>
                <p className="text-[11px] font-bold mt-0.5 tabular-nums">{count}건 식립</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ToothRow({ teeth, heatmap }: { teeth: number[]; heatmap: ToothHeatmapData }) {
  const renderHalf = (nums: number[]) => (
    <div className="grid grid-cols-7 gap-[2px] flex-1">
      {nums.map(n => (
        <React.Fragment key={n}>
          <ToothCell n={n} count={heatmap.counts[n] || 0} maxCount={heatmap.maxCount} />
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <div className="mb-2">
      <div className="flex gap-[2px]" role="row">
        {renderHalf(teeth.slice(0, 7))}
        <div className="w-px bg-slate-300 mx-0.5 self-stretch flex-shrink-0" />
        {renderHalf(teeth.slice(7))}
      </div>
    </div>
  );
}

export default function ToothAnalysis({ toothAnalysis, toothHeatmap, mounted }: Props) {
  const positionItems = [
    { label: '상악', value: toothAnalysis.upper, pct: toothAnalysis.upperPercent, color: '#4F46E5' },
    { label: '하악', value: toothAnalysis.lower, pct: toothAnalysis.lowerPercent, color: '#93C5FD' },
    { label: '전치부', value: toothAnalysis.anterior, pct: toothAnalysis.anteriorPercent, color: '#10B981' },
    { label: '구치부', value: toothAnalysis.posterior, pct: toothAnalysis.posteriorPercent, color: '#A7F3D0' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-l-[3px] border-l-emerald-500 p-6 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-slate-800">식립 부위 분석</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Position Distribution & FDI Heatmap</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        {/* Ring chart + summary */}
        <div className="flex items-center gap-5">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-label="식립 부위별 분포 링 차트">
              <circle cx="50" cy="50" r="44" fill="none" stroke="#f1f5f9" strokeWidth="7" />
              <circle cx="50" cy="50" r="33" fill="none" stroke="#f1f5f9" strokeWidth="7" />
              <circle cx="50" cy="50" r="44" fill="none" stroke="#4F46E5" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 44 * toothAnalysis.upperPercent / 100} ${2 * Math.PI * 44}`}
                transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1)' }} />
              <circle cx="50" cy="50" r="33" fill="none" stroke="#10B981" strokeWidth="7" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 33 * toothAnalysis.anteriorPercent / 100} ${2 * Math.PI * 33}`}
                transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 1.2s cubic-bezier(0.16,1,0.3,1) 0.2s' }} />
              <text x="50" y="50" textAnchor="middle" dominantBaseline="central" fill="#0f172a" fontSize="14" fontWeight="600">{toothAnalysis.upper + toothAnalysis.lower}</text>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-x-5 gap-y-2 flex-1">
            {positionItems.map((item, i) => (
              <div key={i}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{item.label}</span>
                </div>
                <p className="text-lg font-semibold text-slate-800 tabular-nums leading-none">{item.value}<span className="text-[10px] font-normal text-slate-400 ml-1">{item.pct}%</span></p>
              </div>
            ))}
          </div>
        </div>

        {/* FDI Heatmap */}
        <div className="min-w-0 relative" role="grid" aria-label="FDI 치아번호별 식립 빈도 히트맵" style={{ overflow: 'visible' }}>
          <ToothRow teeth={[17,16,15,14,13,12,11, 21,22,23,24,25,26,27]} heatmap={toothHeatmap} />
          <ToothRow teeth={[47,46,45,44,43,42,41, 31,32,33,34,35,36,37]} heatmap={toothHeatmap} />
          <div className="flex items-center justify-center gap-2 mt-3">
            <span className="text-[8px] text-slate-400">낮음</span>
            <div className="flex gap-0.5">
              {[0.15, 0.3, 0.5, 0.7, 1].map((op, i) => (
                <div key={i} className="w-4 h-2.5 rounded-sm" style={{ backgroundColor: `rgba(79, 70, 229, ${op})` }} />
              ))}
            </div>
            <span className="text-[8px] text-slate-400">높음</span>
          </div>
        </div>
      </div>
    </div>
  );
}
