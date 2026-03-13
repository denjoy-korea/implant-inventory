
import React from 'react';
import { Order, OrderStatus, InventoryItem, PlanType, ReturnRequest } from '../../types';
import type { LowStockEntry } from '../../hooks/useOrderManagerData';
import { ReceiptConfirmationModal, ReceiptUpdate } from '../ReceiptConfirmationModal';
import OrderCancelModal from './OrderCancelModal';
import ConfirmModal from '../ConfirmModal';
import { OrderHistoryPanel } from './OrderHistoryPanel';
import BrandOrderModal from './BrandOrderModal';
import OrderReportDashboard from './OrderReportDashboard';
import { GroupedOrder } from '../../hooks/useOrderManager';
import type { UnifiedRow } from '../../hooks/useOrderManager';

interface OrderPCLayoutProps {
  // Data
  orders: Order[];
  inventory: InventoryItem[];
  returnRequests: ReturnRequest[];
  plan?: PlanType;
  isReadOnly?: boolean;
  // Stats & KPI
  reportStats: {
    lowStockCount: number;
    lowStockQty: number;
    pendingRepCount: number;
    pendingRepQty: number;
    excRetCount: number;
    receivedCount: number;
    totalCount: number;
  };
  kpiData: {
    pendingRepCount: number;
    pendingRepQty: number;
    pendingExcRetCount: number;
    lowStockQty: number;
  };
  groupedLowStock: [string, LowStockEntry[]][];
  unifiedRows: UnifiedRow[];
  groupedOrders: GroupedOrder[];
  lowStockItems: LowStockEntry[];
  // Modal state
  cancelModalOrder: Order[] | null;
  setCancelModalOrder: (orders: Order[] | null) => void;
  isCancelLoading: boolean;
  setIsCancelLoading: (v: boolean) => void;
  selectedGroupModal: GroupedOrder | null;
  setSelectedGroupModal: (g: GroupedOrder | null) => void;
  isReceiptConfirming: boolean;
  setIsReceiptConfirming: (v: boolean) => void;
  brandOrderModalMfr: string | null;
  setBrandOrderModalMfr: (mfr: string | null) => void;
  showBulkOrderModal: boolean;
  setShowBulkOrderModal: (v: boolean) => void;
  showHistoryPanel: boolean;
  setShowHistoryPanel: (v: boolean) => void;
  // Callbacks
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onConfirmReceipt: (updates: ReceiptUpdate[], orderIdsToReceive: string[]) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onQuickOrder: (item: InventoryItem, quantity?: number) => Promise<void>;
  onCompleteReturn?: (returnId: string, actualQties?: Record<string, number>) => Promise<void>;
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onUpgradePlan?: () => void;
  setFilterType: (t: Order['type'] | 'all' | 'fail_and_return') => void;
}

export function OrderPCLayout({
  orders,
  inventory,
  returnRequests,
  plan,
  isReadOnly,
  reportStats,
  kpiData,
  groupedLowStock,
  unifiedRows,
  groupedOrders,
  lowStockItems,
  cancelModalOrder,
  setCancelModalOrder,
  isCancelLoading,
  setIsCancelLoading,
  selectedGroupModal,
  setSelectedGroupModal,
  isReceiptConfirming,
  setIsReceiptConfirming,
  brandOrderModalMfr,
  setBrandOrderModalMfr,
  showBulkOrderModal,
  setShowBulkOrderModal,
  showHistoryPanel,
  setShowHistoryPanel,
  onCancelOrder,
  onConfirmReceipt,
  onUpdateOrderStatus,
  onDeleteOrder,
  onQuickOrder,
  onCompleteReturn,
  showAlertToast,
  onUpgradePlan,
  setFilterType,
}: OrderPCLayoutProps) {
  return (
    <div>
      <OrderReportDashboard
        stats={reportStats}
        kpiData={kpiData}
        groupedLowStock={groupedLowStock}
        unifiedRows={unifiedRows}
        plan={plan}
        isReadOnly={isReadOnly}
        setShowBulkOrderModal={setShowBulkOrderModal}
        setBrandOrderModalMfr={setBrandOrderModalMfr}
        setFilterType={setFilterType}
        setShowHistoryPanel={setShowHistoryPanel}
        onCompleteReturn={onCompleteReturn}
      />

      {/* 모달: 취소 */}
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

      {/* 모달: 입고 확인 */}
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
                await onConfirmReceipt(updates, orderIds);
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

      {/* 모달: 브랜드별 발주 */}
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

      {/* 모달: 일괄 주문 */}
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

      {/* 모달: 주문 히스토리 패널 */}
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
    </div>
  );
}
