
import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, OrderType, InventoryItem, ReturnRequest, ReturnStatus, ReturnReason, ReturnMutationResult } from '../types';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { useCountUp, DONUT_COLORS } from './surgery-dashboard/shared';
import OrderCancelModal from './order/OrderCancelModal';
import ReturnManager from './ReturnManager';
import ConfirmModal from './ConfirmModal';

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

interface OrderManagerProps {
  orders: Order[];
  inventory: InventoryItem[];
  returnRequests: ReturnRequest[];
  hospitalId?: string;
  currentUserName?: string;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onQuickOrder: (item: InventoryItem) => void;
  onCreateReturn: (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => Promise<void>;
  onUpdateReturnStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => Promise<ReturnMutationResult>;
  onCompleteReturn: (returnId: string) => Promise<ReturnMutationResult>;
  onDeleteReturn: (returnId: string) => Promise<void>;
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
  isReadOnly?: boolean;
}

type LowStockEntry = {
  item: InventoryItem;
  rawDeficit: number;
  pendingQty: number;
  remainingDeficit: number;
};

const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  inventory,
  returnRequests,
  hospitalId,
  currentUserName = '관리자',
  onUpdateOrderStatus,
  onDeleteOrder,
  onCancelOrder,
  onQuickOrder,
  onCreateReturn,
  onUpdateReturnStatus,
  onCompleteReturn,
  onDeleteReturn,
  showAlertToast,
  isReadOnly,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'returns'>('orders');
  const [filterType, setFilterType] = useState<OrderType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');

