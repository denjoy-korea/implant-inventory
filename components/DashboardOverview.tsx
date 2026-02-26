import React, { useEffect, useMemo, useState } from 'react';
import {
  DashboardTab,
  DEFAULT_WORK_DAYS,
  ExcelData,
  ExcelRow,
  HospitalPlanState,
  InventoryItem,
  Order,
  SurgeryUnregisteredItem,
} from '../types';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { auditService, AuditHistoryItem } from '../services/auditService';
import { manufacturerAliasKey, isExchangePrefix } from '../services/appUtils';
import { useWorkDaysMap } from './surgery-dashboard/useWorkDaysMap';
import { holidayService } from '../services/holidayService';
import { failThresholdService, getFailSeverity, FailThresholds } from '../services/failThresholdService';
import FailThresholdModal from './dashboard/FailThresholdModal';

interface DashboardOverviewProps {
  inventory: InventoryItem[];
  orders: Order[];
  surgeryMaster: Record<string, ExcelRow[]>;
  fixtureData: ExcelData | null;
  surgeryUnregisteredItems?: SurgeryUnregisteredItem[];
  hospitalId?: string;
  hospitalWorkDays?: number[];
  onNavigate: (tab: DashboardTab) => void;
  isAdmin: boolean;
  planState: HospitalPlanState | null;
  isMaster?: boolean;
  onStartTrial: () => void;
  onGoToPricing: () => void;
  onboardingStep?: number | null;
  onResumeOnboarding?: () => void;
}

type ShortageEntry = {
  item: InventoryItem;
  rawDeficit: number;
  pendingQty: number;
  remainingDeficit: number;
};

type FailExchangeEntry = {
  manufacturer: string;
  brand: string;
  size: string;
  pendingFails: number;
  orderedExchange: number;
  remainingToExchange: number;
};

