import React, { lazy } from 'react';
import FeatureGate from '../FeatureGate';
import {
  DashboardTab,
  ExcelRow,
  HospitalPlanState,
  InventoryItem,
  Order,
  OrderStatus,
  PlanType,
  SurgeryUnregisteredItem,
  User,
} from '../../types';

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
  onAddFailOrder: (order: Order) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onQuickOrder: (item: InventoryItem) => Promise<void>;
}

const DashboardOperationalTabs: React.FC<DashboardOperationalTabsProps> = ({
  dashboardTab,
  user,
  inventory,
  surgeryMaster,
  orders,
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
  onAddFailOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onQuickOrder,
}) => {
  return (
    <>
      {dashboardTab === 'inventory_audit' && (
        <InventoryAudit
          inventory={inventory}
          hospitalId={user?.hospitalId || ''}
          onApplied={() => {
            if (user) {
              void onLoadHospitalData(user);
            }
          }}
          showHistory={showAuditHistory}
          onCloseHistory={onCloseAuditHistory}
        />
      )}
      {dashboardTab === 'surgery_database' && (
        <SurgeryDashboard
          rows={surgeryMaster['수술기록지'] || []}
          onUpload={() => onTabChange('surgery_upload')}
          isLoading={isLoading}
          unregisteredFromSurgery={surgeryUnregisteredItems}
          onGoInventoryMaster={() => onTabChange('inventory_master')}
          hospitalWorkDays={hospitalWorkDays}
          planState={planState}
        />
      )}
      {dashboardTab === 'fail_management' && (
        <FailManager
          surgeryMaster={surgeryMaster}
          inventory={inventory}
          failOrders={orders.filter(o => o.type === 'fail_exchange')}
          onAddFailOrder={onAddFailOrder}
          currentUserName={user?.name || '관리자'}
          isReadOnly={isReadOnly}
        />
      )}
      {dashboardTab === 'order_management' && (
        <FeatureGate feature="one_click_order" plan={effectivePlan}>
          <OrderManager
            orders={orders}
            inventory={inventory}
            onUpdateOrderStatus={onUpdateOrderStatus}
            onDeleteOrder={onDeleteOrder}
            onQuickOrder={onQuickOrder}
            isReadOnly={isReadOnly}
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
        />
      )}
      {dashboardTab === 'audit_log' && user?.hospitalId && (
        <FeatureGate feature="audit_log" plan={effectivePlan}>
          <AuditLogViewer hospitalId={user.hospitalId} />
        </FeatureGate>
      )}
    </>
  );
};

export default DashboardOperationalTabs;
