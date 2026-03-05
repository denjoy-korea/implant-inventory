import React, { lazy, useEffect, useRef } from 'react';
import FeatureGate from '../FeatureGate';
import { StockCalcSettings } from '../../services/hospitalSettingsService';
import {
  DashboardTab,
  ExcelRow,
  HospitalPlanState,
  InventoryItem,
  Order,
  OrderStatus,
  PlanType,
  ReturnRequest,
  ReturnReason,
  ReturnStatus,
  ReturnMutationResult,
  SurgeryUnregisteredItem,
  User,
} from '../../types';
import { ReceiptUpdate } from '../ReceiptConfirmationModal';

const InventoryAudit = lazy(() => import('../InventoryAudit'));
const SurgeryDashboard = lazy(() => import('../SurgeryDashboard'));
const FailManager = lazy(() => import('../FailManager'));
const OrderManager = lazy(() => import('../OrderManager'));
const SettingsHub = lazy(() => import('../SettingsHub'));
const AuditLogViewer = lazy(() => import('../AuditLogViewer'));

interface DashboardOperationalTabsProps {
  dashboardTab: DashboardTab;
  user: User | null;
  inventory: InventoryItem[];
  surgeryMaster: Record<string, ExcelRow[]>;
  orders: Order[];
  returnRequests: ReturnRequest[];
  isReadOnly: boolean;
  effectivePlan: PlanType;
  isHospitalMaster: boolean;
  isSystemAdmin: boolean;
  hospitalWorkDays: number[];
  planState: HospitalPlanState | null;
  isLoading: boolean;
  surgeryUnregisteredItems: SurgeryUnregisteredItem[];
  showAuditHistory: boolean;
  onCloseAuditHistory: () => void;
  onLoadHospitalData: (user: User) => Promise<void>;
  onTabChange: (tab: DashboardTab) => void;
  onWorkDaysChange: (workDays: number[]) => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onConfirmReceipt: (updates: ReceiptUpdate[], orderIdsToReceive: string[]) => Promise<void>;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onQuickOrder: (item: InventoryItem) => Promise<void>;
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
  onGoToPricing?: () => void;
  onOpenPaymentModal?: (plan: PlanType) => void;
  onAuditSessionComplete?: () => void;
  initialShowFailBulkModal?: boolean;
  onFailBulkModalOpened?: () => void;
  onFailAuditDone?: () => void;
  orderHistoryOnly?: boolean;
  stockCalcSettings?: StockCalcSettings;
  onStockCalcSettingsChange?: (settings: StockCalcSettings) => Promise<void>;
}