type LatestAuditSummary = {
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

type PriorityLevel = 'critical' | 'warning' | 'ok';

type AlertCard = {
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

type ActionItem = {
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
};

type ManufacturerUsageRow = {
  manufacturer: string;
  totalQty: number;
  recentQty: number;
  placementQty: number;
  failQty: number;
  failRate: number;
  topBrands: Array<{ brand: string; qty: number }>;
  monthly: Array<{ month: string; qty: number }>;
};

type ManufacturerUsageSummary = {
  rows: ManufacturerUsageRow[];
  totalQty: number;
  recentQty: number;
  placementQty: number;
  failQty: number;
};

const normalize = (value: string) => String(value || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

const PRIORITY_WEIGHT: Record<PriorityLevel, number> = {
  critical: 3,
  warning: 2,
  ok: 1,
};

const PRIORITY_BADGE: Record<PriorityLevel, { label: string; className: string }> = {
  critical: { label: '긴급', className: 'bg-rose-100 text-rose-700' },
  warning: { label: '주의', className: 'bg-amber-100 text-amber-700' },
  ok: { label: '안정', className: 'bg-emerald-100 text-emerald-700' },
};

function parseQty(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed;
}

function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '-';
  const parsed = parseDate(value);
  if (!parsed) return value;
  return parsed.toLocaleDateString('ko-KR');
}

function daysSince(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = parseDate(value);
  if (!parsed) return null;
  const now = new Date();
  const diff = now.getTime() - parsed.getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function monthKeyFromDate(value: unknown): string | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = width / (values.length - 1);

  return values
    .map((v, index) => {
      const x = index * stepX;
      const y = height - ((v - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function getRecentMonthKeys(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
}

function pickDisplayManufacturer(current: string, candidate: string): string {
  const a = String(current || '').trim();
  const b = String(candidate || '').trim();
  if (!a) return b;
  if (!b) return a;

  const aHasImplant = /implant/i.test(a);
  const bHasImplant = /implant/i.test(b);
  if (bHasImplant && !aHasImplant) return b;
  if (aHasImplant && !bHasImplant) return a;

  return b.length > a.length ? b : a;
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

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  inventory,
  orders,
  surgeryMaster,
  surgeryUnregisteredItems = [],
  hospitalId,
  hospitalWorkDays = DEFAULT_WORK_DAYS,
  onNavigate,
  planState,
  onboardingStep,
  onResumeOnboarding,
}) => {
  const [auditHistory, setAuditHistory] = useState<AuditHistoryItem[]>([]);
  const [isAuditLoading, setIsAuditLoading] = useState(false);
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

  const visibleInventory = useMemo(
    () =>
      inventory.filter(
        (item) =>
          !isExchangePrefix(item.manufacturer) &&
          item.manufacturer !== '보험청구' &&
          item.brand !== '보험임플란트'
      ),
    [inventory]
  );

  const buildOrderItemKey = (manufacturer: string, brand: string, size: string) =>
    `${normalize(manufacturer)}|${normalize(brand)}|${getSizeMatchKey(size, manufacturer)}`;

  const pendingReplenishmentQtyByKey = useMemo(() => {
    const map = new Map<string, number>();

    orders.forEach((order) => {
      if (order.status !== 'ordered' || order.type !== 'replenishment') return;
      order.items.forEach((item) => {
        const key = buildOrderItemKey(order.manufacturer, item.brand, item.size);
        map.set(key, (map.get(key) ?? 0) + Number(item.quantity || 0));
      });
    });

    return map;
  }, [orders]);

  const pendingFailExchangeQtyByKey = useMemo(() => {
    const map = new Map<string, number>();

    orders.forEach((order) => {
      if (order.status !== 'ordered' || order.type !== 'fail_exchange') return;
      order.items.forEach((item) => {
        const key = buildOrderItemKey(order.manufacturer, item.brand, item.size);
        map.set(key, (map.get(key) ?? 0) + Number(item.quantity || 0));
      });
    });

    return map;
  }, [orders]);

  const shortageEntries = useMemo<ShortageEntry[]>(() => {
    return visibleInventory
      .map((item) => {
        const rawDeficit = Math.max(0, item.recommendedStock - item.currentStock);
        if (rawDeficit <= 0) return null;

        const key = buildOrderItemKey(item.manufacturer, item.brand, item.size);
        const pendingQty = pendingReplenishmentQtyByKey.get(key) ?? 0;
        const remainingDeficit = Math.max(0, rawDeficit - pendingQty);
        if (remainingDeficit <= 0) return null;

        return { item, rawDeficit, pendingQty, remainingDeficit };
      })
      .filter((entry): entry is ShortageEntry => entry !== null)
      .sort((a, b) => b.remainingDeficit - a.remainingDeficit);
  }, [visibleInventory, pendingReplenishmentQtyByKey]);

  const shortageSummary = useMemo(
    () => ({
      itemCount: shortageEntries.length,
      deficitQty: shortageEntries.reduce((sum, entry) => sum + entry.remainingDeficit, 0),
    }),
    [shortageEntries]
  );

  const orderedReplenishment = useMemo(
    () => orders.filter((o) => o.status === 'ordered' && o.type === 'replenishment'),
    [orders]
  );
  const orderedFailExchange = useMemo(
    () => orders.filter((o) => o.status === 'ordered' && o.type === 'fail_exchange'),
    [orders]
  );

  const pendingOrderSummary = useMemo(
    () => ({
      replenishmentCount: orderedReplenishment.length,
      replenishmentQty: orderedReplenishment.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
        0
      ),
      failExchangeCount: orderedFailExchange.length,
      failExchangeQty: orderedFailExchange.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
        0
      ),
    }),
    [orderedFailExchange, orderedReplenishment]
  );

  const surgeryRows = surgeryMaster['수술기록지'] || [];

  const cleanSurgeryRows = useMemo(
    () =>
      surgeryRows.filter((row) => !Object.values(row).some((val) => String(val).includes('합계'))),
    [surgeryRows]
  );

  const pendingFailRows = useMemo(
    () => cleanSurgeryRows.filter((row) => String(row['구분'] || '').trim() === '수술중교환'),
    [cleanSurgeryRows]
  );

  const failExchangeEntries = useMemo<FailExchangeEntry[]>(() => {
    const aggregated = new Map<string, { manufacturer: string; brand: string; size: string; pendingFails: number }>();

    pendingFailRows.forEach((row) => {
      const manufacturer = String(row['제조사'] || '').trim() || '기타';
      const brand = String(row['브랜드'] || '').trim() || '-';
      const size = String(row['규격(SIZE)'] || '').trim() || '-';
      const key = buildOrderItemKey(manufacturer, brand, size);
      const current = aggregated.get(key);
      const qty = parseQty(row['갯수']);

      if (current) {
        current.pendingFails += qty;
      } else {
        aggregated.set(key, { manufacturer, brand, size, pendingFails: qty });
      }
    });

    return Array.from(aggregated.entries())
      .map(([key, value]) => {
        const orderedExchange = pendingFailExchangeQtyByKey.get(key) ?? 0;
        const remainingToExchange = Math.max(0, value.pendingFails - orderedExchange);
        return { ...value, orderedExchange, remainingToExchange };
      })
      .filter((entry) => entry.remainingToExchange > 0)
      .sort((a, b) => b.remainingToExchange - a.remainingToExchange);
  }, [pendingFailRows, pendingFailExchangeQtyByKey]);

  const failSummary = useMemo(
    () => ({
      pendingRows: pendingFailRows.length,
      pendingQty: pendingFailRows.reduce((sum, row) => sum + parseQty(row['갯수']), 0),
      remainingExchangeQty: failExchangeEntries.reduce((sum, entry) => sum + entry.remainingToExchange, 0),
    }),
    [failExchangeEntries, pendingFailRows]
  );

  const unregisteredSummary = useMemo(
    () => ({
      count: surgeryUnregisteredItems.length,
      usageQty: surgeryUnregisteredItems.reduce((sum, item) => sum + Number(item.usageCount || 0), 0),
    }),
    [surgeryUnregisteredItems]
  );

  const latestAuditSummary = useMemo<LatestAuditSummary>(() => {
    if (auditHistory.length === 0) {
      return {
        date: null,
        mismatchCount: 0,
        mismatchQty: 0,
        topMismatches: [],
      };
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

  const monthlyTotals = useMemo(() => {
    const monthMap = new Map<string, { placement: number; fail: number }>();

    cleanSurgeryRows.forEach((row) => {
      const cls = String(row['구분'] || '').trim();
      if (cls !== '식립' && cls !== '수술중교환') return;

      const monthKey = monthKeyFromDate(row['날짜']);
      if (!monthKey) return;

      const qty = parseQty(row['갯수']);
      const current = monthMap.get(monthKey) ?? { placement: 0, fail: 0 };

      if (cls === '식립') current.placement += qty;
      if (cls === '수술중교환') current.fail += qty;

      monthMap.set(monthKey, current);
    });

    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, ...value }));
  }, [cleanSurgeryRows]);

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

    if (!last || !prev) {
      return { placementDelta: 0, failDelta: 0 };
    }

    return {
      placementDelta: last.placement - prev.placement,
      failDelta: last.fail - prev.fail,
    };
  }, [recentMonthlyTrend]);

  const latestTrendMonth = useMemo(() => {
    const last = recentMonthlyTrend[recentMonthlyTrend.length - 1];
    if (!last) {
      return {
        month: '-',
        placement: 0,
        fail: 0,
        placementAvg: 0,
        failAvg: 0,
        workDays: 0,
      };
    }
    return last;
  }, [recentMonthlyTrend]);

  const orderProcessing = useMemo(() => {
    const total = orders.length;
    const received = orders.filter((order) => order.status === 'received').length;
    const pending = orders.filter((order) => order.status === 'ordered').length;
    const rate = total > 0 ? Math.round((received / total) * 100) : 0;

    return { total, received, pending, rate };
  }, [orders]);

  const thisMonthSurgery = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    let placementQty = 0;
    let failQty = 0;

    cleanSurgeryRows.forEach((row) => {
      const rawDate = String(row['날짜'] || '');
      if (!rawDate.startsWith(thisMonth)) return;
      const cls = String(row['구분'] || '').trim();
      const qty = parseQty(row['갯수']);
      if (cls === '식립') placementQty += qty;
      if (cls === '수술중교환') failQty += qty;
    });

    return { placementQty, failQty };
  }, [cleanSurgeryRows]);

  // 진행율 기반 전월 대비 delta 계산
  // 이번달 경과 진료일수 / 이번달 전체 진료일수 = 진행율
  // 지난달 동일 진행율 시점의 누계와 비교
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

      // 이번달 1일~오늘까지 경과 진료일수
      let thisElapsed = 0;
      for (let day = 1; day <= todayDay; day++) {
        const dow = new Date(thisYear, thisMonthNum - 1, day).getDay();
        const dateStr = `${thisYear}-${String(thisMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (hospitalWorkDays.includes(dow) && !thisHolidaySet.has(dateStr)) thisElapsed++;
      }

      // 진행율 (0~1)
      const progress = thisMonthTotalWorkDays > 0 ? thisElapsed / thisMonthTotalWorkDays : 0;

      // 지난달에서 동일 진행율에 해당하는 진료일수 목표
      const prevTargetWorkDays = Math.round(progress * prevMonthTotalWorkDays);

      // 지난달 목표 진료일수에 해당하는 달력 일자 찾기
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

      // 지난달 cutoff 일자까지 누계 집계
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

  const latestSurgeryDate = useMemo(() => {
    let maxDate: Date | null = null;
    for (const row of cleanSurgeryRows) {
      const parsed = parseDate(row['날짜']);
      if (!parsed) continue;
      if (!maxDate || parsed > maxDate) maxDate = parsed;
    }
    return maxDate ? maxDate.toISOString().slice(0, 10) : null;
  }, [cleanSurgeryRows]);

  const latestOrderDate = useMemo(() => {
    let maxDate: Date | null = null;
    for (const order of orders) {
      const parsed = parseDate(order.date);
      if (!parsed) continue;
      if (!maxDate || parsed > maxDate) maxDate = parsed;
    }
    return maxDate ? maxDate.toISOString().slice(0, 10) : null;
  }, [orders]);

  const recentMonthKeys = useMemo(() => getRecentMonthKeys(6), []);

  const manufacturerUsageSummary = useMemo<ManufacturerUsageSummary>(() => {
    const monthSet = new Set(recentMonthKeys);
    const map = new Map<
      string,
      {
        manufacturer: string;
        totalQty: number;
        recentQty: number;
        placementQty: number;
        failQty: number;
        brandMap: Map<string, number>;
        monthMap: Map<string, number>;
      }
    >();

    cleanSurgeryRows.forEach((row) => {
      const cls = String(row['구분'] || '').trim();
      if (cls !== '식립' && cls !== '수술중교환') return;

      const manufacturer = String(row['제조사'] || '').trim();
      const brand = String(row['브랜드'] || '').trim() || '-';
      if (!manufacturer) return;
      if (isExchangePrefix(manufacturer) || manufacturer === '보험청구' || brand === '보험임플란트') return;
      const manufacturerKey = manufacturerAliasKey(manufacturer);
      if (!manufacturerKey) return;

      const qty = parseQty(row['갯수']);
      const monthKey = monthKeyFromDate(row['날짜']);
      const current = map.get(manufacturerKey) ?? {
        manufacturer,
        totalQty: 0,
        recentQty: 0,
        placementQty: 0,
        failQty: 0,
        brandMap: new Map<string, number>(),
        monthMap: new Map<string, number>(),
      };

      current.manufacturer = pickDisplayManufacturer(current.manufacturer, manufacturer);
      current.totalQty += qty;
      if (cls === '식립') current.placementQty += qty;
      if (cls === '수술중교환') current.failQty += qty;
      if (monthKey && monthSet.has(monthKey)) current.recentQty += qty;
      current.brandMap.set(brand, (current.brandMap.get(brand) ?? 0) + qty);
      if (monthKey) current.monthMap.set(monthKey, (current.monthMap.get(monthKey) ?? 0) + qty);

      map.set(manufacturerKey, current);
    });

    const rows = Array.from(map.values())
      .map((value) => {
        const topBrands = Array.from(value.brandMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([brand, qty]) => ({ brand, qty }));
        const monthly = recentMonthKeys.map((month) => ({
          month,
          qty: value.monthMap.get(month) ?? 0,
        }));
        const failRate = value.totalQty > 0 ? Math.round((value.failQty / value.totalQty) * 100) : 0;
        return {
          manufacturer: value.manufacturer,
          totalQty: value.totalQty,
          recentQty: value.recentQty,
          placementQty: value.placementQty,
          failQty: value.failQty,
          failRate,
          topBrands,
          monthly,
        };
      })
      .sort((a, b) => {
        if (b.recentQty !== a.recentQty) return b.recentQty - a.recentQty;
        return b.totalQty - a.totalQty;
      });

    return {
      rows,
      totalQty: rows.reduce((sum, row) => sum + row.totalQty, 0),
      recentQty: rows.reduce((sum, row) => sum + row.recentQty, 0),
      placementQty: rows.reduce((sum, row) => sum + row.placementQty, 0),
      failQty: rows.reduce((sum, row) => sum + row.failQty, 0),
    };
  }, [cleanSurgeryRows, recentMonthKeys]);

  const surgeryStaleDays = daysSince(latestSurgeryDate);
  const auditStaleDays = daysSince(latestAuditSummary.date);

  const hasBaseStockSet = useMemo(
    () => visibleInventory.some((item) => item.initialStock > 0),
    [visibleInventory]
  );

  const thisMonthFailRate = useMemo(() => {
    const total = thisMonthSurgery.placementQty + thisMonthSurgery.failQty;
    if (total === 0) return null;
    return Number(((thisMonthSurgery.failQty / total) * 100).toFixed(1));
  }, [thisMonthSurgery.placementQty, thisMonthSurgery.failQty]);

  const alertCards = useMemo<AlertCard[]>(() => {
    const shortageSeverity: PriorityLevel =
      shortageSummary.deficitQty >= 30 || shortageSummary.itemCount >= 12
        ? 'critical'
        : shortageSummary.itemCount > 0
          ? 'warning'
          : 'ok';
    const failSeverity: PriorityLevel =
      failSummary.remainingExchangeQty >= 15 || failSummary.pendingRows >= 10
        ? 'critical'
        : failSummary.pendingRows > 0
          ? 'warning'
          : 'ok';
    const auditSeverity: PriorityLevel =
      latestAuditSummary.mismatchQty >= 15 || latestAuditSummary.mismatchCount >= 8
        ? 'critical'
        : latestAuditSummary.mismatchCount > 0
          ? 'warning'
          : 'ok';
    const unregisteredSeverity: PriorityLevel =
      unregisteredSummary.usageQty >= 20 || unregisteredSummary.count >= 8
        ? 'critical'
        : unregisteredSummary.count > 0
          ? 'warning'
          : 'ok';
    const orderSeverity: PriorityLevel =
      pendingOrderSummary.replenishmentQty >= 25 || pendingOrderSummary.replenishmentCount >= 10
        ? 'critical'
        : pendingOrderSummary.replenishmentCount > 0
          ? 'warning'
          : 'ok';

    const cards: AlertCard[] = [
      {
        key: 'shortage',
        title: '남은 부족분',
        value: `${shortageSummary.itemCount}종`,
        sub: `${shortageSummary.deficitQty}개`,
        tone:
          shortageSeverity === 'critical'
            ? 'border-rose-300 bg-rose-50 text-rose-700'
            : shortageSeverity === 'warning'
              ? 'border-rose-200 bg-rose-50/70 text-rose-700'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
        tab: 'order_management',
        hint: '입고대기 주문 차감 후 기준',
        severity: shortageSeverity,
        score: (shortageSummary.deficitQty * 3) + (shortageSummary.itemCount * 5),
      },
      {
        key: 'pending-fails',
        title: '미교환',
        value: `${failSummary.pendingRows}건`,
        sub: `${failSummary.remainingExchangeQty}개 교환 필요`,
        tone:
          failSeverity === 'critical'
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : failSeverity === 'warning'
              ? 'border-amber-200 bg-amber-50/70 text-amber-700'
              : 'border-emerald-200 bg-emerald-50/70 text-emerald-700',
        tab: 'fail_management',
        hint: '수술중교환 기준',
        severity: failSeverity,
        score: (failSummary.remainingExchangeQty * 3) + (failSummary.pendingRows * 4),
      },
      {
        key: 'audit-mismatch',
        title: '최근 실사 불일치',
        value: isAuditLoading ? '...' : `${latestAuditSummary.mismatchCount}건`,
        sub: isAuditLoading ? '실사 이력 조회 중' : `${latestAuditSummary.mismatchQty}개 차이`,
        tone:
          auditSeverity === 'critical'
            ? 'border-orange-300 bg-orange-50 text-orange-800'
            : auditSeverity === 'warning'
              ? 'border-orange-200 bg-orange-50/70 text-orange-700'
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
        tone:
          orderSeverity === 'critical'
            ? 'border-indigo-300 bg-indigo-50 text-indigo-800'
            : orderSeverity === 'warning'
              ? 'border-indigo-200 bg-indigo-50/70 text-indigo-700'
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
        tone:
          unregisteredSeverity === 'critical'
            ? 'border-fuchsia-300 bg-fuchsia-50 text-fuchsia-800'
            : unregisteredSeverity === 'warning'
              ? 'border-fuchsia-200 bg-fuchsia-50/70 text-fuchsia-700'
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
    failSummary.pendingRows,
    failSummary.remainingExchangeQty,
    isAuditLoading,
    latestAuditSummary.date,
    latestAuditSummary.mismatchCount,
    latestAuditSummary.mismatchQty,
    pendingOrderSummary.replenishmentCount,
    pendingOrderSummary.replenishmentQty,
    shortageSummary.deficitQty,
    shortageSummary.itemCount,
    unregisteredSummary.count,
    unregisteredSummary.usageQty,
  ]);

  const todayActionItems = useMemo<ActionItem[]>(() => {
    const items: ActionItem[] = [];

    // 온보딩 미완료 시 최우선 긴급 항목으로 추가
    if (onboardingStep != null && onResumeOnboarding) {
      const label = ONBOARDING_STEP_LABELS[onboardingStep];
      items.push({
        key: 'action-onboarding',
        title: label?.title ?? '초기 설정 완료하기',
        description: label?.desc ?? '초기 설정을 완료하세요.',
        tab: 'overview',
        severity: 'critical',
        score: 9999, // 항상 1순위
        alertNote: `초기 설정 ${onboardingStep}/7단계 진행 중`,
        onClick: onResumeOnboarding,
      });
    }

    const topShortage = shortageEntries[0];
    const topMismatch = latestAuditSummary.topMismatches[0];
    const topFail = failExchangeEntries[0];

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

    if (surgeryStaleDays !== null && surgeryStaleDays >= 7) {
      items.push({
        key: 'action-surgery-freshness',
        title: '수술기록 최신화 필요',
        description: `마지막 수술기록 반영 후 ${surgeryStaleDays}일 경과`,
        tab: 'surgery_database',
        severity: surgeryStaleDays >= 14 ? 'critical' : 'warning',
        score: surgeryStaleDays * 3,
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
    auditStaleDays,
    failExchangeEntries,
    failSummary.pendingRows,
    failSummary.remainingExchangeQty,
    failThresholds,
    hasBaseStockSet,
    latestAuditSummary.date,
    latestAuditSummary.mismatchCount,
    latestAuditSummary.mismatchQty,
    latestAuditSummary.topMismatches,
    pendingOrderSummary.replenishmentCount,
    pendingOrderSummary.replenishmentQty,
    shortageEntries,
    shortageSummary.deficitQty,
    shortageSummary.itemCount,
    surgeryStaleDays,
    unregisteredSummary.count,
    unregisteredSummary.usageQty,
    visibleInventory,
    onboardingStep,
    onResumeOnboarding,
  ]);

  const maxManufacturerRecentQty = useMemo(
    () => Math.max(1, ...manufacturerUsageSummary.rows.map((row) => row.recentQty)),
    [manufacturerUsageSummary.rows]
  );

  return (
    <>
    <div className="space-y-5 [&_button]:cursor-pointer">
      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">오늘 할 일 우선순위</h3>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600">
                {todayActionItems.length}개
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              실시간 지표 기반으로 자동 정렬됩니다.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">이번달 식립</p>
                <p className="text-sm font-black text-indigo-700 tabular-nums leading-tight">
                  {thisMonthSurgery.placementQty}개{progressDelta.isReady && progressDelta.placementDelta !== 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${progressDelta.placementDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({progressDelta.placementDelta > 0 ? '+' : ''}{progressDelta.placementDelta})
                    </span>
                  )}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">이번달 교환</p>
                <p className={`text-sm font-black tabular-nums leading-tight ${thisMonthSurgery.failQty > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {thisMonthSurgery.failQty}개{progressDelta.isReady && progressDelta.failDelta !== 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${progressDelta.failDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ({progressDelta.failDelta > 0 ? '+' : ''}{progressDelta.failDelta})
                    </span>
                  )}
                </p>
              </div>
            </div>
            {progressDelta.isReady && (
              <div className="relative group/pdtip">
                <p className="text-[9px] text-slate-400 font-medium pr-0.5 cursor-help underline decoration-dashed decoration-slate-300 underline-offset-2">
                  전월 1~{progressDelta.prevCutoffDay}일 누계 기준 ⓘ
                </p>
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/pdtip:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                  <p>진행율 {progressDelta.progressPct}% 기준 (이번달 {progressDelta.thisElapsed}일 경과 / 전체 {progressDelta.thisTotalWorkDays}일)</p>
                  <p className="mt-1">전월({progressDelta.prevMonthLabel}) 동일 시점인 {progressDelta.prevCutoffDay}일까지 누계와 비교합니다.</p>
                  <p className="mt-1 text-slate-400">진료요일 설정 및 대한민국 공휴일을 반영합니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
          {todayActionItems.map((item, index) => {
            const isOnboarding = item.key === 'action-onboarding';
            return (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              onClick={() => item.onClick ? item.onClick() : onNavigate(item.tab)}
              onKeyDown={(e) => e.key === 'Enter' && (item.onClick ? item.onClick() : onNavigate(item.tab))}
              className={isOnboarding
                ? 'lg:col-span-2 w-full text-left rounded-xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 via-white to-violet-50 hover:border-indigo-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/15 active:translate-y-0 active:scale-[0.99] transition-all duration-200 px-4 py-3 cursor-pointer relative overflow-hidden group'
                : 'w-full text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] transition-all duration-150 px-3 py-2.5 cursor-pointer'
              }
            >
              {isOnboarding && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-violet-500/5 group-hover:from-indigo-500/10 group-hover:to-violet-500/10 transition-colors" />
                  <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-l-xl" />
                </>
              )}
              <div className={`flex items-center gap-3 ${isOnboarding ? 'relative z-10' : ''}`}>
                <span className={`mt-0.5 w-6 h-6 rounded-lg text-white text-[11px] font-black inline-flex items-center justify-center shrink-0 ${isOnboarding ? 'bg-indigo-600 animate-pulse' : 'bg-slate-900'}`}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-black truncate ${isOnboarding ? 'text-indigo-900' : 'text-slate-800'}`}>{item.title}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {isOnboarding && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black animate-pulse">
                          시작하기
                        </span>
                      )}
                      {item.key === 'action-fail' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowFailThresholdModal(true); }}
                          className="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                          title="기준량 설정"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                      {!isOnboarding && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${PRIORITY_BADGE[item.severity].className}`}>
                        {PRIORITY_BADGE[item.severity].label}
                      </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isOnboarding ? 'text-indigo-700' : 'text-slate-600'}`}>{item.description}</p>
                  {item.alertNote && (
                    <div className={`flex items-center gap-1.5 mt-1 ${isOnboarding ? '' : ''}`}>
                      {isOnboarding && onboardingStep != null && (
                        <div className="flex-1 max-w-[180px] h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round(((onboardingStep - 1) / 7) * 100)}%` }}
                          />
                        </div>
                      )}
                      <p className={`text-[10px] font-bold ${isOnboarding ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {isOnboarding ? item.alertNote : `⚠ ${item.alertNote}`}
                      </p>
                    </div>
                  )}
                  {item.meta && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.meta}</p>}
                  {item.metaItems && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {item.metaItems.map(({ label, count }) => (
                        <span key={label} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[9px] font-black text-amber-700 whitespace-nowrap">
                          {label} <span className="text-amber-500">{count}개</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <svg className={`w-3.5 h-3.5 shrink-0 ${isOnboarding ? 'text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all' : 'text-slate-400'}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            );
          })}

          {todayActionItems.length === 0 && (
            <div className="lg:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-bold text-emerald-700">오늘 처리할 긴급/주의 항목이 없습니다.</p>
              <p className="text-xs text-emerald-600 mt-1">현재 운영 상태가 안정적입니다.</p>
            </div>
          )}
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {alertCards.map((card, index) => (
          <button
            key={card.key}
            onClick={() => onNavigate(card.tab)}
            className={`text-left rounded-2xl border p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-indigo-500 ${card.tone}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{card.title}</p>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${PRIORITY_BADGE[card.severity].className}`}
                title={`우선순위 점수 ${card.score}`}
              >
                {PRIORITY_BADGE[card.severity].label}
              </span>
            </div>
            <p className="mt-2 text-2xl font-black leading-none tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs font-semibold opacity-85">{card.sub}</p>
            <div className="mt-2 flex items-center justify-between gap-1">
              <p className="text-[10px] font-medium opacity-70">
                P{index + 1} · {card.hint}
              </p>
              <svg className="w-3 h-3 opacity-50 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">발주 필요 TOP 5</h3>
            <button
              onClick={() => onNavigate('order_management')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              주문 관리 이동
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {shortageEntries.slice(0, 5).map((entry) => (
              <div key={entry.item.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {entry.item.brand} {entry.item.size}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">{entry.item.manufacturer}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-black text-rose-600">-{entry.remainingDeficit}개</p>
                  {entry.pendingQty > 0 && (
                    <p className="text-[10px] font-semibold text-slate-500">주문중 {entry.pendingQty}</p>
                  )}
                </div>
              </div>
            ))}
            {shortageEntries.length === 0 && (
              <p className="text-xs text-emerald-600 font-semibold px-1 py-2">발주 필요 품목이 없습니다.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">실사 후속 TOP 5</h3>
            <button
              onClick={() => onNavigate('inventory_audit')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              재고 실사 이동
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {isAuditLoading && <p className="text-xs text-slate-500 px-1 py-2">최근 실사 데이터를 불러오는 중...</p>}
            {!isAuditLoading && latestAuditSummary.topMismatches.map((row) => (
              <div key={row.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{row.brand} {row.size}</p>
                  <p className="text-[10px] text-slate-500 truncate">{row.manufacturer}</p>
                </div>
                <p className="text-xs font-black text-orange-600 shrink-0 ml-3">
                  {row.difference > 0 ? '+' : ''}{row.difference}개
                </p>
              </div>
            ))}
            {!isAuditLoading && latestAuditSummary.topMismatches.length === 0 && (
              <p className="text-xs text-slate-500 px-1 py-2">최근 실사에서 후속 조치가 필요한 불일치가 없습니다.</p>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">교환 권장 TOP 5</h3>
            <button
              onClick={() => onNavigate('fail_management')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              교환 관리 이동
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            {failExchangeEntries.slice(0, 5).map((entry) => (
              <div
                key={`${entry.manufacturer}|${entry.brand}|${entry.size}`}
                className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{entry.brand} {entry.size}</p>
                  <p className="text-[10px] text-slate-500 truncate">{entry.manufacturer}</p>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p className="text-xs font-black text-amber-600">{entry.remainingToExchange}개</p>
                  {entry.orderedExchange > 0 && (
                    <p className="text-[10px] font-semibold text-slate-500">주문중 {entry.orderedExchange}</p>
                  )}
                </div>
              </div>
            ))}
            {failExchangeEntries.length === 0 && (
              <p className="text-xs text-emerald-600 font-semibold px-1 py-2">교환 권장 항목이 없습니다.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-5 gap-4">
        <div className="xl:col-span-3 bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">운영 추이 스냅샷</h3>
            <p className="text-[11px] font-semibold text-slate-500">최근 {Math.max(recentMonthlyTrend.length, 1)}개월</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">식립 / 교환 월평균 추이</p>
              {isWorkDaysLoading ? (
                <p className="text-xs text-slate-500 mt-5">진료요일/공휴일 기준 진료일수를 계산 중입니다...</p>
              ) : recentMonthlyTrend.length >= 2 ? (
                <svg className="w-full h-20 mt-3" viewBox="0 0 240 80" role="img" aria-label="최근 월별 식립 및 교환 추이">
                  <path d={buildSparklinePath(trendSeries.placement, 240, 80)} fill="none" stroke="#4f46e5" strokeWidth="2.4" strokeLinecap="round" />
                  <path d={buildSparklinePath(trendSeries.fail, 240, 80)} fill="none" stroke="#f43f5e" strokeWidth="2.1" strokeLinecap="round" />
                </svg>
              ) : (
                <p className="text-xs text-slate-500 mt-5">추이를 표시할 월별 데이터가 아직 부족합니다.</p>
              )}
              <p className="mt-2 text-[10px] text-slate-500">
                그래프 기준: 월별 평균(설정 진료요일 + 대한민국 공휴일 반영)
              </p>
              {!isWorkDaysLoading && (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  최근 {latestTrendMonth.month} 진료일 {latestTrendMonth.workDays}일
                </p>
              )}
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-indigo-600">
                  실제 식립 {latestTrendMonth.placement}개 (Δ {trendDelta.placementDelta >= 0 ? '+' : ''}{trendDelta.placementDelta})
                </span>
                <span className="font-semibold text-rose-600">
                  실제 교환 {latestTrendMonth.fail}개 (Δ {trendDelta.failDelta >= 0 ? '+' : ''}{trendDelta.failDelta})
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">주문 처리율</p>
              <p className="mt-4 text-4xl font-black text-slate-800 tabular-nums">{orderProcessing.rate}%</p>
              <p className="mt-1 text-xs text-slate-500">입고완료 {orderProcessing.received}건 / 전체 {orderProcessing.total}건</p>
              <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${orderProcessing.rate}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">입고대기 {orderProcessing.pending}건</p>
            </div>
          </div>
        </div>

        <div className="xl:col-span-2 space-y-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-3">데이터 상태</h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">최근 수술일</span>
                <span className="font-bold text-slate-700">{formatDate(latestSurgeryDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">최근 주문일</span>
                <span className="font-bold text-slate-700">{formatDate(latestOrderDate)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">최근 실사일</span>
                <span className="font-bold text-slate-700">{formatDate(latestAuditSummary.date)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">수술 데이터 경과</span>
                <span className="font-bold text-slate-700">
                  {daysSince(latestSurgeryDate) === null ? '-' : `${daysSince(latestSurgeryDate)}일`}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <h3 className="text-sm font-black text-slate-900 mb-3">빠른 실행</h3>
            <div className="grid grid-cols-2 gap-2">
              {[
                {
                  label: '재고 마스터',
                  tab: 'inventory_master' as DashboardTab,
                  hoverClass: 'hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 hover:shadow-[0_8px_18px_rgba(16,185,129,0.16)]',
                },
                {
                  label: '재고 실사',
                  tab: 'inventory_audit' as DashboardTab,
                  hoverClass: 'hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 hover:shadow-[0_8px_18px_rgba(245,158,11,0.16)]',
                },
                {
                  label: '주문 관리',
                  tab: 'order_management' as DashboardTab,
                  hoverClass: 'hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:shadow-[0_8px_18px_rgba(79,70,229,0.16)]',
                },
                {
                  label: '수술 DB',
                  tab: 'surgery_database' as DashboardTab,
                  hoverClass: 'hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 hover:shadow-[0_8px_18px_rgba(14,165,233,0.16)]',
                },
                {
                  label: '교환 관리',
                  tab: 'fail_management' as DashboardTab,
                  hoverClass: 'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 hover:shadow-[0_8px_18px_rgba(244,63,94,0.16)]',
                },
                {
                  label: '로우데이터',
                  tab: 'fixture_upload' as DashboardTab,
                  hoverClass: 'hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 hover:shadow-[0_8px_18px_rgba(139,92,246,0.16)]',
                },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.tab)}
                  className={`group relative overflow-hidden px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-700 transition-all duration-200 hover:-translate-y-0.5 ${item.hoverClass} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 active:translate-y-0`}
                >
                  <span className="absolute inset-x-0 top-0 h-[2px] bg-current opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                  <span className="relative flex items-center justify-center">
                    {item.label}
                    <svg
                      className="absolute right-0 w-3.5 h-3.5 opacity-0 translate-x-1 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M5 10H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                      <path d="M11 6L15 10L11 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-slate-500">
              플랜: <span className="font-bold text-slate-700">{planState?.plan?.toUpperCase() || 'FREE'}</span>
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900">제조사 사용 추이</h3>
          <button
            onClick={() => onNavigate('surgery_database')}
            className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
          >
            수술 데이터 상세 보기
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {manufacturerUsageSummary.rows.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">최근 6개월 사용</p>
                <p className="mt-1 text-xl font-black text-slate-800 tabular-nums">{manufacturerUsageSummary.recentQty}개</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">사용 제조사</p>
                <p className="mt-1 text-xl font-black text-slate-800 tabular-nums">{manufacturerUsageSummary.rows.length}곳</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.12em]">식립 합계</p>
                <p className="mt-1 text-xl font-black text-indigo-700 tabular-nums">{manufacturerUsageSummary.placementQty}개</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.12em]">교환 합계</p>
                <p className="mt-1 text-xl font-black text-rose-700 tabular-nums">{manufacturerUsageSummary.failQty}개</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-black text-slate-800">최근 6개월 사용량 TOP 6</h4>
                <div className="mt-3 space-y-2.5">
                  {manufacturerUsageSummary.rows.slice(0, 6).map((row) => {
                    const ratio = row.recentQty / maxManufacturerRecentQty;
                    const width = Math.max(6, Math.round(ratio * 100));
                    return (
                      <div key={row.manufacturer} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <p className="font-bold text-slate-800 truncate">{row.manufacturer}</p>
                          <p className="font-semibold text-slate-500 shrink-0">최근 {row.recentQty}개 · 전체 {row.totalQty}개</p>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>식립 {row.placementQty}개 / 교환 {row.failQty}개</span>
                          <span>교환율 {row.failRate}%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          주요 브랜드: {row.topBrands.map((brand) => `${brand.brand}(${brand.qty})`).join(' · ') || '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-black text-slate-800">월별 사용 히트맵 (최근 6개월)</h4>
                <div className="mt-3 overflow-x-auto">
                  <div className="min-w-[480px] space-y-1">
                    <div
                      className="grid gap-1"
                      style={{ gridTemplateColumns: `120px repeat(${recentMonthKeys.length}, minmax(0, 1fr))` }}
                    >
                      <div className="text-[10px] font-bold text-slate-400 px-2 py-1">제조사</div>
                      {recentMonthKeys.map((month) => (
                        <div key={`head-${month}`} className="text-[10px] font-bold text-slate-400 text-center px-1 py-1">
                          {month.slice(5)}
                        </div>
                      ))}
                    </div>

                    {manufacturerUsageSummary.rows.slice(0, 5).map((row) => (
                      <div
                        key={`${row.manufacturer}-heatmap`}
                        className="grid gap-1"
                        style={{ gridTemplateColumns: `120px repeat(${recentMonthKeys.length}, minmax(0, 1fr))` }}
                      >
                        <div className="h-8 rounded-md bg-slate-50 px-2 inline-flex items-center text-[11px] font-bold text-slate-700 truncate">
                          {row.manufacturer}
                        </div>
                        {row.monthly.map((monthly) => {
                          const intensity = row.recentQty > 0 ? monthly.qty / row.recentQty : 0;
                          const tone =
                            monthly.qty <= 0
                              ? 'bg-slate-100 text-slate-400'
                              : intensity >= 0.35
                                ? 'bg-indigo-500 text-white'
                                : intensity >= 0.2
                                  ? 'bg-indigo-200 text-indigo-700'
                                  : 'bg-indigo-100 text-indigo-600';
                          return (
                            <div
                              key={`${row.manufacturer}|${monthly.month}`}
                              className={`h-8 rounded-md text-[10px] font-bold inline-flex items-center justify-center ${tone}`}
                            >
                              {monthly.qty}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">수술기록지의 식립/수술중교환 수량 기준 집계</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">최근 수술 데이터에서 집계할 제조사 사용량이 없습니다.</p>
            <p className="text-xs text-slate-500 mt-1">수술기록지 업로드 후 제조사/브랜드 추이를 확인할 수 있습니다.</p>
            <button
              onClick={() => onNavigate('surgery_database')}
              className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              수술 데이터 보기
            </button>
          </div>
        )}
      </section>
    </div>

    {showFailThresholdModal && (
      <FailThresholdModal
        manufacturers={failExchangeEntries.map((e) => e.manufacturer).filter((m, i, arr) => arr.indexOf(m) === i)}
        currentThresholds={failThresholds}
        onSave={async (updated) => {
          if (hospitalId) await failThresholdService.save(hospitalId, updated);
          setFailThresholds(updated);
        }}
        onClose={() => setShowFailThresholdModal(false)}
      />
    )}
    </>
  );
};

export default DashboardOverview;
