import { useMemo, useState, useEffect } from 'react';
import type {
  DashboardTab,
  ExcelRow,
  HospitalPlanState,
  InventoryItem,
  Order,
  SurgeryUnregisteredItem,
} from '../types';
import { planService } from '../services/planService';
import { auditService, AuditHistoryItem } from '../services/auditService';
import { useWorkDaysMap } from '../components/surgery-dashboard/useWorkDaysMap';
import { holidayService } from '../services/holidayService';
import { failThresholdService, getFailSeverity, FailThresholds } from '../services/failThresholdService';
import { useDashboardOverviewData, parseQty, parseDate } from './useDashboardOverviewData';

export type PriorityLevel = 'critical' | 'warning' | 'ok';

export type LatestAuditSummary = {
  date: string | null;
  mismatchCount: number;
  mismatchQty: number;
  topMismatches: Array<{
    id: string;
    manufacturer: string;
    brand: string;
    size: string;
    difference: number;
  }>;
};

export type AlertCard = {
  key: string;
  title: string;
  value: string;
  sub: string;
  tone: string;
  tab: DashboardTab;
  hint: string;
  severity: PriorityLevel;
  score: number;
};

export type ActionItem = {
  key: string;
  title: string;
  description: string;
  tab: DashboardTab;
  severity: PriorityLevel;
  score: number;
  meta?: string;
  metaItems?: Array<{ label: string; count: number }>;
  alertNote?: string;
  onClick?: () => void;
  uploadAction?: () => void;
};

export const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  critical: 3,
  warning: 2,
  ok: 1,
};

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = parseDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('ko-KR');
}

export function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseDate(value);
  if (!parsed) return null;
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function formatDateKorean(value: string | null | undefined): string {
  const parsed = parseDate(value);
  if (!parsed) return '기록 없음';
  const year = parsed.getFullYear();
  const month = parsed.getMonth() + 1;
  const day = parsed.getDate();
  const dow = ['일', '월', '화', '수', '목', '금', '토'][parsed.getDay()];
  return `${year}년 ${month}월 ${day}일 (${dow})`;
}

const ONBOARDING_STEP_LABELS: Record<number, { title: string; desc: string }> = {
  1: { title: '초기 설정을 시작하세요', desc: '웰컴 가이드를 확인하고 DenJOY 설정을 시작합니다.' },
  2: { title: '덴트웹 픽스쳐 데이터 다운로드', desc: '덴트웹에서 픽스쳐(재고) 데이터를 내려받으세요.' },
  3: { title: '픽스쳐 데이터 업로드', desc: '다운받은 픽스쳐 엑셀 파일을 업로드하세요.' },
  4: { title: '덴트웹 수술기록 다운로드', desc: '덴트웹에서 수술기록 데이터를 내려받으세요.' },
  5: { title: '수술기록 업로드', desc: '다운받은 수술기록 엑셀 파일을 업로드하세요.' },
  6: { title: '기초재고 실사 실행', desc: '현재 실물 재고와 시스템 재고를 대조하세요.' },
  7: { title: '교환 재고 정리', desc: '미교환 교환 임플란트를 확인하고 정리하세요.' },
};

interface UseDashboardOverviewParams {
  inventory: InventoryItem[];
  orders: Order[];
  surgeryMaster: Record<string, ExcelRow[]>;
  surgeryUnregisteredItems?: SurgeryUnregisteredItem[];
  hospitalId?: string;
  hospitalWorkDays?: number[];
  planState: HospitalPlanState | null;
  onboardingStep?: number | null;
  onResumeOnboarding?: () => void;
  onSurgeryUploadClick?: () => void;
}

