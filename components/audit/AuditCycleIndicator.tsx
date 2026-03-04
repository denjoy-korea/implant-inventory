import React from 'react';
import { CycleStats } from './utils/auditReportUtils';

interface Props {
  stats: CycleStats;
}

const AuditCycleIndicator: React.FC<Props> = ({ stats }) => {
  const { daysSinceLast, avgIntervalDays, sessionCount } = stats;

  const status =
    daysSinceLast === null ? 'none'
    : daysSinceLast <= 14 ? 'good'
    : daysSinceLast <= 30 ? 'warn'
    : 'danger';

  const statusConfig = {
    none: { label: '실사 이력 없음', color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-200', dot: 'bg-slate-300' },
    good: { label: '양호', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
    warn: { label: '주의', color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400' },
    danger: { label: '실사 필요', color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', dot: 'bg-rose-500' },
  }[status];

  // Progress arc: how "overdue" we are vs avg interval
  const arcPct = (avgIntervalDays && daysSinceLast !== null)
    ? Math.min(daysSinceLast / avgIntervalDays, 1)
    : 0;
  const radius = 28;
  const circ = 2 * Math.PI * radius;
  const strokeDash = circ * arcPct;

  return (
    <div className={`bg-white border ${statusConfig.border} rounded-2xl p-5 shadow-sm flex flex-col gap-3`}>
      <p className="text-sm font-black text-slate-900">실사 주기 현황</p>

      <div className="flex items-center gap-5">
        {/* Arc gauge */}
        <div className="relative shrink-0">
          <svg width={70} height={70} viewBox="0 0 70 70">
            <circle cx={35} cy={35} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={6} />
            <circle
              cx={35} cy={35} r={radius} fill="none"
              stroke={status === 'good' ? '#10b981' : status === 'warn' ? '#f59e0b' : status === 'danger' ? '#f43f5e' : '#cbd5e1'}
              strokeWidth={6}
              strokeLinecap="round"
              strokeDasharray={`${strokeDash} ${circ}`}
              transform="rotate(-90 35 35)"
              className="transition-all duration-700"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-[11px] font-black ${statusConfig.color}`}>
              {daysSinceLast !== null ? `${daysSinceLast}일` : '—'}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex flex-col gap-2 flex-1">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${statusConfig.bg} self-start`}>
            <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`} />
            <span className={`text-[11px] font-bold ${statusConfig.color}`}>{statusConfig.label}</span>
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">평균 실사 주기</span>
              <span className="text-[11px] font-bold text-slate-700">
                {avgIntervalDays !== null ? `${avgIntervalDays}일` : sessionCount < 2 ? '데이터 부족' : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400">총 실사 횟수</span>
              <span className="text-[11px] font-bold text-slate-700">{sessionCount}회</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuditCycleIndicator;
