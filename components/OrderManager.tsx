
import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, OrderType, InventoryItem, PlanType, ReturnRequest, ReturnStatus, ReturnMutationResult, ExcelRow, CreateReturnParams, RETURN_STATUS_LABELS, RETURN_REASON_LABELS } from '../types';
import { isIbsImplantManufacturer } from '../services/sizeNormalizer';
import { useCountUp } from './surgery-dashboard/shared';
import OrderCancelModal from './order/OrderCancelModal';
import ConfirmModal from './ConfirmModal';
import { ReceiptConfirmationModal, ReceiptUpdate } from './ReceiptConfirmationModal';
import OptimizeModal from './inventory/OptimizeModal';
import { OrderHistoryPanel } from './order/OrderHistoryPanel';
import ReturnRequestModal from './order/ReturnRequestModal';
import ReturnCandidateModal, { ReturnCategory } from './order/ReturnCandidateModal';
import BrandOrderModal from './order/BrandOrderModal';
import { useOrderManagerData, simpleNormalize, displayMfr, buildOrderItemKey, formatManagerCell } from '../hooks/useOrderManagerData';

interface OrderManagerProps {
  orders: Order[];
  inventory: InventoryItem[];
  surgeryMaster: Record<string, ExcelRow[]>;
  hospitalId?: string;
  currentUserName?: string;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onConfirmReceipt: (updates: ReceiptUpdate[], orderIdsToReceive: string[]) => Promise<void>;
  onDeleteOrder: (orderId: string) => void;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onQuickOrder: (item: InventoryItem) => void;
  onCreateReturn: (params: CreateReturnParams) => Promise<void>;
  onUpdateReturnStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => Promise<ReturnMutationResult>;
  onCompleteReturn: (returnId: string) => Promise<ReturnMutationResult>;
  onDeleteReturn: (returnId: string) => Promise<void>;
  returnRequests: ReturnRequest[];
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
  isReadOnly?: boolean;
  historyOnly?: boolean;
  plan?: PlanType;
  onUpgradePlan?: () => void;
}

export interface GroupedOrder {
  id: string; // "YYYY-MM-DD|Manufacturer|OrderType"
  date: string;
  manufacturer: string;
  type: Order['type'];
  orders: Order[];
  totalItems: number; // Distinct item count
  totalQuantity: number; // Sum of all item quantities
  managers: string[];
  confirmers: string[];  // 신청자와 다른 확인자만
  statuses: OrderStatus[];
  overallStatus: OrderStatus | 'mixed';
}

interface GroupedReturnRequest {
  id: string;            // "requestedDate|manufacturer"
  date: string;
  manufacturer: string;
  requests: ReturnRequest[];
  totalItems: number;
  totalQty: number;
  managers: string[];
  confirmers: string[];  // 신청자와 다른 확인자만
  overallStatus: ReturnStatus | 'mixed';
}

type UnifiedRow = { kind: 'order'; data: GroupedOrder } | { kind: 'return'; data: GroupedReturnRequest };