export function useDashboardOverview({
  inventory,
  orders,
  surgeryMaster,
  surgeryUnregisteredItems = [],
  hospitalId,
  hospitalWorkDays = [],
  planState,
  onboardingStep,
  onResumeOnboarding,
  onSurgeryUploadClick,
}: UseDashboardOverviewParams) {
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
  const [selectedAuditSessionKey, setSelectedAuditSessionKey] = useState<string | null>(null);
  const [auditDetailShowAll, setAuditDetailShowAll] = useState(false);
  const [failThresholds, setFailThresholds] = useState<FailThresholds>({});
  const [showFailThresholdModal, setShowFailThresholdModal] = useState(false);
  const [progressDelta, setProgressDelta] = useState<{
    placementDelta: number;
    failDelta: number;
    prevCutoffDay: number;
    prevMonthLabel: string;
    progressPct: number;
    thisElapsed: number;
    thisTotalWorkDays: number;
    isReady: boolean;
  }>({ placementDelta: 0, failDelta: 0, prevCutoffDay: 0, prevMonthLabel: '', progressPct: 0, thisElapsed: 0, thisTotalWorkDays: 0, isReady: false });

  useEffect(() => {
    let cancelled = false;

    if (!hospitalId) {
      setAuditHistory([]);
      return;
    }

    setIsAuditLoading(true);
    auditService
      .getAuditHistory(hospitalId)
      .then((rows) => {
        if (!cancelled) setAuditHistory(rows);
      })
      .finally(() => {
        if (!cancelled) setIsAuditLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hospitalId]);

  useEffect(() => {
    if (!hospitalId) return;
    failThresholdService.get(hospitalId).then(setFailThresholds).catch(() => {});
  }, [hospitalId]);

  const {
    visibleInventory,
    shortageEntries,
    shortageSummary,
    pendingOrderSummary,
    cleanSurgeryRows,
    failExchangeEntries,
    failSummary,
    unregisteredSummary,
    monthlyTotals,
    orderProcessing,
    thisMonthSurgery,
    latestSurgeryDate,
    recentMonthKeys,
    manufacturerUsageSummary,
    hasBaseStockSet,
  } = useDashboardOverviewData({ inventory, orders, surgeryMaster, surgeryUnregisteredItems });

  const latestAuditSummary = useMemo<LatestAuditSummary>(() => {
    if (auditHistory.length === 0) {
      return { date: null, mismatchCount: 0, mismatchQty: 0, topMismatches: [] };
    }
    const latestAuditDate = auditHistory[0].auditDate;
    const latestRows = auditHistory.filter((row) => row.auditDate === latestAuditDate);
    const mismatches = latestRows.filter((row) => Math.abs(Number(row.difference || 0)) > 0);
    return {
      date: latestAuditDate,
      mismatchCount: mismatches.length,
      mismatchQty: mismatches.reduce((sum, row) => sum + Math.abs(Number(row.difference || 0)), 0),
      topMismatches: [...mismatches]
        .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          manufacturer: row.manufacturer,
          brand: row.brand,
          size: row.size,
          difference: row.difference,
        })),
    };
  }, [auditHistory]);

  const recentAuditSessions = useMemo(() => {
    const sessMap = new Map<string, {
      key: string; date: string; createdAt: string;
      mismatchCount: number; totalDiff: number; performedBy: string | null;
    }>();
    auditHistory.forEach(row => {
      const minute = row.createdAt.substring(0, 16);
      const key = `${minute}__${row.performedBy || ''}`;
      if (!sessMap.has(key)) {
        sessMap.set(key, { key, date: row.auditDate, createdAt: row.createdAt, mismatchCount: 0, totalDiff: 0, performedBy: row.performedBy ?? null });
      }
      const s = sessMap.get(key)!;
      if (Math.abs(row.difference) > 0) { s.mismatchCount++; s.totalDiff += Math.abs(row.difference); }
    });
    return [...sessMap.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);
  }, [auditHistory]);

  const trendMonths = useMemo(() => monthlyTotals.map((row) => row.month), [monthlyTotals]);
  const workDaysMap = useWorkDaysMap(trendMonths, hospitalWorkDays);
  const isWorkDaysLoading = trendMonths.length > 0 && workDaysMap === undefined;

  const monthlyTrend = useMemo(
    () =>
      monthlyTotals.map((row) => {
        const workDays = workDaysMap?.[row.month] ?? 0;
        return {
          ...row,
          workDays,
          placementAvg: workDays > 0 ? Number((row.placement / workDays).toFixed(2)) : 0,
          failAvg: workDays > 0 ? Number((row.fail / workDays).toFixed(2)) : 0,
        };
      }),
    [monthlyTotals, workDaysMap]
  );

  const recentMonthlyTrend = useMemo(() => monthlyTrend.slice(-6), [monthlyTrend]);

  const trendSeries = useMemo(() => {
    const placement = recentMonthlyTrend.map((row) => row.placementAvg);
    const fail = recentMonthlyTrend.map((row) => row.failAvg);
    return { placement, fail };
  }, [recentMonthlyTrend]);

  const trendDelta = useMemo(() => {
    const last = recentMonthlyTrend[recentMonthlyTrend.length - 1];
    const prev = recentMonthlyTrend[recentMonthlyTrend.length - 2];
    if (!last || !prev) return { placementDelta: 0, failDelta: 0 };
    return {
      placementDelta: last.placement - prev.placement,
      failDelta: last.fail - prev.fail,
    };
  }, [recentMonthlyTrend]);

  const latestTrendMonth = useMemo(() => {
    const last = recentMonthlyTrend[recentMonthlyTrend.length - 1];
    if (!last) return { month: '-', placement: 0, fail: 0, placementAvg: 0, failAvg: 0, workDays: 0 };
    return last;
  }, [recentMonthlyTrend]);

  useEffect(() => {
    if (!workDaysMap || hospitalWorkDays.length === 0) {
      setProgressDelta(prev => ({ ...prev, isReady: false }));
      return;
    }

    const today = new Date();
    const thisYear = today.getFullYear();
    const thisMonthNum = today.getMonth() + 1;
    const todayDay = today.getDate();
    const thisMonthKey = `${thisYear}-${String(thisMonthNum).padStart(2, '0')}`;

    const prevDate = new Date(thisYear, thisMonthNum - 2, 1);
    const prevYear = prevDate.getFullYear();
    const prevMonthNum = prevDate.getMonth() + 1;
    const prevMonthKey = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;

    const thisMonthTotalWorkDays = workDaysMap[thisMonthKey] ?? 0;
    const prevMonthTotalWorkDays = workDaysMap[prevMonthKey] ?? 0;

    if (thisMonthTotalWorkDays === 0 || prevMonthTotalWorkDays === 0) return;

    let cancelled = false;

    Promise.all([
      holidayService.getHolidays(thisYear),
      holidayService.getHolidays(prevYear),
    ]).then(([thisHolidays, prevHolidays]) => {
      if (cancelled) return;

      const thisHolidaySet = new Set(thisHolidays);
      const prevHolidaySet = new Set(prevHolidays);

      let thisElapsed = 0;
      for (let day = 1; day <= todayDay; day++) {
        const dow = new Date(thisYear, thisMonthNum - 1, day).getDay();
        const dateStr = `${thisYear}-${String(thisMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (hospitalWorkDays.includes(dow) && !thisHolidaySet.has(dateStr)) thisElapsed++;
      }

      const progress = thisMonthTotalWorkDays > 0 ? thisElapsed / thisMonthTotalWorkDays : 0;
      const prevTargetWorkDays = Math.round(progress * prevMonthTotalWorkDays);
      const daysInPrevMonth = new Date(prevYear, prevMonthNum, 0).getDate();
      let prevWorkDayCount = 0;
      let prevCutoffDay = daysInPrevMonth;
      for (let day = 1; day <= daysInPrevMonth; day++) {
        const dow = new Date(prevYear, prevMonthNum - 1, day).getDay();
        const dateStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (hospitalWorkDays.includes(dow) && !prevHolidaySet.has(dateStr)) {
          prevWorkDayCount++;
        }
        if (prevWorkDayCount >= prevTargetWorkDays) {
          prevCutoffDay = day;
          break;
        }
      }

      const prevCutoffDateStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-${String(prevCutoffDay).padStart(2, '0')}`;

      let prevPlacement = 0;
      let prevFail = 0;
      cleanSurgeryRows.forEach((row) => {
        const rawDate = String(row['날짜'] || '');
        if (!rawDate.startsWith(prevMonthKey)) return;
        if (rawDate > prevCutoffDateStr) return;
        const cls = String(row['구분'] || '').trim();
        const qty = parseQty(row['갯수']);
        if (cls === '식립') prevPlacement += qty;
        if (cls === '수술중교환') prevFail += qty;
      });

      setProgressDelta({
        placementDelta: thisMonthSurgery.placementQty - prevPlacement,
        failDelta: thisMonthSurgery.failQty - prevFail,
        prevCutoffDay,
        prevMonthLabel: `${prevMonthNum}월`,
        progressPct: Math.round(progress * 100),
        thisElapsed,
        thisTotalWorkDays: thisMonthTotalWorkDays,
        isReady: true,
      });
    }).catch(() => {
      setProgressDelta(prev => ({ ...prev, isReady: false }));
    });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workDaysMap, hospitalWorkDays, cleanSurgeryRows, thisMonthSurgery]);

  const surgeryStaleDays = daysSince(latestSurgeryDate);
  const auditStaleDays = daysSince(latestAuditSummary.date);

  const tickerConfig = useMemo(() => {
    const days = surgeryStaleDays;
    const dateStr = formatDateKorean(latestSurgeryDate);
    if (days === null) return {
      tagClass: 'bg-slate-600', tagText: 'DATA', dotClass: 'bg-slate-300',
      wrapperClass: 'bg-slate-50 border-slate-200', textClass: 'text-slate-600',
      message: '수술기록지 데이터가 없습니다  ·  덴트웹에서 수술기록지를 다운로드하여 업로드하세요  ·  정확한 재고 파악을 위해 최신 데이터 등록이 필요합니다',
    };
    if (days === 0) return {
      tagClass: 'bg-emerald-600', tagText: '최신', dotClass: 'bg-emerald-200',
      wrapperClass: 'bg-emerald-50/60 border-emerald-200', textClass: 'text-emerald-800',
      message: `최근 수술기록지 등록일  ${dateStr}  ·  오늘 업데이트됨 — 재고 현황이 최신 상태입니다  ·  재고 및 주문 현황을 검토하세요`,
    };
    if (days <= 5) return {
      tagClass: 'bg-slate-700', tagText: '정상', dotClass: 'bg-slate-300',
      wrapperClass: 'bg-white border-slate-200', textClass: 'text-slate-700',
      message: `최근 수술기록지 등록일  ${dateStr}  ·  업데이트 후 ${days}일 경과  ·  재고 및 주문 현황을 최신 상태로 유지하세요`,
    };
    if (days <= 15) return {
      tagClass: 'bg-amber-500', tagText: '주의', dotClass: 'bg-amber-200',
      wrapperClass: 'bg-amber-50 border-amber-200', textClass: 'text-amber-900',
      message: `최근 수술기록지 등록일  ${dateStr}  ·  업데이트 후 ${days}일 경과  ·  덴트웹에서 최신 수술기록지를 다운로드하여 업로드하세요  ·  오래된 데이터는 재고 정확도를 낮춥니다`,
    };
    return {
      tagClass: 'bg-rose-600', tagText: '경고', dotClass: 'bg-rose-200',
      wrapperClass: 'bg-rose-50 border-rose-200', textClass: 'text-rose-800',
      message: `최근 수술기록지 등록일  ${dateStr}  ·  업데이트 후 ${days}일 경과  ·  수술기록지가 오래되었습니다  ·  즉시 업데이트하여 정확한 재고 관리 및 주문 현황을 유지하세요`,
    };
  }, [surgeryStaleDays, latestSurgeryDate]);

  const alertCards = useMemo<AlertCard[]>(() => {
    const shortageSeverity: PriorityLevel =
      shortageSummary.deficitQty >= 30 || shortageSummary.itemCount >= 12 ? 'critical'
        : shortageSummary.itemCount > 0 ? 'warning' : 'ok';
    const failSeverity: PriorityLevel =
      failSummary.remainingExchangeQty >= 15 || failSummary.pendingRows >= 10 ? 'critical'
        : failSummary.pendingRows > 0 ? 'warning' : 'ok';
    const auditSeverity: PriorityLevel =
      latestAuditSummary.mismatchQty >= 15 || latestAuditSummary.mismatchCount >= 8 ? 'critical'
        : latestAuditSummary.mismatchCount > 0 ? 'warning' : 'ok';
    const unregisteredSeverity: PriorityLevel =
      unregisteredSummary.usageQty >= 20 || unregisteredSummary.count >= 8 ? 'critical'
        : unregisteredSummary.count > 0 ? 'warning' : 'ok';
    const orderSeverity: PriorityLevel =
      pendingOrderSummary.replenishmentQty >= 25 || pendingOrderSummary.replenishmentCount >= 10 ? 'critical'
        : pendingOrderSummary.replenishmentCount > 0 ? 'warning' : 'ok';

    const cards: AlertCard[] = [
      {
        key: 'shortage',
        title: '남은 부족분',
        value: `${shortageSummary.itemCount}종`,
        sub: `${shortageSummary.deficitQty}개`,
        tone: shortageSeverity === 'critical' ? 'border-rose-300 bg-rose-50 text-rose-700'
          : shortageSeverity === 'warning' ? 'border-rose-200 bg-rose-50/70 text-rose-700'
          : 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
        tab: 'order_management',
        hint: '권장량 대비 부족 품목 기준',
        severity: shortageSeverity,
        score: (shortageSummary.deficitQty * 2) + (shortageSummary.itemCount * 4),
      },
      {
        key: 'fail-exchange',
        title: '교환 미처리',
        value: `${failSummary.pendingRows}건`,
        sub: `${failSummary.remainingExchangeQty}개`,
        tone: failSeverity === 'critical' ? 'border-rose-300 bg-rose-50 text-rose-700'
          : failSeverity === 'warning' ? 'border-amber-200 bg-amber-50/70 text-amber-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
        tab: 'fail_management',
        hint: '수술 중 교환 미처리 건',
        severity: failSeverity,
        score: (failSummary.remainingExchangeQty * 3) + (failSummary.pendingRows * 4),
      },
      {
        key: 'audit-mismatch',
        title: '최근 실사 불일치',
        value: isAuditLoading ? '...' : `${latestAuditSummary.mismatchCount}건`,
        sub: isAuditLoading ? '실사 이력 조회 중' : `${latestAuditSummary.mismatchQty}개 차이`,
        tone: auditSeverity === 'critical' ? 'border-orange-300 bg-orange-50 text-orange-800'
          : auditSeverity === 'warning' ? 'border-orange-200 bg-orange-50/70 text-orange-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
        tab: 'inventory_audit',
        hint: latestAuditSummary.date ? `${formatDate(latestAuditSummary.date)} 실사` : '실사 이력 없음',
        severity: auditSeverity,
        score: (latestAuditSummary.mismatchQty * 3) + (latestAuditSummary.mismatchCount * 6),
      },
      {
        key: 'pending-orders',
        title: '입고 대기',
        value: `${pendingOrderSummary.replenishmentCount}건`,
        sub: `${pendingOrderSummary.replenishmentQty}개`,
        tone: orderSeverity === 'critical' ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
          : orderSeverity === 'warning' ? 'border-indigo-200 bg-indigo-50/70 text-indigo-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
        tab: 'order_management',
        hint: '재고 발주 기준',
        severity: orderSeverity,
        score: (pendingOrderSummary.replenishmentQty * 2) + (pendingOrderSummary.replenishmentCount * 4),
      },
      {
        key: 'unregistered',
        title: '수술 미등록 품목',
        value: `${unregisteredSummary.count}종`,
        sub: `${unregisteredSummary.usageQty}개 누적`,
        tone: unregisteredSeverity === 'critical' ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800'
          : unregisteredSeverity === 'warning' ? 'border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-700'
          : 'border-slate-200 bg-slate-50 text-slate-600',
        tab: 'inventory_master',
        hint: '재고 마스터 기준',
        severity: unregisteredSeverity,
        score: (unregisteredSummary.usageQty * 2) + (unregisteredSummary.count * 5),
      },
    ];

    return cards.sort((a, b) => {
      const bySeverity = PRIORITY_WEIGHT[b.severity] - PRIORITY_WEIGHT[a.severity];
      if (bySeverity !== 0) return bySeverity;
      return b.score - a.score;
    });
  }, [
    failSummary.pendingRows, failSummary.remainingExchangeQty,
    isAuditLoading, latestAuditSummary.date, latestAuditSummary.mismatchCount, latestAuditSummary.mismatchQty,
    pendingOrderSummary.replenishmentCount, pendingOrderSummary.replenishmentQty,
    shortageSummary.deficitQty, shortageSummary.itemCount,
    unregisteredSummary.count, unregisteredSummary.usageQty,
  ]);

  const todayActionItems = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    if (onboardingStep != null && onResumeOnboarding) {
      const label = ONBOARDING_STEP_LABELS[onboardingStep];
      items.push({
        key: 'action-onboarding',
        title: label?.title ?? '초기 설정 완료하기',
        description: label?.desc ?? '초기 설정을 완료하세요.',
        tab: 'overview',
        severity: 'critical',
        score: 9999,
        alertNote: `초기 설정 ${onboardingStep}/7단계 진행 중`,
        onClick: onResumeOnboarding,
      });
    }

    const topShortage = shortageEntries[0];
    const topMismatch = latestAuditSummary.topMismatches[0];

    if (shortageSummary.itemCount > 0) {
      items.push({
        key: 'action-shortage',
        title: '발주 부족분 처리',
        description: `부족 ${shortageSummary.itemCount}종 / ${shortageSummary.deficitQty}개`,
        tab: 'order_management',
        severity: shortageSummary.deficitQty >= 30 ? 'critical' : 'warning',
        score: (shortageSummary.deficitQty * 3) + (shortageSummary.itemCount * 5),
        meta: topShortage ? `우선: ${topShortage.item.brand} ${topShortage.item.size} (-${topShortage.remainingDeficit})` : undefined,
      });
    }

    if (latestAuditSummary.mismatchCount > 0) {
      items.push({
        key: 'action-audit',
        title: '실사 불일치 정리',
        description: `최근 실사 불일치 ${latestAuditSummary.mismatchCount}건 / ${latestAuditSummary.mismatchQty}개`,
        tab: 'inventory_audit',
        severity: latestAuditSummary.mismatchQty >= 15 ? 'critical' : 'warning',
        score: (latestAuditSummary.mismatchQty * 3) + (latestAuditSummary.mismatchCount * 6),
        meta: topMismatch ? `최대 편차: ${topMismatch.brand} ${topMismatch.size} (${topMismatch.difference > 0 ? '+' : ''}${topMismatch.difference})` : undefined,
      });
    }

    if (failSummary.remainingExchangeQty > 0) {
      const failByManufacturer = failExchangeEntries.reduce<Record<string, number>>((acc, e) => {
        acc[e.manufacturer] = (acc[e.manufacturer] || 0) + e.remainingToExchange;
        return acc;
      }, {});
      const failMetaItems = Object.entries(failByManufacturer)
        .sort(([, a], [, b]) => b - a)
        .map(([label, count]) => ({ label, count }));
      const computedSeverity = getFailSeverity(failByManufacturer, failThresholds) ?? 'warning';
      items.push({
        key: 'action-fail',
        title: '교환 발주',
        description: `미교환 ${failSummary.pendingRows}건 / ${failSummary.remainingExchangeQty}개`,
        tab: 'fail_management',
        severity: computedSeverity,
        score: (failSummary.remainingExchangeQty * 3) + (failSummary.pendingRows * 4),
        metaItems: failMetaItems.length > 0 ? failMetaItems : undefined,
      });
    }

    if (unregisteredSummary.count > 0) {
      items.push({
        key: 'action-unregistered',
        title: '미등록 품목 마스터 반영',
        description: `${unregisteredSummary.count}종 / 누적 ${unregisteredSummary.usageQty}개`,
        tab: 'inventory_master',
        severity: unregisteredSummary.usageQty >= 20 ? 'critical' : 'warning',
        score: (unregisteredSummary.usageQty * 2) + (unregisteredSummary.count * 5),
      });
    }

    if (pendingOrderSummary.replenishmentCount > 0) {
      items.push({
        key: 'action-pending-order',
        title: '입고 대기 주문 처리',
        description: `${pendingOrderSummary.replenishmentCount}건 / ${pendingOrderSummary.replenishmentQty}개`,
        tab: 'order_management',
        severity: pendingOrderSummary.replenishmentQty >= 25 ? 'critical' : 'warning',
        score: (pendingOrderSummary.replenishmentQty * 2) + (pendingOrderSummary.replenishmentCount * 4),
      });
    }

    if (surgeryStaleDays === null || surgeryStaleDays >= 3) {
      const uploadSeverity: PriorityLevel =
        surgeryStaleDays === null || surgeryStaleDays >= 14 ? 'critical' :
        surgeryStaleDays >= 7 ? 'warning' : 'ok';
      const dentwebStartDate = latestSurgeryDate ? (() => {
        const d = new Date(latestSurgeryDate);
        d.setDate(d.getDate() + 1);
        return d.toISOString().slice(0, 10);
      })() : null;
      const dentwebMeta = dentwebStartDate
        ? `덴트웹: ${formatDate(dentwebStartDate)}부터 조회 후 다운로드 → 업로드`
        : '덴트웹에서 수술기록 다운로드 후 업로드하세요.';
      items.push({
        key: 'action-surgery-upload',
        title: '수술기록지 업로드',
        description: surgeryStaleDays === null
          ? '수술기록 데이터가 없습니다. 엑셀을 업로드해주세요.'
          : `마지막 업로드: ${formatDate(latestSurgeryDate)} (${surgeryStaleDays}일 전)`,
        tab: 'surgery_database',
        severity: uploadSeverity,
        score: surgeryStaleDays === null ? 80 : surgeryStaleDays >= 7 ? surgeryStaleDays * 3 : 5,
        meta: dentwebMeta,
        uploadAction: onSurgeryUploadClick,
      });
    }

    if (!latestAuditSummary.date && visibleInventory.length > 0) {
      items.push({
        key: 'action-first-audit',
        title: '첫 재고 실사 실행',
        description: '실사 이력이 아직 없어 기준값 검증이 필요합니다.',
        tab: 'inventory_audit',
        severity: hasBaseStockSet ? 'warning' : 'critical',
        score: hasBaseStockSet ? 35 : 60,
        alertNote: hasBaseStockSet ? undefined : '기초재고 설정이 되지 않았습니다.',
      });
    }

    if (auditStaleDays !== null && auditStaleDays >= 15) {
      items.push({
        key: 'action-audit-freshness',
        title: '정기 실사 일정 경과',
        description: `최근 실사 후 ${auditStaleDays}일 경과`,
        tab: 'inventory_audit',
        severity: auditStaleDays >= 45 ? 'critical' : auditStaleDays >= 30 ? 'warning' : 'ok',
        score: auditStaleDays,
      });
    }

    return items.sort((a, b) => {
      const bySeverity = PRIORITY_WEIGHT[b.severity] - PRIORITY_WEIGHT[a.severity];
      if (bySeverity !== 0) return bySeverity;
      return b.score - a.score;
    });
  }, [
    auditStaleDays, failExchangeEntries, failSummary.pendingRows, failSummary.remainingExchangeQty,
    failThresholds, hasBaseStockSet, latestAuditSummary.date, latestAuditSummary.mismatchCount,
    latestAuditSummary.mismatchQty, latestAuditSummary.topMismatches,
    pendingOrderSummary.replenishmentCount, pendingOrderSummary.replenishmentQty,
    shortageEntries, shortageSummary.deficitQty, shortageSummary.itemCount,
    surgeryStaleDays, latestSurgeryDate, unregisteredSummary.count, unregisteredSummary.usageQty,
    visibleInventory, onboardingStep, onResumeOnboarding, onSurgeryUploadClick,
  ]);

  const maxManufacturerRecentQty = useMemo(
    () => Math.max(1, ...manufacturerUsageSummary.rows.map((row) => row.recentQty)),
    [manufacturerUsageSummary.rows]
  );

  const fomoData = useMemo(() => {
    if (!planState || planState.plan !== 'free' || planState.isTrialActive) return null;
    const surgeryCount = Object.values(surgeryMaster).flat().length;
    const failOrderCount = orders.filter(o => (o as { type: string }).type === 'fail_exchange').length;
    const canBrandAnalytics = planService.canAccess('free', 'brand_analytics');
    const canFailMgmt = planService.canAccess('free', 'fail_management');
    const canOrderExec = planService.canAccess('free', 'order_execution');
    if (canBrandAnalytics && canFailMgmt && canOrderExec) return null;
    return { surgeryCount, failOrderCount, inventoryCount: inventory.length };
  }, [planState, surgeryMaster, orders, inventory.length]);

  return {
    // audit state
    auditHistory,
    isAuditLoading,
    selectedAuditSessionKey,
    setSelectedAuditSessionKey,
    auditDetailShowAll,
    setAuditDetailShowAll,
    failThresholds,
    setFailThresholds,
    showFailThresholdModal,
    setShowFailThresholdModal,
    progressDelta,
    // data from useDashboardOverviewData
    visibleInventory,
    shortageEntries,
    shortageSummary,
    pendingOrderSummary,
    failExchangeEntries,
    failSummary,
    unregisteredSummary,
    monthlyTotals,
    orderProcessing,
    thisMonthSurgery,
    latestSurgeryDate,
    recentMonthKeys,
    manufacturerUsageSummary,
    hasBaseStockSet,
    // computed
    latestAuditSummary,
    recentAuditSessions,
    isWorkDaysLoading,
    monthlyTrend,
    recentMonthlyTrend,
    trendSeries,
    trendDelta,
    latestTrendMonth,
    surgeryStaleDays,
    auditStaleDays,
    tickerConfig,
    alertCards,
    todayActionItems,
    maxManufacturerRecentQty,
    fomoData,
  };
}