const DashboardOperationalTabs: React.FC<DashboardOperationalTabsProps> = ({
  dashboardTab,
  user,
  inventory,
  surgeryMaster,
  orders,
  returnRequests,
  isReadOnly,
  effectivePlan,
  isHospitalMaster,
  isSystemAdmin,
  hospitalWorkDays,
  planState,
  isLoading,
  surgeryUnregisteredItems,
  showAuditHistory,
  onCloseAuditHistory,
  onLoadHospitalData,
  onTabChange,
  onWorkDaysChange,
  onUpdateOrderStatus,
  onConfirmReceipt,
  onCancelOrder,
  onDeleteOrder,
  onQuickOrder,
  onCreateReturn,
  onUpdateReturnStatus,
  onCompleteReturn,
  onDeleteReturn,
  showAlertToast,
  onGoToPricing,
  onAuditSessionComplete,
  initialShowFailBulkModal,
  onFailBulkModalOpened,
  onFailAuditDone,
  orderHistoryOnly,
  stockCalcSettings,
  onStockCalcSettingsChange,
  onOpenPaymentModal,
}) => {
  const prevTabRef = useRef<DashboardTab>(dashboardTab);

  useEffect(() => {
    const prevTab = prevTabRef.current;
    if (prevTab !== dashboardTab) {
      // Save scroll position of the tab we are leaving
      sessionStorage.setItem(`tab-scroll-${prevTab}`, window.scrollY.toString());
      prevTabRef.current = dashboardTab;
    }
    // Restore scroll position for the newly active tab
    const savedY = sessionStorage.getItem(`tab-scroll-${dashboardTab}`);
    if (savedY) {
      window.scrollTo(0, parseInt(savedY, 10));
    } else {
      window.scrollTo(0, 0);
    }
  }, [dashboardTab]);

  return (
    <>
      {dashboardTab === 'inventory_audit' && (
        <FeatureGate feature="inventory_audit" plan={effectivePlan} onOpenPaymentModal={onOpenPaymentModal}>
          <InventoryAudit
            inventory={inventory}
            hospitalId={user?.hospitalId || ''}
            userName={user?.name}
            onApplied={() => {
              if (user) {
                void onLoadHospitalData(user);
              }
            }}
            onAuditSessionComplete={onAuditSessionComplete}
            showHistory={showAuditHistory}
            onCloseHistory={onCloseAuditHistory}
          />
        </FeatureGate>
      )}
      {(dashboardTab === 'surgery_database' || dashboardTab === 'surgery_upload') && (
        <SurgeryDashboard
          rows={surgeryMaster['수술기록지'] || []}
          onUpload={() => onTabChange('surgery_upload')}
          isLoading={isLoading}
          unregisteredFromSurgery={surgeryUnregisteredItems}
          onGoInventoryMaster={() => onTabChange('inventory_master')}
          hospitalWorkDays={hospitalWorkDays}
          planState={planState}
          hospitalId={user?.hospitalId}
          isReadOnly={isReadOnly}
          currentUserName={user?.name || '관리자'}
          onUpgrade={onGoToPricing}
        />
      )}
      {dashboardTab === 'fail_management' && (
        <FeatureGate
          feature="fail_management"
          plan={effectivePlan}
          onOpenPaymentModal={onOpenPaymentModal}
          dataHint={(() => {
            const count = orders.filter(o => o.type === 'fail_exchange').length;
            return count > 0 ? `FAIL 기록 ${count}건이 쌓여 있습니다 — 지금 관리를 시작하세요` : undefined;
          })()}
        >
          <FailManager
            surgeryMaster={surgeryMaster}
            inventory={inventory}
            failOrders={orders.filter(o => o.type === 'fail_exchange' || o.type === 'return')}
            returnRequests={returnRequests}
            onCreateReturn={onCreateReturn}
            currentUserName={user?.name || '관리자'}
            isReadOnly={isReadOnly}
            hospitalId={user?.hospitalId}
            onBulkSetupComplete={async () => {
              if (user) await onLoadHospitalData(user);
              onFailAuditDone?.();
            }}
            initialShowBulkModal={initialShowFailBulkModal}
            onInitialModalOpened={onFailBulkModalOpened}
            onDeleteOrder={onDeleteOrder}
          />
        </FeatureGate>
      )}
      {dashboardTab === 'order_management' && (
        <FeatureGate feature="order_execution" plan={effectivePlan} onOpenPaymentModal={onOpenPaymentModal}>
          <OrderManager
            orders={orders}
            inventory={inventory}
            surgeryMaster={surgeryMaster}
            hospitalId={user?.hospitalId}
            currentUserName={user?.name}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onConfirmReceipt={onConfirmReceipt}
            onCancelOrder={onCancelOrder}
            onDeleteOrder={onDeleteOrder}
            onQuickOrder={onQuickOrder}
            onCreateReturn={onCreateReturn}
            returnRequests={returnRequests}
            onUpdateReturnStatus={onUpdateReturnStatus}
            onCompleteReturn={onCompleteReturn}
            onDeleteReturn={onDeleteReturn}
            showAlertToast={showAlertToast}
            isReadOnly={isReadOnly}
            historyOnly={orderHistoryOnly}
            plan={effectivePlan}
            onUpgradePlan={() => onOpenPaymentModal?.('basic')}
          />
        </FeatureGate>
      )}
      {dashboardTab === 'settings' && (
        <SettingsHub
          onNavigate={onTabChange}
          isMaster={isHospitalMaster || isSystemAdmin}
          isStaff={user?.role === 'staff'}
          plan={effectivePlan}
          hospitalId={user?.hospitalId}
          hospitalWorkDays={hospitalWorkDays}
          onWorkDaysChange={onWorkDaysChange}
          permissions={user?.permissions}
          stockCalcSettings={stockCalcSettings}
          onStockCalcSettingsChange={onStockCalcSettingsChange}
        />
      )}
      {dashboardTab === 'audit_log' && user?.hospitalId && (
        <FeatureGate feature="audit_log" plan={effectivePlan} onOpenPaymentModal={onOpenPaymentModal}>
          <AuditLogViewer hospitalId={user.hospitalId} />
        </FeatureGate>
      )}
    </>
  );
};

export default DashboardOperationalTabs;
