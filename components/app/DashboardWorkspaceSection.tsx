import React, { Suspense, useMemo, useState } from 'react';
import { AppState, BillingCycle, ExcelData, InventoryItem, Order, OrderStatus, PlanType, PLAN_LIMITS, ReturnReason, ReturnRequest, ReturnStatus, ReturnMutationResult, SurgeryUnregisteredItem, User } from '../../types';
import { StockCalcSettings } from '../../services/hospitalSettingsService';
import MigrationBanner from '../MigrationBanner';
import { checkProfileGaps, hasProfileGaps } from '../../utils/profileCompleteness';
import UpgradeNudge, { NudgeType } from '../UpgradeNudge';
import PlanLimitToast, { LimitType } from '../PlanLimitToast';
import ReadOnlyBanner from '../ReadOnlyBanner';
import FeatureGate from '../FeatureGate';
import RawDataUploadGuide from '../RawDataUploadGuide';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
/* Lazy-loaded tab components — loaded only when user navigates to the tab */
const MemberManager = lazyWithRetry(() => import('../MemberManager'));
const DashboardFixtureEditSection = lazyWithRetry(() => import('./DashboardFixtureEditSection'));
const DashboardOverview = lazyWithRetry(() => import('../DashboardOverview'));
const DashboardInventoryMasterSection = lazyWithRetry(() => import('./DashboardInventoryMasterSection'));
const DashboardOperationalTabs = lazyWithRetry(() => import('../dashboard/DashboardOperationalTabs'));
import { ReceiptUpdate } from '../ReceiptConfirmationModal';
import { buildSurgeryUsageSet } from '../../services/fixtureUsageUtils';

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
  onMarkUnusedBySurgery: (usageSet: Set<string>) => void;
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
    forceApply?: boolean;
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
  failOrderCount?: number;
  planLimitToast: LimitType | null;
  billableItemCount: number;
  surgeryUnregisteredItems: SurgeryUnregisteredItem[];
  showAuditHistory: boolean;
  fixtureEdit: FixtureEditBindings;
  inventoryMaster: InventoryMasterBindings;
  returnRequests: ReturnRequest[];
  onLoadHospitalData: (user: User) => Promise<void>;
  onGoToPricing: () => void;
  onOpenPaymentModal?: (plan: PlanType, billing?: BillingCycle) => void;
  onOpenProfilePlan?: () => void;
  onDismissPlanLimitToast: () => void;
  onUpgradeFromPlanLimitToast: () => void;
  onStartOverviewTrial: () => Promise<void>;
  onFixtureUploadClick: () => void;
  onSurgeryUploadClick: () => void;
  onCloseAuditHistory: () => void;
  onAddOrder: (order: Order) => Promise<void>;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onCancelOrder: (orderId: string, reason: string) => Promise<void>;
  onDeleteOrder: (orderId: string) => Promise<void>;
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
  onAuditSessionComplete?: () => void;
  initialShowFailBulkModal?: boolean;
  onFailBulkModalOpened?: () => void;
  onFailAuditDone?: () => void;
  onboardingStep?: number | null;
  onResumeOnboarding?: () => void;
  onConfirmReceipt: (updates: ReceiptUpdate[], orderIdsToReceive: string[], silent?: boolean) => Promise<void>;
  orderHistoryOnly?: boolean;
  stockCalcSettings?: StockCalcSettings;
  onStockCalcSettingsChange?: (settings: StockCalcSettings) => Promise<void>;
}

