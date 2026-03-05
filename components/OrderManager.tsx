
import React from 'react';
import { Order, OrderStatus, InventoryItem, PlanType, ReturnRequest, ReturnStatus, ReturnMutationResult, ExcelRow, CreateReturnParams } from '../types';
import OrderCancelModal from './order/OrderCancelModal';
import ConfirmModal from './ConfirmModal';
import { ReceiptConfirmationModal, ReceiptUpdate } from './ReceiptConfirmationModal';
import OptimizeModal from './inventory/OptimizeModal';
import { OrderHistoryPanel } from './order/OrderHistoryPanel';
import ReturnRequestModal from './order/ReturnRequestModal';
import ReturnCandidateModal from './order/ReturnCandidateModal';
import BrandOrderModal from './order/BrandOrderModal';
import { displayMfr, buildOrderItemKey } from '../hooks/useOrderManagerData';
import { useOrderManager } from '../hooks/useOrderManager';
import { OrderLowStockSection } from './order/OrderLowStockSection';
import { OrderExchangeSection } from './order/OrderExchangeSection';
import { OrderReturnSection } from './order/OrderReturnSection';
import { OrderTableSection } from './order/OrderTableSection';
import { OrderReturnDetailModal } from './order/OrderReturnDetailModal';
import { OrderExchangeReturnModal } from './order/OrderExchangeReturnModal';
export type { GroupedOrder, GroupedReturnRequest, UnifiedRow } from '../hooks/useOrderManager';

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
  const {
    filterType, setFilterType,
    filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo,
    filterManufacturer, setFilterManufacturer,
    cancelModalOrder, setCancelModalOrder,
    isCancelLoading, setIsCancelLoading,
    showBulkOrderModal, setShowBulkOrderModal,
    unselectedLowStockKeys, setUnselectedLowStockKeys,
    isMobileBulkOrdering,
    selectedGroupModal, setSelectedGroupModal,
    isReceiptConfirming, setIsReceiptConfirming,
    showHistoryPanel, setShowHistoryPanel,
    showReturnModal, setShowReturnModal,
    isCreatingReturn,
    returnActionLoadingId,
    brandOrderModalMfr, setBrandOrderModalMfr,
    showOptimizeModal, setShowOptimizeModal,
    showReturnCandidateModal, setShowReturnCandidateModal,
    returnCandidateCategory, setReturnCandidateCategory,
    showBulkReturnConfirm, setShowBulkReturnConfirm,
    isBulkReturning,
    returnDetailGroup, setReturnDetailGroup,
    exchangeReturnTarget, setExchangeReturnTarget,
    exchangeItemQuantities,
    isExchangeReturnSubmitting,
    exchangeTotalQty,
    lowStockItems,
    returnCandidates,
    bulkReturnItems,
    deadStockItems,
    exchangeCandidates,
    kpiData,
    groupedLowStock,
    orderedLowStockGroups,
    manufacturerOptions,
    groupedOrders,
    unifiedRows,
    stats,
    typeCounts,
    animPendingRep,
    animExcRet,
    animLowStock,
    animTotal,
    handleReturnCreate,
    handleReturnUpdateStatus,
    handleBulkReturn,
    handleMobileBulkOrder,
    handleExchangeCandidateClick,
    adjustExchangeQty,
    handleExchangeReturnSubmit,
  } = useOrderManager({
    orders,
    inventory,
    surgeryMaster,
    currentUserName,
    isReadOnly,
    returnRequests,
    showAlertToast,
    onCreateReturn,
    onCompleteReturn,
    onUpdateReturnStatus,
    onQuickOrder,
  });

  const TYPE_TABS: { key: 'all' | 'replenishment' | 'fail_exchange' | 'return'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'replenishment', label: '발주' },
    { key: 'fail_exchange', label: '교환' },
    { key: 'return', label: '반품' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 [animation-duration:0s]">
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
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('replenishment'); } }}
              className={`rounded-xl border px-3 py-3 transition-colors active:scale-[0.98] cursor-pointer ${animPendingRep > 0 ? 'border-rose-100 bg-rose-50/60 hover:bg-rose-100' : 'border-slate-100 bg-slate-50/80 hover:bg-slate-100'}`}
            >
              <p className="text-[10px] font-bold text-slate-500">진행 중 발주</p>
              <p className={`text-xl font-black tabular-nums mt-1 ${animPendingRep > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{animPendingRep}</p>
            </div>
            <div
              onClick={() => { setFilterType('fail_and_return'); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('fail_and_return'); } }}
              className={`rounded-xl border px-3 py-3 transition-colors active:scale-[0.98] cursor-pointer ${animExcRet > 0 ? 'border-amber-200 bg-amber-50 hover:bg-amber-100' : 'border-amber-100 bg-amber-50/80 hover:bg-amber-100'}`}
            >
              <p className="text-[10px] font-bold text-amber-600">교환/반품 대기</p>
              <p className={`text-xl font-black tabular-nums mt-1 ${animExcRet > 0 ? 'text-amber-600' : 'text-slate-800'}`}>{animExcRet}</p>
            </div>
            <div
              onClick={() => { setShowHistoryPanel(true); }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowHistoryPanel(true); } }}
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
                    showAlertToast("읽기 전용 모드입니다.", 'info');
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (isReadOnly) { showAlertToast("읽기 전용 모드입니다.", 'info'); return; } if (lowStockItems.length === 0) { window.location.hash = '#/dashboard/inventory'; return; } setShowBulkOrderModal(true); } }}
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('replenishment'); } }}
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('fail_and_return'); } }}
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterType('all'); } }}
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

        <OrderLowStockSection
          groupedLowStock={groupedLowStock}
          orderedLowStockGroups={orderedLowStockGroups}
          lowStockCount={lowStockItems.length}
          lowStockQty={stats.lowStockQty}
          isReadOnly={isReadOnly}
          setShowBulkOrderModal={setShowBulkOrderModal}
          setBrandOrderModalMfr={setBrandOrderModalMfr}
        />


        <OrderExchangeSection
          exchangeCandidates={exchangeCandidates}
          isReadOnly={isReadOnly}
          handleExchangeCandidateClick={handleExchangeCandidateClick}
        />

        <OrderReturnSection
          returnCandidates={returnCandidates}
          bulkReturnItems={bulkReturnItems}
          isReadOnly={isReadOnly}
          setReturnCandidateCategory={setReturnCandidateCategory}
          setShowReturnCandidateModal={setShowReturnCandidateModal}
          setShowBulkReturnConfirm={setShowBulkReturnConfirm}
          setShowOptimizeModal={setShowOptimizeModal}
        />

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

        <OrderTableSection
          unifiedRows={unifiedRows}
          isReadOnly={isReadOnly}
          historyOnly={historyOnly}
          returnActionLoadingId={returnActionLoadingId}
          setSelectedGroupModal={setSelectedGroupModal}
          setCancelModalOrder={setCancelModalOrder}
          setReturnDetailGroup={setReturnDetailGroup}
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

        <OrderExchangeReturnModal
          exchangeReturnTarget={exchangeReturnTarget}
          setExchangeReturnTarget={setExchangeReturnTarget}
          isExchangeReturnSubmitting={isExchangeReturnSubmitting}
          exchangeItemQuantities={exchangeItemQuantities}
          exchangeTotalQty={exchangeTotalQty}
          adjustExchangeQty={adjustExchangeQty}
          handleExchangeReturnSubmit={handleExchangeReturnSubmit}
        />
      </div>

    </div>
  );
};

export default OrderManager;
