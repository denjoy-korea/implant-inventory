import React from 'react';
import { AppState, ExcelData, InventoryItem, Order, OrderStatus, PlanType, PLAN_LIMITS, SurgeryUnregisteredItem, User } from '../../types';
import MigrationBanner from '../MigrationBanner';
import UpgradeNudge, { NudgeType } from '../UpgradeNudge';
import PlanLimitToast, { LimitType } from '../PlanLimitToast';
import ReadOnlyBanner from '../ReadOnlyBanner';
import DashboardOverview from '../DashboardOverview';
import FeatureGate from '../FeatureGate';
import MemberManager from '../MemberManager';
import RawDataUploadGuide from '../RawDataUploadGuide';
import DashboardFixtureEditSection from './DashboardFixtureEditSection';
import DashboardInventoryMasterSection from './DashboardInventoryMasterSection';
import DashboardOperationalTabs from '../dashboard/DashboardOperationalTabs';

interface FixtureEditBindings {
  enabledManufacturers: string[];
  hasSavedPoint: boolean;
  isDirtyAfterSave: boolean;
  restoreToast: 'idle' | 'restored';
  saveToast: 'idle' | 'saved';
  formattedSavedAt: string | null;
  fixtureRestoreDiffCount: number;
  restorePanelRef: React.RefObject<HTMLDivElement | null>;
  onManufacturerToggle: (manufacturer: string, isActive: boolean) => void;
  onBulkToggle: (filters: Record<string, string>, targetUnused: boolean) => void;
  onLengthToggle: (normalizedTarget: string, setUnused: boolean) => void;
  onRestoreToSavedPoint: () => void;
  onSaveSettings: () => boolean;
  onUpdateFixtureCell: (index: number, column: string, value: boolean | string | number) => void;
  onFixtureSheetChange: (sheetName: string) => void;
  onExpandFailClaim: () => void;
  onRequestFixtureExcelDownload: () => void;
  onRequestApplyFixtureToInventory: () => void;
}

interface InventoryMasterBindings {
  virtualSurgeryData: ExcelData | null;
  initialShowBaseStockEdit?: boolean;
  onBaseStockEditApplied?: () => void;
  applyBaseStockBatch: (changes: Array<{ id: string; initialStock: number; nextCurrentStock: number }>) => Promise<void>;
  refreshLatestSurgeryUsage: () => Promise<Record<string, number> | null>;
  resolveManualSurgeryInput: (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
  }) => Promise<{
    checked: number;
    found: number;
    applicable: number;
    alreadyFixed: number;
    updated: number;
    failed: number;
    notFound: number;
    appliedManufacturer: string;
    appliedBrand: string;
    appliedSize: string;
  }>;
  onShowAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export interface DashboardWorkspaceSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  effectivePlan: PlanType;
  isHospitalAdmin: boolean;
  isHospitalMaster: boolean;
  isSystemAdmin: boolean;
  isReadOnly: boolean;
  activeNudge: NudgeType | null;
  planLimitToast: LimitType | null;
  billableItemCount: number;
  surgeryUnregisteredItems: SurgeryUnregisteredItem[];
  showAuditHistory: boolean;
  fixtureEdit: FixtureEditBindings;
  inventoryMaster: InventoryMasterBindings;
  onLoadHospitalData: (user: User) => Promise<void>;
  onGoToPricing: () => void;
  onDismissPlanLimitToast: () => void;
  onUpgradeFromPlanLimitToast: () => void;
  onStartOverviewTrial: () => Promise<void>;
  onFixtureUploadClick: () => void;
  onSurgeryUploadClick: () => void;
  onCloseAuditHistory: () => void;
  onAddOrder: (order: Order) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
  onAuditSessionComplete?: () => void;
  initialShowFailBulkModal?: boolean;
  onFailBulkModalOpened?: () => void;
  onFailAuditDone?: () => void;
  onboardingStep?: number | null;
  onResumeOnboarding?: () => void;
}

