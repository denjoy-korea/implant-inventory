import { useMemo } from 'react';
import { AuditHistoryItem } from '../../../services/auditService';
import {
  groupAuditSessions,
  calcAuditKpi,
  buildTrendData,
  buildItemRanking,
  buildReasonStats,
  calcCycleStats,
} from '../utils/auditReportUtils';

export function useAuditReport(auditHistory: AuditHistoryItem[]) {
  const sessions = useMemo(() => groupAuditSessions(auditHistory), [auditHistory]);
  const kpi = useMemo(() => calcAuditKpi(sessions), [sessions]);
  const trendData = useMemo(() => buildTrendData(sessions), [sessions]);
  const itemRanking = useMemo(() => buildItemRanking(auditHistory), [auditHistory]);
  const reasonStats = useMemo(() => buildReasonStats(auditHistory), [auditHistory]);
  const cycleStats = useMemo(() => calcCycleStats(sessions), [sessions]);

  return { sessions, kpi, trendData, itemRanking, reasonStats, cycleStats };
}
