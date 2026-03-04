import { AuditHistoryItem } from '../../../services/auditService';

/* ── 타입 정의 ── */

export interface AuditSession {
  key: string;
  date: string;
  createdAt: string;
  performedBy: string | null;
  items: AuditHistoryItem[];
  totalItems: number;
  mismatchCount: number;
  totalDiff: number;
}

export interface AuditKpi {
  totalSessions: number;
  lastAuditDate: string | null;
  daysSinceLastAudit: number | null;
  avgMismatchRate: number; // 0~100
  recentMismatchCount: number;
  totalUniqueItemsAudited: number;
}

export interface TrendPoint {
  label: string;
  mismatchCount: number;
  totalDiff: number;
}

export interface ItemRankingEntry {
  key: string;
  brand: string;
  manufacturer: string;
  size: string;
  mismatchCount: number;
  totalDiff: number;
}

export interface ReasonStat {
  reason: string;
  count: number;
}

export interface CycleStats {
  daysSinceLast: number | null;
  avgIntervalDays: number | null;
  sessionCount: number;
}

/* ── 유틸 함수 ── */

export function groupAuditSessions(history: AuditHistoryItem[]): AuditSession[] {
  const map = new Map<string, AuditSession>();
  history.forEach(row => {
    const minute = row.createdAt.substring(0, 16);
    const key = `${minute}__${row.performedBy || ''}`;
    if (!map.has(key)) {
      map.set(key, {
        key,
        date: row.auditDate,
        createdAt: row.createdAt,
        performedBy: row.performedBy ?? null,
        items: [],
        totalItems: 0,
        mismatchCount: 0,
        totalDiff: 0,
      });
    }
    const s = map.get(key)!;
    s.items.push(row);
    s.totalItems++;
    if (row.difference !== 0) {
      s.mismatchCount++;
      s.totalDiff += Math.abs(row.difference);
    }
  });
  return [...map.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function calcAuditKpi(sessions: AuditSession[]): AuditKpi {
  if (sessions.length === 0) {
    return { totalSessions: 0, lastAuditDate: null, daysSinceLastAudit: null, avgMismatchRate: 0, recentMismatchCount: 0, totalUniqueItemsAudited: 0 };
  }
  const latest = sessions[0];
  const today = new Date();
  const lastDate = new Date(latest.date);
  const daysSince = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);

  const rates = sessions.map(s => s.totalItems > 0 ? (s.mismatchCount / s.totalItems) * 100 : 0);
  const avgMismatchRate = rates.reduce((a, b) => a + b, 0) / rates.length;

  const uniqueItemKeys = new Set<string>();
  sessions.forEach(s => s.items.forEach(i => uniqueItemKeys.add(`${i.manufacturer}|${i.brand}|${i.size}`)));

  return {
    totalSessions: sessions.length,
    lastAuditDate: latest.date,
    daysSinceLastAudit: daysSince,
    avgMismatchRate: Math.round(avgMismatchRate * 10) / 10,
    recentMismatchCount: latest.mismatchCount,
    totalUniqueItemsAudited: uniqueItemKeys.size,
  };
}

export function buildTrendData(sessions: AuditSession[]): TrendPoint[] {
  return [...sessions]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .slice(-12)
    .map(s => ({
      label: s.date,
      mismatchCount: s.mismatchCount,
      totalDiff: s.totalDiff,
    }));
}

export function buildItemRanking(history: AuditHistoryItem[]): ItemRankingEntry[] {
  const map = new Map<string, ItemRankingEntry>();
  history.filter(r => r.difference !== 0).forEach(r => {
    const key = `${r.manufacturer}|${r.brand}|${r.size}`;
    if (!map.has(key)) {
      map.set(key, { key, brand: r.brand, manufacturer: r.manufacturer, size: r.size, mismatchCount: 0, totalDiff: 0 });
    }
    const e = map.get(key)!;
    e.mismatchCount++;
    e.totalDiff += Math.abs(r.difference);
  });
  return [...map.values()].sort((a, b) => b.mismatchCount - a.mismatchCount).slice(0, 10);
}

export function buildReasonStats(history: AuditHistoryItem[]): ReasonStat[] {
  const map = new Map<string, number>();
  history.filter(r => r.difference !== 0 && r.reason).forEach(r => {
    const key = r.reason!;
    map.set(key, (map.get(key) ?? 0) + 1);
  });
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([reason, count]) => ({ reason, count }));
}

export function calcCycleStats(sessions: AuditSession[]): CycleStats {
  if (sessions.length === 0) return { daysSinceLast: null, avgIntervalDays: null, sessionCount: 0 };

  const today = new Date();
  const sorted = [...sessions].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const lastDate = new Date(sorted[sorted.length - 1].date);
  const daysSinceLast = Math.floor((today.getTime() - lastDate.getTime()) / 86400000);

  let avgIntervalDays: number | null = null;
  if (sorted.length >= 2) {
    let totalDays = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = new Date(sorted[i - 1].date).getTime();
      const curr = new Date(sorted[i].date).getTime();
      totalDays += (curr - prev) / 86400000;
    }
    avgIntervalDays = Math.round(totalDays / (sorted.length - 1));
  }

  return { daysSinceLast, avgIntervalDays, sessionCount: sessions.length };
}