const DashboardWorkspaceSection: React.FC<DashboardWorkspaceSectionProps> = ({
  state,
  setState,
  effectivePlan,
  isHospitalAdmin,
  isHospitalMaster,
  isSystemAdmin,
  isReadOnly,
  activeNudge,
  planLimitToast,
  billableItemCount,
  surgeryUnregisteredItems,
  showAuditHistory,
  fixtureEdit,
  inventoryMaster,
  onLoadHospitalData,
  onGoToPricing,
  onDismissPlanLimitToast,
  onUpgradeFromPlanLimitToast,
  onStartOverviewTrial,
  onFixtureUploadClick,
  onSurgeryUploadClick,
  onCloseAuditHistory,
  onAddOrder,
  onUpdateOrderStatus,
  onDeleteOrder,
  onAuditSessionComplete,
  initialShowFailBulkModal,
  onFailBulkModalOpened,
  onFailAuditDone,
  onboardingStep,
  onResumeOnboarding,
}) => {
  const buildQuickOrder = (item: InventoryItem): Order => ({
    id: `order_${Date.now()}`,
    type: 'replenishment',
    manufacturer: item.manufacturer,
    date: new Date().toISOString().split('T')[0],
    items: [{ brand: item.brand, size: item.size, quantity: item.recommendedStock - item.currentStock }],
    manager: state.user?.name || '관리자',
    status: 'ordered',
  });

  return (
    <div className="p-3 sm:p-6 max-w-7xl mx-auto space-y-6 pb-24 sm:pb-6">
      {state.user && state.user.hospitalId && (
        <MigrationBanner
          user={state.user}
          onMigrationComplete={async () => { if (state.user) await onLoadHospitalData(state.user); }}
        />
      )}

      {activeNudge && (
        <UpgradeNudge
          type={activeNudge}
          daysLeft={state.planState?.trialDaysRemaining}
          currentCount={billableItemCount}
          maxCount={PLAN_LIMITS.free.maxItems}
          onUpgrade={onGoToPricing}
        />
      )}

      {planLimitToast && (
        <PlanLimitToast
          type={planLimitToast}
          currentCount={billableItemCount}
          maxCount={PLAN_LIMITS.free.maxItems}
          onUpgrade={onUpgradeFromPlanLimitToast}
          onClose={onDismissPlanLimitToast}
        />
      )}

      {state.user?.status === 'readonly' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-amber-800">읽기 전용 모드</p>
              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                플랜 다운그레이드로 인해 읽기 전용 상태입니다. 데이터 조회는 가능하지만 추가/수정/삭제가 제한됩니다. 관리자에게 문의하세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {state.planState && state.planState.plan === 'free' && billableItemCount > PLAN_LIMITS.free.maxItems && (
        <ReadOnlyBanner
          currentItemCount={billableItemCount}
          maxItems={PLAN_LIMITS.free.maxItems}
          onUpgrade={onGoToPricing}
        />
      )}

      {state.dashboardTab === 'overview' && (
        <DashboardOverview
          inventory={state.inventory}
          orders={state.orders}
          surgeryMaster={state.surgeryMaster}
          fixtureData={state.fixtureData}
          surgeryUnregisteredItems={surgeryUnregisteredItems}
          hospitalId={state.user?.hospitalId}
          hospitalWorkDays={state.hospitalWorkDays}
          onNavigate={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
          isAdmin={isHospitalAdmin}
          planState={state.planState}
          isMaster={isHospitalMaster || isSystemAdmin}
          onStartTrial={onStartOverviewTrial}
          onGoToPricing={onGoToPricing}
          onboardingStep={onboardingStep}
          onResumeOnboarding={onResumeOnboarding}
        />
      )}

      {state.dashboardTab === 'member_management' && state.user && (
        <FeatureGate feature="role_management" plan={effectivePlan}>
          <MemberManager
            currentUser={state.user}
            onClose={() => setState(prev => ({ ...prev, dashboardTab: 'overview' }))}
            planState={state.planState}
            onGoToPricing={onGoToPricing}
          />
        </FeatureGate>
      )}

      {state.dashboardTab === 'fixture_upload' && (
        <RawDataUploadGuide
          onUploadClick={onFixtureUploadClick}
          hasExistingData={!!state.fixtureData}
          onGoToEdit={() => setState(prev => ({ ...prev, dashboardTab: 'fixture_edit' }))}
        />
      )}

      {state.dashboardTab === 'fixture_edit' && (
        <DashboardFixtureEditSection
          fixtureData={state.fixtureData}
          selectedFixtureIndices={state.selectedFixtureIndices}
          inventoryCount={state.inventory.length}
          effectivePlan={effectivePlan}
          enabledManufacturers={fixtureEdit.enabledManufacturers}
          hasSavedPoint={fixtureEdit.hasSavedPoint}
          isDirtyAfterSave={fixtureEdit.isDirtyAfterSave}
          restoreToast={fixtureEdit.restoreToast}
          saveToast={fixtureEdit.saveToast}
          formattedSavedAt={fixtureEdit.formattedSavedAt}
          restoreDiffCount={fixtureEdit.fixtureRestoreDiffCount}
          restorePanelRef={fixtureEdit.restorePanelRef}
          onManufacturerToggle={fixtureEdit.onManufacturerToggle}
          onBulkToggle={fixtureEdit.onBulkToggle}
          onLengthToggle={fixtureEdit.onLengthToggle}
          onRestoreToSavedPoint={fixtureEdit.onRestoreToSavedPoint}
          onSaveSettings={fixtureEdit.onSaveSettings}
          onUpdateFixtureCell={fixtureEdit.onUpdateFixtureCell}
          onFixtureSheetChange={fixtureEdit.onFixtureSheetChange}
          onExpandFailClaim={fixtureEdit.onExpandFailClaim}
          onRequestDownloadExcel={fixtureEdit.onRequestFixtureExcelDownload}
          onRequestApplyToInventory={fixtureEdit.onRequestApplyFixtureToInventory}
          onGoToFixtureUpload={() => setState(prev => ({ ...prev, dashboardTab: 'fixture_upload' }))}
        />
      )}

      {state.dashboardTab === 'inventory_master' && (
        <DashboardInventoryMasterSection
          state={state}
          setState={setState}
          isReadOnly={isReadOnly}
          effectivePlan={effectivePlan}
          billableItemCount={billableItemCount}
          virtualSurgeryData={inventoryMaster.virtualSurgeryData}
          initialShowBaseStockEdit={inventoryMaster.initialShowBaseStockEdit}
          onBaseStockEditApplied={inventoryMaster.onBaseStockEditApplied}
          surgeryUnregisteredItems={surgeryUnregisteredItems}
          applyBaseStockBatch={inventoryMaster.applyBaseStockBatch}
          refreshLatestSurgeryUsage={inventoryMaster.refreshLatestSurgeryUsage}
          resolveManualSurgeryInput={inventoryMaster.resolveManualSurgeryInput}
          onAddOrder={onAddOrder}
          showAlertToast={inventoryMaster.onShowAlertToast}
        />
      )}

      <DashboardOperationalTabs
        dashboardTab={state.dashboardTab}
        user={state.user}
        inventory={state.inventory}
        surgeryMaster={state.surgeryMaster}
        orders={state.orders}
        isReadOnly={isReadOnly}
        effectivePlan={effectivePlan}
        isHospitalMaster={isHospitalMaster}
        isSystemAdmin={isSystemAdmin}
        hospitalWorkDays={state.hospitalWorkDays}
        planState={state.planState}
        isLoading={state.isLoading}
        surgeryUnregisteredItems={surgeryUnregisteredItems}
        showAuditHistory={showAuditHistory}
        onCloseAuditHistory={onCloseAuditHistory}
        onLoadHospitalData={onLoadHospitalData}
        onTabChange={(tab) => {
          if (tab === 'surgery_upload') {
            onSurgeryUploadClick();
            return;
          }
          setState(prev => ({ ...prev, dashboardTab: tab }));
        }}
        onWorkDaysChange={(workDays) => setState(prev => ({ ...prev, hospitalWorkDays: workDays }))}
        onAddFailOrder={onAddOrder}
        onUpdateOrderStatus={onUpdateOrderStatus}
        onDeleteOrder={onDeleteOrder}
        onQuickOrder={(item) => onAddOrder(buildQuickOrder(item))}
        onAuditSessionComplete={onAuditSessionComplete}
        initialShowFailBulkModal={initialShowFailBulkModal}
        onFailBulkModalOpened={onFailBulkModalOpened}
        onFailAuditDone={onFailAuditDone}
      />
    </div>
  );
};

export default DashboardWorkspaceSection;
