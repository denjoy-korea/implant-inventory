
import React from 'react';
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
import { GroupedOrder, GroupedReturnRequest, ExchangeReturnTarget, UnifiedRow } from '../../hooks/useOrderManager';
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
  handleExchangeReturnSubmit: () => Promise<void>;
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
  handleExchangeReturnSubmit,
}: OrderMobileLayoutProps) {
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
          plan={plan}
          setShowBulkOrderModal={setShowBulkOrderModal}
          setBrandOrderModalMfr={setBrandOrderModalMfr}
        />

        <OrderExchangeSection
          exchangeCandidates={exchangeCandidates}
          isReadOnly={isReadOnly}
          handleExchangeCandidateClick={handleExchangeCandidateClick}
        />

        <FeatureGate feature="return_management" plan={plan ?? 'free'}>
          <OrderReturnSection
            returnCandidates={returnCandidates}
            bulkReturnItems={bulkReturnItems}
            isReadOnly={isReadOnly}
            setReturnCandidateCategory={setReturnCandidateCategory}
            setShowReturnCandidateModal={setShowReturnCandidateModal}
            setShowBulkReturnConfirm={setShowBulkReturnConfirm}
            setShowOptimizeModal={setShowOptimizeModal}
          />
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
              onOrder={onQuickOrder}
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
          exchangeItemQuantities={exchangeItemQuantities}
          exchangeTotalQty={exchangeTotalQty}
          adjustExchangeQty={adjustExchangeQty}
          handleExchangeReturnSubmit={handleExchangeReturnSubmit}
        />
      </div>
    </div>
  );
}
