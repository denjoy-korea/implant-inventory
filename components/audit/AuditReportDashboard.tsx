import React from 'react';
import { AuditHistoryItem } from '../../services/auditService';
import { PlanType } from '../../types';
import { useAuditReport } from './hooks/useAuditReport';
import AuditReportKpiStrip from './AuditReportKpiStrip';
import AuditMismatchTrend from './AuditMismatchTrend';
import AuditSessionTable from './AuditSessionTable';
import AuditItemRanking from './AuditItemRanking';
import AuditReasonChart from './AuditReasonChart';
import AuditCycleIndicator from './AuditCycleIndicator';
import AuditMobileQrPanel from './AuditMobileQrPanel';

interface Props {
  auditHistory: AuditHistoryItem[];
  isLoading: boolean;
  plan: PlanType;
}

const AUDIT_URL = `${window.location.origin}/#/dashboard/audit`;

const PLUS_PLANS: PlanType[] = ['plus', 'business', 'ultimate'];

/** Basic 플랜 — Plus 전용 섹션 그룹 블러 + 배지 1개 */
const PlusSectionGroup: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="relative">
    <div className="pointer-events-none select-none blur-[3px] opacity-60 flex flex-col gap-5">
      {children}
    </div>
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        Plus 플랜에서 이용 가능
      </div>
    </div>
  </div>
);

const AuditReportDashboard: React.FC<Props> = ({ auditHistory, isLoading, plan }) => {
  const { sessions, kpi, trendData, itemRanking, reasonStats, cycleStats } = useAuditReport(auditHistory);
  const isPlus = PLUS_PLANS.includes(plan);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400 font-semibold">실사 이력 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 실사 이력 없음 — QR 패널 전면 안내
  if (auditHistory.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 px-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mb-1">
            <svg className="w-7 h-7 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h3 className="text-base font-black text-slate-900">아직 실사 이력이 없습니다</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            재고 실사는 현장에서 스마트폰으로 진행합니다.<br />
            아래 QR 코드를 스캔해 첫 실사를 시작해보세요.
          </p>
        </div>
        <div className="w-full max-w-sm">
          <AuditMobileQrPanel auditUrl={AUDIT_URL} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-10">
      {/* KPI Strip — Basic+ */}
      <AuditReportKpiStrip kpi={kpi} />

      {/* QR — Basic+ / Cycle+분석 — Plus+ */}
      {isPlus ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuditMobileQrPanel auditUrl={AUDIT_URL} />
            <AuditCycleIndicator stats={cycleStats} />
          </div>
          <AuditMismatchTrend data={trendData} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AuditItemRanking items={itemRanking} />
            <AuditReasonChart stats={reasonStats} />
          </div>
        </>
      ) : (
        <>
          <AuditMobileQrPanel auditUrl={AUDIT_URL} />
          <PlusSectionGroup>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AuditCycleIndicator stats={cycleStats} />
              <AuditMismatchTrend data={trendData} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AuditItemRanking items={itemRanking} />
              <AuditReasonChart stats={reasonStats} />
            </div>
          </PlusSectionGroup>
        </>
      )}

      {/* Session table — Basic+ */}
      <AuditSessionTable sessions={sessions} />
    </div>
  );
};

export default AuditReportDashboard;
