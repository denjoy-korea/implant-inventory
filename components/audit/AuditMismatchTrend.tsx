import React from 'react';
import { TrendPoint } from './utils/auditReportUtils';
import { buildSparklinePath } from '../../utils/chartUtils';

interface Props {
  data: TrendPoint[];
}

const AuditMismatchTrend: React.FC<Props> = ({ data }) => {
  if (data.length < 2) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <p className="text-sm font-black text-slate-900 mb-1">불일치 추이</p>
        <p className="text-xs text-slate-400 mt-6">추이를 표시하려면 실사 기록이 2회 이상 필요합니다.</p>
      </div>
    );
  }

  const W = 560;
  const H = 100;
  const PAD = { top: 12, bottom: 28, left: 32, right: 12 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const counts = data.map(d => d.mismatchCount);
  const maxCount = Math.max(...counts, 1);
  const stepX = innerW / (data.length - 1);

  const points = data.map((d, i) => ({
    x: PAD.left + i * stepX,
    y: PAD.top + innerH - (d.mismatchCount / maxCount) * innerH,
    ...d,
  }));

  const pathD = buildSparklinePath(counts, innerW, innerH);
  // shift path to account for padding
  const shiftedPath = pathD.replace(/M ([\d.]+) ([\d.]+)/g, (_m, x, y) =>
    `M ${(parseFloat(x) + PAD.left).toFixed(2)} ${(parseFloat(y) + PAD.top).toFixed(2)}`
  ).replace(/L ([\d.]+) ([\d.]+)/g, (_m, x, y) =>
    `L ${(parseFloat(x) + PAD.left).toFixed(2)} ${(parseFloat(y) + PAD.top).toFixed(2)}`
  );

  // area fill path
  const areaPath = shiftedPath
    + ` L ${points[points.length - 1].x.toFixed(2)} ${(PAD.top + innerH).toFixed(2)}`
    + ` L ${points[0].x.toFixed(2)} ${(PAD.top + innerH).toFixed(2)} Z`;

  // Y axis labels (0, max)
  const yLabels = [
    { val: maxCount, y: PAD.top },
    { val: 0, y: PAD.top + innerH },
  ];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black text-slate-900">불일치 추이</p>
        <p className="text-[11px] font-semibold text-slate-400">최근 {data.length}회 실사</p>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[120px]" role="img" aria-label="회차별 불일치 건수 추이">
        {/* Y axis labels */}
        {yLabels.map(({ val, y }) => (
          <text key={y} x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize={9} fill="#94a3b8" fontFamily="monospace">{val}</text>
        ))}
        {/* Grid lines */}
        {[0, 0.5, 1].map(t => {
          const y = PAD.top + innerH * (1 - t);
          return <line key={t} x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y} stroke="#f1f5f9" strokeWidth={1} />;
        })}
        {/* Area fill */}
        <path d={areaPath} fill="url(#trendGrad)" opacity={0.25} />
        {/* Line */}
        <path d={shiftedPath} fill="none" stroke="#6366f1" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill={p.mismatchCount > 0 ? '#f43f5e' : '#10b981'} />
        ))}
        {/* X axis labels — show first, last, and every 3rd */}
        {points.map((p, i) => {
          if (i !== 0 && i !== points.length - 1 && i % 3 !== 0) return null;
          const label = p.label.substring(5); // MM-DD
          return (
            <text key={i} x={p.x} y={H - 4} textAnchor="middle" fontSize={8} fill="#94a3b8">{label}</text>
          );
        })}
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
      </svg>
      {/* Legend */}
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          <span className="text-[10px] text-slate-400 font-semibold">불일치 발생</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-400 font-semibold">전 품목 일치</span>
        </div>
      </div>
    </div>
  );
};

export default AuditMismatchTrend;
