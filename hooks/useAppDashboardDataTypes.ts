import type { AppGlobalOverlaysProps } from '../components/app/AppGlobalOverlays';
import type { AppUserOverlayStackProps } from '../components/app/AppUserOverlayStack';
import type { DashboardWorkspaceSectionProps } from '../components/app/DashboardWorkspaceSection';

export type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;
export type GlobalOverlayPartialProps = Omit<AppGlobalOverlaysProps, 'pwaUpdateBar' | 'alertToast'>;
export type FixtureEditProps = DashboardWorkspaceSectionProps['fixtureEdit'];

export interface DashboardDataWorkspaceInput {
  fixtureEditState: {
    enabledManufacturers: FixtureEditProps['enabledManufacturers'];
    hasSavedPoint: FixtureEditProps['hasSavedPoint'];
    isDirtyAfterSave: FixtureEditProps['isDirtyAfterSave'];
    restoreToast: FixtureEditProps['restoreToast'];
    saveToast: FixtureEditProps['saveToast'];
    formattedSavedAt: FixtureEditProps['formattedSavedAt'];
    fixtureRestoreDiffCount: FixtureEditProps['fixtureRestoreDiffCount'];
    restorePanelRef: FixtureEditProps['restorePanelRef'];
  };
  fixtureEditActions: {
    onManufacturerToggle: FixtureEditProps['onManufacturerToggle'];
    onBulkToggle: FixtureEditProps['onBulkToggle'];
    onMarkUnusedBySurgery: FixtureEditProps['onMarkUnusedBySurgery'];
    onLengthToggle: FixtureEditProps['onLengthToggle'];
    onRestoreToSavedPoint: FixtureEditProps['onRestoreToSavedPoint'];
    onSaveSettings: FixtureEditProps['onSaveSettings'];
    onUpdateFixtureCell: FixtureEditProps['onUpdateFixtureCell'];
    onExpandFailClaim: FixtureEditProps['onExpandFailClaim'];
    onRequestFixtureExcelDownload: FixtureEditProps['onRequestFixtureExcelDownload'];
    onRequestApplyFixtureToInventory: FixtureEditProps['onRequestApplyFixtureToInventory'];
  };
  inventoryMaster: DashboardWorkspaceSectionProps['inventoryMaster'];
  returnRequests: DashboardWorkspaceSectionProps['returnRequests'];
  orderActions: Pick<
    DashboardWorkspaceSectionProps,
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
  stockCalcSettings: DashboardWorkspaceSectionProps['stockCalcSettings'];
  onStockCalcSettingsChange: DashboardWorkspaceSectionProps['onStockCalcSettingsChange'];
  onAuditSessionComplete: DashboardWorkspaceSectionProps['onAuditSessionComplete'];
  initialShowFailBulkModal: DashboardWorkspaceSectionProps['initialShowFailBulkModal'];
  onFailAuditDone: DashboardWorkspaceSectionProps['onFailAuditDone'];
  orderHistoryOnly: boolean;
  onboardingStep: DashboardWorkspaceSectionProps['onboardingStep'];
  onResumeOnboarding: DashboardWorkspaceSectionProps['onResumeOnboarding'];
}

export interface DashboardDataUserOverlayInput {
  shouldShowOnboarding: boolean;
  onboardingStep: number | null;
  showOnboardingToast: boolean;
  onboardingProgress: number;
  toastCompletedLabel: string | null;
  showOnboardingComplete: boolean;
  onOnboardingSkip: AppUserOverlayStackProps['onOnboardingSkip'];
  onReopenOnboarding: () => void;
  onGoToDataSetup: AppUserOverlayStackProps['onGoToDataSetup'];
  onGoToSurgeryUpload: AppUserOverlayStackProps['onGoToSurgeryUpload'];
  onGoToInventoryAudit: () => void;
  onGoToFailManagement: () => void;
  onOnboardingCompleteClose: () => void;
}

export interface DashboardDataGlobalOverlayInput {
  planLimitModal: GlobalOverlayPartialProps['planLimitModal'];
  inventoryCompare: GlobalOverlayPartialProps['inventoryCompare'];
  closePlanLimitModal: () => void;
  handleConfirmApplyToInventory: () => void;
  cancelInventoryCompare: () => void;
}

export type DashboardInventoryWorkspaceInput = Pick<
  DashboardDataWorkspaceInput,
  'inventoryMaster'
  | 'returnRequests'
  | 'orderActions'
  | 'stockCalcSettings'
  | 'onStockCalcSettingsChange'
  | 'orderHistoryOnly'
>;

export type DashboardFixtureWorkspaceInput = Pick<
  DashboardDataWorkspaceInput,
  'fixtureEditState'
  | 'fixtureEditActions'
  | 'onAuditSessionComplete'
  | 'initialShowFailBulkModal'
  | 'onFailAuditDone'
  | 'onboardingStep'
  | 'onResumeOnboarding'
>;
