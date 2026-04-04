import { useCallback, useMemo } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import type {
  AppState,
  BillingCycle,
  PlanType,
  User,
} from '../types';
import { planService } from '../services/planService';
import type { DashboardWorkspaceSectionProps } from '../components/app/DashboardWorkspaceSection';

type WorkspaceProps = Omit<DashboardWorkspaceSectionProps, 'state' | 'setState'>;
type NotifyFn = DashboardWorkspaceSectionProps['showAlertToast'];

interface UseDashboardWorkspacePropsParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  effectivePlan: WorkspaceProps['effectivePlan'];
  isHospitalAdmin: WorkspaceProps['isHospitalAdmin'];
  isHospitalMaster: WorkspaceProps['isHospitalMaster'];
  isSystemAdmin: WorkspaceProps['isSystemAdmin'];
  isReadOnly: WorkspaceProps['isReadOnly'];
  activeNudge: WorkspaceProps['activeNudge'];
  failOrderCount: number;
  planLimitToast: WorkspaceProps['planLimitToast'];
  billableItemCount: number;
  surgeryUnregisteredItems: WorkspaceProps['surgeryUnregisteredItems'];
  showAuditHistory: boolean;
  fixtureEditState: {
    enabledManufacturers: WorkspaceProps['fixtureEdit']['enabledManufacturers'];
    hasSavedPoint: WorkspaceProps['fixtureEdit']['hasSavedPoint'];
    isDirtyAfterSave: WorkspaceProps['fixtureEdit']['isDirtyAfterSave'];
    restoreToast: WorkspaceProps['fixtureEdit']['restoreToast'];
    saveToast: WorkspaceProps['fixtureEdit']['saveToast'];
    formattedSavedAt: WorkspaceProps['fixtureEdit']['formattedSavedAt'];
    fixtureRestoreDiffCount: WorkspaceProps['fixtureEdit']['fixtureRestoreDiffCount'];
    restorePanelRef: WorkspaceProps['fixtureEdit']['restorePanelRef'];
  };
  fixtureEditActions: {
    onManufacturerToggle: WorkspaceProps['fixtureEdit']['onManufacturerToggle'];
    onBulkToggle: WorkspaceProps['fixtureEdit']['onBulkToggle'];
    onMarkUnusedBySurgery: WorkspaceProps['fixtureEdit']['onMarkUnusedBySurgery'];
    onLengthToggle: WorkspaceProps['fixtureEdit']['onLengthToggle'];
    onRestoreToSavedPoint: WorkspaceProps['fixtureEdit']['onRestoreToSavedPoint'];
    onSaveSettings: WorkspaceProps['fixtureEdit']['onSaveSettings'];
    onUpdateFixtureCell: WorkspaceProps['fixtureEdit']['onUpdateFixtureCell'];
    onExpandFailClaim: WorkspaceProps['fixtureEdit']['onExpandFailClaim'];
    onRequestFixtureExcelDownload: WorkspaceProps['fixtureEdit']['onRequestFixtureExcelDownload'];
    onRequestApplyFixtureToInventory: WorkspaceProps['fixtureEdit']['onRequestApplyFixtureToInventory'];
  };
  inventoryMaster: WorkspaceProps['inventoryMaster'];
  setProfileInitialTab: (value: 'info' | 'plan' | 'security' | 'reviews' | undefined) => void;
  setPlanLimitToast: (value: WorkspaceProps['planLimitToast']) => void;
  setShowAuditHistory: (value: boolean) => void;
  setAutoOpenFailBulkModal: (value: boolean) => void;
  handleOpenDirectPayment: (plan: PlanType, billing?: BillingCycle, isRenewal?: boolean) => void;
  loadHospitalData: (user: User) => Promise<void>;
  fixtureFileRef: RefObject<HTMLInputElement | null>;
  surgeryFileRef: RefObject<HTMLInputElement | null>;
  returnRequests: WorkspaceProps['returnRequests'];
  showAlertToast: NotifyFn;
  orderActions: Pick<
    WorkspaceProps,
    'onAddOrder'
    | 'onUpdateOrderStatus'
    | 'onConfirmReceipt'
    | 'onCancelOrder'
    | 'onDeleteOrder'
    | 'onCreateReturn'
    | 'onUpdateReturnStatus'
    | 'onCompleteReturn'
    | 'onDeleteReturn'
  >;
  stockCalcSettings: WorkspaceProps['stockCalcSettings'];
  onStockCalcSettingsChange: WorkspaceProps['onStockCalcSettingsChange'];
  onAuditSessionComplete: WorkspaceProps['onAuditSessionComplete'];
  initialShowFailBulkModal: WorkspaceProps['initialShowFailBulkModal'];
  onFailAuditDone: WorkspaceProps['onFailAuditDone'];
  orderHistoryOnly: boolean;
  onboardingStep: WorkspaceProps['onboardingStep'];
  onResumeOnboarding: WorkspaceProps['onResumeOnboarding'];
}