  // ── 취소 모달 state ──
  const [cancelModalOrder, setCancelModalOrder] = useState<Order | null>(null);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  // ── 일괄 주문 모달 state ──
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);

  // ── 발주 권장 품목 UI state ──
  const [expandedMfrs, setExpandedMfrs] = useState<Set<string>>(new Set());
  const [lowStockSearch, setLowStockSearch] = useState('');
  const [lowStockMfrFilter, setLowStockMfrFilter] = useState<string | 'all'>('all');

  const simpleNormalize = (str: string) => String(str || "").trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');
  const displayMfr = (name: string) => name === 'IBS' ? 'IBS Implant' : name;
  const buildOrderItemKey = (manufacturer: string, brand: string, size: string) =>
    `${simpleNormalize(manufacturer)}|${simpleNormalize(brand)}|${getSizeMatchKey(size, manufacturer)}`;

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const typeMatch = filterType === 'all' || order.type === filterType;
      const statusMatch = filterStatus === 'all' || order.status === filterStatus;
      const dateFromMatch = !filterDateFrom || order.date >= filterDateFrom;
      const dateToMatch = !filterDateTo || order.date <= filterDateTo;
      const mfrMatch = filterManufacturer === 'all' || order.manufacturer === filterManufacturer;
      return typeMatch && statusMatch && dateFromMatch && dateToMatch && mfrMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, filterType, filterStatus, filterDateFrom, filterDateTo, filterManufacturer]);

  const pendingQtyByItemKey = useMemo(() => {
    const qtyMap = new Map<string, number>();
    orders.forEach(order => {
      if (order.status !== 'ordered' || order.type !== 'replenishment') return;
      order.items.forEach(oi => {
        const key = buildOrderItemKey(order.manufacturer, oi.brand, oi.size);
        qtyMap.set(key, (qtyMap.get(key) ?? 0) + Number(oi.quantity || 0));
      });
    });
    return qtyMap;
  }, [orders]);

  const lowStockItems = useMemo<LowStockEntry[]>(() => {
    return inventory
      .filter(item => simpleNormalize(item.manufacturer) !== simpleNormalize('보험임플란트'))
      .map(item => {
        const rawDeficit = Math.max(0, item.recommendedStock - item.currentStock);
        if (rawDeficit <= 0) return null;
        const itemKey = buildOrderItemKey(item.manufacturer, item.brand, item.size);
        const pendingQty = pendingQtyByItemKey.get(itemKey) ?? 0;
        const remainingDeficit = Math.max(0, rawDeficit - pendingQty);
        if (remainingDeficit <= 0) return null;
        return { item, rawDeficit, pendingQty, remainingDeficit };
      })
      .filter((entry): entry is LowStockEntry => entry !== null)
      .sort((a, b) => {
        const aSeverity = a.remainingDeficit / Math.max(a.item.recommendedStock, 1);
        const bSeverity = b.remainingDeficit / Math.max(b.item.recommendedStock, 1);
        return bSeverity - aSeverity;
      });
  }, [inventory, pendingQtyByItemKey]);

  const stats = useMemo(() => {
    const totalOrders = orders.filter(o => filterType === 'all' || o.type === filterType);
    const pendingOrders = totalOrders.filter(o => o.status === 'ordered');
    const receivedOrders = totalOrders.filter(o => o.status === 'received');
    const sumQty = (list: Order[]) => list.reduce((acc, o) => acc + (o.items[0]?.quantity || 0), 0);
    const lowStockDeficit = lowStockItems.reduce((acc, entry) => acc + entry.remainingDeficit, 0);
    // 반품 통계 (전체 orders 기준, 필터 무관)
    const returnOrders = orders.filter(o => o.type === 'return');
    const returnPending = returnOrders.filter(o => o.status === 'ordered');
    const returnReceived = returnOrders.filter(o => o.status === 'received');
    return {
      totalCount: totalOrders.length,
      totalQty: sumQty(totalOrders),
      pendingCount: pendingOrders.length,
      pendingQty: sumQty(pendingOrders),
      receivedCount: receivedOrders.length,
      receivedQty: sumQty(receivedOrders),
      lowStockCount: lowStockItems.length,
      lowStockQty: lowStockDeficit,
      returnCount: returnOrders.length,
      returnQty: sumQty(returnOrders),
      returnPendingCount: returnPending.length,
      returnReceivedCount: returnReceived.length,
    };
  }, [orders, lowStockItems, filterType]);

  const typeCounts: Record<'all' | 'replenishment' | 'fail_exchange' | 'return', number> = useMemo(() => ({
    all: orders.length,
    replenishment: orders.filter(o => o.type === 'replenishment').length,
    fail_exchange: orders.filter(o => o.type === 'fail_exchange').length,
    return: orders.filter(o => o.type === 'return').length,
  }), [orders]);

  // ── 월별 주문 추세 데이터 (건수 → 총 수량 합계) ──
  const monthlyOrderData = useMemo(() => {
    const monthMap: Record<string, { replenishment: number; fail_exchange: number; total: number }> = {};
    orders.forEach(o => {
      const d = o.date;
      if (!d || d.length < 7) return;
      const month = d.substring(0, 7);
      if (!monthMap[month]) monthMap[month] = { replenishment: 0, fail_exchange: 0, total: 0 };
      const qty = o.items.reduce((s, item) => s + Number(item.quantity || 0), 0);
      if (o.type === 'replenishment') monthMap[month].replenishment += qty;
      else monthMap[month].fail_exchange += qty;
      monthMap[month].total += qty;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }, [orders]);

  const orderSparkline = useMemo(() => monthlyOrderData.map(d => d.total), [monthlyOrderData]);

  // ── 제조사별 주문 분포 (도넛) ──
  const manufacturerDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.manufacturer] = (counts[o.manufacturer] || 0) + 1;
    });
    const total = orders.length;
    if (total === 0) return [];
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count], i) => ({
        name, count,
        percent: Math.round((count / total) * 100),
        color: DONUT_COLORS[i % DONUT_COLORS.length]
      }));
  }, [orders]);

  const donutPaths = useMemo(() => {
    const total = manufacturerDonut.reduce((s, d) => s + d.count, 0);
    if (total === 0) return [];
    const r = 50, cx = 60, cy = 60;
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

  // ── 발주 권장 품목 제조사별 그룹핑 ──
  const groupedLowStock = useMemo(() => {
    const groups: Record<string, LowStockEntry[]> = {};
    lowStockItems.forEach(entry => {
      const m = entry.item.manufacturer;
      if (!groups[m]) groups[m] = [];
      groups[m].push(entry);
    });
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [lowStockItems]);

  // ── 필터링 + 브랜드별 그룹핑 ──
  const filteredGroupedLowStock = useMemo(() => {
    const searchLower = lowStockSearch.trim().toLowerCase();
    return groupedLowStock
      .filter(([mfr]) => lowStockMfrFilter === 'all' || mfr === lowStockMfrFilter)
      .map(([mfr, entries]) => {
        const filtered = searchLower
          ? entries.filter(e => e.item.brand.toLowerCase().includes(searchLower) || e.item.size.toLowerCase().includes(searchLower))
          : entries;
        // brand sub-grouping
        const brandGroups: Record<string, LowStockEntry[]> = {};
        filtered.forEach(e => {
          const b = e.item.brand;
          if (!brandGroups[b]) brandGroups[b] = [];
          brandGroups[b].push(e);
        });
        const brandEntries = Object.entries(brandGroups).sort(([, a], [, b]) => b.length - a.length);
        return { mfr, entries: filtered, brandEntries };
      })
      .filter(g => g.entries.length > 0);
  }, [groupedLowStock, lowStockSearch, lowStockMfrFilter]);

  // Auto-expand first manufacturer on initial load
  React.useEffect(() => {
    if (expandedMfrs.size === 0 && groupedLowStock.length > 0) {
      setExpandedMfrs(new Set([groupedLowStock[0][0]]));
    }
  }, [groupedLowStock.length]);

  // ── Animated KPI & Specific Metrics ──
  const kpiData = useMemo(() => {
    const pendingReplenishments = orders.filter(o => o.type === 'replenishment' && o.status === 'ordered');
    const pendingReplenishmentQty = pendingReplenishments.reduce((acc, o) => acc + (o.items[0]?.quantity || 0), 0);
    const receivedOrders = orders.filter(o => o.status === 'received');
    const receivedQty = receivedOrders.reduce((acc, o) => acc + (o.items[0]?.quantity || 0), 0);
    const pendingExcRet = orders.filter(o => (o.type === 'fail_exchange' || o.type === 'return') && o.status === 'ordered');
    const lowStockDeficit = lowStockItems.reduce((acc, entry) => acc + entry.remainingDeficit, 0);

    return {
      pendingRepCount: pendingReplenishments.length,
      pendingRepQty: pendingReplenishmentQty,
      receivedCount: receivedOrders.length,
      receivedQty: receivedQty,
      pendingExcRetCount: pendingExcRet.length,
      lowStockCount: lowStockItems.length,
      lowStockQty: lowStockDeficit,
    };
  }, [orders, lowStockItems]);

  const animPendingRep = useCountUp(kpiData.pendingRepCount);
  const animReceived = useCountUp(kpiData.receivedCount);
  const animExcRet = useCountUp(kpiData.pendingExcRetCount);
  const animLowStock = useCountUp(kpiData.lowStockCount);
  const animTotal = useCountUp(stats.totalCount);

  const TYPE_TABS: { key: 'all' | 'replenishment' | 'fail_exchange' | 'return'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'replenishment', label: '발주' },
    { key: 'fail_exchange', label: '교환' },
    { key: 'return', label: '반품' },
  ];
  const STATUS_FILTERS: { key: 'all' | OrderStatus; label: string }[] = [
    { key: 'all', label: '모든 상태' },
    { key: 'ordered', label: '입고대기' },
    { key: 'received', label: '입고완료' },
    { key: 'cancelled', label: '취소됨' },
  ];

  const manufacturerOptions = useMemo(() => {
    const set = new Set(orders.map(o => o.manufacturer));
    return Array.from(set).sort();
  }, [orders]);

  const chartW = 600;
  const chartH = 160;
  const barPad = 4;
  const maxBarVal = Math.max(...monthlyOrderData.map(d => d.total), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500" style={{ animationDuration: '0s' }}>
      {/* 서브탭: 발주 관리 | 반품 관리 */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${activeTab === 'orders'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          발주 관리
        </button>
        <button
          onClick={() => setActiveTab('returns')}
          className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 ${activeTab === 'returns'
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          반품 관리
          {returnRequests.filter(r => r.status === 'requested').length > 0 && (
            <span className="bg-yellow-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {returnRequests.filter(r => r.status === 'requested').length}
            </span>
          )}
        </button>
      </div>

      {/* 반품 관리 탭 */}
      {activeTab === 'returns' && (
        <ReturnManager
          returnRequests={returnRequests}
          inventory={inventory}
          hospitalId={hospitalId}
          currentUserName={currentUserName}
          isReadOnly={isReadOnly ?? false}
          onCreateReturn={onCreateReturn}
          onUpdateReturnStatus={onUpdateReturnStatus}
          onCompleteReturn={onCompleteReturn}
          onDeleteReturn={onDeleteReturn}
          showAlertToast={showAlertToast}
        />
      )}

      {activeTab === 'orders' && <div className="space-y-6">
        {/* ═══════════════════════════════════════ */}
        {/* STICKY HEADER + KPI + FILTERS           */}
        {/* ═══════════════════════════════════════ */}
        <div
          className="md:sticky z-20 pt-px pb-3 -mt-px bg-slate-50/80 backdrop-blur-md transition-[padding] duration-200 lg:space-y-4"
          style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)' }}
        >
          <div className="hidden md:flex flex-col gap-4">
            {/* Tier 1: Context & Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-stretch gap-2 flex-1 min-w-0">
                  <div className="min-w-[150px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 flex flex-col justify-center">
                    <h4 className="text-sm font-semibold text-slate-800">총 레코드</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Records</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <p className="text-base font-bold text-slate-800 tabular-nums tracking-tight">{animTotal}</p>
                      <span className="text-xs font-semibold text-slate-400">건</span>
                    </div>
                  </div>

                  <div className="min-w-[190px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">보기 필터</h4>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">View Filter</p>
                      </div>
                    </div>
                    <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mt-2 w-fit">
                      {TYPE_TABS.map(({ key, label }) => {
                        const isActive = filterType === key;
                        return (
                          <button
                            key={key}
                            onClick={() => setFilterType(key)}
                            className={`px-3 py-1 text-[11px] font-black rounded-lg transition-all flex items-center gap-1.5 ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                          >
                            {label}
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-indigo-200/50 text-indigo-800' : 'bg-slate-100 text-slate-500'}`}>{typeCounts[key]}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
                  {/* 상태 필터 */}
                  <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {STATUS_FILTERS.map(({ key, label }) => {
                      const isActive = filterStatus === key;
                      const activeStyle = key === 'ordered' ? 'bg-rose-50 text-rose-600' : key === 'received' ? 'bg-emerald-50 text-emerald-600' : key === 'cancelled' ? 'bg-slate-100 text-slate-500' : 'bg-indigo-50 text-indigo-600';
                      return (
                        <button
                          key={key}
                          onClick={() => setFilterStatus(key)}
                          className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${isActive ? activeStyle : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                  {/* 날짜 범위 필터 */}
                  <div className="flex items-center gap-1.5">
                    <input
                      type="date"
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                      className="px-2 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    />
                    <span className="text-[10px] text-slate-400 font-bold">~</span>
                    <input
                      type="date"
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                      className="px-2 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    />
                    {(filterDateFrom || filterDateTo) && (
                      <button
                        onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                        title="날짜 필터 초기화"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    )}
                  </div>
                  {/* 제조사 필터 */}
                  {manufacturerOptions.length > 1 && (
                    <select
                      value={filterManufacturer}
                      onChange={e => setFilterManufacturer(e.target.value)}
                      className="px-3 py-1.5 text-[11px] font-bold rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                    >
                      <option value="all">전체 제조사</option>
                      {manufacturerOptions.map(m => (
                        <option key={m} value={m}>{displayMfr(m)}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Tier 2: KPI Metrics Strip */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden p-2 flex flex-col sm:flex-row divide-y sm:divide-y-0">

              {/* 1. 긴급 부족 품목 */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (isReadOnly) {
                    alert("읽기 전용 모드입니다.");
                    return;
                  }
                  if (lowStockItems.length === 0) {
                    window.location.hash = '#/dashboard/inventory';
                    return;
                  }
                  setShowBulkOrderModal(true);
                }}
                role="button"
                tabIndex={0}
                className={`flex-1 p-5 lg:p-6 transition-all duration-300 ${lowStockItems.length > 0 ? 'hover:bg-rose-50/40 cursor-pointer active:bg-rose-100/50 group/lowstock' : 'bg-white cursor-default'} outline-none relative overflow-hidden`}
              >
                {lowStockItems.length > 0 && (
                  <div className="absolute top-5 right-5 opacity-0 translate-x-2 group-hover/lowstock:opacity-100 group-hover/lowstock:translate-x-0 transition-all duration-300 pointer-events-none">
                    <div className="flex items-center gap-1 text-rose-600 bg-white shadow-sm border border-rose-100 px-2.5 py-1 rounded-full">
                      <span className="text-[10px] font-black tracking-tight">일괄 주문</span>
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                  </div>
                )}
                <h4 className={`text-sm font-semibold transition-colors ${lowStockItems.length > 0 ? 'text-slate-800 group-hover/lowstock:text-rose-700' : 'text-slate-800'}`}>긴급 부족 품목</h4>
                <p className={`text-[11px] uppercase tracking-widest font-black mt-0.5 transition-colors ${lowStockItems.length > 0 ? 'text-slate-400 group-hover/lowstock:text-rose-400' : 'text-slate-400'}`}>Urgent Shortage</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <p className={`text-2xl font-black tabular-nums tracking-tighter leading-none transition-colors duration-300 ${animLowStock > 0 ? 'text-rose-600 group-hover/lowstock:text-rose-600' : 'text-slate-800'}`}>{animLowStock}</p>
                  <span className={`text-sm font-bold transition-colors ${lowStockItems.length > 0 ? 'text-slate-400 group-hover/lowstock:text-rose-400' : 'text-slate-400'}`}>items</span>
                </div>
                {animLowStock > 0 ? (
                  <p className="text-xs font-bold text-slate-500 mt-2 transition-colors group-hover/lowstock:text-rose-500">
                    총 <span className="text-rose-600">{kpiData.lowStockQty}개</span> 부족
                  </p>
                ) : (
                  <p className="text-xs font-bold text-slate-400 mt-2">부족 품목 없음</p>
                )}
              </div>

              <div className="w-px bg-slate-100 shrink-0" />

              {/* 2. 진행 중인 발주 */}
              <div
                onClick={() => { setFilterType('replenishment'); setFilterStatus('ordered'); }}
                role="button"
                tabIndex={0}
                className="flex-1 p-5 lg:p-6 transition-colors hover:bg-slate-50/50 cursor-pointer active:bg-slate-100/50 outline-none group/pending relative overflow-hidden"
              >
                <div className="absolute top-5 right-5 opacity-0 translate-x-2 group-hover/pending:opacity-100 group-hover/pending:translate-x-0 transition-all duration-300 pointer-events-none">
                  <div className="flex items-center gap-1 text-slate-600 bg-white shadow-sm border border-slate-200 px-2.5 py-1 rounded-full">
                    <span className="text-[10px] font-black tracking-tight">필터 적용</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 group-hover/pending:text-slate-900 transition-colors">진행 중인 발주</h4>
                <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black mt-0.5 group-hover/pending:text-slate-500 transition-colors">Pending Orders</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <p className={`text-2xl font-black tabular-nums tracking-tighter leading-none ${animPendingRep > 0 ? 'text-rose-600 font-black' : 'text-slate-800'}`}>{animPendingRep}</p>
                  <span className="text-sm font-bold text-slate-400">건</span>
                </div>
                {animPendingRep > 0 ? (
                  <p className="text-xs font-bold text-rose-500 mt-2">미입고 {kpiData.pendingRepQty}개</p>
                ) : (
                  <p className="text-xs font-bold text-slate-400 mt-2">대기 중인 발주 없음</p>
                )}
              </div>

              <div className="w-px bg-slate-100 shrink-0" />

              {/* 3. 교환/반품 대기 */}
              <div
                onClick={() => { setFilterType('fail_exchange'); setFilterStatus('ordered'); }}
                role="button"
                tabIndex={0}
                className="flex-1 p-5 lg:p-6 transition-all duration-300 hover:bg-amber-50/40 cursor-pointer active:bg-amber-100/50 outline-none group/excret relative overflow-hidden"
              >
                <div className="absolute top-5 right-5 opacity-0 translate-x-2 group-hover/excret:opacity-100 group-hover/excret:translate-x-0 transition-all duration-300 pointer-events-none">
                  <div className="flex items-center gap-1 text-amber-600 bg-white shadow-sm border border-amber-100 px-2.5 py-1 rounded-full">
                    <span className="text-[10px] font-black tracking-tight">필터 적용</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-800 group-hover/excret:text-amber-700 transition-colors">교환/반품 대기</h4>
                <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black mt-0.5 group-hover/excret:text-amber-400 transition-colors">Exchange & Return</p>
                <div className="flex items-baseline gap-1 mt-3">
                  <p className={`text-2xl font-black tabular-nums tracking-tighter leading-none transition-colors duration-300 ${animExcRet > 0 ? 'text-amber-500 group-hover/excret:text-amber-600' : 'text-slate-800 group-hover/excret:text-amber-600'}`}>{animExcRet}</p>
                  <span className="text-sm font-bold text-slate-400 group-hover/excret:text-amber-400 transition-colors">건</span>
                </div>
                {animExcRet > 0 ? (
                  <p className="text-xs font-bold text-amber-500 mt-2 transition-colors group-hover/excret:text-amber-600">빠른 조치 필요</p>
                ) : (
                  <p className="text-xs font-bold text-slate-400 mt-2 transition-colors group-hover/excret:text-amber-400">대기 중인 건 없음</p>
                )}
              </div>

              <div className="w-px bg-slate-100 shrink-0" />

              {/* 4. 종합 상태 요약 */}
              <div
                onClick={() => { setFilterType('all'); setFilterStatus('all'); }}
                role="button"
                tabIndex={0}
                className="flex-[1.2] p-5 lg:p-6 transition-colors hover:bg-slate-50/50 cursor-pointer active:bg-slate-100/50 outline-none group/summary relative overflow-hidden"
              >
                <div className="absolute top-5 right-5 opacity-0 translate-x-2 group-hover/summary:opacity-100 group-hover/summary:translate-x-0 transition-all duration-300 pointer-events-none">
                  <div className="flex items-center gap-1 text-slate-600 bg-white shadow-sm border border-slate-200 px-2.5 py-1 rounded-full">
                    <span className="text-[10px] font-black tracking-tight">전체 보기</span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
                <h4 className="text-sm font-semibold text-slate-800">종합 상태 현황</h4>
                <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black mt-0.5">Overall Status</p>

                <div className="flex items-center gap-4 mt-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                      <span className="text-xs font-semibold text-slate-600">일반 발주</span>
                    </div>
                    <p className="text-base font-bold text-slate-800 tabular-nums ml-3.5"><span className="text-[10px] text-slate-400 mr-1.5 font-bold">진행</span>{kpiData.pendingRepCount} <span className="text-[10px] text-slate-400 font-bold ml-1.5 mr-1.5">/ 완료</span><span className="text-emerald-600">{stats.receivedCount}</span></p>
                  </div>
                  <div className="w-px h-8 bg-slate-200 mx-2"></div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                      <span className="text-xs font-semibold text-slate-600">교환/반품</span>
                    </div>
                    <p className="text-base font-bold text-slate-800 tabular-nums ml-3.5"><span className="text-[10px] text-slate-400 mr-1.5 font-bold">진행</span>{kpiData.pendingExcRetCount} <span className="text-[10px] text-slate-400 font-bold ml-1.5 mr-1.5">/ 발생</span><span className="text-amber-500">{typeCounts.fail_exchange + typeCounts.return}</span></p>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Mobile View Strategy */}
          <div className="md:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-800">모바일 주문 요약</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {/* Mobile 1 */}
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  if (isReadOnly) {
                    alert("읽기 전용 모드입니다.");
                    return;
                  }
                  if (lowStockItems.length === 0) return;
                  setShowBulkOrderModal(true);
                }}
                role="button"
                tabIndex={0}
                className={`rounded-xl border ${lowStockItems.length > 0 ? 'border-rose-200 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 cursor-pointer' : 'border-rose-100 bg-rose-50/80'} px-3 py-2.5 transition-colors`}
              >
                <div className="flex justify-between items-start">
                  <p className="text-[10px] font-bold text-rose-500">긴급 부족품</p>
                  {lowStockItems.length > 0 && <span className="bg-white border border-rose-200 text-rose-600 text-[8px] font-bold px-1.5 py-0.5 rounded shadow-sm">일괄주문 &gt;</span>}
                </div>
                <p className={`text-base font-black tabular-nums mt-0.5 ${animLowStock > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{animLowStock}</p>
              </div>
              {/* Mobile 2 */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-500">진행 중 발주</p>
                <p className={`text-base font-black tabular-nums ${animPendingRep > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{animPendingRep}</p>
              </div>
              {/* Mobile 3 */}
              <div className="rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5">
                <p className="text-[10px] font-bold text-amber-600">교환/반품 대기</p>
                <p className={`text-base font-black tabular-nums ${animExcRet > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{animExcRet}</p>
              </div>
              {/* Mobile 4 */}
              <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-500">종합 현황</p>
                <p className="text-[10px] font-bold text-slate-800 mt-1 whitespace-nowrap overflow-hidden text-ellipsis"><span className="text-slate-400 mr-1">발주완료</span><span className="text-emerald-600 font-black">{stats.receivedCount}</span><span className="text-slate-400 ml-2 mr-1">교환/반품</span><span className="text-amber-500 font-black">{typeCounts.fail_exchange + typeCounts.return}</span></p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex gap-1">
                {TYPE_TABS.map(({ key, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterType(key)}
                    className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${filterType === key ? 'border-indigo-800 bg-indigo-800 text-white' : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                  >
                    {label}
                    <span className={`inline-block ml-1 text-[9px] scale-90 px-1 py-0.5 rounded-full ${filterType === key ? 'bg-indigo-900 text-indigo-100' : 'bg-slate-200 text-slate-400'}`}>{typeCounts[key]}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-1">
                {STATUS_FILTERS.map(({ key, label }) => {
                  const isActive = filterStatus === key;
                  const activeColor = key === 'ordered' ? 'border-rose-300 bg-rose-50 text-rose-600' : key === 'received' ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-indigo-300 bg-indigo-50 text-indigo-600';
                  return (
                    <button
                      key={key}
                      onClick={() => setFilterStatus(key)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${isActive ? activeColor : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* 발주 권장 품목 (제조사별 그룹핑)          */}
        {/* ═══════════════════════════════════════ */}
        {groupedLowStock.length > 0 && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            {/* ── Header ── */}
            <div className="px-4 sm:px-7 pt-5 sm:pt-7 pb-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <h3 className="text-base font-black text-slate-800 tracking-tight">발주 권장 품목</h3>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Low Stock</span>
                  <span className="text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">{lowStockItems.length}종 · {stats.lowStockQty}개 부족</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isReadOnly && <span className="text-[10px] font-bold text-slate-400 italic hidden sm:inline">사이즈 클릭 시 즉시 발주</span>}
                </div>
              </div>

              {/* ── Search + Manufacturer Filter Tabs ── */}
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
                {/* Search */}
                <div className="relative flex-1 max-w-xs">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  <input
                    type="text"
                    value={lowStockSearch}
                    onChange={e => setLowStockSearch(e.target.value)}
                    placeholder="브랜드·사이즈 검색"
                    className="w-full pl-9 pr-3 py-2 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 placeholder:text-slate-400 transition-all"
                  />
                  {lowStockSearch && (
                    <button onClick={() => setLowStockSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}
                </div>
                {/* Manufacturer filter tabs */}
                <div className="flex flex-wrap gap-1 bg-slate-100/60 p-1 rounded-xl">
                  <button
                    onClick={() => setLowStockMfrFilter('all')}
                    className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${lowStockMfrFilter === 'all' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                      }`}
                  >
                    전체 ({lowStockItems.length})
                  </button>
                  {groupedLowStock.map(([mfr, entries]) => (
                    <button
                      key={mfr}
                      onClick={() => setLowStockMfrFilter(lowStockMfrFilter === mfr ? 'all' : mfr)}
                      className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all ${lowStockMfrFilter === mfr ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                        }`}
                    >
                      {displayMfr(mfr)} ({entries.length})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Accordion List ── */}
            <div className="px-4 sm:px-7 pb-5 sm:pb-7 space-y-3">
              {filteredGroupedLowStock.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-sm text-slate-400 font-bold">검색 결과가 없습니다.</p>
                </div>
              ) : filteredGroupedLowStock.map(({ mfr, entries, brandEntries }) => {
                const isExpanded = expandedMfrs.has(mfr);
                const toggleExpanded = () => {
                  setExpandedMfrs(prev => {
                    const next = new Set(prev);
                    if (next.has(mfr)) next.delete(mfr); else next.add(mfr);
                    return next;
                  });
                };
                const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);

                return (
                  <div key={mfr} className={`rounded-2xl border transition-all duration-300 ${isExpanded ? 'bg-white border-slate-200 shadow-[0_4px_12px_rgba(15,23,42,0.04)] ring-1 ring-slate-100/50' : 'bg-slate-50/80 border-slate-100 hover:border-slate-200 hover:bg-slate-50 hover:shadow-sm'
                    }`}>
                    {/* Manufacturer Header — clickable */}
                    <button
                      onClick={toggleExpanded}
                      className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <svg className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        <span className="text-sm font-black text-slate-800 tracking-tight">{displayMfr(mfr)}</span>
                        <span className="text-[10px] font-bold text-slate-400">{brandEntries.length}개 브랜드</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">{entries.length}종</span>
                        <span className="text-[10px] font-black text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">{totalDeficit}개 부족</span>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-3" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                        {brandEntries.map(([brand, bEntries]) => {
                          const brandDeficit = bEntries.reduce((s, e) => s + e.remainingDeficit, 0);
                          return (
                            <div key={brand} className="bg-slate-50/80 rounded-xl p-3 sm:p-4">
                              {/* Brand sub-header */}
                              <div className="flex items-center gap-2 mb-2.5">
                                <div className="w-1 h-4 rounded-full bg-indigo-400" />
                                <span className="text-[11px] font-black text-slate-700">{brand}</span>
                                <span className="text-[9px] font-bold text-slate-400 bg-slate-200/60 px-1.5 py-0.5 rounded">{bEntries.length}종 · {brandDeficit}개</span>
                              </div>
                              {/* Size chips — compact, no brand name */}
                              <div className="flex flex-wrap gap-1.5">
                                {bEntries.map(({ item, remainingDeficit, pendingQty }) => {
                                  const severity = remainingDeficit / Math.max(item.recommendedStock, 1);
                                  const severityClass = severity >= 0.8
                                    ? 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600'
                                    : severity >= 0.5
                                      ? 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-500 hover:text-white hover:border-orange-500'
                                      : 'bg-white border-slate-200 text-slate-700 hover:bg-indigo-600 hover:text-white hover:border-indigo-600';
                                  const readOnlyClass = 'border-slate-200 text-slate-400 cursor-not-allowed opacity-60 bg-slate-50';

                                  return (
                                    <button
                                      key={item.id}
                                      onClick={() => !isReadOnly && onQuickOrder({ ...item, currentStock: item.recommendedStock - remainingDeficit })}
                                      disabled={isReadOnly}
                                      title={`${item.brand} ${item.size} — ${remainingDeficit}개 부족${pendingQty > 0 ? ` (주문중 ${pendingQty})` : ''}`}
                                      className={`inline-flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-[11px] font-bold transition-all cursor-pointer active:scale-95 ${isReadOnly ? readOnlyClass : severityClass
                                        }`}
                                    >
                                      <span>{item.size}</span>
                                      {pendingQty > 0 && (
                                        <span className="px-1 py-0.5 bg-slate-200/60 text-slate-500 rounded text-[8px] font-black leading-none">+{pendingQty}</span>
                                      )}
                                      <span className={`px-1 py-0.5 rounded text-[8px] font-black leading-none ${severity >= 0.8 ? 'bg-rose-200/80 text-rose-700' : severity >= 0.5 ? 'bg-orange-200/80 text-orange-700' : 'bg-slate-100 text-slate-500'
                                        }`}>{remainingDeficit}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Legend ── */}
            <div className="px-4 sm:px-7 pb-5 sm:pb-7 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">범례</span>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-rose-100 border border-rose-200" /><span className="text-[10px] font-bold text-slate-500">긴급 (≥80%)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" /><span className="text-[10px] font-bold text-slate-500">주의 (≥50%)</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded bg-white border border-slate-200" /><span className="text-[10px] font-bold text-slate-500">일반</span></div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* 주문 분석 차트                            */}
        {/* ═══════════════════════════════════════ */}
        {orders.length > 0 && (
          <>
            <div className="md:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <h3 className="text-sm font-black text-slate-800">모바일 주문 요약</h3>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-slate-400">최근 월 주문량</p>
                  <p className="text-base font-black text-slate-800 tabular-nums">
                    {(monthlyOrderData[monthlyOrderData.length - 1]?.total ?? 0).toLocaleString()}개
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
                  <p className="text-[10px] font-bold text-slate-400">입고 대기</p>
                  <p className="text-base font-black text-rose-600 tabular-nums">{stats.pendingCount}건</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 col-span-2">
                  <p className="text-[10px] font-bold text-slate-400">주요 제조사</p>
                  <p className="text-sm font-black text-slate-800 truncate">
                    {manufacturerDonut[0]?.name ? `${displayMfr(manufacturerDonut[0].name)} (${manufacturerDonut[0].percent}%)` : '데이터 없음'}
                  </p>
                </div>
              </div>
            </div>

            <div className="hidden md:grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-4 sm:gap-6">
              {/* LEFT: 월별 추세 */}
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm ring-1 ring-slate-100/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 opacity-60"></div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 sm:mb-6 relative z-10">
                  <div>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">월별 주문 추세</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">Monthly Order Trend</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 bg-white/50 backdrop-blur-sm px-2.5 sm:px-3 py-1.5 rounded-xl border border-white shadow-sm">
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm" /><span className="text-[10px] font-bold text-slate-500">발주</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 shadow-sm" /><span className="text-[10px] font-bold text-slate-500">교환</span></div>
                  </div>
                </div>
                {monthlyOrderData.length > 0 ? (
                  <div className="overflow-x-auto relative z-10">
                    <svg viewBox={`0 0 ${Math.max(chartW, monthlyOrderData.length * 60)} ${chartH + 30}`} className="w-full min-w-[340px] sm:min-w-[400px]" preserveAspectRatio="xMinYMid meet">
                      <defs>
                        <linearGradient id="barIndigoGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                        <linearGradient id="barRoseGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fb7185" />
                          <stop offset="100%" stopColor="#e11d48" />
                        </linearGradient>
                        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                          <feGaussianBlur stdDeviation="3" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      {/* 도트 가이드라인 */}
                      {[0, 0.25, 0.5, 0.75, 1].map(pct => {
                        const y = chartH - pct * chartH;
                        return <line key={pct} x1="40" y1={y} x2={Math.max(chartW, monthlyOrderData.length * 60)} y2={y} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="2 4" opacity="0.6" />;
                      })}
                      {[0, 0.5, 1].map(pct => {
                        const val = Math.round(maxBarVal * pct);
                        const y = chartH - pct * chartH;
                        return <text key={pct} x="35" y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="700">{val}</text>;
                      })}
                      {monthlyOrderData.map((d, i) => {
                        const barWidth = Math.max(20, Math.min(40, (Math.max(chartW, monthlyOrderData.length * 60) - 60) / monthlyOrderData.length - barPad));
                        const x = 50 + i * (barWidth + barPad);

                        // Add 15% top padding room in the visual representation so labels above bars aren't clipped
                        const visualChartH = chartH * 0.85;
                        const hRep = (d.replenishment / maxBarVal) * visualChartH;
                        const hFail = (d.fail_exchange / maxBarVal) * visualChartH;
                        const startY = chartH - hRep - hFail;

                        return (
                          <g key={d.month} className="group cursor-pointer">
                            {/* 툴팁 효과를 뒷받침할 배경 하이라이트 */}
                            <rect x={x - barPad / 2} y={0} width={barWidth + barPad} height={chartH} fill="#f8fafc" opacity="0" className="group-hover:opacity-100 transition-opacity" rx="4" />

                            {hFail > 0 && <rect x={x} y={startY} width={barWidth} height={hFail} rx="4" fill="url(#barRoseGrad)" className="transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-md" />}
                            {hRep > 0 && <rect x={x} y={chartH - hRep} width={barWidth} height={hRep} rx="4" fill="url(#barIndigoGrad)" className="transition-all duration-300 drop-shadow-sm group-hover:drop-shadow-md" />}

                            {/* 교환 수량 (hFail >= 14 이면 바 내부 중앙, 작으면 바 위) */}
                            {hFail > 0 && hFail >= 14 ? (
                              <text x={x + barWidth / 2} y={startY + (hFail / 2) + 3} textAnchor="middle" fontSize="9" fill="#ffffff" fontWeight="800" className="pointer-events-none drop-shadow-sm">{d.fail_exchange}</text>
                            ) : hFail > 0 ? (
                              <text x={x + barWidth / 2} y={startY - 6} textAnchor="middle" fontSize="9" fill="#e11d48" fontWeight="800" className="pointer-events-none">{d.fail_exchange}</text>
                            ) : null}

                            {/* 발주 수량 (hRep >= 14 이면 바 내부 상단) */}
                            {hRep > 0 && hRep >= 14 ? (
                              <text x={x + barWidth / 2} y={chartH - hRep + 14} textAnchor="middle" fontSize="9" fill="#ffffff" fontWeight="800" className="pointer-events-none drop-shadow-sm opacity-90">{d.replenishment}</text>
                            ) : hRep > 0 && hFail === 0 ? (
                              <text x={x + barWidth / 2} y={chartH - hRep - 6} textAnchor="middle" fontSize="9" fill="#4f46e5" fontWeight="800" className="pointer-events-none">{d.replenishment}</text>
                            ) : null}

                            <text x={x + barWidth / 2} y={chartH + 18} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="800" className="transition-colors group-hover:fill-indigo-600">{d.month.slice(2)}</text>
                            {/* Hover Quantity Text - Total */}
                            <text x={x + barWidth / 2} y={startY - (hFail > 0 && hFail < 14 ? 18 : 8)} textAnchor="middle" fontSize="10" fill="#1e293b" fontWeight="900" opacity="0" className="group-hover:opacity-100 transition-opacity drop-shadow-sm bg-white/50 backdrop-blur-sm px-1 rounded">{d.total}개</text>
                          </g>
                        );
                      })}
                    </svg>
                  </div>
                ) : (
                  <div className="py-16 text-center"><p className="text-sm text-slate-400 font-medium">차트 데이터 없음</p></div>
                )}
              </div>
              {/* RIGHT: 제조사 도넛 */}
              <div className="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-200 shadow-sm ring-1 ring-slate-100/50 relative overflow-hidden flex flex-col">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/50 rounded-full blur-3xl -z-10 translate-x-1/3 -translate-y-1/3 opacity-60"></div>
                <div>
                  <h3 className="text-base font-black text-slate-800 tracking-tight">제조사별 주문 비율</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5">By Manufacturer</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 mt-4 sm:mt-6 flex-1 relative z-10">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                    <svg viewBox="0 0 120 120" className="w-full h-full drop-shadow-sm">
                      <defs>
                        <filter id="donutShadow" x="-10%" y="-10%" width="120%" height="120%">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
                        </filter>
                      </defs>
                      {donutPaths.map((seg, i) => (
                        <path key={i} d={seg.path} fill={seg.color} stroke="#ffffff" strokeWidth="2.5" className="transition-all duration-300 hover:opacity-80 cursor-pointer" filter="url(#donutShadow)" />
                      ))}
                      <circle cx="60" cy="60" r="34" fill="white" className="drop-shadow-sm" />
                      <text x="60" y="56" textAnchor="middle" fontSize="18" fontWeight="900" fill="#0f172a">{orders.length}</text>
                      <text x="60" y="73" textAnchor="middle" fontSize="8" fontWeight="800" fill="#64748b" letterSpacing="0.15em">ORDERS</text>
                    </svg>
                  </div>
                  <div className="w-full flex-1 space-y-2 max-h-56 overflow-y-auto pr-1">
                    {manufacturerDonut.map(seg => (
                      <div key={seg.name} className="flex items-center justify-between group p-1.5 -mx-1.5 rounded-lg hover:bg-slate-50/80 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: seg.color }} />
                          <span className="text-[12px] sm:text-[13px] font-black text-slate-700">{displayMfr(seg.name)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] sm:text-[13px] font-bold text-slate-400 tabular-nums">{seg.percent}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* 주문 내역 테이블                          */}
        {/* ═══════════════════════════════════════ */}
        <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm ring-1 ring-slate-100/50 overflow-hidden relative">
          <div className="absolute top-0 left-1/2 w-full h-8 bg-gradient-to-r from-transparent via-indigo-50/50 to-transparent -translate-x-1/2"></div>
          <div className="px-4 sm:px-7 py-5 border-b border-slate-100/50 flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm" />
                주문 내역
              </h3>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-0.5 ml-4">Order History</p>
            </div>
            <span className="text-[10px] font-black text-slate-500 bg-slate-100/80 px-2 py-1 rounded-lg">{filteredOrders.length}건</span>
          </div>
          <div className="md:hidden px-3 pb-3 space-y-2.5 relative z-10">
            {filteredOrders.length > 0 ? filteredOrders.map((order) => {
              const item = order.items[0] || { brand: 'N/A', size: 'N/A', quantity: 0 };
              const typeBadgeClass = order.type === 'replenishment'
                ? 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-indigo-700'
                : order.type === 'return'
                  ? 'bg-gradient-to-br from-amber-50 to-white border border-amber-100 text-amber-700'
                  : 'bg-gradient-to-br from-rose-50 to-white border border-rose-100 text-rose-700';
              return (
                <article
                  key={`mobile-order-${order.id}`}
                  className="rounded-2xl border border-slate-200 bg-white px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">{order.date}</p>
                      <p className="text-sm font-black text-slate-800 truncate mt-0.5">{displayMfr(order.manufacturer)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${typeBadgeClass}`}>
                      {order.type === 'replenishment' ? '발주' : order.type === 'return' ? '반품' : '교환'}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <p className="text-xs font-black text-slate-700">{item.brand}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">{item.size}</span>
                      <span className="text-sm font-black text-slate-900 tabular-nums">{item.quantity}<span className="ml-0.5 text-[10px] text-slate-500">개</span></span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 truncate">담당자: {order.manager}</span>
                    <div className="flex items-center gap-1.5">
                      {order.status === 'cancelled' ? (
                        <span className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-400">취소됨</span>
                      ) : (
                        <button
                          onClick={() => !isReadOnly && onUpdateOrderStatus(order.id, order.status === 'ordered' ? 'received' : 'ordered')}
                          disabled={isReadOnly}
                          className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${isReadOnly
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : order.status === 'received'
                              ? 'bg-emerald-500 text-white'
                              : 'bg-white border border-slate-200 text-rose-600'
                            }`}
                        >
                          {order.type === 'return'
                            ? order.status === 'received' ? '반품완료' : '반품확인'
                            : order.status === 'received' ? '입고완료' : '입고확인'}
                        </button>
                      )}
                      {!isReadOnly && order.status === 'ordered' && (
                        <button
                          onClick={() => setCancelModalOrder(order)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-amber-100 bg-amber-50 text-amber-500"
                          title="발주 취소"
                          aria-label="발주 취소"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                        </button>
                      )}
                      {!isReadOnly && (
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          className="h-9 w-9 inline-flex items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-500"
                          title="주문 삭제"
                          aria-label="주문 삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-500">표시할 주문 내역이 없습니다.</p>
              </div>
            )}
          </div>
          <div className="hidden md:block overflow-x-auto relative z-10">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50/50 border-b border-slate-100/50 backdrop-blur-sm">
                <tr>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">주문일자<br /><span className="text-[8px] tracking-widest">DATE</span></th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">유형<br /><span className="text-[8px] tracking-widest">TYPE</span></th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">제조사<br /><span className="text-[8px] tracking-widest">MFR</span></th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">품목 내역<br /><span className="text-[8px] tracking-widest">ITEM</span></th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">수량<br /><span className="text-[8px] tracking-widest">QTY</span></th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">담당자<br /><span className="text-[8px] tracking-widest">MANAGER</span></th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">상태<br /><span className="text-[8px] tracking-widest">STATUS</span></th>
                  <th className="px-6 py-3.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">관리<br /><span className="text-[8px] tracking-widest">ACTION</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredOrders.length > 0 ? filteredOrders.map((order, idx) => {
                  const accentHoverClass = order.type === 'replenishment' ? 'hover:border-l-indigo-500' : order.type === 'return' ? 'hover:border-l-amber-500' : 'hover:border-l-rose-500';
                  const item = order.items[0] || { brand: 'N/A', size: 'N/A', quantity: 0 };
                  const isEven = idx % 2 === 1;
                  return (
                    <tr key={order.id} className={`group transition-all duration-300 border-l-[3px] border-l-transparent ${accentHoverClass} hover:bg-slate-50/80 hover:shadow-[inset_0_0_12px_rgba(99,102,241,0.08)] ${isEven ? 'bg-slate-50/30' : ''}`}>
                      <td className="px-6 py-3"><span className="text-[13px] font-bold text-slate-800">{order.date}</span></td>
                      <td className="px-6 py-3">
                        <span className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black shadow-sm flex inline-flex items-center justify-center w-[65px] ${order.type === 'replenishment' ? 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-indigo-700' : order.type === 'return' ? 'bg-gradient-to-br from-amber-50 to-white border border-amber-100 text-amber-700' : 'bg-gradient-to-br from-rose-50 to-white border border-rose-100 text-rose-700'}`}>
                          {order.type === 'replenishment' ? '발주' : order.type === 'return' ? '반품' : '교환'}
                        </span>
                      </td>
                      <td className="px-6 py-3"><span className="text-[15px] font-black text-slate-800">{displayMfr(order.manufacturer)}</span></td>
                      <td className="px-6 py-3">
                        <div className="flex bg-white/60 border border-slate-100 items-center justify-between px-3 py-1.5 rounded-xl shadow-sm w-fit group-hover:border-indigo-100 group-hover:bg-white transition-colors">
                          <span className="text-xs font-black text-slate-800 mr-4">{item.brand}</span>
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">{item.size}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-center font-black text-slate-800 text-lg tabular-nums">{item.quantity}<span className="text-[11px] ml-0.5 font-bold text-slate-400">개</span></td>
                      <td className="px-6 py-3"><span className="text-xs font-bold text-slate-600 bg-slate-100/80 px-2 py-1.5 rounded-lg">{order.manager}</span></td>
                      <td className="px-6 py-3 text-center">
                        {order.status === 'cancelled' ? (
                          <span className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-slate-100 text-slate-400">
                            취소됨
                            {order.cancelledReason && (
                              <span className="block text-[9px] text-slate-400 font-medium truncate max-w-[100px] mt-0.5">{order.cancelledReason}</span>
                            )}
                          </span>
                        ) : (
                          <button
                            onClick={() => !isReadOnly && onUpdateOrderStatus(order.id, order.status === 'ordered' ? 'received' : 'ordered')}
                            disabled={isReadOnly}
                            className={`px-4 py-1.5 rounded-xl text-[11px] font-black transition-all shadow-sm active:scale-95 ${isReadOnly ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : order.status === 'received' ? 'bg-gradient-to-br from-emerald-400 to-emerald-500 text-white hover:shadow-md hover:from-emerald-500 hover:to-emerald-600 border border-emerald-500/20' : 'bg-white border border-slate-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50'}`}
                          >
                            {order.type === 'return'
                              ? order.status === 'received' ? '반품 완료' : '반품 확인'
                              : order.status === 'received' ? '입고 완료' : '입고 확인'}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-3 text-right">
                        {!isReadOnly && (
                          <div className="flex items-center justify-end gap-1">
                            {order.status === 'ordered' && (
                              <button
                                onClick={() => setCancelModalOrder(order)}
                                className="p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 hover:shadow-sm rounded-xl transition-all"
                                title="발주 취소"
                                aria-label="발주 취소"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                              </button>
                            )}
                            <button onClick={() => onDeleteOrder(order.id)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:shadow-sm rounded-xl transition-all" title="주문 삭제" aria-label="주문 삭제">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="px-8 py-24 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-12 h-12 text-slate-200 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        <p className="text-slate-400 font-bold text-sm mt-2">표시할 주문 내역이 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 취소 모달 */}
        {cancelModalOrder && (
          <OrderCancelModal
            order={cancelModalOrder}
            isLoading={isCancelLoading}
            onClose={() => setCancelModalOrder(null)}
            onConfirm={async (orderId, reason) => {
              setIsCancelLoading(true);
              try {
                await onCancelOrder(orderId, reason);
              } finally {
                setIsCancelLoading(false);
                setCancelModalOrder(null);
              }
            }}
          />
        )}

        {showBulkOrderModal && (
          <ConfirmModal
            title="긴급 부족 품목 일괄 주문"
            message={`현재 부족 상태인 ${kpiData.lowStockQty}개 (총 ${lowStockItems.length}품목)를\n한 번에 발주 진행하시겠습니까?`}
            tip="발주가 진행된 항목들은 '진행 중인 발주'에서 확인할 수 있습니다."
            confirmLabel="일괄 주문"
            cancelLabel="취소"
            confirmColor="rose"
            icon={
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            onConfirm={() => {
              lowStockItems.forEach(entry => {
                onQuickOrder({ ...entry.item, currentStock: entry.item.recommendedStock - entry.remainingDeficit });
              });
              setShowBulkOrderModal(false);
              showAlertToast(`${lowStockItems.length}품목이 성공적으로 발주 목록에 추가되었습니다.`, 'success');
            }}
            onCancel={() => setShowBulkOrderModal(false)}
          />
        )}
      </div>}
    </div>
  );
};

export default OrderManager;