const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  inventory,
  surgeryMaster,
  hospitalId,
  currentUserName = '관리자',
  onUpdateOrderStatus,
  onConfirmReceipt,
  onDeleteOrder,
  onCancelOrder,
  onQuickOrder,
  onCreateReturn,
  onUpdateReturnStatus,
  onCompleteReturn,
  onDeleteReturn: _onDeleteReturn,
  returnRequests,
  showAlertToast,
  isReadOnly,
  historyOnly,
  plan,
  onUpgradePlan,
}) => {
  const [filterType, setFilterType] = useState<OrderType | 'all' | 'fail_and_return'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');

  // ── 취소 모달 state ──
  const [cancelModalOrder, setCancelModalOrder] = useState<Order[] | null>(null);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  // ── 일괄 주문 모달 state (데스크톱) ──
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);

  // ── 모바일 인라인 발주 목록 state ──
  const [unselectedLowStockKeys, setUnselectedLowStockKeys] = useState<Set<string>>(new Set());
  const [isMobileBulkOrdering, setIsMobileBulkOrdering] = useState(false);

  // ── 상세 입고 확인 모달 state ──
  const [selectedGroupModal, setSelectedGroupModal] = useState<GroupedOrder | null>(null);
  const [isReceiptConfirming, setIsReceiptConfirming] = useState(false);

  // ── 주문 히스토리 패널 state ──
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // ── 반품 신청 모달 state ──
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isCreatingReturn, setIsCreatingReturn] = useState(false);
  const [returnActionLoadingId, setReturnActionLoadingId] = useState<string | null>(null);

  // ── 발주 권장 품목 UI state ──
  const [expandedMfrs, setExpandedMfrs] = useState<Set<string>>(new Set());
  const [brandOrderModalMfr, setBrandOrderModalMfr] = useState<string | null>(null);

  // ── 반품 권장 모달 state ──
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showReturnCandidateModal, setShowReturnCandidateModal] = useState(false);
  const [returnCandidateCategory, setReturnCandidateCategory] = useState<ReturnCategory>('overstock');
  const [showBulkReturnConfirm, setShowBulkReturnConfirm] = useState(false);
  const [isBulkReturning, setIsBulkReturning] = useState(false);

  // ── 반품 신청 상세 보기 state ──
  const [returnDetailGroup, setReturnDetailGroup] = useState<GroupedReturnRequest | null>(null);

  // ── 교환 권장 품목 반품 처리 모달 state ──
  const [exchangeReturnTarget, setExchangeReturnTarget] = useState<{ manufacturer: string; count: number; groups: { brand: string; size: string; maxQty: number }[] } | null>(null);
  const [exchangeItemQuantities, setExchangeItemQuantities] = useState<Record<string, number>>({});
  const [isExchangeReturnSubmitting, setIsExchangeReturnSubmitting] = useState(false);

  // ── 반품 신청 액션 핸들러 ──
  const handleReturnCreate = async (params: CreateReturnParams) => {
    setIsCreatingReturn(true);
    try {
      await onCreateReturn(params);
      setShowReturnModal(false);
      showAlertToast('반품 신청이 등록되었습니다.', 'success');
    } catch {
      showAlertToast('반품 신청에 실패했습니다.', 'error');
    } finally {
      setIsCreatingReturn(false);
    }
  };

  const handleReturnUpdateStatus = async (returnId: string, newStatus: ReturnStatus, currentStatus: ReturnStatus) => {
    setReturnActionLoadingId(returnId);
    try {
      if (newStatus === 'completed') {
        const result = await onCompleteReturn(returnId);
        if (result.ok) showAlertToast('반품 완료 처리되었습니다.', 'success');
        else showAlertToast(result.reason === 'conflict' ? '상태가 변경되어 반영할 수 없습니다.' : '처리 중 오류가 발생했습니다.', 'error');
      } else {
        const result = await onUpdateReturnStatus(returnId, newStatus, currentStatus);
        if (result.ok) showAlertToast(`상태가 "${RETURN_STATUS_LABELS[newStatus]}"(으)로 변경되었습니다.`, 'success');
        else showAlertToast(result.reason === 'conflict' ? '상태가 변경되어 반영할 수 없습니다.' : '처리 중 오류가 발생했습니다.', 'error');
      }
    } finally {
      setReturnActionLoadingId(null);
    }
  };

  const {
    pendingQtyByItemKey,
    lowStockItems,
    returnCandidates,
    bulkReturnItems,
    deadStockItems,
    exchangeCandidates,
    kpiData,
    monthlyOrderData,
    manufacturerDonut,
    donutPaths,
    groupedLowStock,
    orderedLowStockGroups,
    manufacturerOptions,
  } = useOrderManagerData({ orders, inventory, surgeryMaster, returnRequests });

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      if (order.status !== 'ordered') return false; // 진행중만 표시 (완료/취소는 히스토리에서)
      const typeMatch = filterType === 'all'
        || (filterType === 'fail_and_return' ? (order.type === 'fail_exchange' || order.type === 'return') : order.type === filterType);
      const dateFromMatch = !filterDateFrom || order.date >= filterDateFrom;
      const dateToMatch = !filterDateTo || order.date <= filterDateTo;
      const mfrMatch = filterManufacturer === 'all' || order.manufacturer === filterManufacturer;
      return typeMatch && dateFromMatch && dateToMatch && mfrMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, filterType, filterDateFrom, filterDateTo, filterManufacturer]);

  const groupedOrders = useMemo(() => {
    const groups: Record<string, GroupedOrder> = {};
    filteredOrders.forEach(order => {
      const key = `${order.date}|${simpleNormalize(order.manufacturer)}|${order.type}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date: order.date,
          manufacturer: order.manufacturer,
          type: order.type,
          orders: [],
          totalItems: 0,
          totalQuantity: 0,
          managers: [],
          confirmers: [],
          statuses: [],
          overallStatus: 'ordered' as OrderStatus | 'mixed'
        };
      }
      const group = groups[key];
      group.orders.push(order);
      group.totalItems += order.items.length;
      group.totalQuantity += order.items.reduce((sum, i) => sum + i.quantity, 0);
      if (!group.managers.includes(order.manager)) group.managers.push(order.manager);
      if (order.confirmedBy && order.confirmedBy !== order.manager && !group.confirmers.includes(order.confirmedBy)) {
        group.confirmers.push(order.confirmedBy);
      }
      if (!group.statuses.includes(order.status)) group.statuses.push(order.status);
    });

    return Object.values(groups).map(g => {
      let overallStatus: GroupedOrder['overallStatus'] = 'mixed';
      if (g.statuses.length === 1) {
        overallStatus = g.statuses[0];
      } else if (!g.statuses.includes('ordered') && !g.statuses.includes('received')) {
        overallStatus = 'cancelled';
      } else if (!g.statuses.includes('ordered')) {
        overallStatus = 'received';
      } else if (g.statuses.includes('ordered') && g.statuses.includes('received')) {
        overallStatus = 'mixed';
      } else {
        overallStatus = 'ordered';
      }
      return { ...g, overallStatus };
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredOrders]);

  const groupedReturnRequests = useMemo<GroupedReturnRequest[]>(() => {
    const map = new Map<string, GroupedReturnRequest>();
    // 진행중만 표시 (대기중·수거중) — 완료/거절은 히스토리에서 조회
    const sourceRequests = returnRequests.filter(r =>
      r.status === 'requested' || r.status === 'picked_up'
    );
    sourceRequests.forEach(r => {
      const key = `${r.requestedDate}|${simpleNormalize(r.manufacturer)}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          date: r.requestedDate,
          manufacturer: r.manufacturer,
          requests: [],
          totalItems: 0,
          totalQty: 0,
          managers: [],
          confirmers: [],
          overallStatus: r.status,
        });
      }
      const g = map.get(key)!;
      g.requests.push(r);
      g.totalItems += r.items.length;
      g.totalQty += r.items.reduce((s, i) => s + i.quantity, 0);
      if (!g.managers.includes(r.manager)) g.managers.push(r.manager);
      if (r.confirmedBy && r.confirmedBy !== r.manager && !g.confirmers.includes(r.confirmedBy)) {
        g.confirmers.push(r.confirmedBy);
      }
    });
    for (const g of map.values()) {
      const statuses = new Set(g.requests.map(r => r.status));
      g.overallStatus = statuses.size === 1 ? g.requests[0].status : 'mixed';
    }
    return Array.from(map.values());
  }, [returnRequests]);

  const unifiedRows = useMemo<UnifiedRow[]>(() => {
    const rows: UnifiedRow[] = [
      ...groupedOrders.map(g => ({ kind: 'order' as const, data: g })),
      ...groupedReturnRequests.map(g => ({ kind: 'return' as const, data: g })),
    ];
    return rows.sort((a, b) => b.data.date.localeCompare(a.data.date));
  }, [groupedOrders, groupedReturnRequests]);

  const stats = useMemo(() => {
    const totalOrders = orders.filter(o =>
      filterType === 'all'
      || (filterType === 'fail_and_return' ? (o.type === 'fail_exchange' || o.type === 'return') : o.type === filterType)
    );
    const pendingOrders = totalOrders.filter(o => o.status === 'ordered');
    const receivedOrders = totalOrders.filter(o => o.status === 'received');
    const sumQty = (list: Order[]) => list.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const lowStockDeficit = lowStockItems.reduce((acc, entry) => acc + entry.remainingDeficit, 0);
    return {
      totalCount: totalOrders.length,
      totalQty: sumQty(totalOrders),
      pendingCount: pendingOrders.length,
      pendingQty: sumQty(pendingOrders),
      receivedCount: receivedOrders.length,
      receivedQty: sumQty(receivedOrders),
      lowStockCount: lowStockItems.length,
      lowStockQty: lowStockDeficit,
    };
  }, [orders, lowStockItems, filterType]);

  const typeCounts: Record<'all' | 'replenishment' | 'fail_exchange' | 'return', number> = useMemo(() => ({
    all: orders.length,
    replenishment: orders.filter(o => o.type === 'replenishment').length,
    fail_exchange: orders.filter(o => o.type === 'fail_exchange').length,
    return: orders.filter(o => o.type === 'return').length,
  }), [orders]);

  // Auto-expand first manufacturer on initial load
  React.useEffect(() => {
    if (expandedMfrs.size === 0 && groupedLowStock.length > 0) {
      setExpandedMfrs(new Set([groupedLowStock[0][0]]));
    }
  }, [groupedLowStock.length]);

  // ── 일괄반품 실행 ──
  const handleBulkReturn = async () => {
    setIsBulkReturning(true);
    const byMfr: Record<string, typeof bulkReturnItems[0][]> = {};
    for (const item of bulkReturnItems) {
      const mfr = item.manufacturer || '기타';
      if (!byMfr[mfr]) byMfr[mfr] = [];
      byMfr[mfr].push(item);
    }
    try {
      await Promise.all(
        Object.entries(byMfr).map(([mfr, items]) => {
          const totalQty = items.reduce((s, i) => s + i.returnQty, 0);
          return onCreateReturn({
            manufacturer: mfr,
            reason: 'excess_stock',
            manager: currentUserName || '일괄반품',
            memo: `일괄 반품 (${items.length}개 품목, 총 ${totalQty}개)`,
            items: items.map(i => ({ brand: i.brand, size: i.size, quantity: i.returnQty })),
          });
        })
      );
      showAlertToast(`일괄 반품 등록 완료: ${bulkReturnItems.length}개 품목`, 'success');
    } catch {
      showAlertToast('일괄 반품 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsBulkReturning(false);
      setShowBulkReturnConfirm(false);
    }
  };

  // ── 모바일 인라인 발주 실행 ──
  const handleMobileBulkOrder = async () => {
    const selected = lowStockItems.filter(e =>
      !unselectedLowStockKeys.has(buildOrderItemKey(e.item.manufacturer, e.item.brand, e.item.size))
    );
    if (selected.length === 0) return;
    setIsMobileBulkOrdering(true);
    try {
      await Promise.all(selected.map(entry => onQuickOrder(entry.item)));
      showAlertToast(`${selected.length}품목 발주 완료`, 'success');
      setUnselectedLowStockKeys(new Set());
    } catch {
      showAlertToast('일부 발주 처리에 실패했습니다.', 'error');
    } finally {
      setIsMobileBulkOrdering(false);
    }
  };

  const animPendingRep = useCountUp(kpiData.pendingRepCount);
  const animExcRet = useCountUp(kpiData.pendingExcRetCount);
  const animLowStock = useCountUp(kpiData.lowStockCount);
  const animTotal = useCountUp(stats.totalCount);

  const TYPE_TABS: { key: 'all' | 'replenishment' | 'fail_exchange' | 'return'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'replenishment', label: '발주' },
    { key: 'fail_exchange', label: '교환' },
    { key: 'return', label: '반품' },
  ];

  const chartW = 600;
  const chartH = 160;
  const barPad = 4;
  const maxBarVal = Math.max(...monthlyOrderData.map(d => d.total), 1);

  return (
    <div className="space-y-6 animate-in fade-in duration-500" style={{ animationDuration: '0s' }}>
      <div className="space-y-6">
        {!historyOnly && (<>
        {/* ═══════════════════════════════════════ */}
        {/* Mobile KPI Overview (non-sticky)        */}
        {/* ═══════════════════════════════════════ */}
        <div className="hidden bg-white rounded-2xl border border-slate-100 shadow-sm px-4 py-4">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">주문 현황</p>
          <div className="grid grid-cols-2 gap-2">
            <div
              className={`rounded-xl border px-3 py-3 ${lowStockItems.length > 0 ? 'border-rose-200 bg-rose-50' : 'border-rose-100 bg-rose-50/80'}`}
            >
              <div className="flex justify-between items-start">
                <p className="text-[10px] font-bold text-rose-500">긴급 부족품</p>
                {lowStockItems.length > 0 && <span className="bg-rose-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">↓ 아래 목록</span>}
              </div>
              <p className={`text-xl font-black tabular-nums mt-1 ${animLowStock > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{animLowStock}</p>
            </div>
            <div
              onClick={() => { setFilterType('replenishment'); }}
              role="button"
              tabIndex={0}
              className={`rounded-xl border px-3 py-3 transition-colors active:scale-[0.98] cursor-pointer ${animPendingRep > 0 ? 'border-rose-100 bg-rose-50/60 hover:bg-rose-100' : 'border-slate-100 bg-slate-50/80 hover:bg-slate-100'}`}
            >
              <p className="text-[10px] font-bold text-slate-500">진행 중 발주</p>
              <p className={`text-xl font-black tabular-nums mt-1 ${animPendingRep > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{animPendingRep}</p>
            </div>
            <div
              onClick={() => { setFilterType('fail_and_return'); }}
              role="button"
              tabIndex={0}
              className={`rounded-xl border px-3 py-3 transition-colors active:scale-[0.98] cursor-pointer ${animExcRet > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-amber-100 bg-amber-50/80 hover:bg-amber-100'}`}
            >
              <p className="text-[10px] font-bold text-amber-600">교환/반품 대기</p>
              <p className={`text-xl font-black tabular-nums mt-1 ${animExcRet > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{animExcRet}</p>
            </div>
            <div
              onClick={() => { setShowHistoryPanel(true); }}
              role="button"
              tabIndex={0}
              className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 cursor-pointer hover:bg-emerald-100 active:scale-[0.98] transition-colors"
            >
              <p className="text-[10px] font-bold text-emerald-600">입고 완료</p>
              <p className="text-xl font-black tabular-nums mt-1 text-emerald-700">{stats.receivedCount}</p>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════ */}
        {/* Mobile: 발주 필요 목록 (인라인 체크박스 섹션)   */}
        {/* ═══════════════════════════════════════════════ */}
        {lowStockItems.length > 0 && (
          <div className="hidden bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
            {/* 헤더 */}
            <div className="px-4 py-3 bg-rose-50/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">발주 필요 목록</span>
                <span className="bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">{lowStockItems.length}</span>
              </div>
              <button
                onClick={() => {
                  const allSelected = lowStockItems.every(e =>
                    !unselectedLowStockKeys.has(buildOrderItemKey(e.item.manufacturer, e.item.brand, e.item.size))
                  );
                  if (allSelected) {
                    setUnselectedLowStockKeys(new Set(
                      lowStockItems.map(e => buildOrderItemKey(e.item.manufacturer, e.item.brand, e.item.size))
                    ));
                  } else {
                    setUnselectedLowStockKeys(new Set());
                  }
                }}
                className="text-[10px] font-semibold text-rose-400 hover:text-rose-600 transition-colors"
              >
                {lowStockItems.every(e => !unselectedLowStockKeys.has(buildOrderItemKey(e.item.manufacturer, e.item.brand, e.item.size)))
                  ? '전체 해제' : '전체 선택'}
              </button>
            </div>

            {/* 품목 목록 */}
            <div className="divide-y divide-rose-50/80">
              {lowStockItems.map(entry => {
                const key = buildOrderItemKey(entry.item.manufacturer, entry.item.brand, entry.item.size);
                const isChecked = !unselectedLowStockKeys.has(key);
                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-rose-50/40 active:bg-rose-50/60 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {
                        const next = new Set(unselectedLowStockKeys);
                        if (isChecked) next.add(key);
                        else next.delete(key);
                        setUnselectedLowStockKeys(next);
                      }}
                      className="w-4 h-4 rounded border-rose-300 text-rose-500 accent-rose-500 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">
                        {entry.item.manufacturer}
                        <span className="text-slate-400 font-normal mx-1">/</span>
                        {entry.item.brand}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{entry.item.size}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-rose-500">−{entry.remainingDeficit}개</span>
                      {entry.pendingQty > 0 && (
                        <p className="text-[9px] text-amber-500 font-semibold">발주 중 {entry.pendingQty}개</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>

            {/* 발주하기 버튼 */}
            <div className="px-4 py-3 border-t border-rose-50 bg-white">
              {(() => {
                const selectedCount = lowStockItems.filter(e =>
                  !unselectedLowStockKeys.has(buildOrderItemKey(e.item.manufacturer, e.item.brand, e.item.size))
                ).length;
                return (
                  <button
                    onClick={handleMobileBulkOrder}
                    disabled={selectedCount === 0 || isMobileBulkOrdering || isReadOnly}
                    className="w-full py-3 bg-rose-500 hover:bg-rose-600 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-all"
                  >
                    {isMobileBulkOrdering
                      ? '발주 중...'
                      : selectedCount === 0
                        ? '품목을 선택하세요'
                        : `선택 ${selectedCount}품목 발주하기`}
                  </button>
                );
              })()}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* STICKY FILTER BAR (mobile) / FILTERS   */}
        {/* ═══════════════════════════════════════ */}
        <div
          className="hidden md:block md:sticky z-20 pt-px pb-3 -mt-px bg-slate-50/80 backdrop-blur-md transition-[padding] duration-200 lg:space-y-4"
          style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)' }}
        >
          <div className="hidden md:flex flex-col gap-4">
            {/* Tier 1: Context & Actions */}
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm hidden">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex flex-wrap items-stretch gap-2 flex-1 min-w-0">
                  <div className="min-w-[150px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 flex flex-col justify-center">
                    <h4 className="text-sm font-semibold text-slate-800">총 레코드</h4>
                    <div className="flex items-baseline gap-1 mt-1">
                      <p className="text-base font-bold text-slate-800 tabular-nums tracking-tight">{animTotal}</p>
                      <span className="text-xs font-semibold text-slate-400">건</span>
                    </div>
                  </div>

                  <div className="min-w-[190px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 flex flex-col justify-center">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">보기 필터</h4>
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
                      className="px-3 py-1.5 text-base sm:text-[11px] font-bold rounded-xl border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
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

            {/* Tier 2: KPI Metrics Strip — hidden */}
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden p-2 flex flex-col sm:flex-row divide-y sm:divide-y-0 hidden">

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
                onClick={() => { setFilterType('replenishment'); }}
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
                onClick={() => { setFilterType('fail_and_return'); }}
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
                onClick={() => { setFilterType('all'); }}
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

          {/* Mobile: compact sticky filter bar */}
          <div className="hidden px-3 pt-1.5 pb-1 space-y-2">
            {/* Type tabs */}
            <div className="flex gap-1">
              {TYPE_TABS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilterType(key)}
                  className={`flex-1 py-2 text-[10px] font-bold rounded-lg border transition-all active:scale-[0.97] ${filterType === key ? 'border-indigo-800 bg-indigo-800 text-white' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                >
                  {label}
                  <span className={`inline-block ml-1 text-[9px] px-1 py-0.5 rounded-full ${filterType === key ? 'bg-indigo-900 text-indigo-100' : 'bg-slate-100 text-slate-400'}`}>{typeCounts[key]}</span>
                </button>
              ))}
            </div>
            {/* Manufacturer row */}
            <div className="flex gap-1.5 items-center">
              {manufacturerOptions.length > 1 && (
                <select
                  value={filterManufacturer}
                  onChange={e => setFilterManufacturer(e.target.value)}
                  className="h-9 pl-2 pr-6 text-[10px] font-bold rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all shrink-0 appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '12px' }}
                >
                  <option value="all">전체</option>
                  {manufacturerOptions.map(m => (
                    <option key={m} value={m}>{displayMfr(m)}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════ */}
        {/* 발주 권장 품목 (제조사별 카드) */}
        {(groupedLowStock.length > 0 || orderedLowStockGroups.length > 0) && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                <h3 className="text-base font-black text-slate-800 tracking-tight">발주 권장 품목</h3>
                <span className="text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">{lowStockItems.length}종 · {stats.lowStockQty}개 부족</span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-1.5 ml-5">재고가 권장 수량보다 부족한 품목입니다. 제조사에 발주를 진행하세요.</p>
            </div>
            <div className="px-5 sm:px-7 pb-5 sm:pb-6">
              {/* 모바일 레이아웃 */}
              <div className="sm:hidden space-y-3">
                <button
                  onClick={() => { if (!isReadOnly) setShowBulkOrderModal(true); }}
                  disabled={isReadOnly}
                  className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-[0.98] ${isReadOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-500 text-white shadow-sm shadow-rose-200'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                  일괄주문
                </button>
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                  {groupedLowStock.map(([mfr, entries]) => {
                    const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);
                    return (
                      <button
                        key={mfr}
                        onClick={() => { if (!isReadOnly) setBrandOrderModalMfr(mfr); }}
                        disabled={isReadOnly}
                        className="flex-none flex flex-col gap-0.5 bg-rose-50 border border-rose-100 rounded-2xl px-3.5 py-2.5 min-w-[90px] text-left active:scale-[0.97] transition-transform"
                      >
                        <span className="text-[11px] font-black text-slate-700 whitespace-nowrap truncate max-w-[100px]">{displayMfr(mfr)}</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-xl font-black text-rose-600 tabular-nums leading-none">{entries.length}</span>
                          <span className="text-[10px] font-bold text-slate-400">종</span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-400">{totalDeficit}개 부족</span>
                      </button>
                    );
                  })}
                  {orderedLowStockGroups.map(([mfr, count]) => (
                    <div
                      key={`ordered-${mfr}`}
                      className="flex-none flex flex-col gap-0.5 bg-emerald-50 border border-emerald-100 rounded-2xl px-3.5 py-2.5 min-w-[90px] text-left opacity-75"
                    >
                      <span className="text-[11px] font-black text-slate-600 whitespace-nowrap truncate max-w-[100px]">{mfr}</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-xl font-black text-emerald-600 tabular-nums leading-none">{count}</span>
                        <span className="text-[10px] font-bold text-slate-400">종</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-500">발주 진행중</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* 데스크톱 레이아웃 */}
              <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => { if (isReadOnly) return; setShowBulkOrderModal(true); }}
                  disabled={isReadOnly}
                  className={`group relative rounded-2xl border-2 border-dashed p-4 transition-all text-left ${isReadOnly ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-rose-300 bg-white hover:bg-rose-50 hover:shadow-md hover:border-rose-400 cursor-pointer active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span className="text-xs font-black text-rose-600">일괄주문</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">부족 품목을 한번에 발주</p>
                </button>
                {groupedLowStock.map(([mfr, entries]) => {
                  const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);
                  return (
                    <button
                      key={mfr}
                      onClick={() => { if (!isReadOnly) setBrandOrderModalMfr(mfr); }}
                      disabled={isReadOnly}
                      className="group relative rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50/80 to-pink-50/40 p-4 transition-all hover:shadow-md hover:border-rose-400 hover:bg-rose-50 active:scale-[0.98] cursor-pointer text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                        <span className="text-xs font-black text-slate-700 truncate group-hover:text-rose-700 transition-colors">{displayMfr(mfr)}</span>
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-rose-600 tabular-nums">{entries.length}</span>
                        <span className="text-xs font-bold text-slate-400">종</span>
                      </div>
                      <p className="text-[10px] font-bold text-rose-400 mt-1">{totalDeficit}개 부족</p>
                      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-[9px] font-bold text-rose-500 bg-white border border-rose-200 px-2 py-0.5 rounded-full">발주 신청 →</span>
                      </div>
                    </button>
                  );
                })}
                {orderedLowStockGroups.map(([mfr, count]) => (
                  <div
                    key={`ordered-${mfr}`}
                    className="relative rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4 text-left opacity-75"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs font-black text-slate-700 truncate">{mfr}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-emerald-600 tabular-nums">{count}</span>
                      <span className="text-xs font-bold text-slate-400">종</span>
                    </div>
                    <p className="text-[10px] font-bold text-emerald-500 mt-1">발주 진행중</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* 교환 권장 품목 (제조사별)                    */}
        {/* ═══════════════════════════════════════ */}
        {exchangeCandidates.total > 0 && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-violet-500 animate-pulse shrink-0" />
                <h3 className="text-base font-black text-slate-800 tracking-tight">교환 권장 품목</h3>
                <span className="text-xs font-black text-violet-500 bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-lg">{exchangeCandidates.totalActual}건 미처리</span>
              </div>
              <p className="hidden sm:block text-xs text-slate-400 mt-1.5 ml-5">수술 중 교환이 발생한 품목입니다. 제조사에 반품 처리를 진행하세요.</p>
            </div>
            <div className="px-5 sm:px-7 pb-5 sm:pb-6">
              {/* 모바일 레이아웃 */}
              <div className="sm:hidden space-y-3">
                <button
                  onClick={() => { if (!isReadOnly) window.location.hash = '#/dashboard/fail'; }}
                  disabled={isReadOnly}
                  className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-[0.98] ${isReadOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white shadow-sm shadow-violet-200'}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  일괄교환
                </button>
                <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                  {exchangeCandidates.list.map(({ manufacturer, actualCount, returnPending }) => (
                    <button
                      key={manufacturer}
                      onClick={() => {
                        if (!isReadOnly && actualCount > 0) {
                          const rows = (surgeryMaster['수술기록지'] || []).filter(row => {
                            if (row['구분'] !== '수술중교환') return false;
                            const raw = String(row['제조사'] || '기타');
                            const mfr = isIbsImplantManufacturer(raw) ? 'IBS Implant' : raw;
                            return mfr === manufacturer;
                          });
                          const groupMap: Record<string, { brand: string; size: string; maxQty: number }> = {};
                          rows.forEach(row => {
                            const brand = String(row['브랜드'] || manufacturer);
                            const size = String(row['규격(SIZE)'] || row['규격'] || '기타');
                            const key = `${brand}|${size}`;
                            if (!groupMap[key]) groupMap[key] = { brand, size, maxQty: 0 };
                            groupMap[key].maxQty++;
                          });
                          const groups = Object.values(groupMap).sort((a, b) => a.brand.localeCompare(b.brand) || a.size.localeCompare(b.size));
                          const initQtys: Record<string, number> = {};
                          groups.forEach(g => { initQtys[`${g.brand}|${g.size}`] = g.maxQty; });
                          setExchangeReturnTarget({ manufacturer, count: actualCount, groups });
                          setExchangeItemQuantities(initQtys);
                        }
                      }}
                      disabled={isReadOnly || actualCount === 0}
                      className={`flex-none flex flex-col gap-0.5 rounded-2xl px-3.5 py-2.5 min-w-[90px] text-left ${
                        returnPending > 0 && actualCount === 0
                          ? 'bg-amber-50 border border-amber-100 opacity-70'
                          : actualCount > 0 && !isReadOnly
                            ? 'bg-violet-50 border border-violet-100 active:scale-[0.97]'
                            : 'bg-violet-50 border border-violet-100'
                      }`}
                    >
                      <span className="text-[11px] font-black text-slate-700 whitespace-nowrap truncate max-w-[100px]">{manufacturer}</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className={`text-xl font-black tabular-nums leading-none ${actualCount > 0 ? 'text-violet-600' : 'text-slate-400'}`}>{actualCount}</span>
                        <span className="text-[10px] font-bold text-slate-400">건</span>
                      </div>
                      {returnPending > 0
                        ? <span className="text-[10px] font-bold text-amber-500">대기중 {returnPending}건</span>
                        : <span className="text-[10px] font-bold text-violet-400">반품 가능</span>
                      }
                    </button>
                  ))}
                </div>
              </div>
              {/* 데스크톱 레이아웃 */}
              <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => { if (isReadOnly) return; window.location.hash = '#/dashboard/fail'; }}
                  disabled={isReadOnly}
                  className={`group relative rounded-2xl border-2 border-dashed p-4 transition-all text-left ${isReadOnly ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-violet-300 bg-white hover:bg-violet-50 hover:shadow-md hover:border-violet-400 cursor-pointer active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span className="text-xs font-black text-violet-600">일괄교환</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">교환 주문 일괄 등록</p>
                </button>
                {exchangeCandidates.list.map(({ manufacturer, actualCount, returnPending }) => (
                  <button
                    key={manufacturer}
                    onClick={() => {
                      if (isReadOnly || actualCount === 0) return;
                      const rows = (surgeryMaster['수술기록지'] || []).filter(row => {
                        if (row['구분'] !== '수술중교환') return false;
                        const raw = String(row['제조사'] || '기타');
                        const mfr = isIbsImplantManufacturer(raw) ? 'IBS Implant' : raw;
                        return mfr === manufacturer;
                      });
                      const groupMap: Record<string, { brand: string; size: string; maxQty: number }> = {};
                      rows.forEach(row => {
                        const brand = String(row['브랜드'] || manufacturer);
                        const size = String(row['규격(SIZE)'] || row['규격'] || '기타');
                        const key = `${brand}|${size}`;
                        if (!groupMap[key]) groupMap[key] = { brand, size, maxQty: 0 };
                        groupMap[key].maxQty++;
                      });
                      const groups = Object.values(groupMap).sort((a, b) => a.brand.localeCompare(b.brand) || a.size.localeCompare(b.size));
                      const initQtys: Record<string, number> = {};
                      groups.forEach(g => { initQtys[`${g.brand}|${g.size}`] = g.maxQty; });
                      setExchangeReturnTarget({ manufacturer, count: actualCount, groups });
                      setExchangeItemQuantities(initQtys);
                    }}
                    disabled={isReadOnly || actualCount === 0}
                    className={`group relative rounded-2xl border-2 p-4 transition-all text-left w-full ${
                      returnPending > 0 && actualCount === 0
                        ? 'border-amber-200 bg-gradient-to-br from-amber-50/60 to-orange-50/30 opacity-70 cursor-default'
                        : actualCount > 0 && !isReadOnly
                          ? 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/40 hover:shadow-md hover:border-violet-400 hover:bg-violet-100/60 active:scale-[0.98] cursor-pointer'
                          : 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-purple-50/40 cursor-default'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span className="text-xs font-black text-slate-700 truncate">{manufacturer}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                      <span className={`text-2xl font-black tabular-nums ${actualCount > 0 ? 'text-violet-600' : 'text-slate-400'}`}>{actualCount}</span>
                      <span className="text-xs font-bold text-slate-400">건</span>
                    </div>
                    {returnPending > 0
                      ? <p className="text-[10px] font-bold text-amber-500 mt-1">반품 대기중 {returnPending}건</p>
                      : <p className="text-[10px] font-bold text-violet-400 mt-1">반품 가능</p>
                    }
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* 반품 권장 품목                              */}
        {/* ═══════════════════════════════════════ */}
        {returnCandidates.total > 0 && (
          <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
              <div className="flex items-center gap-2.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <h3 className="text-base font-black text-slate-800 tracking-tight">반품 권장 품목</h3>
              </div>
              <p className="text-xs text-slate-400 mt-1.5 ml-5">장기 미사용, 미등록 사용, 과잉 재고 품목을 반품하여 재고를 최적화하세요.</p>
            </div>
            <div className="px-5 sm:px-7 pb-5 sm:pb-6">
              {/* 그룹 레이블 행 — 데스크톱 전용 */}
              <div className="hidden sm:grid grid-cols-4 gap-3 mb-2">
                <p className="text-[10px] font-bold text-indigo-600/80 tracking-widest px-0.5">과잉 재고</p>
                <p className="text-[10px] font-bold text-amber-600/80 tracking-widest col-span-3 border-l border-slate-200 pl-3">미사용 기반</p>
              </div>
              {/* 균일 4열 카드 그리드 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

                {/* 1. 권장량 초과 */}
                <button
                  onClick={() => { setReturnCandidateCategory('overstock'); setShowReturnCandidateModal(true); }}
                  className={`group relative rounded-2xl border-2 p-4 transition-all text-left hover:shadow-md cursor-pointer ${returnCandidates.overstock.length > 0
                    ? 'border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-blue-50/40'
                    : 'border-slate-100 bg-slate-50/60'
                    }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    <span className="text-xs font-black text-slate-700">권장량 초과</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-indigo-600 tabular-nums">{returnCandidates.overstock.length}</span>
                    <span className="text-xs font-bold text-slate-400">품목</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">+{returnCandidates.overstockExcess}개 초과 보유</p>
                </button>

                {/* 2. 일괄반품 액션 카드 */}
                <button
                  onClick={() => { if (isReadOnly || bulkReturnItems.length === 0) return; setShowBulkReturnConfirm(true); }}
                  disabled={isReadOnly || bulkReturnItems.length === 0}
                  className={`group relative rounded-2xl border-2 border-dashed p-4 transition-all text-left ${isReadOnly || bulkReturnItems.length === 0 ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-amber-300 bg-white hover:bg-amber-50 hover:shadow-md hover:border-amber-400 cursor-pointer active:scale-[0.98]'}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                    <span className="text-xs font-black text-amber-600">일괄반품</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-600 tabular-nums">{bulkReturnItems.length}</span>
                    <span className="text-xs font-bold text-slate-400">품목</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">2개 초과분 일괄 반품</p>
                </button>

                {/* 3. 1년 이상 미사용 */}
                <button
                  onClick={() => setShowOptimizeModal(true)}
                  className={`group relative rounded-2xl border-2 p-4 transition-all text-left hover:shadow-md cursor-pointer ${returnCandidates.olderThanYear.length > 0
                    ? 'border-amber-200 bg-gradient-to-br from-amber-50/80 to-orange-50/40'
                    : 'border-slate-100 bg-slate-50/60'
                    }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span className="text-xs font-black text-slate-700">1년 이상 미사용</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-amber-600 tabular-nums">{returnCandidates.olderThanYear.length}</span>
                    <span className="text-xs font-bold text-slate-400">품목</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{returnCandidates.olderThanYearQty}개 보유 중</p>
                </button>

                {/* 4. 한 번도 미사용 */}
                <button
                  onClick={() => setShowOptimizeModal(true)}
                  className={`group relative rounded-2xl border-2 p-4 transition-all text-left hover:shadow-md cursor-pointer ${returnCandidates.neverUsed.length > 0
                    ? 'border-rose-200 bg-gradient-to-br from-rose-50/80 to-pink-50/40'
                    : 'border-slate-100 bg-slate-50/60'
                    }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                    <span className="text-xs font-black text-slate-700">한 번도 미사용</span>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-rose-500 tabular-nums">{returnCandidates.neverUsed.length}</span>
                    <span className="text-xs font-bold text-slate-400">품목</span>
                  </div>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{returnCandidates.neverUsedQty}개 보유 중</p>
                </button>

              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* 주문 분석 차트 — hidden */}
        {false && orders.length > 0 && (
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
        </>)}

        {/* ═══════════════════════════════════════ */}
        {/* 주문 히스토리 패널                        */}
        {/* ═══════════════════════════════════════ */}
        {showHistoryPanel && (
          <OrderHistoryPanel
            orders={orders}
            returnRequests={returnRequests}
            isReadOnly={isReadOnly}
            plan={plan}
            onUpgrade={onUpgradePlan}
            onClose={() => setShowHistoryPanel(false)}
            onReceiptConfirm={(order) => {
              const group = groupedOrders.find(g =>
                g.date === order.date &&
                g.manufacturer === order.manufacturer &&
                g.type === order.type
              );
              if (group) setSelectedGroupModal(group);
            }}
          />
        )}

        {/* ═══════════════════════════════════════ */}
        {/* 주문 내역 테이블                          */}
        {/* ═══════════════════════════════════════ */}
        <div className={`bg-white rounded-[32px] border border-slate-200 shadow-sm ring-1 ring-slate-100/50 overflow-hidden relative ${!historyOnly ? 'hidden md:block' : ''}`}>
          <div className="absolute top-0 left-1/2 w-full h-8 bg-gradient-to-r from-transparent via-indigo-50/50 to-transparent -translate-x-1/2"></div>
          <div className="px-4 sm:px-7 py-5 border-b border-slate-100/50 flex items-center justify-between relative z-10">
            <div>
              <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm" />
                주문/반품 내역
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {/* 수동 반품 신청 버튼 - 추후 활성화 가능 */}
              {false && !isReadOnly && !historyOnly && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-[11px] font-black bg-indigo-600 text-white hover:bg-indigo-700 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                  반품 신청
                </button>
              )}
              <button
                onClick={() => setShowHistoryPanel(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                히스토리
              </button>
              <span className="text-[10px] font-black text-slate-500 bg-slate-100/80 px-2 py-1 rounded-lg">{unifiedRows.length}건</span>
            </div>
          </div>
          <div className="md:hidden px-3 pt-3 pb-3 space-y-2.5 relative z-10">
            {unifiedRows.length > 0 ? unifiedRows.map((row) => {
              if (row.kind === 'return') {
                const g = row.data;
                const allItems = g.requests.flatMap(r => r.items);
                const first = allItems[0];
                const isActing = g.requests.some(r => returnActionLoadingId === r.id);
                const statusBadgeClass =
                  g.overallStatus === 'requested' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
                  g.overallStatus === 'picked_up' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
                  g.overallStatus === 'completed' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
                  g.overallStatus === 'mixed' ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' :
                  'bg-slate-100 border border-slate-200 text-slate-500';
                const statusLabel = g.overallStatus === 'mixed' ? '처리중' : RETURN_STATUS_LABELS[g.overallStatus as ReturnStatus];
                return (
                  <article key={`mobile-return-${g.id}`} className="rounded-2xl border border-teal-200 bg-teal-50/40 px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-500">{g.date}</p>
                        <p className="text-sm font-black text-slate-800 truncate mt-0.5">{displayMfr(g.manufacturer)}</p>
                      </div>
                      <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-teal-50 border border-teal-100 text-teal-700 w-[56px] text-center">반품신청</span>
                    </div>
                    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-500">{g.totalItems}개 품목</span>
                        <span className="text-sm font-black text-slate-900 tabular-nums">총 {g.totalQty}<span className="ml-0.5 text-[10px] text-slate-500">개</span></span>
                      </div>
                      {first && (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[11px] text-slate-600 font-medium">{first.brand} {first.size === '기타' || first.size === '-' ? '규격정보없음' : first.size}</span>
                            <span className="text-[11px] text-slate-400">×{first.quantity}</span>
                            {allItems.length > 1 && <span className="text-[10px] text-slate-400 font-medium">외 {allItems.length - 1}종</span>}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${statusBadgeClass}`}>{statusLabel}</span>
                      {!isReadOnly && (
                        <div className="flex items-center gap-1.5">
                          {g.requests.some(r => r.status === 'requested') && (
                            <button disabled={isActing} onClick={() => g.requests.filter(r => r.status === 'requested').forEach(r => handleReturnUpdateStatus(r.id, 'picked_up', 'requested'))} className="px-3 py-2 rounded-xl text-[11px] font-black bg-blue-50 border border-blue-200 text-blue-700 active:scale-95">수거완료</button>
                          )}
                          {g.requests.some(r => r.status === 'picked_up') && (
                            <button disabled={isActing} onClick={() => g.requests.filter(r => r.status === 'picked_up').forEach(r => handleReturnUpdateStatus(r.id, 'completed', 'picked_up'))} className="px-3 py-2 rounded-xl text-[11px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 active:scale-95">반품완료</button>
                          )}
                          {g.overallStatus === 'requested' && (
                            <button disabled={isActing} onClick={() => g.requests.forEach(r => handleReturnUpdateStatus(r.id, 'rejected', 'requested'))} className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-500 active:scale-95">거절</button>
                          )}
                          {g.requests.every(r => r.status === 'completed' || r.status === 'rejected') && (
                            <button onClick={() => setReturnDetailGroup(g)} className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-600 active:scale-95">상세보기</button>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              }
              const group = row.data;
              const typeBadgeClass = group.type === 'replenishment'
                ? 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-indigo-700'
                : group.type === 'return'
                  ? 'bg-gradient-to-br from-amber-50 to-white border border-amber-100 text-amber-700'
                  : 'bg-gradient-to-br from-rose-50 to-white border border-rose-100 text-rose-700';
              return (
                <article
                  key={`mobile-group-${group.id}`}
                  className={`rounded-2xl border px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] ${
                    group.type === 'replenishment' ? 'border-indigo-100 bg-indigo-50/30' :
                    group.type === 'return' ? 'border-amber-100 bg-amber-50/30' :
                    'border-rose-100 bg-rose-50/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-500">{group.date}</p>
                      <p className="text-sm font-black text-slate-800 truncate mt-0.5">{displayMfr(group.manufacturer)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${typeBadgeClass}`}>
                      {group.type === 'replenishment' ? '발주' : group.type === 'return' ? '반품' : '수술중교환'}
                    </span>
                  </div>

                  <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-500">{group.totalItems}개 품목</span>
                      <span className="text-sm font-black text-slate-900 tabular-nums">총 {group.totalQuantity}<span className="ml-0.5 text-[10px] text-slate-500">개</span></span>
                    </div>
                    {(() => {
                      const allItems = group.orders.flatMap(o => o.items);
                      const first = allItems[0];
                      if (!first) return null;
                      return (
                        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="text-[11px] text-slate-600 font-medium">{first.brand} {first.size === '기타' || first.size === '-' ? '규격정보없음' : first.size}</span>
                            <span className="text-[11px] text-slate-400">×{first.quantity}</span>
                            {allItems.length > 1 && (
                              <span className="text-[10px] text-slate-400 font-medium">외 {allItems.length - 1}종</span>
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 truncate">담당자: {formatManagerCell(group.managers, group.confirmers)}</span>
                    <div className="flex items-center gap-1.5">
                      {group.overallStatus === 'cancelled' ? (
                        <>
                          <span className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-400">취소됨</span>
                          {!isReadOnly && (
                            <button
                              onClick={() => group.orders.forEach(o => onDeleteOrder(o.id))}
                              className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
                            >
                              삭제
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          {(group.overallStatus === 'ordered' || group.overallStatus === 'mixed') && !isReadOnly && (
                            <button
                              onClick={() => {
                                const orderedItems = group.orders.filter(o => o.status === 'ordered');
                                if (orderedItems.length > 0) setCancelModalOrder(orderedItems);
                              }}
                              className="px-3 py-2 rounded-xl text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-200 transition-all active:scale-95"
                            >
                              취소
                            </button>
                          )}
                          <button
                            onClick={() => setSelectedGroupModal(group)}
                            className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${group.overallStatus === 'received'
                              ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                              : 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                              }`}
                          >
                            {group.overallStatus === 'received' ? '상세 확인' : '입고 확인'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            }) : (
              <div className="px-4 py-10 text-center">
                <p className="text-sm font-semibold text-slate-500">표시할 내역이 없습니다.</p>
              </div>
            )}
          </div>
          <div className="hidden md:block relative z-10">
            <table className="w-full text-left border-collapse table-fixed">
              <colgroup>
                <col className="w-[10%]" />
                <col className="w-[6%]" />
                <col className="w-[11%]" />
                <col className="w-[20%]" />
                <col className="w-[6%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[18%]" />
              </colgroup>
              <thead className="bg-slate-50/50 border-b border-slate-100/50 backdrop-blur-sm">
                <tr>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">주문일자</th>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">유형</th>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">제조사</th>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">품목 내역</th>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider text-center">수량</th>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">담당자/확인자</th>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider text-center">상태</th>
                  <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {unifiedRows.length > 0 ? unifiedRows.map((row) => {
                  if (row.kind === 'return') {
                    const g = row.data;
                    const isActing = g.requests.some(req => returnActionLoadingId === req.id);
                    const allItems = g.requests.flatMap(req => req.items);
                    const first = allItems[0];
                    const statusBadgeClass =
                      g.overallStatus === 'requested' ? 'bg-yellow-50 border border-yellow-100 text-yellow-700' :
                      g.overallStatus === 'picked_up' ? 'bg-blue-50 border border-blue-100 text-blue-700' :
                      g.overallStatus === 'completed' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' :
                      g.overallStatus === 'mixed' ? 'bg-purple-50 border border-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-400';
                    const statusLabel =
                      g.overallStatus === 'mixed' ? '처리중' :
                      RETURN_STATUS_LABELS[g.overallStatus as ReturnStatus];
                    return (
                      <tr key={`return-${g.id}`} className="group transition-all duration-300 border-l-[3px] border-l-teal-400 bg-teal-50/25 hover:bg-teal-50/50">
                        <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-700">{g.date}</span></td>
                        <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap">
                          <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black inline-flex items-center justify-center w-[60px] bg-teal-50 border border-teal-100 text-teal-700">반품신청</span>
                        </td>
                        <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-xs font-black text-slate-800">{displayMfr(g.manufacturer)}</span></td>
                        <td className="px-2 lg:px-4 py-2.5">
                          {first && (
                            <div className="flex items-center gap-1 text-[11px] min-w-0">
                              <span className="font-bold text-slate-700 truncate">{first.brand}</span>
                              <span className="text-slate-500 shrink-0">{first.size === '기타' || first.size === '-' ? '규격정보없음' : first.size}</span>
                              <span className="text-slate-400 shrink-0">×{first.quantity}</span>
                              {allItems.length > 1 && <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-0.5">외 {allItems.length - 1}종</span>}
                            </div>
                          )}
                        </td>
                        <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap font-black text-slate-800 text-sm tabular-nums">{g.totalQty}<span className="text-[10px] ml-0.5 font-bold text-slate-400">개</span></td>
                        <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded-md">{formatManagerCell(g.managers, g.confirmers)}</span></td>
                        <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black inline-block ${statusBadgeClass}`}>{statusLabel}</span>
                        </td>
                        <td className="px-2 lg:px-4 py-2.5 text-right whitespace-nowrap">
                          {!isReadOnly && (
                            <div className="flex items-center justify-end gap-1">
                              {/* 수거완료: requested 상태인 요청이 있을 때 */}
                              {g.requests.some(req => req.status === 'requested') && (
                                <button disabled={isActing} onClick={() => g.requests.filter(req => req.status === 'requested').forEach(req => handleReturnUpdateStatus(req.id, 'picked_up', 'requested'))} className="px-2 py-1 rounded-lg text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all active:scale-95">수거완료</button>
                              )}
                              {/* 반품완료: picked_up 상태인 요청이 있을 때 */}
                              {g.requests.some(req => req.status === 'picked_up') && (
                                <button disabled={isActing} onClick={() => g.requests.filter(req => req.status === 'picked_up').forEach(req => handleReturnUpdateStatus(req.id, 'completed', 'picked_up'))} className="px-2 py-1 rounded-lg text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95">반품완료</button>
                              )}
                              {/* 거절: 전체가 requested일 때만 */}
                              {g.overallStatus === 'requested' && (
                                <button disabled={isActing} onClick={() => g.requests.forEach(req => handleReturnUpdateStatus(req.id, 'rejected', 'requested'))} className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">거절</button>
                              )}
                              {/* 상세보기: 전체가 완료/거절일 때 */}
                              {g.requests.every(req => req.status === 'completed' || req.status === 'rejected') && (
                                <button onClick={() => setReturnDetailGroup(g)} className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">상세보기</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  }
                  const group = row.data;
                  const rowBgClass = group.type === 'replenishment'
                    ? 'border-l-indigo-300 bg-indigo-50/15 hover:bg-indigo-50/40'
                    : group.type === 'return'
                      ? 'border-l-amber-300 bg-amber-50/20 hover:bg-amber-50/40'
                      : 'border-l-rose-300 bg-rose-50/20 hover:bg-rose-50/40';
                  return (
                    <tr key={group.id} className={`group transition-all duration-300 border-l-[3px] ${rowBgClass}`}>
                      <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-700">{group.date}</span></td>
                      <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black inline-flex items-center justify-center w-[60px] ${group.type === 'replenishment' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : group.type === 'return' ? 'bg-amber-50 border border-amber-100 text-amber-700' : 'bg-rose-50 border border-rose-100 text-rose-700'}`}>
                          {group.type === 'replenishment' ? '발주' : group.type === 'return' ? '반품' : '수술중교환'}
                        </span>
                      </td>
                      <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-xs font-black text-slate-800">{displayMfr(group.manufacturer)}</span></td>
                      <td className="px-2 lg:px-4 py-2.5">
                        {(() => {
                          const allItems = group.orders.flatMap(o => o.items);
                          const first = allItems[0];
                          if (!first) return null;
                          return (
                            <div className="flex items-center gap-1 text-[11px] min-w-0">
                              <span className="font-bold text-slate-700 truncate">{first.brand}</span>
                              <span className="text-slate-500 shrink-0">{first.size}</span>
                              <span className="text-slate-400 shrink-0">×{first.quantity}</span>
                              {allItems.length > 1 && (
                                <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-0.5">외 {allItems.length - 1}종</span>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap font-black text-slate-800 text-sm tabular-nums">{group.totalQuantity}<span className="text-[10px] ml-0.5 font-bold text-slate-400">개</span></td>
                      <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded-md">{formatManagerCell(group.managers, group.confirmers)}</span></td>
                      <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap">
                        {group.overallStatus === 'cancelled' ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-400 inline-block">취소됨</span>
                        ) : group.overallStatus === 'received' ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 inline-block">완료</span>
                        ) : group.overallStatus === 'ordered' ? (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-50 border border-rose-100 text-rose-600 inline-block">대기중</span>
                        ) : (
                          <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-50 border border-indigo-100 text-indigo-600 inline-block">부분완료</span>
                        )}
                      </td>
                      <td className="px-2 lg:px-4 py-2.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {(group.overallStatus === 'ordered' || group.overallStatus === 'mixed') && !isReadOnly && (
                            <button
                              onClick={() => {
                                const orderedItems = group.orders.filter(o => o.status === 'ordered');
                                if (orderedItems.length > 0) setCancelModalOrder(orderedItems);
                              }}
                              className="px-2 py-1 rounded-lg text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all active:scale-95"
                            >
                              취소
                            </button>
                          )}
                          {group.overallStatus === 'cancelled' && !isReadOnly && (
                            <button
                              onClick={() => group.orders.forEach(o => onDeleteOrder(o.id))}
                              className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                            >
                              삭제
                            </button>
                          )}
                          {group.overallStatus !== 'cancelled' && (
                            <button
                              onClick={() => setSelectedGroupModal(group)}
                              className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 border ${group.overallStatus === 'ordered' || group.overallStatus === 'mixed'
                                ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                                }`}
                            >
                              상세 보기
                            </button>
                          )}
                        </div>
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

        {/* 반품 신청 모달 */}
        {showReturnModal && (
          <ReturnRequestModal
            inventory={inventory}
            currentUserName={currentUserName}
            isLoading={isCreatingReturn}
            onClose={() => setShowReturnModal(false)}
            onConfirm={handleReturnCreate}
          />
        )}

        {/* 반품 신청 상세 보기 모달 */}
        {returnDetailGroup && (() => {
          const g = returnDetailGroup;
          const allItems = g.requests.flatMap(r => r.items);
          const reason = g.requests[0]?.reason;
          const memo = g.requests[0]?.memo;
          return (
            <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0" onClick={() => setReturnDetailGroup(null)}>
              <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-teal-50 border border-teal-100 text-teal-700">반품신청</span>
                      <h3 className="text-base font-black text-slate-900">{displayMfr(g.manufacturer)}</h3>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{g.date} · {reason ? RETURN_REASON_LABELS[reason] : ''}</p>
                  </div>
                  <button onClick={() => setReturnDetailGroup(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500 w-16 shrink-0">담당자/확인자</span>
                    <span className="font-bold">{formatManagerCell(g.managers, g.confirmers)}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-600">
                    <span className="font-semibold text-slate-500 w-16 shrink-0">상태</span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
                      g.overallStatus === 'completed' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>{g.overallStatus === 'mixed' ? '처리중' : RETURN_STATUS_LABELS[g.overallStatus as ReturnStatus]}</span>
                  </div>
                  {memo && (
                    <div className="flex items-start gap-3 text-xs text-slate-600">
                      <span className="font-semibold text-slate-500 w-16 shrink-0">메모</span>
                      <span>{memo}</span>
                    </div>
                  )}
                  <div className="mt-2 rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500">브랜드</th>
                          <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500">규격</th>
                          <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500">수량</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {allItems.map((item, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-semibold text-slate-700">{item.brand}</td>
                            <td className="px-3 py-2 text-slate-500">{(!item.size || item.size === '기타') ? '-' : item.size}</td>
                            <td className="px-3 py-2 text-right font-black text-slate-800 tabular-nums">{item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
                  <span className="text-xs text-slate-500">총 <span className="font-black text-slate-700">{g.totalQty}개</span> · {allItems.length}종</span>
                  <button onClick={() => setReturnDetailGroup(null)} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 transition-colors">닫기</button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 취소 모달 */}
        {cancelModalOrder && (
          <OrderCancelModal
            orders={cancelModalOrder}
            isLoading={isCancelLoading}
            onClose={() => setCancelModalOrder(null)}
            onConfirm={async (reason) => {
              setIsCancelLoading(true);
              try {
                for (const o of cancelModalOrder) {
                  await onCancelOrder(o.id, reason);
                }
              } finally {
                setIsCancelLoading(false);
                setCancelModalOrder(null);
                setSelectedGroupModal(null);
              }
            }}
          />
        )}

        {(() => {
          const activeModalGroup = selectedGroupModal ? (
            groupedOrders.find(g =>
              g.date === selectedGroupModal.date &&
              g.manufacturer === selectedGroupModal.manufacturer &&
              g.type === selectedGroupModal.type
            ) || null
          ) : null;

          // 그룹 내 모든 주문이 삭제되면 모달 자동 닫힘
          if (selectedGroupModal && !activeModalGroup) {
            setTimeout(() => setSelectedGroupModal(null), 0);
            return null;
          }

          return activeModalGroup && (
            <ReceiptConfirmationModal
              groupedOrder={activeModalGroup}
              inventory={inventory}
              onClose={() => setSelectedGroupModal(null)}
              onConfirmReceipt={async (updates, orderIds) => {
                setIsReceiptConfirming(true);
                try {
                  await onConfirmReceipt(updates, orderIds);
                  setSelectedGroupModal(null);
                } finally {
                  setIsReceiptConfirming(false);
                }
              }}
              onUpdateOrderStatus={onUpdateOrderStatus}
              onDeleteOrder={onDeleteOrder}
              isLoading={isReceiptConfirming}
            />
          );
        })()}

        {/* 브랜드별 발주 신청 모달 */}
        {brandOrderModalMfr !== null && (() => {
          const brandEntries = groupedLowStock.find(([m]) => m === brandOrderModalMfr)?.[1] ?? [];
          return (
            <BrandOrderModal
              mfr={brandOrderModalMfr}
              entries={brandEntries}
              onOrder={onQuickOrder}
              onClose={() => setBrandOrderModalMfr(null)}
              isReadOnly={isReadOnly}
              showAlertToast={showAlertToast}
            />
          );
        })()}

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
              setShowBulkOrderModal(false);
              void Promise.all(
                lowStockItems.map(entry =>
                  onQuickOrder({ ...entry.item, currentStock: entry.item.recommendedStock - entry.remainingDeficit })
                )
              ).then(() => {
                showAlertToast(`${lowStockItems.length}품목이 성공적으로 발주 목록에 추가되었습니다.`, 'success');
              }).catch(() => {
                showAlertToast('일부 발주 처리에 실패했습니다. 다시 시도해주세요.', 'error');
              });
            }}
            onCancel={() => setShowBulkOrderModal(false)}
          />
        )}

        {/* 일괄반품 확인 모달 */}
        {showBulkReturnConfirm && (
          <ConfirmModal
            title="일괄 반품 등록"
            message={`${bulkReturnItems.length}개 품목의 2개 초과 재고(총 ${bulkReturnItems.reduce((s, i) => s + i.returnQty, 0)}개)를 반품 주문으로 등록합니다.`}
            tip="각 품목별로 2개를 남기고 초과분만 반품 처리됩니다."
            confirmLabel={isBulkReturning ? '처리 중...' : '일괄 반품 등록'}
            confirmColor="amber"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>}
            onConfirm={handleBulkReturn}
            onCancel={() => setShowBulkReturnConfirm(false)}
          />
        )}

        {/* 권장량 초과 목록 모달 */}
        {showReturnCandidateModal && (
          <ReturnCandidateModal
            initialCategory={returnCandidateCategory}
            inventory={inventory}
            returnRequests={returnRequests}
            snoozedIds={{}}
            onClose={() => setShowReturnCandidateModal(false)}
            onCreateReturn={onCreateReturn}
            onSnooze={() => {}}
            managerName={currentUserName}
            showAlertToast={showAlertToast}
          />
        )}

        {/* 반품 권장 상세 모달 */}
        {showOptimizeModal && (
          <OptimizeModal
            deadStockItems={deadStockItems}
            onCreateReturn={onCreateReturn}
            managerName={currentUserName}
            hospitalId={hospitalId}
            onClose={() => setShowOptimizeModal(false)}
          />
        )}

        {/* 교환 권장 품목 반품 처리 모달 */}
        {exchangeReturnTarget && (() => {
          const { manufacturer, count, groups } = exchangeReturnTarget;
          const totalQty = groups.reduce((s, g) => s + (exchangeItemQuantities[`${g.brand}|${g.size}`] ?? g.maxQty), 0);
          const adjustQty = (key: string, delta: number, maxQty: number) => {
            setExchangeItemQuantities(prev => {
              const cur = prev[key] ?? maxQty;
              return { ...prev, [key]: Math.min(maxQty, Math.max(0, cur + delta)) };
            });
          };
          return (
            <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 pb-[68px] sm:pb-0" onClick={() => !isExchangeReturnSubmitting && setExchangeReturnTarget(null)}>
              <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl flex flex-col h-[calc(100dvh-68px)] sm:h-auto sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-100 shrink-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        <h2 className="text-base font-black text-slate-900">{displayMfr(manufacturer)} 교환 반품 처리</h2>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 ml-6">{count}건 · 수량을 조정 후 반품 처리하세요</p>
                    </div>
                    <button onClick={() => setExchangeReturnTarget(null)} disabled={isExchangeReturnSubmitting} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 whitespace-nowrap">브랜드</th>
                        <th className="px-2 py-2.5 text-left text-[11px] font-bold text-slate-500 whitespace-nowrap">규격</th>
                        <th className="px-2 py-2.5 text-right text-[11px] font-bold text-slate-500 whitespace-nowrap">최대</th>
                        <th className="px-2 py-2.5 text-center text-[11px] font-bold text-violet-500 whitespace-nowrap">수량</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {groups.map(g => {
                        const key = `${g.brand}|${g.size}`;
                        const qty = exchangeItemQuantities[key] ?? g.maxQty;
                        return (
                          <tr key={key} className={`transition-colors ${qty === 0 ? 'opacity-40' : 'hover:bg-slate-50/60'}`}>
                            <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{g.brand}</td>
                            <td className="px-2 py-3 text-slate-500 whitespace-nowrap">{(!g.size || g.size === '기타') ? '-' : g.size}</td>
                            <td className="px-2 py-3 text-right text-slate-400 tabular-nums whitespace-nowrap">{g.maxQty}</td>
                            <td className="px-2 py-3">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => adjustQty(key, -1, g.maxQty)}
                                  disabled={qty <= 0}
                                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
                                >
                                  <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                                </button>
                                <span className="w-6 text-center font-black text-slate-800 tabular-nums text-sm">{qty}</span>
                                <button
                                  onClick={() => adjustQty(key, +1, g.maxQty)}
                                  disabled={qty >= g.maxQty}
                                  className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
                                >
                                  <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Footer */}
                <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
                  <p className="text-xs text-slate-500">
                    {totalQty > 0
                      ? <><span className="font-black text-violet-600">{totalQty}개</span> 반품 처리</>
                      : '수량을 1 이상으로 설정하세요'
                    }
                  </p>
                  <button
                    onClick={async () => {
                      if (!onCreateReturn || totalQty === 0) return;
                      setIsExchangeReturnSubmitting(true);
                      try {
                        const items = groups
                          .map(g => ({ brand: g.brand, size: g.size, quantity: exchangeItemQuantities[`${g.brand}|${g.size}`] ?? g.maxQty }))
                          .filter(it => it.quantity > 0);
                        await onCreateReturn({
                          manufacturer,
                          reason: 'exchange',
                          manager: currentUserName,
                          memo: `교환 반품 ${totalQty}개`,
                          items,
                        });
                        setExchangeReturnTarget(null);
                        showAlertToast('반품 처리 완료. 전자장부에서 주문금액 변동을 확인하세요.', 'success');
                      } catch {
                        showAlertToast('반품 처리에 실패했습니다.', 'error');
                      } finally {
                        setIsExchangeReturnSubmitting(false);
                      }
                    }}
                    disabled={isExchangeReturnSubmitting || totalQty === 0}
                    className="h-10 px-5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    {isExchangeReturnSubmitting ? '처리 중...' : '반품 처리 완료'}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

    </div>
  );
};

export default OrderManager;