const DashboardWorkspaceSection: React.FC<DashboardWorkspaceSectionProps> = ({
  state,
  setState,
  effectivePlan,
  isHospitalMaster,
  isSystemAdmin,
  isReadOnly,
  activeNudge,
  failOrderCount,
  planLimitToast,
  billableItemCount,
  surgeryUnregisteredItems,
  showAuditHistory,
  fixtureEdit,
  inventoryMaster,
  returnRequests,
  onLoadHospitalData,
  onGoToPricing,
  onOpenProfilePlan,
  onDismissPlanLimitToast,
  onUpgradeFromPlanLimitToast,
  onFixtureUploadClick,
  onSurgeryUploadClick,
  onCloseAuditHistory,
  onAddOrder,
  onUpdateOrderStatus,
  onCancelOrder,
  onDeleteOrder,
  onCreateReturn,
  onUpdateReturnStatus,
  onCompleteReturn,
  onDeleteReturn,
  onConfirmReceipt,
  showAlertToast,
  onAuditSessionComplete,
  initialShowFailBulkModal,
  onFailBulkModalOpened,
  onFailAuditDone,
  onboardingStep,
  onResumeOnboarding,
  orderHistoryOnly,
  stockCalcSettings,
  onStockCalcSettingsChange,
  onOpenPaymentModal,
}) => {
  const [profileBannerDismissed, setProfileBannerDismissed] = useState(false);

  const surgeryUsageSet = useMemo(
    () => buildSurgeryUsageSet(state.surgeryMaster),
    [state.surgeryMaster],
  );

  const profileGaps = useMemo(
    () => isHospitalMaster ? checkProfileGaps({
      phone: state.user?.phone,
      bizFileUrl: state.hospitalBizFileUrl,
    }) : null,
    [isHospitalMaster, state.user?.phone, state.hospitalBizFileUrl],
  );

  const buildQuickOrder = (item: InventoryItem, quantity?: number): Order => ({
    id: `order_${Date.now()}`,
    type: 'replenishment',
    manufacturer: item.manufacturer,
    date: new Date().toISOString().split('T')[0],
    items: [{ brand: item.brand, size: item.size, quantity: quantity ?? (item.recommendedStock - item.currentStock) }],
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
          failCount={failOrderCount}
          onUpgrade={onOpenProfilePlan ?? onGoToPricing}
        />
      )}

      {planLimitToast && (
        <PlanLimitToast
          type={planLimitToast}
          currentCount={billableItemCount}
          maxCount={PLAN_LIMITS.free.maxItems}
          onUpgrade={onOpenProfilePlan ?? onUpgradeFromPlanLimitToast}
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
          onUpgrade={onOpenProfilePlan ?? onGoToPricing}
        />
      )}

      {profileGaps && hasProfileGaps(profileGaps) && !profileBannerDismissed && (
        <div className="bg-sky-50 border border-sky-200 rounded-xl px-5 py-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <svg className="w-4 h-4 text-sky-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-sky-800">프로필 정보를 완성하세요</p>
                <p className="text-xs text-sky-600 mt-0.5">
                  미등록: {[profileGaps.missingPhone && '연락처', profileGaps.missingBizFile && '사업자등록증'].filter(Boolean).join(', ')}
                  <button
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, dashboardTab: 'settings' }))}
                    className="ml-2 font-bold underline underline-offset-2 hover:text-sky-700"
                  >
                    설정에서 등록 →
                  </button>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setProfileBannerDismissed(true)}
              aria-label="닫기"
              className="text-sky-400 hover:text-sky-600 flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {state.dashboardTab === 'overview' && (
        <Suspense fallback={null}>
          <DashboardOverview
            inventory={state.inventory}
            orders={state.orders}
            surgeryMaster={state.surgeryMaster}
            surgeryUnregisteredItems={surgeryUnregisteredItems}
            returnRequests={returnRequests}
            hospitalId={state.user?.hospitalId}
            hospitalWorkDays={state.hospitalWorkDays}
            onNavigate={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
            planState={state.planState}
            onboardingStep={onboardingStep}
            onResumeOnboarding={onResumeOnboarding}
            onSurgeryUploadClick={onSurgeryUploadClick}
            onUpgrade={onOpenProfilePlan ?? (() => onOpenPaymentModal ? onOpenPaymentModal('basic') : onGoToPricing())}
          />
        </Suspense>
      )}

      {state.dashboardTab === 'member_management' && state.user && (
        <FeatureGate feature="role_management" plan={effectivePlan} onOpenPaymentModal={onOpenPaymentModal} onOpenProfilePlan={onOpenProfilePlan}>
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
          surgeryUsageSet={surgeryUsageSet}
          onManufacturerToggle={fixtureEdit.onManufacturerToggle}
          onBulkToggle={fixtureEdit.onBulkToggle}
          onMarkUnusedBySurgery={fixtureEdit.onMarkUnusedBySurgery}
          onLengthToggle={fixtureEdit.onLengthToggle}
          onRestoreToSavedPoint={fixtureEdit.onRestoreToSavedPoint}
          onSaveSettings={fixtureEdit.onSaveSettings}
          onUpdateFixtureCell={fixtureEdit.onUpdateFixtureCell}
          onFixtureSheetChange={fixtureEdit.onFixtureSheetChange}
          onExpandFailClaim={fixtureEdit.onExpandFailClaim}
          onRequestDownloadExcel={fixtureEdit.onRequestFixtureExcelDownload}
          onRequestApplyToInventory={fixtureEdit.onRequestApplyFixtureToInventory}
          onGoToFixtureUpload={() => setState(prev => ({ ...prev, dashboardTab: 'fixture_upload' }))}
          onOpenPaymentModal={onOpenPaymentModal}
        />
      )}

      {state.dashboardTab === 'inventory_master' && (
        <Suspense fallback={null}>
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
            onCreateReturn={onCreateReturn}
            showAlertToast={inventoryMaster.onShowAlertToast}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
      <DashboardOperationalTabs
        dashboardTab={state.dashboardTab}
        user={state.user}
        inventory={state.inventory}
        surgeryMaster={state.surgeryMaster}
        orders={state.orders}
        returnRequests={returnRequests}
        isReadOnly={isReadOnly}
        effectivePlan={effectivePlan}
        isHospitalMaster={isHospitalMaster}
        isSystemAdmin={isSystemAdmin}
        hospitalWorkDays={state.hospitalWorkDays}
        planState={state.planState}
        isLoading={state.isLoading}
        surgeryUnregisteredItems={surgeryUnregisteredItems}
        showAuditHistory={showAuditHistory}
        onConfirmReceipt={onConfirmReceipt}
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
        onUpdateOrderStatus={onUpdateOrderStatus}
        onCancelOrder={onCancelOrder}
        onDeleteOrder={onDeleteOrder}
        onQuickOrder={(item, qty) => onAddOrder(buildQuickOrder(item, qty))}
        onCreateReturn={onCreateReturn}
        onUpdateReturnStatus={onUpdateReturnStatus}
        onCompleteReturn={onCompleteReturn}
        onDeleteReturn={onDeleteReturn}
        showAlertToast={showAlertToast}
        onGoToPricing={onGoToPricing}
        onOpenPaymentModal={onOpenPaymentModal}
        onOpenProfilePlan={onOpenProfilePlan}
        onAuditSessionComplete={onAuditSessionComplete}
        initialShowFailBulkModal={initialShowFailBulkModal}
        onFailBulkModalOpened={onFailBulkModalOpened}
        onFailAuditDone={onFailAuditDone}
        orderHistoryOnly={orderHistoryOnly}
        stockCalcSettings={stockCalcSettings}
        onStockCalcSettingsChange={onStockCalcSettingsChange}
      />
      </Suspense>
    </div>
  );
};

export default DashboardWorkspaceSection;
