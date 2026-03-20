
import React, { useState } from 'react';
import { Order, OrderStatus, InventoryItem, PlanType, ReturnRequest, ReturnStatus, ReturnMutationResult, ExcelRow, CreateReturnParams } from '../../types';
import type { LowStockEntry } from '../../hooks/useOrderManagerData';
import { buildOrderItemKey } from '../../hooks/useOrderManagerData';
import { ReceiptConfirmationModal, ReceiptUpdate } from '../ReceiptConfirmationModal';
import FeatureGate from '../FeatureGate';
import OrderCancelModal from './OrderCancelModal';
import ConfirmModal from '../ConfirmModal';
import { OrderHistoryPanel } from './OrderHistoryPanel';
import BrandOrderModal from './BrandOrderModal';
import ReturnRequestModal from './ReturnRequestModal';
import ReturnCandidateModal from './ReturnCandidateModal';
import { OrderMobileFilterBar } from './OrderMobileFilterBar';
import { OrderTableSection } from './OrderTableSection';
import { OrderReturnDetailModal } from './OrderReturnDetailModal';
import { OrderExchangeReturnModal } from './OrderExchangeReturnModal';
import { ReturnCompleteModal } from './ReturnCompleteModal';
import { OrderLowStockSection } from './OrderLowStockSection';
import { OrderExchangeSection } from './OrderExchangeSection';
import { OrderReturnSection } from './OrderReturnSection';
import OptimizeModal from '../inventory/OptimizeModal';
import ModalShell from '../shared/ModalShell';
import { GroupedOrder, GroupedReturnRequest, ExchangeReturnTarget, UnifiedRow } from '../../hooks/useOrderManager';
import { buildReturnItems } from '../../hooks/useFailManager';
import type { ReturnCategory } from './ReturnCandidateModal';

interface OrderMobileLayoutProps {
  // Data
  orders: Order[];
  inventory: InventoryItem[];
  returnRequests: ReturnRequest[];
  hospitalId?: string;
  currentUserName: string;
  plan?: PlanType;
  isReadOnly?: boolean;
  historyOnly?: boolean;
  // Computed data
  lowStockItems: LowStockEntry[];
  returnCandidates: {
    olderThanYear: import('../../types').InventoryItem[];
    neverUsed: import('../../types').InventoryItem[];
    overstock: import('../../types').InventoryItem[];
    olderThanYearQty: number;
    neverUsedQty: number;
    overstockExcess: number;
    total: number;
  };
  bulkReturnItems: (import('../../types').InventoryItem & { returnQty: number })[];
  deadStockItems: (import('../../types').InventoryItem & { neverUsed: boolean; olderThanYear: boolean; lastUsedDate: string | null })[];
  exchangeCandidates: {
    list: { manufacturer: string; count: number; returnPending: number; actualCount: number }[];
    total: number;
    totalActual: number;
  };
  groupedLowStock: [string, LowStockEntry[]][];
  orderedLowStockGroups: any[];
  manufacturerOptions: string[];
  groupedOrders: GroupedOrder[];
  unifiedRows: UnifiedRow[];
  stats: { lowStockQty: number; receivedCount: number };
  kpiData: { pendingRepCount: number; pendingRepQty: number; pendingExcRetCount: number; lowStockQty: number };
  animPendingRep: number;
  animExcRet: number;
  animLowStock: number;
  // Filter state
  filterType: Order['type'] | 'all' | 'fail_and_return';
  setFilterType: (t: Order['type'] | 'all' | 'fail_and_return') => void;
  filterDateFrom: string;
  setFilterDateFrom: (d: string) => void;
  filterDateTo: string;
  setFilterDateTo: (d: string) => void;
  filterManufacturer: string;
  setFilterManufacturer: (m: string) => void;
  // Modal state (individual — from useOrderManager)
  cancelModalOrder: Order[] | null;
  setCancelModalOrder: (orders: Order[] | null) => void;
  isCancelLoading: boolean;
  setIsCancelLoading: (v: boolean) => void;
  selectedGroupModal: GroupedOrder | null;
  setSelectedGroupModal: (g: GroupedOrder | null) => void;
  isReceiptConfirming: boolean;
  setIsReceiptConfirming: (v: boolean) => void;
  showHistoryPanel: boolean;
  setShowHistoryPanel: (v: boolean) => void;
  showReturnModal: boolean;
  setShowReturnModal: (v: boolean) => void;
  isCreatingReturn: boolean;
  brandOrderModalMfr: string | null;
  setBrandOrderModalMfr: (mfr: string | null) => void;
  showOptimizeModal: boolean;
  setShowOptimizeModal: (v: boolean) => void;
  showReturnCandidateModal: boolean;
  setShowReturnCandidateModal: (v: boolean) => void;
  returnCandidateCategory: ReturnCategory;
  setReturnCandidateCategory: (c: ReturnCategory) => void;
  showBulkReturnConfirm: boolean;
  setShowBulkReturnConfirm: (v: boolean) => void;
  isBulkReturning: boolean;
  exchangeReturnTarget: ExchangeReturnTarget | null;
  setExchangeReturnTarget: (t: ExchangeReturnTarget | null) => void;
  exchangeItemQuantities: Record<string, number>;
  isExchangeReturnSubmitting: boolean;
  exchangeTotalQty: number;
  returnActionLoadingId: string | null;
  unselectedLowStockKeys: Set<string>;
  setUnselectedLowStockKeys: (keys: Set<string>) => void;
  isMobileBulkOrdering: boolean;
  showBulkOrderModal: boolean;
  setShowBulkOrderModal: (v: boolean) => void;
  // useOrderManagerModals dispatch for return modals
  returnCompleteGroup: GroupedReturnRequest | null;
  setReturnCompleteGroup: (g: GroupedReturnRequest | null) => void;
  isReturnCompleting: boolean;
  setIsReturnCompleting: (v: boolean) => void;
  returnDetailGroup: GroupedReturnRequest | null;
  setReturnDetailGroup: (g: GroupedReturnRequest | null) => void;
  // Handlers
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onConfirmReceipt: (updates: ReceiptUpdate[], orderIdsToReceive: string[], silent?: boolean) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onQuickOrder: (item: InventoryItem, quantity?: number) => Promise<void>;
  onCreateReturn: (params: CreateReturnParams) => Promise<void>;
  onUpgradePlan?: () => void;
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
  handleReturnCreate: (params: CreateReturnParams) => Promise<void>;
  handleReturnUpdateStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => void;
  handleReturnCompleteWithQties: (returnId: string, actualQties: Record<string, number>) => Promise<ReturnMutationResult>;
  handleBulkReturn: () => Promise<void>;
  handleMobileBulkOrder: () => Promise<void>;
  handleExchangeCandidateClick: (manufacturer: string, actualCount: number) => void;
  adjustExchangeQty: (key: string, delta: number, maxQty: number) => void;
}

