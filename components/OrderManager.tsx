
import React from 'react';
import { Order, OrderStatus, InventoryItem, PlanType, ReturnRequest, ReturnStatus, ReturnMutationResult, ExcelRow, CreateReturnParams } from '../types';
import { ReceiptUpdate } from './ReceiptConfirmationModal';
import { useOrderManager } from '../hooks/useOrderManager';
import { useOrderManagerModals } from '../hooks/useOrderManagerModals';
import { OrderPCLayout } from './order/OrderPCLayout';
import { OrderMobileLayout } from './order/OrderMobileLayout';
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
  onQuickOrder: (item: InventoryItem, quantity?: number) => Promise<void>;
  onCreateReturn: (params: CreateReturnParams) => Promise<void>;
  onUpdateReturnStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => Promise<ReturnMutationResult>;
  onCompleteReturn: (returnId: string, actualQties?: Record<string, number>) => Promise<ReturnMutationResult>;
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
  onDeleteReturn,
  returnRequests,
  showAlertToast,
  isReadOnly,
  historyOnly,
  plan,
  onUpgradePlan,
}) => {
  // ── 모달 상태: useReducer (discriminated union) ──────────────────
  const { modal, dispatch } = useOrderManagerModals();

  // returnCompleteGroup, isReturnCompleting, returnDetailGroup via modal state
  const returnCompleteGroup = modal.kind === 'return_complete' ? modal.group : null;
  const returnDetailGroup = modal.kind === 'return_detail' ? modal.group : null;
  const [isReturnCompleting, setIsReturnCompleting] = React.useState(false);

  // ── useOrderManager: data + handlers ────────────────────────────
  const {
    isMobileViewport,
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
    typeCounts: _typeCounts,
    animPendingRep,
    animExcRet,
    animLowStock,
    handleReturnCreate,
    handleReturnUpdateStatus,
    handleReturnCompleteWithQties,
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

  const reportStats = {
    lowStockCount: stats.lowStockCount,
    lowStockQty: stats.lowStockQty,
    pendingRepCount: kpiData.pendingRepCount,
    pendingRepQty: kpiData.pendingRepQty,
    excRetCount: kpiData.pendingExcRetCount,
    receivedCount: stats.receivedCount,
    totalCount: stats.totalCount,
  };

  // ── PC Layout ────────────────────────────────────────────────────
  if (!isMobileViewport) {
    return (
      <OrderPCLayout
        orders={orders}
        inventory={inventory}
        returnRequests={returnRequests}
        plan={plan}
        isReadOnly={isReadOnly}
        reportStats={reportStats}
        kpiData={kpiData}
        groupedLowStock={groupedLowStock}
        unifiedRows={unifiedRows}
        groupedOrders={groupedOrders}
        lowStockItems={lowStockItems}
        cancelModalOrder={cancelModalOrder}
        setCancelModalOrder={setCancelModalOrder}
        isCancelLoading={isCancelLoading}
        setIsCancelLoading={setIsCancelLoading}
        selectedGroupModal={selectedGroupModal}
        setSelectedGroupModal={setSelectedGroupModal}
        isReceiptConfirming={isReceiptConfirming}
        setIsReceiptConfirming={setIsReceiptConfirming}
        brandOrderModalMfr={brandOrderModalMfr}
        setBrandOrderModalMfr={setBrandOrderModalMfr}
        showBulkOrderModal={showBulkOrderModal}
        setShowBulkOrderModal={setShowBulkOrderModal}
        showHistoryPanel={showHistoryPanel}
        setShowHistoryPanel={setShowHistoryPanel}
        onCancelOrder={onCancelOrder}
        onConfirmReceipt={onConfirmReceipt}
        onUpdateOrderStatus={onUpdateOrderStatus}
        onDeleteOrder={onDeleteOrder}
        onQuickOrder={onQuickOrder}
        onCompleteReturn={async (returnId, actualQties) => {
          if (!actualQties) return;
          await handleReturnCompleteWithQties(returnId, actualQties);
        }}
        onUpdateReturnStatus={handleReturnUpdateStatus}
        onDeleteReturn={onDeleteReturn}
        showAlertToast={showAlertToast}
        onUpgradePlan={onUpgradePlan}
        setFilterType={setFilterType}
      />
    );
  }

  // ── Mobile Layout ────────────────────────────────────────────────
  return (
    <OrderMobileLayout
      orders={orders}
      inventory={inventory}
      returnRequests={returnRequests}
      hospitalId={hospitalId}
      currentUserName={currentUserName}
      plan={plan}
      isReadOnly={isReadOnly}
      historyOnly={historyOnly}
      lowStockItems={lowStockItems}
      returnCandidates={returnCandidates}
      bulkReturnItems={bulkReturnItems}
      deadStockItems={deadStockItems}
      exchangeCandidates={exchangeCandidates}
      groupedLowStock={groupedLowStock}
      orderedLowStockGroups={orderedLowStockGroups}
      manufacturerOptions={manufacturerOptions}
      groupedOrders={groupedOrders}
      unifiedRows={unifiedRows}
      stats={stats}
      kpiData={kpiData}
      animPendingRep={animPendingRep}
      animExcRet={animExcRet}
      animLowStock={animLowStock}
      filterType={filterType}
      setFilterType={setFilterType}
      filterDateFrom={filterDateFrom}
      setFilterDateFrom={setFilterDateFrom}
      filterDateTo={filterDateTo}
      setFilterDateTo={setFilterDateTo}
      filterManufacturer={filterManufacturer}
      setFilterManufacturer={setFilterManufacturer}
      cancelModalOrder={cancelModalOrder}
      setCancelModalOrder={setCancelModalOrder}
      isCancelLoading={isCancelLoading}
      setIsCancelLoading={setIsCancelLoading}
      selectedGroupModal={selectedGroupModal}
      setSelectedGroupModal={setSelectedGroupModal}
      isReceiptConfirming={isReceiptConfirming}
      setIsReceiptConfirming={setIsReceiptConfirming}
      showHistoryPanel={showHistoryPanel}
      setShowHistoryPanel={setShowHistoryPanel}
      showReturnModal={showReturnModal}
      setShowReturnModal={setShowReturnModal}
      isCreatingReturn={isCreatingReturn}
      brandOrderModalMfr={brandOrderModalMfr}
      setBrandOrderModalMfr={setBrandOrderModalMfr}
      showOptimizeModal={showOptimizeModal}
      setShowOptimizeModal={setShowOptimizeModal}
      showReturnCandidateModal={showReturnCandidateModal}
      setShowReturnCandidateModal={setShowReturnCandidateModal}
      returnCandidateCategory={returnCandidateCategory}
      setReturnCandidateCategory={setReturnCandidateCategory}
      showBulkReturnConfirm={showBulkReturnConfirm}
      setShowBulkReturnConfirm={setShowBulkReturnConfirm}
      isBulkReturning={isBulkReturning}
      exchangeReturnTarget={exchangeReturnTarget}
      setExchangeReturnTarget={setExchangeReturnTarget}
      exchangeItemQuantities={exchangeItemQuantities}
      isExchangeReturnSubmitting={isExchangeReturnSubmitting}
      exchangeTotalQty={exchangeTotalQty}
      returnActionLoadingId={returnActionLoadingId}
      unselectedLowStockKeys={unselectedLowStockKeys}
      setUnselectedLowStockKeys={setUnselectedLowStockKeys}
      isMobileBulkOrdering={isMobileBulkOrdering}
      showBulkOrderModal={showBulkOrderModal}
      setShowBulkOrderModal={setShowBulkOrderModal}
      returnCompleteGroup={returnCompleteGroup}
      setReturnCompleteGroup={(g) => g
        ? dispatch({ type: 'OPEN_RETURN_COMPLETE', group: g })
        : dispatch({ type: 'CLOSE' })
      }
      isReturnCompleting={isReturnCompleting}
      setIsReturnCompleting={setIsReturnCompleting}
      returnDetailGroup={returnDetailGroup}
      setReturnDetailGroup={(g) => g
        ? dispatch({ type: 'OPEN_RETURN_DETAIL', group: g })
        : dispatch({ type: 'CLOSE' })
      }
      onCancelOrder={onCancelOrder}
      onConfirmReceipt={onConfirmReceipt}
      onUpdateOrderStatus={onUpdateOrderStatus}
      onDeleteOrder={onDeleteOrder}
      onQuickOrder={onQuickOrder}
      onCreateReturn={onCreateReturn}
      onUpgradePlan={onUpgradePlan}
      showAlertToast={showAlertToast}
      handleReturnCreate={handleReturnCreate}
      handleReturnUpdateStatus={handleReturnUpdateStatus}
      handleReturnCompleteWithQties={handleReturnCompleteWithQties}
      handleBulkReturn={handleBulkReturn}
      handleMobileBulkOrder={handleMobileBulkOrder}
      handleExchangeCandidateClick={handleExchangeCandidateClick}
      adjustExchangeQty={adjustExchangeQty}
    />
  );
};

export default OrderManager;