export function useDashboardWorkspaceProps({
  state,
  setState,
  effectivePlan,
  isHospitalAdmin,
  isHospitalMaster,
  isSystemAdmin,
  isReadOnly,
  activeNudge,
  failOrderCount,
  planLimitToast,
  billableItemCount,
  surgeryUnregisteredItems,
  showAuditHistory,
  fixtureEditState,
  fixtureEditActions,
  inventoryMaster,
  setProfileInitialTab,
  setPlanLimitToast,
  setShowAuditHistory,
  setAutoOpenFailBulkModal,
  handleOpenDirectPayment,
  loadHospitalData,
  fixtureFileRef,
  surgeryFileRef,
  returnRequests,
  showAlertToast,
  orderActions,
  stockCalcSettings,
  onStockCalcSettingsChange,
  onAuditSessionComplete,
  initialShowFailBulkModal,
  onFailAuditDone,
  orderHistoryOnly,
  onboardingStep,
  onResumeOnboarding,
}: UseDashboardWorkspacePropsParams): WorkspaceProps {
  const handleFixtureSheetChange = useCallback((sheetName: string) => {
    setState(prev => ({ ...prev, fixtureData: { ...prev.fixtureData!, activeSheetName: sheetName } }));
  }, [setState]);

  const handleGoToPricing = useCallback(() => {
    setState(prev => ({ ...prev, currentView: 'pricing' }));
  }, [setState]);

  const handleOpenProfilePlan = useCallback(() => {
    setProfileInitialTab('plan');
    setState(prev => ({ ...prev, showProfile: true }));
  }, [setProfileInitialTab, setState]);

  const handleDismissPlanLimitToast = useCallback(() => {
    setPlanLimitToast(null);
  }, [setPlanLimitToast]);

  const handleUpgradeFromPlanLimitToast = useCallback(() => {
    setPlanLimitToast(null);
    handleOpenDirectPayment('basic');
  }, [handleOpenDirectPayment, setPlanLimitToast]);

  const handleStartOverviewTrial = useCallback(async () => {
    if (!state.user?.hospitalId) return;
    const ok = await planService.startTrial(state.user.hospitalId);
    if (!ok) return;
    const ps = await planService.getHospitalPlan(state.user.hospitalId);
    setState(prev => ({ ...prev, planState: ps }));
  }, [setState, state.user?.hospitalId]);

  const handleFixtureUploadClick = useCallback(() => {
    fixtureFileRef.current?.click();
  }, [fixtureFileRef]);

  const handleSurgeryUploadClick = useCallback(() => {
    surgeryFileRef.current?.click();
  }, [surgeryFileRef]);

  const handleCloseAuditHistory = useCallback(() => {
    setShowAuditHistory(false);
  }, [setShowAuditHistory]);

  const handleFailBulkModalOpened = useCallback(() => {
    setAutoOpenFailBulkModal(false);
  }, [setAutoOpenFailBulkModal]);

  const fixtureEdit = useMemo<WorkspaceProps['fixtureEdit']>(() => ({
    ...fixtureEditState,
    ...fixtureEditActions,
    onFixtureSheetChange: handleFixtureSheetChange,
  }), [fixtureEditActions, fixtureEditState, handleFixtureSheetChange]);

  return useMemo(() => ({
    effectivePlan,
    isHospitalAdmin,
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
    onLoadHospitalData: loadHospitalData,
    onGoToPricing: handleGoToPricing,
    onOpenPaymentModal: handleOpenDirectPayment,
    onOpenProfilePlan: handleOpenProfilePlan,
    onDismissPlanLimitToast: handleDismissPlanLimitToast,
    onUpgradeFromPlanLimitToast: handleUpgradeFromPlanLimitToast,
    onStartOverviewTrial: handleStartOverviewTrial,
    onFixtureUploadClick: handleFixtureUploadClick,
    onSurgeryUploadClick: handleSurgeryUploadClick,
    onCloseAuditHistory: handleCloseAuditHistory,
    returnRequests,
    showAlertToast,
    ...orderActions,
    stockCalcSettings,
    onStockCalcSettingsChange,
    onAuditSessionComplete,
    initialShowFailBulkModal,
    onFailBulkModalOpened: handleFailBulkModalOpened,
    onFailAuditDone,
    orderHistoryOnly,
    onboardingStep,
    onResumeOnboarding,
  }), [
    activeNudge,
    billableItemCount,
    effectivePlan,
    failOrderCount,
    fixtureEdit,
    handleCloseAuditHistory,
    handleDismissPlanLimitToast,
    handleFailBulkModalOpened,
    handleFixtureUploadClick,
    handleGoToPricing,
    handleOpenDirectPayment,
    handleOpenProfilePlan,
    handleStartOverviewTrial,
    handleSurgeryUploadClick,
    handleUpgradeFromPlanLimitToast,
    initialShowFailBulkModal,
    inventoryMaster,
    isHospitalAdmin,
    isHospitalMaster,
    isReadOnly,
    isSystemAdmin,
    loadHospitalData,
    onAuditSessionComplete,
    onFailAuditDone,
    onResumeOnboarding,
    onStockCalcSettingsChange,
    onboardingStep,
    orderActions,
    orderHistoryOnly,
    planLimitToast,
    returnRequests,
    showAlertToast,
    showAuditHistory,
    stockCalcSettings,
    surgeryUnregisteredItems,
  ]);
}
