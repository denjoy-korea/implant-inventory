
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ExcelRow, InventoryItem, Order as FailOrder, ReturnRequest, ReturnReason } from '../types';
import { getSizeMatchKey, isIbsImplantManufacturer } from '../services/sizeNormalizer';
import { useToast } from '../hooks/useToast';
import { useCountUp, DONUT_COLORS } from './surgery-dashboard/shared';
import FailBulkSetupModal from './FailBulkSetupModal';
import { surgeryService } from '../services/surgeryService';
import DateRangeSlider from './surgery-dashboard/DateRangeSlider';
import FailKpiStrip from './fail/FailKpiStrip';
import FailReturnModal from './fail/FailReturnModal';

// ============================================================
// TYPES
// ============================================================
interface FailManagerProps {
  surgeryMaster: Record<string, ExcelRow[]>;
  inventory: InventoryItem[];
  failOrders: FailOrder[];
  returnRequests?: ReturnRequest[];
  onCreateReturn: (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => Promise<void>;
  currentUserName: string;
  isReadOnly?: boolean;
  hospitalId?: string;
  onBulkSetupComplete?: () => Promise<void>;
  initialShowBulkModal?: boolean;
  onInitialModalOpened?: () => void;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

interface MonthlyFailDatum {
  month: string;
  total: number;
  byManufacturer: Record<string, number>;
}

// ============================================================
// COMPONENT
// ============================================================
const FailManager: React.FC<FailManagerProps> = ({ surgeryMaster, inventory, failOrders, returnRequests = [], onCreateReturn, currentUserName, isReadOnly, hospitalId, onBulkSetupComplete, initialShowBulkModal, onInitialModalOpened, onDeleteOrder }) => {
  const { toast, showToast } = useToast();
  const simpleNormalize = (str: string) => String(str || "").trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');
  // IBS / IBS Implant 등 표기 변형을 'IBS Implant'로 통일
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

  // 초기화: allMonths 변경 시 최근 2개월로 설정
  useEffect(() => {
    if (allMonths.length > 0) {
      setPeriodStartIdx(Math.max(0, allMonths.length - 2));
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

  // 5. 미처리 교환을 제조사별 카운트로 변환
  const pendingByManufacturer = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingFailList.forEach(f => {
      const m = normalizeMfrName(String(f['제조사'] || '기타'));
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([manufacturer, count]) => ({ manufacturer, count }));
  }, [pendingFailList]);

  const pendingByManufacturerMap = useMemo(() => {
    const map: Record<string, number> = {};
    pendingByManufacturer.forEach(({ manufacturer, count }) => { map[manufacturer] = count; });
    return map;
  }, [pendingByManufacturer]);

  const [activeM, setActiveM] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isOrderSubmitting, setIsOrderSubmitting] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [showBulkInfo, setShowBulkInfo] = useState(false);
  const [isAllReturnConfirmOpen, setIsAllReturnConfirmOpen] = useState(false);
  const [isAllReturnSubmitting, setIsAllReturnSubmitting] = useState(false);

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
  const recommendedScrollRef = useRef<HTMLDivElement>(null);
  const [recommendedScrollPct, setRecommendedScrollPct] = useState(0);

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

  // 반품 대기중 건수 (ReturnRequest 기반: requested 또는 picked_up 상태)
  const returnPendingByMfr = useMemo(() => {
    const counts: Record<string, number> = {};
    returnRequests
      .filter(r => r.status === 'requested' || r.status === 'picked_up')
      .forEach(r => {
        const m = normalizeMfrName(r.manufacturer);
        const qty = r.items.reduce((s, i) => s + i.quantity, 0);
        counts[m] = (counts[m] || 0) + qty;
      });
    return counts;
  }, [returnRequests]);

  const totalReturnPending = Object.values(returnPendingByMfr).reduce((s, v) => s + v, 0);
  const returnPendingCount = activeM === 'all'
    ? totalReturnPending
    : (returnPendingByMfr[activeM] || 0);
  const actualPendingFails = Math.max(0, currentRemainingFails - returnPendingCount);

  const mPendingList = activeM === 'all'
    ? pendingFailList
    : pendingFailList.filter(f => normalizeMfrName(String(f['제조사'] || '기타')) === activeM);

  // ============================================================
  // 월별 교환 추세 데이터
  // ============================================================
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

  // 필터된 월별 값 빠른 조회용 맵
  const filteredMonthlyMap = useMemo(() => {
    const map: Record<string, Record<string, number>> = {};
    monthlyFailData.forEach(d => { map[d.month] = d.byManufacturer; });
    return map;
  }, [monthlyFailData]);

  // KPI용 sparkline 데이터 (월별 총 교환)
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

  // 전체 수술 건수 (교환율 계산용) — 동일 기간 필터 적용
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

  // ============================================================
  // 제조사별 교환 분포 (도넛 차트용)
  // ============================================================
  const manufacturerDonut = useMemo(() => {
    const total = filteredHistoryFailList.length;
    if (total === 0) return [];
    return manufacturers.map((m, i) => {
      const count = mStats[m]?.total || 0;
      const percent = Math.round((count / total) * 100);
      return { name: m, count, percent, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    }).sort((a, b) => b.count - a.count);
  }, [manufacturers, mStats, filteredHistoryFailList.length]);

  // ============================================================
  // 브랜드/규격별 TOP FAIL 랭킹
  // ============================================================
  const topFailSizes = useMemo(() => {
    const counts: Record<string, { brand: string; size: string; count: number }> = {};
    filteredHistoryFailList.forEach(f => {
      const b = String(f['브랜드'] || 'Unknown');
      const s = String(f['규격(SIZE)'] || 'Unknown');
      const key = `${b}|${s}`;
      if (!counts[key]) counts[key] = { brand: b, size: s, count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredHistoryFailList]);

  // ============================================================
  // Animated KPI values
  // ============================================================
  const animTotal = useCountUp(filteredHistoryFailList.length);
  const animProcessed = useCountUp(filteredHistoryFailList.filter(f => f['구분'] === '교환완료').length);
  const animPending = useCountUp(Math.max(0, pendingFailList.length - totalReturnPending));
  const animFailRate = useCountUp(Math.round(failRate * 10));
  const animMonthlyAvg = useCountUp(Math.round(monthlyAvgFail * 10));

  // 팝업 상단: 교환 권장 품목 추출
  const recommendedExchangeItems = useMemo(() => {
    if (!activeM || !isModalOpen) return [];
    const failCounts: Record<string, { brand: string, size: string, count: number }> = {};
    mPendingList.forEach(f => {
      const b = String(f['브랜드'] || 'Unknown');
      const s = String(f['규격(SIZE)'] || 'Unknown');
      const key = `${simpleNormalize(b)}|${getSizeMatchKey(s, activeM)}`;
      if (!failCounts[key]) failCounts[key] = { brand: b, size: s, count: 0 };
      failCounts[key].count++;
    });
    const result = Object.values(failCounts).map(item => {
      let alreadyOrderedQty = 0;
      failOrders
        .filter(o => o.status === 'ordered' && simpleNormalize(o.manufacturer) === simpleNormalize(activeM))
        .forEach(order => {
          order.items.forEach(oi => {
            if (simpleNormalize(oi.brand) === simpleNormalize(item.brand) &&
              getSizeMatchKey(oi.size, activeM) === getSizeMatchKey(item.size, activeM)) {
              alreadyOrderedQty += oi.quantity;
            }
          });
        });
      const invItem = inventory.find(i =>
        simpleNormalize(i.brand) === simpleNormalize(item.brand) &&
        getSizeMatchKey(i.size, activeM) === getSizeMatchKey(item.size, activeM)
      );
      const dailyMaxUsage = invItem?.dailyMaxUsage ?? 0;
      const monthlyAvgUsage = invItem?.monthlyAvgUsage ?? 0;
      return { ...item, remainingToOrder: item.count - alreadyOrderedQty, dailyMaxUsage, monthlyAvgUsage };
    }).filter(item => item.remainingToOrder > 0);
    result.sort((a, b) => {
      const scoreA = a.dailyMaxUsage * a.monthlyAvgUsage;
      const scoreB = b.dailyMaxUsage * b.monthlyAvgUsage;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return b.remainingToOrder - a.remainingToOrder;
    });
    return result;
  }, [activeM, mPendingList, failOrders, isModalOpen, inventory]);

  const handleOpenOrderModal = () => {
    if (activeM === 'all') {
      showToast('제조사를 먼저 선택해주세요.', 'error');
      return;
    }
    if (currentRemainingFails <= 0) {
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
    await surgeryService.bulkReconcileFails(reconciles, hospitalId, date);
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

  const handleReturnSubmit = () => {
    if (currentRemainingFails === 0) return;
    // 반품 품목: 권장 교환 품목 기반, 없으면 제조사/기타/전체건수로 생성
    const returnItems = recommendedExchangeItems.length > 0
      ? recommendedExchangeItems.map(item => ({
        brand: item.brand,
        size: item.size,
        quantity: item.remainingToOrder,
      }))
      : [{ brand: activeM, size: '기타', quantity: currentRemainingFails }];

    setIsOrderSubmitting(true);
    void onCreateReturn({
      manufacturer: activeM,
      reason: 'exchange',
      manager: currentUserName,
      memo: `수술중교환 ${currentRemainingFails}건`,
      items: returnItems,
    })
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
        // 브랜드/규격별 집계
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

  // ============================================================
  // 도넛 차트 SVG 경로 생성
  // ============================================================
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

  // ============================================================
  // RENDER
  // ============================================================
  // 월별 차트: 스와이프 오프셋으로 보이는 월 범위 슬라이스
  const CHART_MAX_VISIBLE = 12;
  // 차트 크기는 전체 기간 기준으로 고정
  const chartDataLength = allMonthlyFailData.length;
  const maxOffset = Math.max(0, chartDataLength - CHART_MAX_VISIBLE);
  const clampedOffset = Math.min(Math.max(chartMonthOffset, 0), maxOffset);
  const visibleMonthlyData = chartDataLength > CHART_MAX_VISIBLE
    ? allMonthlyFailData.slice(clampedOffset, clampedOffset + CHART_MAX_VISIBLE)
    : allMonthlyFailData;

  // 월별 차트 상수 (grouped bar용)
  const CHART_PAD = { l: 36, r: 8, t: 8, b: 24 };
  const CHART_AREA_H = 280;
  // 막대 높이는 필터된 값 기준
  const maxBarVal = Math.max(
    ...monthlyFailData.flatMap(d => manufacturers.map(m => d.byManufacturer[m] ?? 0)),
    1
  );
  const chartTickStep = Math.ceil(maxBarVal / 4) || 1;
  const chartTicks = Array.from({ length: 5 }, (_, i) => i * chartTickStep);
  const chartYMax = chartTicks[chartTicks.length - 1];

  const activeOrders = activeM === 'all' ? failOrders : failOrders.filter(o => o.manufacturer === activeM);

  return (
    <div className="space-y-6" style={{ animationDuration: '0s' }}>

      {/* ========================================= */}
      {/* STICKY HEADER + KPI + FILTER              */}
      {/* ========================================= */}
      <div
        className="md:sticky z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50"
        style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.08)' }}
      >

        {/* A. Header Strip */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 min-w-0">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">데이터 기간</h4>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">
                  {allMonths.length > 0
                    ? `${allMonths[periodStartIdx] || allMonths[0]} ~ ${allMonths[periodEndIdx] || allMonths[allMonths.length - 1]}`
                    : '-'
                  }
                </p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 교환 레코드</h4>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{filteredHistoryFailList.length}<span className="text-xs font-semibold text-slate-400 ml-1">건</span></p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 식립 대비</h4>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{totalPlacements}<span className="text-xs font-semibold text-slate-400 ml-1">cases</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hospitalId && (
                <div className="relative group/exchange-cleanup">
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    disabled={isReadOnly}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    교환 재고 정리
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/exchange-cleanup:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                    <p className="font-bold mb-1">교환 재고 일괄 정리</p>
                    <p>1회만 적용할 수 있는 기능입니다.</p>
                    <p className="mt-1 text-slate-300">임플란트 재고관리 Pro 도입 시점에 수술 중 교환한 품목의 실제 보유량을 조사하여 입력하면 됩니다.</p>
                  </div>
                </div>
              )}
              <button
                onClick={activeM === 'all' ? () => setIsAllReturnConfirmOpen(true) : handleOpenOrderModal}
                disabled={isReadOnly}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                반품 처리
              </button>
            </div>
          </div>
        </div>

        {/* Period Filter Slider */}
        {allMonths.length > 1 && (
          <div className="hidden md:block">
            <DateRangeSlider
              months={allMonths}
              startIdx={periodStartIdx}
              endIdx={periodEndIdx}
              onChange={handlePeriodChange}
            />
          </div>
        )}

        {/* B. KPI Metrics Strip */}
        <FailKpiStrip
          animTotal={animTotal}
          animProcessed={animProcessed}
          animPending={animPending}
          animFailRate={animFailRate}
          animMonthlyAvg={animMonthlyAvg}
          failRate={failRate}
          monthlyFailDataLength={monthlyFailData.length}
          totalReturnPending={totalReturnPending}
          failSparkline={failSparkline}
          exchangeSparkline={exchangeSparkline}
        />

        {/* C. Manufacturer Filter Strip (Pill style) */}
        <div className="hidden md:block bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm">
          <div className="flex gap-1.5 bg-indigo-50/40 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveM('all')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeM === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              전체
              {Math.max(0, pendingFailList.length - totalReturnPending) > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeM === 'all' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-500'}`}>{Math.max(0, pendingFailList.length - totalReturnPending)}</span>
              )}
            </button>
            {manufacturers.map(m => {
              const stats = mStats[m];
              return (
                <button
                  key={m}
                  onClick={() => setActiveM(m)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeM === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  {m}
                  {Math.max(0, stats.pending - (returnPendingByMfr[m] || 0)) > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeM === m ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-500'}`}>{Math.max(0, stats.pending - (returnPendingByMfr[m] || 0))}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:hidden bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-800">모바일 교환 관리</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">미처리</p>
              <p className={`text-base font-black tabular-nums ${Math.max(0, pendingFailList.length - totalReturnPending) > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{Math.max(0, pendingFailList.length - totalReturnPending)}</p>
              {totalReturnPending > 0 && <p className="text-[9px] font-bold text-amber-500">반품대기 {totalReturnPending}</p>}
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">교환완료</p>
              <p className="text-base font-black text-emerald-600 tabular-nums">{historyFailList.filter(f => f['구분'] === '교환완료').length}</p>
            </div>
          </div>

          <div>
            <label htmlFor="mobile-fail-manufacturer" className="text-xs font-bold text-slate-500 uppercase tracking-widest">제조사 선택</label>
            <select
              id="mobile-fail-manufacturer"
              value={activeM}
              onChange={(e) => setActiveM(e.target.value)}
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">전체</option>
              {manufacturers.map((m) => (
                <option key={`mobile-fail-${m}`} value={m}>
                  {m} (미처리 {Math.max(0, (mStats[m]?.pending ?? 0) - (returnPendingByMfr[m] || 0))})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={activeM === 'all' ? () => setIsAllReturnConfirmOpen(true) : handleOpenOrderModal}
            disabled={isReadOnly || (activeM !== 'all' && currentRemainingFails <= 0)}
            className={`w-full min-h-11 rounded-xl text-sm font-black transition-all ${isReadOnly || (activeM !== 'all' && currentRemainingFails <= 0)
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-indigo-600 text-white active:scale-[0.98]'
              }`}
          >
            반품 처리
          </button>
          {hospitalId && (
            <div>
              <div className="relative">
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={isReadOnly}
                  className={`w-full min-h-11 rounded-xl text-sm font-black transition-all ${isReadOnly
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 text-white active:scale-[0.98]'
                    }`}
                >
                  교환 재고 정리
                </button>
                <button
                  onClick={() => setShowBulkInfo(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/60 hover:text-white/90 transition-colors"
                  aria-label="설명 보기"
                >
                  ⓘ
                </button>
              </div>
              {showBulkInfo && (
                <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 leading-relaxed">
                  <p className="font-bold text-slate-700 mb-0.5">교환 재고 일괄 정리</p>
                  <p>1회만 적용할 수 있는 기능입니다.</p>
                  <p className="mt-1 text-slate-400">임플란트 재고관리 Pro 도입 시점에 수술 중 교환한 품목의 실제 보유량을 조사하여 입력하면 됩니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>{/* end sticky wrapper */}

      {activeM ? (
        <div className="space-y-6">
          {/* ========================================= */}
          {/* ROW 1: 제조사별 현황 + 브랜드/규격 분포      */}
          {/* ========================================= */}
          <div className="hidden md:grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            {/* LEFT: 선택된 제조사 현황 카드 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">{activeM === 'all' ? '전체' : activeM} 교환 현황</h3>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={activeM === 'all' ? () => setIsAllReturnConfirmOpen(true) : handleOpenOrderModal}
                    disabled={isReadOnly || (activeM !== 'all' && currentRemainingFails <= 0)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${isReadOnly || (activeM !== 'all' && currentRemainingFails <= 0) ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-200'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    반품 처리
                  </button>
                </div>
              </div>
              {/* 3-column stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">총 발생</p>
                  <p className="text-2xl font-black text-slate-800 tabular-nums">{currentStats.total}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">교환 완료</p>
                  <p className="text-2xl font-black text-emerald-600 tabular-nums">{currentStats.processed}</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${actualPendingFails > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${actualPendingFails > 0 ? 'text-rose-400' : 'text-slate-400'}`}>미처리 잔여</p>
                  <p className={`text-2xl font-black tabular-nums ${actualPendingFails > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{actualPendingFails}</p>
                  {returnPendingCount > 0 && (
                    <p className="text-[9px] font-bold text-amber-500 mt-1">반품 대기중 {returnPendingCount}건</p>
                  )}
                </div>
              </div>
              {/* FAIL 진행률 바 */}
              {currentStats.total > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400">교환 처리율</span>
                    <span className="text-[10px] font-black text-indigo-600">{Math.round((currentStats.processed / currentStats.total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700"
                      style={{ width: `${(currentStats.processed / currentStats.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: 제조사별 교환 분포 (도넛 차트) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">제조사 분석</h3>
              <div className="flex items-center gap-4 mt-4">
                {/* Donut */}
                <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0">
                  {donutPaths.map((seg, i) => (
                    <path key={i} d={seg.path} fill={seg.color} stroke="white" strokeWidth="2" className="transition-opacity hover:opacity-80" />
                  ))}
                  <circle cx="60" cy="60" r="30" fill="white" />
                  <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{historyFailList.length}</text>
                  <text x="60" y="72" textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8" letterSpacing="0.1em">TOTAL EXCHANGE</text>
                </svg>
                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {manufacturerDonut.map((seg, i) => (
                    <div key={seg.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-xs font-bold text-slate-600">{seg.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 tabular-nums">{seg.count}</span>
                        <span className="text-[10px] font-bold text-slate-400">{seg.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* ROW 2: 월별 교환 추세 + TOP FAIL 규격       */}
          {/* ========================================= */}
          <div className="hidden md:grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            {/* LEFT: 월별 추세 차트 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">월별 교환 추세</h3>
                </div>
                <div className="flex items-center gap-3">
                  {manufacturers.map((m, i) => (
                    <div key={m} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-400">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              {allMonthlyFailData.length > 0 ? (() => {
                const filterStart = allMonths[periodStartIdx] || allMonths[0] || '';
                const filterEnd = allMonths[periodEndIdx] || allMonths[allMonths.length - 1] || '';
                const inRange = (month: string) => month >= filterStart && month <= filterEnd;
                const nMfr = manufacturers.length || 1;
                const MONTH_W = Math.max(48, Math.min(68, Math.floor(680 / visibleMonthlyData.length)));
                const GROUP_W = MONTH_W - 10;
                const BAR_GAP = 2;
                const BAR_W = Math.max(6, Math.floor((GROUP_W - BAR_GAP * (nMfr - 1)) / nMfr));
                const SVG_W = CHART_PAD.l + visibleMonthlyData.length * MONTH_W + CHART_PAD.r;
                const SVG_H = CHART_PAD.t + CHART_AREA_H + CHART_PAD.b;
                // 툴팁 크기
                const TW = 148;
                const T_ROW_H = 20;
                const T_PAD = 10;
                const TH = T_PAD + 14 + nMfr * T_ROW_H + T_PAD;

                return (
                  <div
                    className="overflow-x-auto -mx-1 px-1"
                    onTouchStart={(e) => {
                      chartTouchStartX.current = e.touches[0].clientX;
                      chartTouchStartY.current = e.touches[0].clientY;
                    }}
                    onTouchMove={(e) => {
                      const deltaX = chartTouchStartX.current - e.touches[0].clientX;
                      const deltaY = chartTouchStartY.current - e.touches[0].clientY;
                      if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        e.preventDefault();
                      }
                    }}
                    onTouchEnd={(e) => {
                      const deltaX = chartTouchStartX.current - e.changedTouches[0].clientX;
                      const deltaY = chartTouchStartY.current - e.changedTouches[0].clientY;
                      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
                        if (deltaX > 0) {
                          // swipe left: shift forward (show later months)
                          setChartMonthOffset(prev => Math.min(prev + 1, maxOffset));
                        } else {
                          // swipe right: shift backward (show earlier months)
                          setChartMonthOffset(prev => Math.max(prev - 1, 0));
                        }
                      }
                      setHoveredChartIdx(null);
                    }}
                  >
                    <svg
                      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                      className="w-full"
                      style={{ minWidth: Math.max(320, SVG_W) }}
                      preserveAspectRatio="xMinYMid meet"
                      onMouseLeave={() => setHoveredChartIdx(null)}
                    >
                      {/* Horizontal grid lines + Y labels */}
                      {chartTicks.map(tick => {
                        const y = CHART_PAD.t + CHART_AREA_H - (tick / chartYMax) * CHART_AREA_H;
                        return (
                          <g key={tick}>
                            <line x1={CHART_PAD.l} y1={y} x2={SVG_W - CHART_PAD.r} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                            <text x={CHART_PAD.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{tick}</text>
                          </g>
                        );
                      })}
                      {/* Baseline */}
                      <line x1={CHART_PAD.l} y1={CHART_PAD.t + CHART_AREA_H} x2={SVG_W - CHART_PAD.r} y2={CHART_PAD.t + CHART_AREA_H} stroke="#e2e8f0" strokeWidth="1.5" />

                      {/* Grouped bars per month */}
                      {visibleMonthlyData.map((d, i) => {
                        const barGroupW = BAR_W * nMfr + BAR_GAP * (nMfr - 1);
                        const groupX = CHART_PAD.l + i * MONTH_W + (MONTH_W - barGroupW) / 2;
                        const groupCenterX = CHART_PAD.l + i * MONTH_W + MONTH_W / 2;
                        const isHov = hoveredChartIdx === i;
                        return (
                          <g key={d.month}>
                            {/* Hover background */}
                            {isHov && (
                              <rect
                                x={CHART_PAD.l + i * MONTH_W + 1}
                                y={CHART_PAD.t}
                                width={MONTH_W - 2}
                                height={CHART_AREA_H}
                                rx="4"
                                fill="#f1f5f9"
                              />
                            )}
                            {/* Bars */}
                            {manufacturers.map((m, mi) => {
                              const val = filteredMonthlyMap[d.month]?.[m] ?? 0;
                              const barH = chartYMax > 0 ? (val / chartYMax) * CHART_AREA_H : 0;
                              const bx = groupX + mi * (BAR_W + BAR_GAP);
                              const by = CHART_PAD.t + CHART_AREA_H - barH;
                              return (
                                <rect
                                  key={m}
                                  x={bx} y={by}
                                  width={BAR_W} height={Math.max(0, barH)}
                                  rx="3"
                                  fill={DONUT_COLORS[mi % DONUT_COLORS.length]}
                                  opacity={isHov ? 1 : 0.82}
                                />
                              );
                            })}
                            {/* X-axis label */}
                            <text
                              x={groupCenterX}
                              y={CHART_PAD.t + CHART_AREA_H + 14}
                              textAnchor="middle"
                              fontSize="8"
                              fill={isHov ? '#1e293b' : inRange(d.month) ? '#94a3b8' : '#e2e8f0'}
                              fontWeight={isHov ? '800' : '600'}
                            >
                              {d.month.slice(2)}
                            </text>
                            {/* Invisible hover capture rect */}
                            <rect
                              x={CHART_PAD.l + i * MONTH_W}
                              y={CHART_PAD.t}
                              width={MONTH_W}
                              height={CHART_AREA_H + CHART_PAD.b}
                              fill="transparent"
                              onMouseEnter={() => setHoveredChartIdx(i)}
                              onTouchStart={(e) => { e.preventDefault(); setHoveredChartIdx(i); }}
                              style={{ cursor: 'crosshair' }}
                            />
                          </g>
                        );
                      })}

                      {/* Tooltip overlay */}
                      {hoveredChartIdx !== null && (() => {
                        const d = visibleMonthlyData[hoveredChartIdx];
                        const groupCenterX = CHART_PAD.l + hoveredChartIdx * MONTH_W + MONTH_W / 2;
                        let TX = groupCenterX - TW / 2;
                        TX = Math.max(CHART_PAD.l, Math.min(SVG_W - CHART_PAD.r - TW, TX));
                        const TY = CHART_PAD.t + 8;
                        return (
                          <g style={{ pointerEvents: 'none' }}>
                            {/* Dashed center line */}
                            <line
                              x1={groupCenterX} y1={CHART_PAD.t}
                              x2={groupCenterX} y2={CHART_PAD.t + CHART_AREA_H}
                              stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3"
                            />
                            {/* Tooltip box shadow (fake) */}
                            <rect x={TX + 2} y={TY + 3} width={TW} height={TH} rx="8" fill="#0f172a" opacity="0.15" />
                            {/* Tooltip box */}
                            <rect x={TX} y={TY} width={TW} height={TH} rx="8" fill="#1e293b" />
                            {/* Month header */}
                            <text
                              x={TX + TW / 2} y={TY + T_PAD + 8}
                              textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700"
                            >
                              {d.month}
                            </text>
                            {/* Data rows */}
                            {manufacturers.map((m, mi) => {
                              const val = filteredMonthlyMap[d.month]?.[m] ?? 0;
                              const ry = TY + T_PAD + 16 + mi * T_ROW_H;
                              return (
                                <g key={m}>
                                  <rect x={TX + T_PAD} y={ry + 2} width="8" height="8" rx="2" fill={DONUT_COLORS[mi % DONUT_COLORS.length]} />
                                  <text x={TX + T_PAD + 13} y={ry + 9} fontSize="10" fill="#e2e8f0" fontWeight="600">{m}</text>
                                  <text x={TX + TW - T_PAD} y={ry + 9} textAnchor="end" fontSize="10" fill="white" fontWeight="800">{val}건</text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                );
              })() : (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-400 font-medium">차트 데이터 없음</p>
                </div>
              )}
            </div>

            {/* RIGHT: TOP FAIL 규격 랭킹 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">교환 다빈도 규격</h3>
              {topFailSizes.length > 0 ? (
                <div className="space-y-3">
                  {topFailSizes.map((item, idx) => (
                    <div key={`${item.brand}-${item.size}`} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.brand}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{item.size}</p>
                      </div>
                      <span className="text-sm font-black text-slate-800 tabular-nums">{item.count}<span className="text-[10px] font-semibold text-slate-400 ml-0.5">건</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">데이터 없음</p>
              )}

              {/* 교환율 by manufacturer */}
              {manufacturers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3">교환율</h4>
                  <div className="space-y-2.5">
                    {manufacturers.map((m, i) => {
                      const failCount = mStats[m]?.total || 0;
                      const allRows = surgeryMaster['수술기록지'] || [];
                      const normalizedM = simpleNormalize(m);
                      const mPlacement = allRows.filter(r => {
                        const rowM = simpleNormalize(String(r['제조사'] || ''));
                        return (rowM.includes(normalizedM) || normalizedM.includes(rowM)) && r['구분'] === '식립';
                      }).length;
                      const rate = mPlacement > 0 ? (failCount / mPlacement * 100) : 0;
                      return (
                        <div key={m} className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">{m}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 tabular-nums">{failCount}건 / {mPlacement}건</span>
                            <span className={`text-xs font-black tabular-nums ${rate > 30 ? 'text-rose-500' : rate > 20 ? 'text-amber-500' : 'text-slate-700'}`}>{rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========================================= */}
          {/* ROW 3: 교환 주문 이력                       */}
          {/* ========================================= */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  교환 주문 이력
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{activeOrders.length}건</span>
            </div>
            {activeOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {activeOrders.map(order => (
                  <div key={order.id} className="p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 hover:border-indigo-100 transition-all">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-black text-slate-800">{order.date} 주문</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${order.status === 'ordered' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {order.status === 'ordered' ? 'Ordered' : 'Completed'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-500">{item.brand} {item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}</span>
                          <span className="text-slate-800 tabular-nums">{item.quantity}개</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">담당: {order.manager}</span>
                      {!isReadOnly && onDeleteOrder && (
                        <button
                          onClick={() => void onDeleteOrder(order.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <svg className="w-12 h-12 text-slate-100 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p className="text-sm text-slate-500 font-medium">아직 교환 주문 이력이 없습니다.</p>
                <p className="text-[11px] text-slate-300 mt-1">반품/교환 주문 버튼으로 첫 주문을 등록하세요.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-40 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm">
          <svg className="w-16 h-16 text-slate-100 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-slate-500 font-medium italic">데이터가 로드되면 제조사를 선택하여 관리를 시작하세요.</p>
        </div>
      )}

      {/* ========================================= */}
      {/* ALL RETURN CONFIRM MODAL                  */}
      {/* ========================================= */}
      {isAllReturnConfirmOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => !isAllReturnSubmitting && setIsAllReturnConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-black text-slate-800">일괄 반품 처리</h2>
                <p className="text-xs text-slate-500 mt-0.5">미처리 잔여 항목 전체를 제조사별로 반품 주문 등록합니다.</p>
              </div>
              <button
                onClick={() => setIsAllReturnConfirmOpen(false)}
                disabled={isAllReturnSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 전자장부 안내 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-800 font-semibold">
              반품 처리 후 전자장부에서 주문 금액 변동을 확인하세요.
            </div>

            {/* 제조사별 미처리 목록 */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">반품 처리 대상</p>
              {manufacturers.map(mfr => {
                const cnt = pendingByManufacturerMap[mfr] || 0;
                if (cnt === 0) return null;
                return (
                  <div key={mfr} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                    <span className="text-sm font-bold text-slate-700">{mfr}</span>
                    <span className="text-sm font-black text-rose-600 tabular-nums">{cnt}건</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-sm font-black text-indigo-700">합계</span>
                <span className="text-sm font-black text-indigo-700 tabular-nums">{pendingFailList.length}건</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setIsAllReturnConfirmOpen(false)}
                disabled={isAllReturnSubmitting}
                className="flex-1 py-3 text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all"
              >
                취소
              </button>
              <button
                onClick={() => void handleAllReturnSubmit()}
                disabled={isAllReturnSubmitting || pendingFailList.length === 0}
                className="flex-1 py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-2xl transition-all active:scale-[0.98]"
              >
                {isAllReturnSubmitting ? '처리 중...' : '반품 처리 완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================= */}
      {/* ORDER MODAL                               */}
      {/* ========================================= */}
      {isModalOpen && (
        <FailReturnModal
          activeM={activeM}
          currentRemainingFails={currentRemainingFails}
          currentUserName={currentUserName}
          isOrderSubmitting={isOrderSubmitting}
          recommendedExchangeItems={recommendedExchangeItems}
          recommendedScrollPct={recommendedScrollPct}
          setRecommendedScrollPct={setRecommendedScrollPct}
          recommendedScrollRef={recommendedScrollRef}
          orderModalRef={orderModalRef}
          orderModalCloseButtonRef={orderModalCloseButtonRef}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleReturnSubmit}
        />
      )}

      {isBulkModalOpen && (
        <FailBulkSetupModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          availableManufacturers={availableManufacturers}
          pendingByManufacturer={pendingByManufacturer}
          onInitialize={handleBulkInitialize}
          onReconcile={handleBulkReconcile}
        />
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
      {toast && (
        <div
          style={isMobileViewport ? { bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' } : undefined}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default FailManager;
