import React from 'react';
import { gradeColorMap } from './analyzeHelpers';

export const ScoreGauge: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const colors = gradeColorMap[color] || gradeColorMap.emerald;
  const radius = 80;
  const circumference = Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <svg viewBox="0 0 200 130" className="w-72 h-auto mx-auto">
      <path d="M 20 105 A 80 80 0 0 1 180 105" fill="none" stroke="#334155" strokeWidth="14" strokeLinecap="round" />
      <path
        d="M 20 105 A 80 80 0 0 1 180 105"
        fill="none"
        stroke={colors.stroke}
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        className="transition-all duration-1000 ease-out"
      />
      <text x="100" y="88" textAnchor="middle" fill="#ffffff" fontSize="48" fontWeight="900">{score}</text>
      <text x="100" y="110" textAnchor="middle" fill="#94a3b8" fontSize="14">/ 100점</text>
    </svg>
  );
};

export const BarChart: React.FC<{ items: { label: string; value: number }[]; maxValue: number }> = ({ items, maxValue }) => (
  <div className="space-y-3">
    {items.map((item, i) => (
      <div key={i}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-600 font-medium truncate">{item.label}</span>
          <span className="text-xs font-bold text-slate-800 ml-2 flex-shrink-0">{item.value}건</span>
        </div>
        <div className="bg-slate-100 rounded-full h-5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
            style={{ width: `${Math.max(8, (item.value / maxValue) * 100)}%` }}
          />
        </div>
      </div>
    ))}
  </div>
);

export const DonutChart: React.FC<{ data: { label: string; count: number }[] }> = ({ data }) => {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (total === 0) return <p className="text-sm text-slate-400 text-center">데이터 없음</p>;
  const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb923c', '#fbbf24'];
  let cumulativePercent = 0;

  const slices = data.slice(0, 8).map((d, i) => {
    const percent = d.count / total;
    const startAngle = cumulativePercent * 360;
    cumulativePercent += percent;
    const endAngle = cumulativePercent * 360;

    const x1 = 50 + 40 * Math.cos((Math.PI * (startAngle - 90)) / 180);
    const y1 = 50 + 40 * Math.sin((Math.PI * (startAngle - 90)) / 180);
    const x2 = 50 + 40 * Math.cos((Math.PI * (endAngle - 90)) / 180);
    const y2 = 50 + 40 * Math.sin((Math.PI * (endAngle - 90)) / 180);
    const largeArc = percent > 0.5 ? 1 : 0;

    return (
      <path
        key={i}
        d={`M 50 50 L ${x1} ${y1} A 40 40 0 ${largeArc} 1 ${x2} ${y2} Z`}
        fill={colors[i % colors.length]}
        className="hover:opacity-80 transition-opacity"
      />
    );
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <svg viewBox="0 0 100 100" className="w-40 h-40 flex-shrink-0">
        {slices}
        <circle cx="50" cy="50" r="22" fill="white" />
        <text x="50" y="48" textAnchor="middle" fill="#1e293b" fontSize="10" fontWeight="bold">{total}</text>
        <text x="50" y="58" textAnchor="middle" fill="#94a3b8" fontSize="6">총 사용</text>
      </svg>
      <div className="w-full space-y-2">
        {data.slice(0, 8).map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: colors[i % colors.length] }}></span>
            <span className="text-slate-600 truncate flex-1">{d.label}</span>
            <span className="font-bold text-slate-800 tabular-nums">{d.count}개</span>
            <span className="text-slate-400 w-8 text-right tabular-nums">{Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
