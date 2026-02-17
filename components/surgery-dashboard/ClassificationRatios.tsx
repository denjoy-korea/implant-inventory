import React, { useState } from 'react';

interface Props {
  classificationStats: Record<string, number>;
  mounted: boolean;
}

function RingGauge({ labelA, labelB, countA, countB, colorA, colorB, mounted, delay = 0 }: {
  labelA: string; labelB: string; countA: number; countB: number;
  colorA: string; colorB: string; mounted: boolean; delay?: number;
}) {
  const [hovered, setHovered] = useState<'a' | 'b' | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      setHovered(prev => prev === 'a' ? 'b' : 'a');
    } else if (e.key === 'Escape') {
      setHovered(null);
    }
  };

  const total = countA + countB || 1;
  const pctA = Math.round((countA / total) * 100);
  const pctB = 100 - pctA;
  const r = 36;
  const circumference = 2 * Math.PI * r;
  const dashA = (pctA / 100) * circumference;

  const centerText = hovered === 'a' ? `${pctA}%` : hovered === 'b' ? `${pctB}%` : `${pctA}%`;
  const centerColor = hovered === 'a' ? colorA : hovered === 'b' ? colorB : '#334155';

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-24 h-24 flex-shrink-0">
        <svg viewBox="0 0 100 100" className="w-full h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 rounded-full"
          role="img" aria-label={`${labelA} ${pctA}% 대 ${labelB} ${pctB}% 비율 링 게이지`}
          tabIndex={0} onKeyDown={handleKeyDown}
          onBlur={() => setHovered(null)}
          style={{ touchAction: 'manipulation' }}>
          <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="50" cy="50" r={r} fill="none" stroke={colorA}
            strokeWidth={hovered === 'a' ? 11 : 8} strokeLinecap="round"
            strokeDasharray={`${mounted ? dashA : 0} ${circumference}`}
            transform="rotate(-90 50 50)"
            className="cursor-pointer"
            style={{ transition: `stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1) ${delay}s, stroke-width 0.3s ease` }}
            onPointerEnter={() => setHovered('a')}
            onPointerLeave={() => setHovered(null)} />
          <circle cx="50" cy="50" r={r} fill="none" stroke={colorB}
            strokeWidth={hovered === 'b' ? 11 : 8} strokeLinecap="round"
            strokeDasharray={`${mounted ? circumference - dashA : 0} ${circumference}`}
            strokeDashoffset={mounted ? -dashA : 0}
            transform="rotate(-90 50 50)"
            className="cursor-pointer"
            style={{ transition: `stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1) ${delay + 0.15}s, stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1) ${delay + 0.15}s, stroke-width 0.3s ease` }}
            onPointerEnter={() => setHovered('b')}
            onPointerLeave={() => setHovered(null)} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-sm font-semibold tabular-nums transition-colors duration-200" style={{ color: centerColor }}>{centerText}</span>
        </div>
      </div>
      <div className="flex-1 space-y-2">
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{labelA} vs {labelB}</p>
        <div className="space-y-1.5">
          {([
            { key: 'a' as const, label: labelA, count: countA, pct: pctA, color: colorA },
            { key: 'b' as const, label: labelB, count: countB, pct: pctB, color: colorB },
          ]).map(item => (
            <div key={item.label}
              className={`flex items-center justify-between px-1.5 py-0.5 rounded transition-colors cursor-default ${hovered === item.key ? 'bg-slate-50' : ''}`}
              onPointerEnter={() => setHovered(item.key)}
              onPointerLeave={() => setHovered(null)}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full transition-transform duration-200" style={{ backgroundColor: item.color, transform: hovered === item.key ? 'scale(1.4)' : 'scale(1)' }} />
                <span className={`text-[11px] font-medium transition-colors duration-200 ${hovered === item.key ? 'text-slate-800' : 'text-slate-600'}`}>{item.label}</span>
              </div>
              <span className={`text-[11px] tabular-nums transition-colors duration-200 ${hovered === item.key ? 'text-slate-700' : 'text-slate-500'}`}>{item.count}건 <span className="font-semibold" style={{ color: hovered === item.key ? item.color : undefined }}>{item.pct}%</span></span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ClassificationRatios({ classificationStats, mounted }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 border-l-[3px] border-l-violet-400 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 flex flex-col">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">구분별 비율</h3>
        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Classification Ratio</p>
      </div>
      <div className="flex-1 flex flex-col justify-center gap-6">
        <RingGauge
          labelA="식립" labelB="청구"
          countA={classificationStats['식립']} countB={classificationStats['청구']}
          colorA="#4F46E5" colorB="#0EA5E9" mounted={mounted} delay={0} />
        <div className="h-px bg-slate-100" />
        <RingGauge
          labelA="식립" labelB="수술중 FAIL"
          countA={classificationStats['식립']} countB={classificationStats['수술중 FAIL']}
          colorA="#4F46E5" colorB="#F43F5E" mounted={mounted} delay={0.3} />
      </div>
    </div>
  );
}
