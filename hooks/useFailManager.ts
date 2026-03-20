import { useMemo, useState, useEffect, useRef } from 'react';
import type { ExcelRow, InventoryItem, Order as FailOrder, ReturnRequest, ReturnReason } from '../types';
import { getSizeMatchKey, isIbsImplantManufacturer } from '../services/sizeNormalizer';
import { useToast } from './useToast';
import { useCountUp, DONUT_COLORS } from '../components/surgery-dashboard/shared';
import { surgeryService } from '../services/surgeryService';
import { useEscapeKey } from './useEscapeKey';

// Chart constants (exported so component can use them)
export const CHART_MAX_VISIBLE = 12;
export const CHART_PAD = { l: 36, r: 8, t: 8, b: 24 } as const;
export const CHART_AREA_H = 280;

export interface MonthlyFailDatum {
  month: string;
  total: number;
  byManufacturer: Record<string, number>;
}

interface UseFailManagerParams {
  surgeryMaster: Record<string, ExcelRow[]>;
  inventory: InventoryItem[];
  failOrders: FailOrder[];
  returnRequests: ReturnRequest[];
  onCreateReturn: (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => Promise<void>;
  currentUserName: string;
  hospitalId?: string;
  onBulkSetupComplete?: () => Promise<void>;
  initialShowBulkModal?: boolean;
  onInitialModalOpened?: () => void;
}

/**
 * FAIL/교환 트랙: 제조사 재고에서 currentStock 많은 순으로 반품 품목 분배.
 * brand 필드에 제조사명 대신 실제 inventory 브랜드/사이즈를 사용해 DB 데이터 정합성 확보.
 */
export function buildReturnItems(
  inventory: InventoryItem[],
  manufacturer: string,
  totalQty: number
): { brand: string; size: string; quantity: number }[] {
  const mfrItems = inventory
    .filter(inv => inv.manufacturer === manufacturer && inv.currentStock > 0)
    .sort((a, b) => b.currentStock - a.currentStock);

  if (mfrItems.length === 0) {
    // 재고 없음 — 빈 값으로 기록 (handleCreateReturn 폴백이 처리)
    return [{ brand: '', size: '', quantity: totalQty }];
  }

  const result: { brand: string; size: string; quantity: number }[] = [];
  let remaining = totalQty;

  for (const item of mfrItems) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, item.currentStock);
    result.push({ brand: item.brand, size: item.size, quantity: take });
    remaining -= take;
  }

  // 전체 재고 < 반품 수량인 경우 첫 항목에 나머지 추가
  if (remaining > 0) {
    result[0].quantity += remaining;
  }

  return result;
}

