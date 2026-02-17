import React from 'react';
import { SparklineData } from './shared';

// Mini sparkline with aria-label
function MiniSparkline({ data, color, id, height = 24, width = 80 }: { data: number[]; color: string; id: string; height?: number; width?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const points = data.map((v, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - 2 - ((v - min) / range) * (height - 4),
  }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x},${p.y}`).join(' ');
  const areaD = `${pathD} L ${width},${height} L 0,${height} Z`;
  const gradId = `spark-${id}`;
  return (
    <svg width={width} height={height} className="mt-2 opacity-50"
      role="img" aria-label={`${id} 월별 추세 스파크라인`}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0.01} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#${gradId})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2} fill={color} />
    </svg>
  );
}

// Trend badge — 2 lines: delta on top, label below
function TrendBadge({ value, prevValue, suffix = '건', label = '전월대비' }: { value: number; prevValue?: number; suffix?: string; label?: string }) {
  if (value === 0) return null;
  const isUp = value > 0;
  const pctChange = prevValue && prevValue > 0
    ? ((value / prevValue) * 100).toFixed(1)
    : null;
  return (
    <div className="inline-flex flex-col items-end ml-auto text-[10px] leading-tight">
      <span className={`font-semibold ${isUp ? 'text-emerald-600' : 'text-red-600'}`}>
        {isUp ? '▲' : '▼'} {Math.abs(value)}{suffix} {pctChange && <>({isUp ? '+' : ''}{pctChange}%)</>}
      </span>
      <span className="text-slate-400 font-medium">{label}</span>
    </div>
  );
}

interface KPIStripProps {
  animPlacement: number;
  animMonthlyAvg: number;
  animFailRate: number;
  animClaim: number;
  animDailyAvg: number;
  animRecentDailyAvg: number;
  sparkline: SparklineData;
}

export default function KPIStrip({ animPlacement, animMonthlyAvg, animFailRate, animClaim, animDailyAvg, animRecentDailyAvg, sparkline }: KPIStripProps) {
  // 최근 1개월 vs 전체 일평균 차이 (소수점 1자리 기준)
  const recentRaw = animRecentDailyAvg / 10;
  const dailyRaw = animDailyAvg / 10;
  const dailyDelta = Math.round((recentRaw - dailyRaw) * 10); // x10 정수

  const metrics = [
    { ko: '총 식립', en: 'Total Placement', value: animPlacement.toLocaleString(), unit: '건', sparkData: sparkline.placement, sparkColor: '#4F46E5', sparkId: 'placement', delta: 0, prevValue: 0, badgeLabel: '전월대비', badgeSuffix: '건' },
    { ko: '월 평균', en: 'Avg Monthly', value: (animMonthlyAvg / 10).toFixed(1), unit: '건/월', sparkData: sparkline.placement, sparkColor: '#4F46E5', sparkId: 'monthly', delta: sparkline.placementDelta, prevValue: sparkline.placementPrev, badgeLabel: '전월대비', badgeSuffix: '건' },
    { ko: 'FAIL률', en: 'Failure Rate', value: (animFailRate / 10).toFixed(1), unit: '%', sparkData: sparkline.fail, sparkColor: '#F43F5E', sparkId: 'fail', delta: sparkline.failDelta, prevValue: sparkline.failPrev, badgeLabel: '전월대비', badgeSuffix: '건' },
    { ko: '보험청구', en: 'Insurance Claim', value: animClaim.toLocaleString(), unit: '건', sparkData: sparkline.claim, sparkColor: '#0EA5E9', sparkId: 'claim', delta: sparkline.claimDelta, prevValue: sparkline.claimPrev, badgeLabel: '전월대비', badgeSuffix: '건' },
    { ko: '일 평균', en: 'Avg Daily', value: (animDailyAvg / 10).toFixed(1), unit: '개/일', sparkData: sparkline.placement, sparkColor: '#64748b', sparkId: 'daily', delta: dailyDelta, prevValue: 0, badgeLabel: '최근 1개월', badgeSuffix: '' },
  ];

  return (
    <div className="grid grid-cols-5 gap-0 bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm divide-x divide-slate-50">
      {metrics.map((m, i) => (
        <div key={i} className={`px-6 py-5 hover:bg-slate-50/50 transition-colors ${i === 0 ? 'bg-indigo-50/30 border-r-2 border-r-indigo-200' : ''}`}>
          <h4 className="text-sm font-semibold text-slate-800">{m.ko}</h4>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">{m.en}</p>
          <div className="flex items-center gap-1.5" aria-live="polite" aria-atomic="true">
            <p className="text-3xl font-bold text-slate-800 tabular-nums tracking-tight">{m.value}</p>
            <span className="text-xs font-semibold text-slate-400">{m.unit}</span>
            {m.delta !== 0 && <TrendBadge value={m.badgeSuffix ? m.delta : m.delta / 10} prevValue={m.prevValue} suffix={m.badgeSuffix || ''} label={m.badgeLabel} />}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <MiniSparkline data={m.sparkData} color={m.sparkColor} id={m.sparkId} height={24} width={80} />
            {m.sparkId === 'daily' && (
              <div className="inline-flex items-baseline gap-1 ml-auto text-[10px] leading-tight mt-2">
                <span className="text-slate-400 font-medium">최근 1개월</span>
                <span className="font-bold text-slate-700 tabular-nums">{(animRecentDailyAvg / 10).toFixed(1)}</span>
                <span className="text-slate-400">개/일</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
