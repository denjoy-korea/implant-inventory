import React from 'react';
import { AuditKpi } from './utils/auditReportUtils';

interface Props {
  kpi: AuditKpi;
}

const KpiCard: React.FC<{ label: string; value: React.ReactNode; sub?: string; accent?: string }> = ({ label, value, sub, accent }) => (
  <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3.5 shadow-sm flex flex-col gap-1">
    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{label}</p>
    <p className={`text-2xl font-black tabular-nums ${accent ?? 'text-slate-900'}`}>{value}</p>
    {sub && <p className="text-[11px] font-semibold text-slate-400">{sub}</p>}
  </div>
);

const AuditReportKpiStrip: React.FC<Props> = ({ kpi }) => {
  const staleness =
    kpi.daysSinceLastAudit === null ? null
    : kpi.daysSinceLastAudit <= 14 ? 'good'
    : kpi.daysSinceLastAudit <= 30 ? 'warn'
    : 'danger';

  const stalenessColor =
    staleness === 'good' ? 'text-emerald-600'
    : staleness === 'warn' ? 'text-amber-500'
    : staleness === 'danger' ? 'text-rose-600'
    : 'text-slate-400';

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <KpiCard
        label="총 실사 횟수"
        value={kpi.totalSessions > 0 ? `${kpi.totalSessions}회` : '—'}
        sub="누적 실사"
      />
      <KpiCard
        label="마지막 실사일"
        value={kpi.lastAuditDate ?? '—'}
        sub={kpi.daysSinceLastAudit !== null ? `${kpi.daysSinceLastAudit}일 전` : undefined}
        accent={stalenessColor}
      />
      <KpiCard
        label="평균 불일치율"
        value={kpi.totalSessions > 0 ? `${kpi.avgMismatchRate}%` : '—'}
        sub="전체 회차 평균"
        accent={kpi.avgMismatchRate > 10 ? 'text-rose-600' : kpi.avgMismatchRate > 5 ? 'text-amber-500' : 'text-emerald-600'}
      />
      <KpiCard
        label="최근 불일치"
        value={kpi.totalSessions > 0 ? `${kpi.recentMismatchCount}건` : '—'}
        sub="직전 실사 기준"
        accent={kpi.recentMismatchCount > 0 ? 'text-rose-600' : 'text-emerald-600'}
      />
      <KpiCard
        label="실사 품목 종류"
        value={kpi.totalUniqueItemsAudited > 0 ? `${kpi.totalUniqueItemsAudited}종` : '—'}
        sub="누적 고유 품목"
      />
    </div>
  );
};

export default AuditReportKpiStrip;