export function useFailManager({
  surgeryMaster,
  inventory,
  failOrders,
  returnRequests,
  onCreateReturn,
  currentUserName,
  hospitalId,
  onBulkSetupComplete,
  initialShowBulkModal,
  onInitialModalOpened,
}: UseFailManagerParams) {
  const { toast, showToast } = useToast();
  const simpleNormalize = (str: string) => String(str || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');
  const normalizeMfrName = (raw: string): string => {
    const s = String(raw || '기타');
    return isIbsImplantManufacturer(s) ? 'IBS Implant' : s;
  };

  // 1. FAIL 히스토리 전체 추출
  const historyFailList = useMemo(() => {
    const allRows = surgeryMaster['수술기록지'] || [];
    return allRows.filter(row => row['구분'] === '수술중교환' || row['구분'] === '교환완료');
  }, [surgeryMaster]);

  // ── 기간 필터: 전체 월 목록 + state ──
  const allMonths = useMemo(() => {
    const monthSet = new Set<string>();
    historyFailList.forEach(f => {
      const d = String(f['날짜'] || '');
      if (d.length >= 7) monthSet.add(d.substring(0, 7));
    });
    return Array.from(monthSet).sort();
  }, [historyFailList]);

  const [periodStartIdx, setPeriodStartIdx] = useState(0);
  const [periodEndIdx, setPeriodEndIdx] = useState(0);

  useEffect(() => {
    if (allMonths.length > 0) {
      setPeriodStartIdx(0);
      setPeriodEndIdx(allMonths.length - 1);
    }
  }, [allMonths.length]);

  const handlePeriodChange = (start: number, end: number) => {
    setPeriodStartIdx(start);
    setPeriodEndIdx(end);
  };

  // ── 기간 필터 적용된 히스토리 ──
  const filteredHistoryFailList = useMemo(() => {
    if (allMonths.length === 0) return historyFailList;
    const startMonth = allMonths[periodStartIdx] || allMonths[0];
    const endMonth = allMonths[periodEndIdx] || allMonths[allMonths.length - 1];
    return historyFailList.filter(f => {
      const d = String(f['날짜'] || '');
      if (d.length < 7) return false;
      const month = d.substring(0, 7);
      return month >= startMonth && month <= endMonth;
    });
  }, [historyFailList, allMonths, periodStartIdx, periodEndIdx]);

  // 2. 미처리 교환 리스트
  const pendingFailList = useMemo(() => {
    return filteredHistoryFailList.filter(row => row['구분'] === '수술중교환');
  }, [filteredHistoryFailList]);

  // 3. 제조사 목록
  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    filteredHistoryFailList.forEach(f => set.add(normalizeMfrName(String(f['제조사'] || '기타'))));
    return Array.from(set).sort();
  }, [filteredHistoryFailList]);

  // 4. 일괄 등록 모달용: 재고에서 유효 제조사 목록
  const availableManufacturers = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => {
      const m = item.manufacturer;
      if (m && !m.startsWith('수술중교환_') && !m.startsWith('수술중FAIL_') && !m.startsWith('FAIL_') && m !== '보험임플란트') {
        set.add(m);
      }
    });
    return Array.from(set).sort();
  }, [inventory]);

  // 5. 미처리 교환을 제조사별 카운트로 변환 (returnPendingByMfr/returnCompletedByMfr 선언 이후로 이동)

  const [activeM, setActiveM] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [showBulkInfo, setShowBulkInfo] = useState(false);
  const [isAllReturnConfirmOpen, setIsAllReturnConfirmOpen] = useState(false);
  const [isAllReturnSubmitting, setIsAllReturnSubmitting] = useState(false);

  useEscapeKey(() => { if (!isAllReturnSubmitting) setIsAllReturnConfirmOpen(false); }, isAllReturnConfirmOpen);

  useEffect(() => {
    if (initialShowBulkModal) {
      setIsBulkModalOpen(true);
      onInitialModalOpened?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [chartMonthOffset, setChartMonthOffset] = useState(0);
  const chartTouchStartX = useRef<number>(0);
  const chartTouchStartY = useRef<number>(0);
  const orderModalRef = useRef<HTMLDivElement>(null);
  const orderModalCloseButtonRef = useRef<HTMLButtonElement>(null);
  // 제조사별 통계
  const mStats = useMemo(() => {
    const stats: Record<string, { total: number; processed: number; pending: number }> = {};
    filteredHistoryFailList.forEach(f => {
      const m = normalizeMfrName(String(f['제조사'] || '기타'));
      if (!stats[m]) stats[m] = { total: 0, processed: 0, pending: 0 };
      stats[m].total++;
      if (f['구분'] === '교환완료') stats[m].processed++;
      else stats[m].pending++;
    });
    return stats;
  }, [filteredHistoryFailList]);

  const currentStats = activeM === 'all'
    ? { total: filteredHistoryFailList.length, processed: filteredHistoryFailList.filter(f => f['구분'] === '교환완료').length, pending: pendingFailList.length }
    : (mStats[activeM] || { total: 0, processed: 0, pending: 0 });
  const currentRemainingFails = currentStats.pending;

  // 반품 대기중 건수 (교환 반품만: requested 또는 picked_up 상태)
  const returnPendingByMfr = useMemo(() => {
    const counts: Record<string, number> = {};
    returnRequests
      .filter(r => r.reason === 'exchange' && (r.status === 'requested' || r.status === 'picked_up'))
      .forEach(r => {
        const m = normalizeMfrName(r.manufacturer);
        // z수술후FAIL 마커 아이템 제외 — FAIL 건수가 교환 처리 집계에 영향 주지 않도록
        const qty = r.items.reduce((s, i) => i.brand === 'z수술후FAIL' ? s : s + i.quantity, 0);
        counts[m] = (counts[m] || 0) + qty;
      });
    return counts;
  }, [returnRequests]);

  // 반품 완료 건수 (교환 반품만: completed 상태)
  const returnCompletedByMfr = useMemo(() => {
    const counts: Record<string, number> = {};
    returnRequests
      .filter(r => r.reason === 'exchange' && r.status === 'completed')
      .forEach(r => {
        const m = normalizeMfrName(r.manufacturer);
        // z수술후FAIL 마커 아이템 제외 — FAIL 건수가 교환 처리 집계에 영향 주지 않도록
        const qty = r.items.reduce((s, i) => i.brand === 'z수술후FAIL' ? s : s + i.quantity, 0);
        counts[m] = (counts[m] || 0) + qty;
      });
    return counts;
  }, [returnRequests]);

  // 모달에 표시되는 "시스템 기록"은 완료/대기 반품을 차감한 실제 미처리 수
  // (차감하지 않으면 사용자가 입력한 값과 최종 표시값이 불일치)
  const pendingByManufacturer = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingFailList.forEach(f => {
      const m = normalizeMfrName(String(f['제조사'] || '기타'));
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([manufacturer, count]) => ({
      manufacturer,
      count: Math.max(0, count
        - (returnPendingByMfr[manufacturer] || 0)
        - (returnCompletedByMfr[manufacturer] || 0)),
    }));
  }, [pendingFailList, returnPendingByMfr, returnCompletedByMfr]);

  const pendingByManufacturerMap = useMemo(() => {
    const map: Record<string, number> = {};
    pendingByManufacturer.forEach(({ manufacturer, count }) => { map[manufacturer] = count; });
    return map;
  }, [pendingByManufacturer]);

  const totalReturnPending = Object.values(returnPendingByMfr).reduce((s, v) => s + v, 0);
  const totalReturnCompleted = Object.values(returnCompletedByMfr).reduce((s, v) => s + v, 0);
  const returnPendingCount = activeM === 'all'
    ? totalReturnPending
    : (returnPendingByMfr[activeM] || 0);
  const returnCompletedCount = activeM === 'all'
    ? totalReturnCompleted
    : (returnCompletedByMfr[activeM] || 0);
  const actualPendingFails = Math.max(0, currentRemainingFails - returnPendingCount - returnCompletedCount);
  const globalPendingFails = Math.max(0, pendingFailList.length - totalReturnPending - totalReturnCompleted);

  // 월별 교환 추세 데이터
  const monthlyFailData = useMemo<MonthlyFailDatum[]>(() => {
    const monthMap: Record<string, Record<string, number>> = {};
    filteredHistoryFailList.forEach(f => {
      const dateStr = String(f['날짜'] || '');
      if (!dateStr || dateStr.length < 7) return;
      const month = dateStr.substring(0, 7);
      const m = normalizeMfrName(String(f['제조사'] || '기타'));
      if (!monthMap[month]) monthMap[month] = {};
      monthMap[month][m] = (monthMap[month][m] || 0) + 1;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, byManufacturer]) => ({
        month,
        byManufacturer,
        total: Object.values(byManufacturer).reduce((s, v) => s + v, 0),
      }));
  }, [filteredHistoryFailList]);

  // 차트 크기 고정용: 전체 기간 기준 월별 데이터 (기간 필터 미적용)
  const allMonthlyFailData = useMemo<MonthlyFailDatum[]>(() => {
    const monthMap: Record<string, Record<string, number>> = {};
    historyFailList.forEach(f => {
      const dateStr = String(f['날짜'] || '');
      if (!dateStr || dateStr.length < 7) return;
      const month = dateStr.substring(0, 7);
      const m = normalizeMfrName(String(f['제조사'] || '기타'));
      if (!monthMap[month]) monthMap[month] = {};
      monthMap[month][m] = (monthMap[month][m] || 0) + 1;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, byManufacturer]) => ({
        month,
        byManufacturer,
        total: Object.values(byManufacturer).reduce((s, v) => s + v, 0),
      }));
  }, [historyFailList]);

  const filteredMonthlyMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    monthlyFailData.forEach(d => { map[d.month] = d.byManufacturer; });
    return map;
  }, [monthlyFailData]);

  const failSparkline = useMemo(() => monthlyFailData.map(d => d.total), [monthlyFailData]);
  const exchangeSparkline = useMemo(() => {
    const monthMap: Record<string, number> = {};
    filteredHistoryFailList.filter(f => f['구분'] === '교환완료').forEach(f => {
      const d = String(f['날짜'] || '');
      if (!d || d.length < 7) return;
      const month = d.substring(0, 7);
      monthMap[month] = (monthMap[month] || 0) + 1;
    });
    return Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [filteredHistoryFailList]);

  const totalPlacements = useMemo(() => {
    const allRows = surgeryMaster['수술기록지'] || [];
    if (allMonths.length === 0) return allRows.filter(row => row['구분'] === '식립').length;
    const startMonth = allMonths[periodStartIdx] || allMonths[0];
    const endMonth = allMonths[periodEndIdx] || allMonths[allMonths.length - 1];
    return allRows.filter(row => {
      if (row['구분'] !== '식립') return false;
      const d = String(row['날짜'] || '');
      if (d.length < 7) return false;
      const month = d.substring(0, 7);
      return month >= startMonth && month <= endMonth;
    }).length;
  }, [surgeryMaster, allMonths, periodStartIdx, periodEndIdx]);

  const failRate = totalPlacements > 0 ? (filteredHistoryFailList.filter(f => f['구분'] === '수술중교환').length / totalPlacements * 100) : 0;
  const monthlyAvgFail = monthlyFailData.length > 0 ? (filteredHistoryFailList.length / monthlyFailData.length) : 0;

  // 제조사별 교환 분포 (도넛 차트용)
  const manufacturerDonut = useMemo(() => {
    const total = filteredHistoryFailList.length;
    if (total === 0) return [];
    return manufacturers.map((m, i) => {
      const count = mStats[m]?.total || 0;
      const percent = Math.round((count / total) * 100);
      return { name: m, count, percent, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    }).sort((a, b) => b.count - a.count);
  }, [manufacturers, mStats, filteredHistoryFailList.length]);

  // 브랜드/규격별 TOP FAIL 랭킹
  const topFailSizes = useMemo(() => {
    const counts: Record<string, { brand: string; size: string; count: number }> = {};
    filteredHistoryFailList.forEach(f => {
      const b = String(f['브랜드'] || '기타');
      const s = String(f['규격(SIZE)'] || '기타');
      const key = `${b}|${s}`;
      if (!counts[key]) counts[key] = { brand: b, size: s, count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredHistoryFailList]);

  // Animated KPI values
  const animTotal = useCountUp(filteredHistoryFailList.length);
  const animProcessed = useCountUp(filteredHistoryFailList.filter(f => f['구분'] === '교환완료').length);
  const animPending = useCountUp(globalPendingFails);
  const animFailRate = useCountUp(Math.round(failRate * 10));
  const animMonthlyAvg = useCountUp(Math.round(monthlyAvgFail * 10));

  // 팝업 상단: 교환 권장 품목 추출
  const handleOpenOrderModal = () => {
    if (activeM === 'all') {
      showToast('제조사를 먼저 선택해주세요.', 'error');
      return;
    }
    if (actualPendingFails <= 0) {
      showToast('현재 제조사에 반품 가능한 교환 잔여 건수가 없습니다.', 'error');
      return;
    }
    setIsModalOpen(true);
  };

  const handleBulkInitialize = async (items: { manufacturer: string; count: number; date: string }[]) => {
    if (!hospitalId) return;
    await surgeryService.bulkInsertFailRecords(items, hospitalId);
    await onBulkSetupComplete?.();
  };

  const handleBulkReconcile = async (reconciles: { manufacturer: string; targetCount: number }[], date: string) => {
    if (!hospitalId) return;
    // 모달의 targetCount는 "반품 차감 후 실미처리 수" 기준
    // bulkReconcileFails는 수술기록 원본을 직접 조작하므로 반품 수량을 다시 더해 역산
    const adjustedReconciles = reconciles.map(r => {
      const m = normalizeMfrName(r.manufacturer);
      const returnOffset = (returnCompletedByMfr[m] || 0) + (returnPendingByMfr[m] || 0);
      return { manufacturer: r.manufacturer, targetCount: r.targetCount + returnOffset };
    });
    await surgeryService.bulkReconcileFails(adjustedReconciles, hospitalId, date);
    await onBulkSetupComplete?.();
  };

  useEffect(() => {
    if (!isModalOpen) return;
    orderModalCloseButtonRef.current?.focus();
  }, [isModalOpen]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }
    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!isModalOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsModalOpen(false);
        return;
      }

      if (e.key !== 'Tab') return;
      const container = orderModalRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
      ) as HTMLElement[];
      const enabledFocusable = focusable.filter((el) => !el.hasAttribute('disabled'));
      if (enabledFocusable.length === 0) return;

      const first = enabledFocusable[0];
      const last = enabledFocusable[enabledFocusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen]);

  const handleReturnSubmit = (exchangeQty: number, failQty: number) => {
    if (exchangeQty <= 0 && failQty <= 0) return;
    setIsOrderSubmitting(true);
    const requests: Promise<void>[] = [];
    if (exchangeQty > 0) {
      requests.push(onCreateReturn({
        manufacturer: activeM,
        reason: 'exchange',
        manager: currentUserName,
        memo: `수술중교환 ${exchangeQty}건`,
        items: buildReturnItems(inventory, activeM, exchangeQty),
      }));
    }
    if (failQty > 0) {
      requests.push(onCreateReturn({
        manufacturer: activeM,
        reason: 'defective',
        manager: currentUserName,
        memo: `수술후FAIL 반품 ${failQty}건`,
        items: buildReturnItems(inventory, activeM, failQty),
      }));
    }
    void Promise.all(requests)
      .then(() => {
        setIsModalOpen(false);
        showToast('반품 신청이 등록되었습니다. 주문 관리 > 반품 탭에서 진행 상태를 확인하세요.', 'success');
      })
      .catch(() => {
        showToast('반품 처리에 실패했습니다.', 'error');
      })
      .finally(() => {
        setIsOrderSubmitting(false);
      });
  };

  const handleAllReturnSubmit = async () => {
    setIsAllReturnSubmitting(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      for (const mfr of manufacturers) {
        const mfrPending = pendingFailList.filter(
          f => normalizeMfrName(String(f['제조사'] || '기타')) === mfr
        );
        if (mfrPending.length === 0) continue;
        const itemMap: Record<string, { brand: string; size: string; quantity: number }> = {};
        mfrPending.forEach(f => {
          const b = String(f['브랜드'] || mfr);
          const s = String(f['규격(SIZE)'] || '기타');
          const key = `${b}|${s}`;
          if (!itemMap[key]) itemMap[key] = { brand: b, size: s, quantity: 0 };
          itemMap[key].quantity++;
        });
        await onCreateReturn({
          manufacturer: mfr,
          reason: 'exchange',
          manager: currentUserName,
          memo: `수술중교환 전체 반품 처리 (${today})`,
          items: Object.values(itemMap),
        });
      }
      setIsAllReturnConfirmOpen(false);
      showToast('전체 반품 처리가 완료되었습니다. 주문 관리 > 반품 탭에서 진행 상태를 확인하세요.', 'success');
    } catch {
      showToast('반품 처리에 실패했습니다.', 'error');
    } finally {
      setIsAllReturnSubmitting(false);
    }
  };

  // 도넛 차트 SVG 경로 생성
  const donutPaths = useMemo(() => {
    const total = manufacturerDonut.reduce((s, d) => s + d.count, 0);
    if (total === 0) return [];
    const r = 50;
    const cx = 60;
    const cy = 60;
    let cumulativeAngle = -90;
    return manufacturerDonut.map(seg => {
      const angle = (seg.count / total) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { ...seg, path };
    });
  }, [manufacturerDonut]);

  // 차트 렌더 계산
  const chartDataLength = allMonthlyFailData.length;
  const maxOffset = Math.max(0, chartDataLength - CHART_MAX_VISIBLE);
  const clampedOffset = Math.min(Math.max(chartMonthOffset, 0), maxOffset);
  const visibleMonthlyData = chartDataLength > CHART_MAX_VISIBLE
    ? allMonthlyFailData.slice(clampedOffset, clampedOffset + CHART_MAX_VISIBLE)
    : allMonthlyFailData;

  const maxBarVal = Math.max(
    ...monthlyFailData.flatMap(d => manufacturers.map(m => d.byManufacturer[m] ?? 0)),
    1
  );
  const chartTickStep = Math.ceil(maxBarVal / 4) || 1;
  const chartTicks = Array.from({ length: 5 }, (_, i) => i * chartTickStep);
  const chartYMax = chartTicks[chartTicks.length - 1];

  const activeOrders = activeM === 'all' ? failOrders : failOrders.filter(o => o.manufacturer === activeM);

  return {
    toast,
    showToast,
    // period filter
    allMonths,
    periodStartIdx,
    periodEndIdx,
    handlePeriodChange,
    // fail data
    historyFailList,
    filteredHistoryFailList,
    pendingFailList,
    manufacturers,
    availableManufacturers,
    pendingByManufacturer,
    pendingByManufacturerMap,
    // UI state
    activeM,
    setActiveM,
    isModalOpen,
    setIsModalOpen,
    isOrderSubmitting,
    isBulkModalOpen,
    setIsBulkModalOpen,
    showBulkInfo,
    setShowBulkInfo,
    isAllReturnConfirmOpen,
    setIsAllReturnConfirmOpen,
    isAllReturnSubmitting,
    hoveredChartIdx,
    setHoveredChartIdx,
    isMobileViewport,
    chartMonthOffset,
    setChartMonthOffset,
    chartTouchStartX,
    chartTouchStartY,
    orderModalRef,
    orderModalCloseButtonRef,
    // stats
    mStats,
    currentStats,
    currentRemainingFails,
    filteredReturnRequests: activeM === 'all'
      ? returnRequests
      : returnRequests.filter(r => normalizeMfrName(r.manufacturer) === activeM),
    returnPendingByMfr,
    returnCompletedByMfr,
    totalReturnPending,
    returnPendingCount,
    actualPendingFails,
    globalPendingFails,
    // chart data
    monthlyFailData,
    allMonthlyFailData,
    filteredMonthlyMap,
    failSparkline,
    exchangeSparkline,
    totalPlacements,
    failRate,
    monthlyAvgFail,
    manufacturerDonut,
    topFailSizes,
    // animated KPIs
    animTotal,
    animProcessed,
    animPending,
    animFailRate,
    animMonthlyAvg,
    // handlers
    handleOpenOrderModal,
    handleBulkInitialize,
    handleBulkReconcile,
    handleReturnSubmit,
    handleAllReturnSubmit,
    // donut chart
    donutPaths,
    // chart render
    chartDataLength,
    maxOffset,
    clampedOffset,
    visibleMonthlyData,
    maxBarVal,
    chartTickStep,
    chartTicks,
    chartYMax,
    activeOrders,
  };
}
