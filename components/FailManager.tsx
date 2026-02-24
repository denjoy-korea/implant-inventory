
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ExcelRow, InventoryItem, Order as FailOrder } from '../types';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { useToast } from '../hooks/useToast';
import { useCountUp, DONUT_COLORS } from './surgery-dashboard/shared';
import FailBulkSetupModal from './FailBulkSetupModal';
import { surgeryService } from '../services/surgeryService';

// ============================================================
// UTILITY: Sparkline SVG path builder (same as InventoryManager)
// ============================================================
function buildSparklinePath(values: number[], width: number, height: number): string {
  if (values.length === 0) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

// ============================================================
// TYPES
// ============================================================
interface FailManagerProps {
  surgeryMaster: Record<string, ExcelRow[]>;
  inventory: InventoryItem[];
  failOrders: FailOrder[];
  onAddFailOrder: (order: FailOrder) => void;
  currentUserName: string;
  isReadOnly?: boolean;
  hospitalId?: string;
  onBulkSetupComplete?: () => Promise<void>;
  initialShowBulkModal?: boolean;
  onInitialModalOpened?: () => void;
}

interface MonthlyFailDatum {
  month: string;
  total: number;
  byManufacturer: Record<string, number>;
}

// ============================================================
// COMPONENT
// ============================================================
const FailManager: React.FC<FailManagerProps> = ({ surgeryMaster, inventory, failOrders, onAddFailOrder, currentUserName, isReadOnly, hospitalId, onBulkSetupComplete, initialShowBulkModal, onInitialModalOpened }) => {
  const { toast, showToast } = useToast();
  const simpleNormalize = (str: string) => String(str || "").trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

  // 1. FAIL 히스토리 전체 추출
  const historyFailList = useMemo(() => {
    const allRows = surgeryMaster['수술기록지'] || [];
    return allRows.filter(row => row['구분'] === '수술중 FAIL' || row['구분'] === 'FAIL 교환완료');
  }, [surgeryMaster]);

  // 2. 미처리 FAIL 리스트
  const pendingFailList = useMemo(() => {
    return historyFailList.filter(row => row['구분'] === '수술중 FAIL');
  }, [historyFailList]);

  // 3. 제조사 목록
  const manufacturers = useMemo(() => {
    const set = new Set<string>();
    historyFailList.forEach(f => set.add(String(f['제조사'] || '기타')));
    return Array.from(set).sort();
  }, [historyFailList]);

  // 4. 일괄 등록 모달용: 재고에서 유효 제조사 목록
  const availableManufacturers = useMemo(() => {
    const set = new Set<string>();
    inventory.forEach(item => {
      const m = item.manufacturer;
      if (m && !m.startsWith('수술중FAIL_') && !m.startsWith('FAIL_') && m !== '보험임플란트') {
        set.add(m);
      }
    });
    return Array.from(set).sort();
  }, [inventory]);

  // 5. 미처리 FAIL을 제조사별 카운트로 변환
  const pendingByManufacturer = useMemo(() => {
    const counts: Record<string, number> = {};
    pendingFailList.forEach(f => {
      const m = String(f['제조사'] || '기타');
      counts[m] = (counts[m] || 0) + 1;
    });
    return Object.entries(counts).map(([manufacturer, count]) => ({ manufacturer, count }));
  }, [pendingFailList]);

  const [activeM, setActiveM] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  useEffect(() => {
    if (initialShowBulkModal) {
      setIsBulkModalOpen(true);
      onInitialModalOpened?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [selectedItems, setSelectedItems] = useState<{ brand: string, size: string, quantity: number }[]>([]);
  const [hoveredChartIdx, setHoveredChartIdx] = useState<number | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const orderModalRef = useRef<HTMLDivElement>(null);
  const orderModalCloseButtonRef = useRef<HTMLButtonElement>(null);

  // 제조사별 통계
  const mStats = useMemo(() => {
    const stats: Record<string, { total: number; processed: number; pending: number }> = {};
    historyFailList.forEach(f => {
      const m = String(f['제조사'] || '기타');
      if (!stats[m]) stats[m] = { total: 0, processed: 0, pending: 0 };
      stats[m].total++;
      if (f['구분'] === 'FAIL 교환완료') stats[m].processed++;
      else stats[m].pending++;
    });
    return stats;
  }, [historyFailList]);

  const currentStats = activeM === 'all'
    ? { total: historyFailList.length, processed: historyFailList.filter(f => f['구분'] === 'FAIL 교환완료').length, pending: pendingFailList.length }
    : (mStats[activeM] || { total: 0, processed: 0, pending: 0 });
  const currentRemainingFails = currentStats.pending;

  const mPendingList = activeM === 'all'
    ? pendingFailList
    : pendingFailList.filter(f => String(f['제조사'] || '기타') === activeM);

  // ============================================================
  // 월별 FAIL 추세 데이터
  // ============================================================
  const monthlyFailData = useMemo<MonthlyFailDatum[]>(() => {
    const monthMap: Record<string, Record<string, number>> = {};
    historyFailList.forEach(f => {
      const dateStr = String(f['날짜'] || '');
      if (!dateStr || dateStr.length < 7) return;
      const month = dateStr.substring(0, 7);
      const m = String(f['제조사'] || '기타');
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

  // KPI용 sparkline 데이터 (월별 총 FAIL)
  const failSparkline = useMemo(() => monthlyFailData.map(d => d.total), [monthlyFailData]);
  const exchangeSparkline = useMemo(() => {
    const monthMap: Record<string, number> = {};
    historyFailList.filter(f => f['구분'] === 'FAIL 교환완료').forEach(f => {
      const d = String(f['날짜'] || '');
      if (!d || d.length < 7) return;
      const month = d.substring(0, 7);
      monthMap[month] = (monthMap[month] || 0) + 1;
    });
    return Object.entries(monthMap).sort(([a], [b]) => a.localeCompare(b)).map(([, v]) => v);
  }, [historyFailList]);

  // 전체 수술 건수 (FAIL률 계산용)
  const totalPlacements = useMemo(() => {
    const allRows = surgeryMaster['수술기록지'] || [];
    return allRows.filter(row => row['구분'] === '식립').length;
  }, [surgeryMaster]);

  const failRate = totalPlacements > 0 ? (historyFailList.filter(f => f['구분'] === '수술중 FAIL').length / totalPlacements * 100) : 0;
  const monthlyAvgFail = monthlyFailData.length > 0 ? (historyFailList.length / monthlyFailData.length) : 0;

  // ============================================================
  // 제조사별 FAIL 분포 (도넛 차트용)
  // ============================================================
  const manufacturerDonut = useMemo(() => {
    const total = historyFailList.length;
    if (total === 0) return [];
    return manufacturers.map((m, i) => {
      const count = mStats[m]?.total || 0;
      const percent = Math.round((count / total) * 100);
      return { name: m, count, percent, color: DONUT_COLORS[i % DONUT_COLORS.length] };
    }).sort((a, b) => b.count - a.count);
  }, [manufacturers, mStats, historyFailList.length]);

  // ============================================================
  // 브랜드/규격별 TOP FAIL 랭킹
  // ============================================================
  const topFailSizes = useMemo(() => {
    const counts: Record<string, { brand: string; size: string; count: number }> = {};
    historyFailList.forEach(f => {
      const b = String(f['브랜드'] || 'Unknown');
      const s = String(f['규격(SIZE)'] || 'Unknown');
      const key = `${b}|${s}`;
      if (!counts[key]) counts[key] = { brand: b, size: s, count: 0 };
      counts[key].count++;
    });
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [historyFailList]);

  // ============================================================
  // Animated KPI values
  // ============================================================
  const animTotal = useCountUp(historyFailList.length);
  const animProcessed = useCountUp(historyFailList.filter(f => f['구분'] === 'FAIL 교환완료').length);
  const animPending = useCountUp(pendingFailList.length);
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
      selectedItems.forEach(si => {
        if (simpleNormalize(si.brand) === simpleNormalize(item.brand) &&
          getSizeMatchKey(si.size, activeM) === getSizeMatchKey(item.size, activeM)) {
          alreadyOrderedQty += Number(si.quantity || 0);
        }
      });
      return { ...item, remainingToOrder: item.count - alreadyOrderedQty };
    }).filter(item => item.remainingToOrder > 0);
    return result;
  }, [activeM, mPendingList, failOrders, selectedItems, isModalOpen]);

  const availableInventoryForM = useMemo(() => {
    if (!activeM) return [];
    const normalizedActiveM = simpleNormalize(activeM);
    return inventory.filter(i => {
      const normalizedInvM = simpleNormalize(i.manufacturer);
      return normalizedInvM.includes(normalizedActiveM) || normalizedActiveM.includes(normalizedInvM);
    });
  }, [inventory, activeM]);

  const handleOpenOrderModal = () => {
    if (currentRemainingFails <= 0) {
      showToast('현재 제조사에 반품 가능한 FAIL 잔여 건수가 없습니다.', 'error');
      return;
    }
    setSelectedItems([{ brand: '', size: '', quantity: 1 }]);
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

  const updateOrderItem = (index: number, field: string, value: string | number) => {
    const next = [...selectedItems];
    if (field === 'brand') {
      next[index] = { ...next[index], brand: String(value), size: '' };
    } else {
      next[index] = { ...next[index], [field]: value } as typeof selectedItems[number];
    }
    setSelectedItems(next);
  };

  const quickAddRecommended = (item: { brand: string, size: string, remainingToOrder: number }) => {
    const otherItemsTotal = selectedItems
      .filter(si => simpleNormalize(si.brand) !== simpleNormalize(item.brand) || getSizeMatchKey(si.size, activeM) !== getSizeMatchKey(item.size, activeM))
      .reduce((sum, si) => sum + (Number(si.brand && si.size ? si.quantity : 0)), 0);
    const globalLimitRoom = Math.max(0, currentRemainingFails - otherItemsTotal);
    const maxPossibleQty = Math.min(item.remainingToOrder, globalLimitRoom);
    if (maxPossibleQty <= 0) {
      showToast('제조사 전체 반품 가능 수량을 초과할 수 없습니다.', 'error');
      return;
    }
    const existingIdx = selectedItems.findIndex(si => simpleNormalize(si.brand) === simpleNormalize(item.brand) && getSizeMatchKey(si.size, activeM) === getSizeMatchKey(item.size, activeM));
    if (existingIdx >= 0) {
      const next = [...selectedItems];
      next[existingIdx].quantity = maxPossibleQty;
      setSelectedItems(next);
    } else {
      const emptyIdx = selectedItems.findIndex(si => !si.brand && !si.size);
      if (emptyIdx >= 0) {
        const next = [...selectedItems];
        next[emptyIdx] = { brand: item.brand, size: item.size, quantity: maxPossibleQty };
        setSelectedItems(next);
      } else {
        setSelectedItems([...selectedItems, { brand: item.brand, size: item.size, quantity: maxPossibleQty }]);
      }
    }
  };

  const handleOrderSubmit = () => {
    const validItems = selectedItems.filter(i => i.brand && i.size).map(i => ({ ...i, quantity: Number(i.quantity) }));
    if (validItems.length === 0) {
      showToast('유효한 품목을 하나 이상 선택해주세요.', 'error');
      return;
    }
    const totalOrderQty = validItems.reduce((sum, item) => sum + item.quantity, 0);
    if (totalOrderQty > currentRemainingFails) {
      showToast(`주문 수량(${totalOrderQty})이 잔여 FAIL 건수(${currentRemainingFails})를 초과할 수 없습니다.`, 'error');
      return;
    }
    validItems.forEach((item, index) => {
      const newOrder: FailOrder = {
        id: `order_${Date.now()}_${index}`,
        type: 'fail_exchange',
        manufacturer: activeM,
        date: new Date().toISOString().split('T')[0],
        items: [item],
        manager: currentUserName,
        status: 'ordered'
      };
      onAddFailOrder(newOrder);
    });
    setIsModalOpen(false);
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
  // 월별 차트 상수 (grouped bar용)
  const CHART_PAD = { l: 36, r: 8, t: 8, b: 24 };
  const CHART_AREA_H = 280;
  const getMonthlyFailValue = (datum: MonthlyFailDatum, manufacturer: string): number => datum.byManufacturer[manufacturer] ?? 0;
  const maxBarVal = Math.max(
    ...monthlyFailData.flatMap(d => manufacturers.map(m => getMonthlyFailValue(d, m))),
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
            <div className="flex items-center gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">데이터 기간</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Data Period</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">
                  {monthlyFailData.length > 0
                    ? `${monthlyFailData[0].month} ~ ${monthlyFailData[monthlyFailData.length - 1].month}`
                    : '-'
                  }
                </p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 FAIL 레코드</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Fail Records</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{historyFailList.length}<span className="text-xs font-semibold text-slate-400 ml-1">건</span></p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 식립 대비</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">vs Total Placement</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{totalPlacements}<span className="text-xs font-semibold text-slate-400 ml-1">cases</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hospitalId && (
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={isReadOnly}
                  className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                  FAIL 재고 정리
                </button>
              )}
              <button
                onClick={handleOpenOrderModal}
                disabled={isReadOnly}
                className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                반품 및 교환 주문
              </button>
            </div>
          </div>
        </div>

        {/* B. KPI Metrics Strip */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-sm">
          <div className="grid grid-cols-5 divide-x divide-slate-100">
            {/* 총 FAIL 발생 */}
            <div className="p-4 relative overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-800">총 FAIL 발생</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Failures</p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums tracking-tight mt-2">{animTotal}<span className="text-sm font-semibold text-slate-400 ml-1">건</span></p>
              {failSparkline.length > 1 && (
                <svg className="absolute bottom-0 right-2 opacity-30" width="80" height="28">
                  <path d={buildSparklinePath(failSparkline, 76, 24)} fill="none" stroke="#4F46E5" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            {/* 교환 처리 완료 */}
            <div className="p-4 relative overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-800">교환 처리 완료</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Exchanged</p>
              <p className="text-2xl font-bold text-emerald-600 tabular-nums tracking-tight mt-2">{animProcessed}<span className="text-sm font-semibold text-slate-400 ml-1">건</span></p>
              {exchangeSparkline.length > 1 && (
                <svg className="absolute bottom-0 right-2 opacity-30" width="80" height="28">
                  <path d={buildSparklinePath(exchangeSparkline, 76, 24)} fill="none" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            {/* 미처리 잔여 */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-slate-800">미처리 잔여</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Pending</p>
              <p className={`text-2xl font-bold tabular-nums tracking-tight mt-2 ${animPending > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{animPending}<span className="text-sm font-semibold text-slate-400 ml-1">건</span></p>
              {animPending > 0 && <p className="text-[10px] font-bold text-rose-400 mt-1">⚠ 전량 미처리</p>}
            </div>
            {/* FAIL률 */}
            <div className="p-4 relative overflow-hidden">
              <h4 className="text-sm font-semibold text-slate-800">FAIL률</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Failure Rate</p>
              <p className={`text-2xl font-bold tabular-nums tracking-tight mt-2 ${failRate > 20 ? 'text-rose-500' : failRate > 10 ? 'text-amber-500' : 'text-slate-800'}`}>
                {(animFailRate / 10).toFixed(1)}<span className="text-sm font-semibold text-slate-400 ml-0.5">%</span>
              </p>
              {failSparkline.length > 1 && (
                <svg className="absolute bottom-0 right-2 opacity-20" width="80" height="28">
                  <path d={buildSparklinePath(failSparkline, 76, 24)} fill="none" stroke="#F43F5E" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              )}
            </div>
            {/* 월 평균 FAIL */}
            <div className="p-4">
              <h4 className="text-sm font-semibold text-slate-800">월 평균</h4>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Avg Monthly</p>
              <p className="text-2xl font-bold text-slate-800 tabular-nums tracking-tight mt-2">
                {(animMonthlyAvg / 10).toFixed(1)}<span className="text-sm font-semibold text-slate-400 ml-1">건/월</span>
              </p>
              {monthlyFailData.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">{monthlyFailData.length}개월 기준</p>
              )}
            </div>
          </div>
        </div>

        {/* C. Manufacturer Filter Strip (Pill style) */}
        <div className="hidden md:block bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm">
          <div className="flex gap-1.5 bg-indigo-50/40 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveM('all')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeM === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              전체
              {pendingFailList.length > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeM === 'all' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-500'}`}>{pendingFailList.length}</span>
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
                  {stats.pending > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeM === m ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-500'}`}>{stats.pending}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:hidden bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-800">모바일 FAIL 관리</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">미처리</p>
              <p className={`text-base font-black tabular-nums ${pendingFailList.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{pendingFailList.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">교환완료</p>
              <p className="text-base font-black text-emerald-600 tabular-nums">{historyFailList.filter(f => f['구분'] === 'FAIL 교환완료').length}</p>
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
                  {m} (미처리 {mStats[m]?.pending ?? 0})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenOrderModal}
            disabled={isReadOnly || currentRemainingFails <= 0 || activeM === 'all'}
            className={`w-full min-h-11 rounded-xl text-sm font-black transition-all ${
              isReadOnly || currentRemainingFails <= 0 || activeM === 'all'
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white active:scale-[0.98]'
            }`}
          >
            반품/교환 주문 등록
          </button>
          {hospitalId && (
            <button
              onClick={() => setIsBulkModalOpen(true)}
              disabled={isReadOnly}
              className={`w-full min-h-11 rounded-xl text-sm font-black transition-all ${
                isReadOnly
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-slate-700 text-white active:scale-[0.98]'
              }`}
            >
              FAIL 재고 정리
            </button>
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
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">{activeM === 'all' ? '전체' : activeM} FAIL 현황</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Manufacturer Status</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleOpenOrderModal}
                    disabled={isReadOnly || currentRemainingFails <= 0 || activeM === 'all'}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 ${isReadOnly || currentRemainingFails <= 0 || activeM === 'all' ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-md shadow-indigo-200'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    반품/교환 주문
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
                <div className={`rounded-xl p-4 text-center ${currentRemainingFails > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${currentRemainingFails > 0 ? 'text-rose-400' : 'text-slate-400'}`}>미처리 잔여</p>
                  <p className={`text-2xl font-black tabular-nums ${currentRemainingFails > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{currentRemainingFails}</p>
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

            {/* RIGHT: 제조사별 FAIL 분포 (도넛 차트) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">제조사 분석</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Manufacturer Analysis</p>
              <div className="flex items-center gap-4 mt-4">
                {/* Donut */}
                <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0">
                  {donutPaths.map((seg, i) => (
                    <path key={i} d={seg.path} fill={seg.color} stroke="white" strokeWidth="2" className="transition-opacity hover:opacity-80" />
                  ))}
                  <circle cx="60" cy="60" r="30" fill="white" />
                  <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{historyFailList.length}</text>
                  <text x="60" y="72" textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8" letterSpacing="0.1em">TOTAL FAIL</text>
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
          {/* ROW 2: 월별 FAIL 추세 + TOP FAIL 규격       */}
          {/* ========================================= */}
          <div className="hidden md:grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            {/* LEFT: 월별 추세 차트 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">월별 FAIL 추세</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Monthly Trend</p>
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
              {monthlyFailData.length > 0 ? (() => {
                const nMfr = manufacturers.length || 1;
                const MONTH_W = Math.max(48, Math.min(68, Math.floor(680 / monthlyFailData.length)));
                const GROUP_W = MONTH_W - 10;
                const BAR_GAP = 2;
                const BAR_W = Math.max(6, Math.floor((GROUP_W - BAR_GAP * (nMfr - 1)) / nMfr));
                const SVG_W = CHART_PAD.l + monthlyFailData.length * MONTH_W + CHART_PAD.r;
                const SVG_H = CHART_PAD.t + CHART_AREA_H + CHART_PAD.b;
                // 툴팁 크기
                const TW = 148;
                const T_ROW_H = 20;
                const T_PAD = 10;
                const TH = T_PAD + 14 + nMfr * T_ROW_H + T_PAD;

                return (
                  <div className="overflow-x-auto -mx-1 px-1">
                    <svg
                      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                      className="w-full"
                      style={{ minWidth: Math.max(320, SVG_W) }}
                      preserveAspectRatio="xMinYMid meet"
                      onMouseLeave={() => setHoveredChartIdx(null)}
                      onTouchEnd={() => setHoveredChartIdx(null)}
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
                      {monthlyFailData.map((d, i) => {
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
                              const val = getMonthlyFailValue(d, m);
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
                              fill={isHov ? '#1e293b' : '#94a3b8'}
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
                        const d = monthlyFailData[hoveredChartIdx];
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
                              const val = getMonthlyFailValue(d, m);
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
              <h3 className="text-sm font-black text-slate-800 tracking-tight">FAIL 다빈도 규격</h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5 mb-4">Top 5 / Size Ranking</p>
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

              {/* FAIL률 by manufacturer */}
              {manufacturers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3">FAIL률 / Failure Rate</h4>
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
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-medium mt-0.5">Exchange Order History · {activeM}</p>
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
                          <span className="text-slate-500">{item.brand} {item.size}</span>
                          <span className="text-slate-800 tabular-nums">{item.quantity}개</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex justify-end">
                      <span className="text-[10px] font-bold text-slate-500">담당: {order.manager}</span>
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
      {/* ORDER MODAL                               */}
      {/* ========================================= */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            ref={orderModalRef}
            className="bg-white w-full max-w-lg sm:max-w-2xl rounded-2xl sm:rounded-[32px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="fail-order-modal-title"
            aria-describedby="fail-order-modal-desc"
          >
            <div className="px-4 py-4 sm:p-8 bg-slate-900 text-white flex justify-between items-center gap-3">
              <div>
                <h3 id="fail-order-modal-title" className="text-lg sm:text-2xl font-black tracking-tight">대체 주문 및 반품 처리</h3>
                <p id="fail-order-modal-desc" className="text-xs opacity-80 mt-1 font-bold uppercase tracking-wider">{activeM} / 반품 가능 잔량: {currentRemainingFails}건</p>
              </div>
              <button ref={orderModalCloseButtonRef} onClick={() => setIsModalOpen(false)} aria-label="대체 주문 모달 닫기" className="h-11 w-11 inline-flex items-center justify-center hover:bg-white/10 rounded-full transition-all">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8 custom-scrollbar">
              {recommendedExchangeItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      교환 권장 품목
                    </h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recommended for Exchange</span>
                  </div>
                  <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {recommendedExchangeItems.map((item, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => quickAddRecommended(item)}
                        className="flex-shrink-0 bg-rose-50 border border-rose-100 p-3.5 sm:p-4 rounded-2xl cursor-pointer hover:bg-rose-100 hover:scale-105 transition-all group min-w-[150px] text-left"
                        aria-label={`권장 품목 추가: ${item.brand} ${item.size}, ${item.remainingToOrder}건`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">PENDING {item.remainingToOrder}건</span>
                          <svg className="w-3 h-3 text-rose-300 group-hover:text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                        </div>
                        <p className="text-xs font-black text-slate-800 truncate">{item.brand}</p>
                        <p className="text-[11px] font-bold text-slate-500">{item.size}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">주문일자 (오늘)</label>
                  <input type="text" value={new Date().toLocaleDateString('ko-KR')} readOnly className="w-full bg-white border border-slate-200 p-3 rounded-xl font-black text-slate-700 shadow-sm outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">반품/주문 담당자</label>
                  <div className="w-full bg-slate-100 border border-slate-200 p-3 rounded-xl font-black text-slate-500 shadow-sm cursor-not-allowed">
                    {currentUserName}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-end mb-2">
                  <h4 className="text-sm font-black text-slate-800">교환 요청 품목</h4>
                  <p className="text-[10px] text-slate-400 italic">* 제조사 FAIL 합계를 초과하여 주문할 수 없습니다.</p>
                </div>

                {selectedItems.map((item, idx) => {
                  const brandOptions = Array.from(new Set(availableInventoryForM.map(i => i.brand))).sort();
                  const sizeOptions = Array.from(new Set(availableInventoryForM
                    .filter(i => i.brand === item.brand)
                    .map(i => i.size)))
                    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-indigo-100 transition-all">
                      <div className="flex-[2]">
                        <label className="text-[9px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">브랜드 선택</label>
                        <select
                          value={item.brand}
                          onChange={(e) => updateOrderItem(idx, 'brand', e.target.value)}
                          className="w-full min-h-11 px-3 py-2.5 text-xs border border-slate-200 rounded-lg outline-none font-black text-slate-700 bg-slate-50 cursor-pointer"
                        >
                          <option value="">브랜드 선택</option>
                          {brandOptions.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                      </div>
                      <div className="flex-[2]">
                        <label className="text-[9px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">규격 선택</label>
                        <select
                          value={item.size}
                          onChange={(e) => updateOrderItem(idx, 'size', e.target.value)}
                          disabled={!item.brand}
                          className="w-full min-h-11 px-3 py-2.5 text-xs border border-slate-200 rounded-lg outline-none font-black text-slate-700 bg-slate-50 cursor-pointer disabled:bg-slate-100 disabled:opacity-50"
                        >
                          <option value="">규격 선택</option>
                          {sizeOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="w-full sm:w-24">
                        <label className="text-[9px] font-bold text-slate-400 mb-1.5 block uppercase tracking-widest">수량</label>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(idx, 'quantity', e.target.value)}
                          className="w-full min-h-11 px-3 py-2.5 text-xs border border-indigo-200 rounded-lg outline-none font-black text-center text-indigo-600 bg-indigo-50/30"
                        />
                      </div>
                      <button
                        onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}
                        disabled={selectedItems.length === 1}
                        className="h-11 w-11 sm:w-auto sm:p-2.5 inline-flex items-center justify-center text-slate-300 hover:text-rose-500 transition-all"
                        aria-label={`${idx + 1}번째 품목 삭제`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  );
                })}

                <button
                  onClick={() => setSelectedItems([...selectedItems, { brand: '', size: '', quantity: 1 }])}
                  className="w-full min-h-11 py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-100 transition-all"
                >
                  + 추가 품목 입력
                </button>
              </div>
            </div>

            <div className="px-4 py-4 sm:p-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="text-sm font-bold text-slate-600">
                총 주문 수량: <span className={`text-xl font-black ml-1 tabular-nums ${selectedItems.reduce((s, i) => s + (Number(i.brand && i.size ? i.quantity : 0)), 0) > currentRemainingFails ? 'text-rose-600 underline decoration-wavy' : 'text-indigo-600'}`}>{selectedItems.reduce((s, i) => s + (Number(i.brand && i.size ? i.quantity : 0)), 0)}</span> / <span className="text-slate-400">{currentRemainingFails}</span>
              </div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setIsModalOpen(false)} className="flex-1 sm:flex-none min-h-11 px-6 py-3 text-sm font-bold text-slate-500 hover:bg-slate-200 rounded-2xl transition-all">취소</button>
                <button
                  onClick={handleOrderSubmit}
                  className="flex-1 sm:flex-none min-h-11 px-10 py-3 bg-slate-900 text-white font-black rounded-2xl shadow-xl shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all"
                >
                  주문 확인 및 완료
                </button>
              </div>
            </div>
          </div>
        </div>
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