const TYPE_TABS: { key: 'all' | 'replenishment' | 'fail_exchange' | 'return'; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'replenishment', label: '발주' },
  { key: 'fail_exchange', label: '교환' },
  { key: 'return', label: '반품' },
];

export function OrderMobileLayout({
  orders,
  inventory,
  returnRequests,
  hospitalId,
  currentUserName,
  plan,
  isReadOnly,
  historyOnly,
  lowStockItems,
  returnCandidates,
  bulkReturnItems,
  deadStockItems,
  exchangeCandidates,
  groupedLowStock,
  orderedLowStockGroups,
  manufacturerOptions,
  groupedOrders,
  unifiedRows,
  stats,
  kpiData,
  animLowStock: _animLowStock,
  animPendingRep: _animPendingRep,
  animExcRet: _animExcRet,
  filterType,
  setFilterType,
  filterDateFrom,
  setFilterDateFrom,
  filterDateTo,
  setFilterDateTo,
  filterManufacturer,
  setFilterManufacturer,
  cancelModalOrder,
  setCancelModalOrder,
  isCancelLoading,
  setIsCancelLoading,
  selectedGroupModal,
  setSelectedGroupModal,
  isReceiptConfirming,
  setIsReceiptConfirming,
  showHistoryPanel,
  setShowHistoryPanel,
  showReturnModal,
  setShowReturnModal,
  isCreatingReturn,
  brandOrderModalMfr,
  setBrandOrderModalMfr,
  showOptimizeModal,
  setShowOptimizeModal,
  showReturnCandidateModal,
  setShowReturnCandidateModal,
  returnCandidateCategory,
  setReturnCandidateCategory,
  showBulkReturnConfirm,
  setShowBulkReturnConfirm,
  isBulkReturning,
  exchangeReturnTarget,
  setExchangeReturnTarget,
  exchangeItemQuantities,
  isExchangeReturnSubmitting,
  exchangeTotalQty,
  returnActionLoadingId,
  unselectedLowStockKeys,
  setUnselectedLowStockKeys,
  isMobileBulkOrdering,
  showBulkOrderModal,
  setShowBulkOrderModal,
  returnCompleteGroup,
  setReturnCompleteGroup,
  isReturnCompleting,
  setIsReturnCompleting,
  returnDetailGroup,
  setReturnDetailGroup,
  onCancelOrder,
  onConfirmReceipt,
  onUpdateOrderStatus,
  onDeleteOrder,
  onQuickOrder,
  onCreateReturn,
  onUpgradePlan,
  showAlertToast,
  handleReturnCreate,
  handleReturnUpdateStatus,
  handleReturnCompleteWithQties,
  handleBulkReturn,
  handleMobileBulkOrder,
  handleExchangeCandidateClick,
  adjustExchangeQty,
}: OrderMobileLayoutProps) {
  type OrderCartEntry = { mfr: string; items: Array<{ item: InventoryItem; qty: number }> };
  type ReturnCartEntry = { manufacturer: string; exchangeQty: number; failQty: number };

  const [orderCart, setOrderCart] = useState<OrderCartEntry[]>([]);
  const [returnCart, setReturnCart] = useState<ReturnCartEntry[]>([]);
  const [isRegisteringCart, setIsRegisteringCart] = useState(false);
  const [isRegisteringReturnCart, setIsRegisteringReturnCart] = useState(false);
  const [expandedCartMfr, setExpandedCartMfr] = useState<string | null>(null);

  const handleAddToOrderCart = (mfr: string, items: Array<{ item: InventoryItem; qty: number }>) => {
    setOrderCart(prev => {
      const next = prev.filter(e => e.mfr !== mfr);
      return [...next, { mfr, items }];
    });
  };

  const handleAddToReturnCart = (manufacturer: string, exchangeQty: number, failQty: number) => {
    setReturnCart(prev => {
      const next = prev.filter(e => e.manufacturer !== manufacturer);
      return [...next, { manufacturer, exchangeQty, failQty }];
    });
  };

  const handleRegisterOrderCart = async () => {
    setIsRegisteringCart(true);
    let failed = 0;
    for (const entry of orderCart) {
      for (const { item, qty } of entry.items) {
        try { await onQuickOrder(item, qty); } catch { failed++; }
      }
    }
    setIsRegisteringCart(false);
    if (failed === 0) {
      showAlertToast('장바구니 품목이 발주 목록에 등록되었습니다.', 'success');
      setOrderCart([]);
    } else {
      showAlertToast(`일부 발주 처리에 실패했습니다 (${failed}건).`, 'error');
    }
  };

  const handleRegisterReturnCart = async () => {
    setIsRegisteringReturnCart(true);
    let failed = 0;
    for (const entry of returnCart) {
      try {
        // 제조사별 교환+FAIL을 하나의 반품 신청으로 통합
        const exchangeMfr = `수술중교환_${entry.manufacturer}`;
        const exchangeItems = entry.exchangeQty > 0
          ? buildReturnItems(inventory, exchangeMfr, entry.exchangeQty)
          : [];
        const failItem = entry.failQty > 0
          ? [{ brand: 'z수술후FAIL', size: '', quantity: entry.failQty }]
          : [];
        const items = [...exchangeItems, ...failItem];

        if (items.length === 0) continue;

        // reason: 교환이 있으면 'exchange' (수술중교환_ 버킷 차감 트리거)
        // FAIL만 있으면 'defective' (차감 없음)
        const reason = entry.exchangeQty > 0 ? 'exchange' : 'defective';
        const memoParts: string[] = [];
        if (entry.exchangeQty > 0) memoParts.push(`수술중교환 ${entry.exchangeQty}건`);
        if (entry.failQty > 0) memoParts.push(`수술후FAIL ${entry.failQty}건`);

        await onCreateReturn({
          manufacturer: entry.manufacturer, // 실제 제조사명 — handleCreateReturn이 prefix 추가
          reason,
          manager: currentUserName,
          memo: memoParts.join(', '),
          items,
        });
      } catch { failed++; }
    }
    setIsRegisteringReturnCart(false);
    if (failed === 0) {
      showAlertToast('반품 신청이 등록되었습니다.', 'success');
      setReturnCart([]);
    } else {
      showAlertToast(`일부 반품 신청에 실패했습니다 (${failed}건).`, 'error');
    }
  };

  const buildCartText = () => {
    const allMfrs = [...new Set([...orderCart.map(e => e.mfr), ...returnCart.map(e => e.manufacturer)])];
    return allMfrs.map(mfr => {
      const lines: string[] = [];
      const orderEntry = orderCart.find(e => e.mfr === mfr);
      const returnEntry = returnCart.find(e => e.manufacturer === mfr);
      if (orderEntry) lines.push(`발주: ${orderEntry.items.map(i => `${i.item.brand} ${i.item.size} ${i.qty}개`).join(', ')}`);
      if (returnEntry) lines.push(`반품: ${returnEntry.exchangeQty + returnEntry.failQty}건`);
      return `[${mfr}]\n${lines.join('\n')}`;
    }).join('\n\n');
  };

  const handleShareKakao = async () => {
    const text = buildCartText();
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); showAlertToast('클립보드에 복사되었습니다.', 'success'); } catch { /* ignore */ }
    }
  };

  const handleRegisterAll = async () => {
    if (orderCart.length > 0) await handleRegisterOrderCart();
    if (returnCart.length > 0) await handleRegisterReturnCart();
    // 등록 완료 후 카카오 공유로 자연스럽게 이어짐
    const text = buildCartText();
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* cancelled */ }
    } else {
      try { await navigator.clipboard.writeText(text); showAlertToast('클립보드에 복사되었습니다.', 'success'); } catch { /* ignore */ }
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 [animation-duration:0s]">
      <div className="space-y-6">
        {!historyOnly && (<>

        {/* 발주 필요 목록 (인라인 체크박스 섹션) — hidden on mobile currently */}
        {lowStockItems.length > 0 && (
          <div className="hidden bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
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

        <OrderLowStockSection
          groupedLowStock={groupedLowStock}
          orderedLowStockGroups={orderedLowStockGroups}
          lowStockCount={lowStockItems.length}
          lowStockQty={stats.lowStockQty}
          isReadOnly={isReadOnly}
          setBrandOrderModalMfr={setBrandOrderModalMfr}
        />

        <OrderExchangeSection
          exchangeCandidates={exchangeCandidates}
          isReadOnly={isReadOnly}
          handleExchangeCandidateClick={handleExchangeCandidateClick}
        />

        {/* 통합 장바구니 */}
        {(() => {
          const allMfrs = [...new Set([
            ...orderCart.map(e => e.mfr),
            ...returnCart.map(e => e.manufacturer),
          ])];
          const isRegistering = isRegisteringCart || isRegisteringReturnCart;
          return (
            <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
              {/* Header */}
              <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <h3 className="text-base font-black text-slate-800 tracking-tight">장바구니</h3>
                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg">{allMfrs.length}개 제조사</span>
                  </div>
                  <button
                    onClick={() => { setOrderCart([]); setReturnCart([]); setExpandedCartMfr(null); }}
                    className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    비우기
                  </button>
                </div>
                <p className="hidden sm:block text-xs text-slate-400 mt-1.5 ml-6">등록 버튼을 누르면 발주·반품 신청이 완료됩니다.</p>
              </div>

              {/* Manufacturer cards */}
              <div className="px-5 sm:px-7 pb-4">
                {allMfrs.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <svg className="w-8 h-8 text-slate-200 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <p className="text-xs font-bold text-slate-300">장바구니가 비어있어요</p>
                    <p className="text-[11px] text-slate-200 mt-0.5">발주·반품 품목을 카드에서 담아보세요</p>
                  </div>
                )}
                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                  {allMfrs.map(mfr => {
                    const orderEntry = orderCart.find(e => e.mfr === mfr);
                    const returnEntry = returnCart.find(e => e.manufacturer === mfr);
                    return (
                      <div key={mfr} className="contents">
                        <button
                          onClick={() => setExpandedCartMfr(mfr)}
                          className="flex flex-col rounded-2xl border-2 border-slate-100 bg-slate-50/40 p-3 sm:p-4 text-left transition-all active:scale-[0.97] w-full hover:border-slate-200 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-1 mb-2">
                            <span className="text-xs font-black text-slate-700 truncate leading-tight">{mfr}</span>
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={e => {
                                e.stopPropagation();
                                setOrderCart(prev => prev.filter(x => x.mfr !== mfr));
                                setReturnCart(prev => prev.filter(x => x.manufacturer !== mfr));
                              }}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.stopPropagation(); setOrderCart(prev => prev.filter(x => x.mfr !== mfr)); setReturnCart(prev => prev.filter(x => x.manufacturer !== mfr)); } }}
                              className="text-slate-300 hover:text-slate-500 text-base leading-none shrink-0 -mt-0.5 cursor-pointer"
                            >×</div>
                          </div>
                          {orderEntry && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded shrink-0">발주</span>
                              <span className="text-[11px] text-slate-600 tabular-nums">{orderEntry.items.length}종·{orderEntry.items.reduce((s, i) => s + i.qty, 0)}개</span>
                            </div>
                          )}
                          {returnEntry && (
                            <div className="flex items-center gap-1 mb-1">
                              <span className="text-[10px] font-black text-violet-500 bg-violet-50 border border-violet-100 px-1.5 py-0.5 rounded shrink-0">반품</span>
                              <span className="text-[11px] text-slate-600 tabular-nums">{returnEntry.exchangeQty + returnEntry.failQty}건</span>
                            </div>
                          )}
                          <p className="text-[10px] font-bold text-slate-400 mt-1">상세보기 →</p>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 상세 팝업 */}
              {expandedCartMfr && (() => {
                const orderEntry = orderCart.find(e => e.mfr === expandedCartMfr);
                const returnEntry = returnCart.find(e => e.manufacturer === expandedCartMfr);
                const orderTotal = orderEntry?.items.reduce((s, i) => s + i.qty, 0) ?? 0;
                const returnTotal = returnEntry ? (returnEntry.exchangeQty + returnEntry.failQty) : 0;
                return (
                  <ModalShell
                    isOpen={true}
                    onClose={() => setExpandedCartMfr(null)}
                    title={expandedCartMfr}
                    titleId="cart-detail-modal-title"
                    backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
                    className="rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[80vh]"
                    maxWidth="w-full sm:max-w-sm"
                  >
                    {/* 내용 */}
                    <div className="flex-1 overflow-y-auto px-5 pt-4 pb-2 space-y-5">
                      {orderEntry && (
                        <div>
                          <p className="text-[11px] font-black text-rose-500 uppercase tracking-wide mb-2">발주 품목</p>
                          <div className="space-y-2">
                            {orderEntry.items.map(({ item, qty }) => (
                              <div key={item.id} className="flex items-center justify-between">
                                <div>
                                  <span className="text-sm font-bold text-slate-800">{item.brand}</span>
                                  {item.size && item.size !== '기타' && <span className="text-xs text-slate-400 ml-1.5">{item.size}</span>}
                                </div>
                                <span className="text-sm font-black text-rose-600 tabular-nums">{qty}개</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                            <span className="text-xs font-bold text-slate-500">발주 합계</span>
                            <span className="text-sm font-black text-rose-600 tabular-nums">{orderEntry.items.length}종 · {orderTotal}개</span>
                          </div>
                        </div>
                      )}
                      {orderEntry && returnEntry && <div className="border-t border-slate-100" />}
                      {returnEntry && (
                        <div>
                          <p className="text-[11px] font-black text-violet-500 uppercase tracking-wide mb-2">반품</p>
                          <div className="flex items-center justify-between bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
                            <span className="text-sm font-bold text-slate-700">반품 합계</span>
                            <span className="text-sm font-black text-violet-600 tabular-nums">{returnTotal}건</span>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* 등록 후 공유 버튼 */}
                    <div className="px-5 py-4 border-t border-slate-100 shrink-0">
                      <button
                        onClick={() => { setExpandedCartMfr(null); void handleRegisterAll(); }}
                        disabled={isRegistering}
                        className="w-full h-11 rounded-xl bg-slate-800 text-white text-sm font-black hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
                      >
                        {isRegistering ? '등록 중...' : (
                          <>
                            등록 후 공유
                            <svg className="w-4 h-4 opacity-60" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 3C6.477 3 2 6.477 2 10.888c0 2.67 1.418 5.03 3.6 6.544l-.92 3.44a.25.25 0 00.38.28l3.8-2.53A11.3 11.3 0 0012 18.776c5.523 0 10-3.477 10-7.888S17.523 3 12 3z" />
                            </svg>
                          </>
                        )}
                      </button>
                    </div>
                  </ModalShell>
                );
              })()}
            </div>
          );
        })()}

        <FeatureGate feature="return_management" plan={plan ?? 'free'}>
          <div className="hidden">
          <OrderReturnSection
            returnCandidates={returnCandidates}
            bulkReturnItems={bulkReturnItems}
            isReadOnly={isReadOnly}
            setReturnCandidateCategory={setReturnCandidateCategory}
            setShowReturnCandidateModal={setShowReturnCandidateModal}
            setShowBulkReturnConfirm={setShowBulkReturnConfirm}
            setShowOptimizeModal={setShowOptimizeModal}
          />
          </div>
        </FeatureGate>

        </>)}

        {/* 주문 히스토리 패널 */}
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

        {historyOnly && (
          <OrderMobileFilterBar
            filterType={filterType}
            setFilterType={setFilterType}
            filterManufacturer={filterManufacturer}
            setFilterManufacturer={setFilterManufacturer}
            filterDateFrom={filterDateFrom}
            setFilterDateFrom={setFilterDateFrom}
            filterDateTo={filterDateTo}
            setFilterDateTo={setFilterDateTo}
            manufacturerOptions={manufacturerOptions}
            totalCount={unifiedRows.length}
          />
        )}

        <OrderTableSection
          unifiedRows={unifiedRows}
          isReadOnly={isReadOnly}
          historyOnly={historyOnly}
          returnActionLoadingId={returnActionLoadingId}
          setSelectedGroupModal={setSelectedGroupModal}
          setCancelModalOrder={setCancelModalOrder}
          setReturnDetailGroup={setReturnDetailGroup}
          onOpenReturnComplete={setReturnCompleteGroup}
          setShowHistoryPanel={setShowHistoryPanel}
          handleReturnUpdateStatus={handleReturnUpdateStatus}
          onDeleteOrder={onDeleteOrder}
        />

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

        <OrderReturnDetailModal
          returnDetailGroup={returnDetailGroup}
          setReturnDetailGroup={setReturnDetailGroup}
        />

        {/* 반품 완료 처리 모달 (실수령 수량 입력) */}
        <ReturnCompleteModal
          group={returnCompleteGroup}
          isLoading={isReturnCompleting}
          onClose={() => setReturnCompleteGroup(null)}
          onConfirm={async (actualQties) => {
            if (!returnCompleteGroup) return;
            setIsReturnCompleting(true);
            try {
              const pickedUpIds = returnCompleteGroup.requests
                .filter(r => r.status === 'picked_up')
                .map(r => r.id);
              if (pickedUpIds.length > 0) {
                await handleReturnCompleteWithQties(pickedUpIds[0], actualQties);
              }
              setReturnCompleteGroup(null);
            } finally {
              setIsReturnCompleting(false);
            }
          }}
        />

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

        {/* 입고 확인 모달 */}
        {(() => {
          const activeModalGroup = selectedGroupModal ? (
            groupedOrders.find(g =>
              g.date === selectedGroupModal.date &&
              g.manufacturer === selectedGroupModal.manufacturer &&
              g.type === selectedGroupModal.type
            ) || null
          ) : null;
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
              onConfirmStep={async (updates, orderIds) => {
                setIsReceiptConfirming(true);
                try {
                  await onConfirmReceipt(updates, orderIds, true);
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
              onAddToCart={handleAddToOrderCart}
              onClose={() => setBrandOrderModalMfr(null)}
              isReadOnly={isReadOnly}
              showAlertToast={showAlertToast}
            />
          );
        })()}

        {/* 일괄 주문 모달 */}
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
              void (async () => {
                let failed = 0;
                for (const entry of lowStockItems) {
                  try {
                    await onQuickOrder({ ...entry.item, currentStock: entry.item.recommendedStock - entry.remainingDeficit });
                  } catch {
                    failed += 1;
                  }
                }
                if (failed === 0) {
                  showAlertToast(`${lowStockItems.length}품목이 성공적으로 발주 목록에 추가되었습니다.`, 'success');
                } else {
                  showAlertToast(`일부 발주 처리에 실패했습니다 (${failed}건). 다시 시도해주세요.`, 'error');
                }
              })();
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

        <OrderExchangeReturnModal
          exchangeReturnTarget={exchangeReturnTarget}
          setExchangeReturnTarget={setExchangeReturnTarget}
          isExchangeReturnSubmitting={isExchangeReturnSubmitting}
          onAddToReturnCart={handleAddToReturnCart}
        />
      </div>
    </div>
  );
}
