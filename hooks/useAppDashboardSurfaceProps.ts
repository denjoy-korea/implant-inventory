import type { AppState, BillingCycle, PlanType, User } from '../types';
import type { ConfirmModalConfig } from '../stores/uiStore';
import type { ReviewType } from '../services/reviewService';
import type { DashboardWorkspaceSectionProps } from '../components/app/DashboardWorkspaceSection';
import type { AppUserOverlayStackProps } from '../components/app/AppUserOverlayStack';
import { useDashboardWorkspaceProps } from './useDashboardWorkspaceProps';
import { useAppUserOverlayProps } from './useAppUserOverlayProps';
import { useAppGlobalOverlayProps } from './useAppGlobalOverlayProps';
import type {
  DashboardDataGlobalOverlayInput,
  DashboardDataUserOverlayInput,
  DashboardDataWorkspaceInput,
} from './useAppDashboardDataTypes';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppDashboardSurfacePropsParams {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  handleDeleteAccount: () => void;
  showAlertToast: NotifyFn;
  fixtureFileRef: React.RefObject<HTMLInputElement | null>;
  surgeryFileRef: React.RefObject<HTMLInputElement | null>;
  effectivePlan: DashboardWorkspaceSectionProps['effectivePlan'];
  isHospitalAdmin: DashboardWorkspaceSectionProps['isHospitalAdmin'];
  isHospitalMaster: DashboardWorkspaceSectionProps['isHospitalMaster'];
  isSystemAdmin: DashboardWorkspaceSectionProps['isSystemAdmin'];
  isReadOnly: DashboardWorkspaceSectionProps['isReadOnly'];
  activeNudge: DashboardWorkspaceSectionProps['activeNudge'];
  failOrderCount: number;
  billableItemCount: number;
  reviewPopupType: ReviewType | null;
  setReviewPopupType: (value: ReviewType | null) => void;
  profileInitialTab: AppUserOverlayStackProps['initialProfileTab'];
  setProfileInitialTab: (value: AppUserOverlayStackProps['initialProfileTab']) => void;
  planLimitToast: DashboardWorkspaceSectionProps['planLimitToast'];
  setPlanLimitToast: (value: DashboardWorkspaceSectionProps['planLimitToast']) => void;
  showAuditHistory: boolean;
  setShowAuditHistory: (value: boolean) => void;
  setAutoOpenFailBulkModal: (value: boolean) => void;
  confirmModal: ConfirmModalConfig | null;
  setConfirmModal: (value: ConfirmModalConfig | null) => void;
  showMobileDashboardNav: boolean;
  surgeryUnregisteredItems: DashboardWorkspaceSectionProps['surgeryUnregisteredItems'];
  workspaceInput: DashboardDataWorkspaceInput;
  userOverlayInput: DashboardDataUserOverlayInput;
  globalOverlayInput: DashboardDataGlobalOverlayInput;
  handleOpenDirectPayment: (plan: PlanType, billing?: BillingCycle, isRenewal?: boolean) => void;
}

export function useAppDashboardSurfaceProps({
  state,
  setState,
  loadHospitalData,
  handleDeleteAccount,
  showAlertToast,
  fixtureFileRef,
  surgeryFileRef,
  effectivePlan,
  isHospitalAdmin,
  isHospitalMaster,
  isSystemAdmin,
  isReadOnly,
  activeNudge,
  failOrderCount,
  billableItemCount,
  reviewPopupType,
  setReviewPopupType,
  profileInitialTab,
  setProfileInitialTab,
  planLimitToast,
  setPlanLimitToast,
  showAuditHistory,
  setShowAuditHistory,
  setAutoOpenFailBulkModal,
  confirmModal,
  setConfirmModal,
  showMobileDashboardNav,
  surgeryUnregisteredItems,
  workspaceInput,
  userOverlayInput,
  globalOverlayInput,
  handleOpenDirectPayment,
}: UseAppDashboardSurfacePropsParams) {
  const workspaceProps = useDashboardWorkspaceProps({
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
    fixtureEditState: workspaceInput.fixtureEditState,
    fixtureEditActions: workspaceInput.fixtureEditActions,
    inventoryMaster: workspaceInput.inventoryMaster,
    setProfileInitialTab,
    setPlanLimitToast,
    setShowAuditHistory,
    setAutoOpenFailBulkModal,
    handleOpenDirectPayment,
    loadHospitalData,
    fixtureFileRef,
    surgeryFileRef,
    returnRequests: workspaceInput.returnRequests,
    showAlertToast,
    orderActions: workspaceInput.orderActions,
    stockCalcSettings: workspaceInput.stockCalcSettings,
    onStockCalcSettingsChange: workspaceInput.onStockCalcSettingsChange,
    onAuditSessionComplete: workspaceInput.onAuditSessionComplete,
    initialShowFailBulkModal: workspaceInput.initialShowFailBulkModal,
    onFailAuditDone: workspaceInput.onFailAuditDone,
    orderHistoryOnly: workspaceInput.orderHistoryOnly,
    onboardingStep: workspaceInput.onboardingStep,
    onResumeOnboarding: workspaceInput.onResumeOnboarding,
  });

  const userOverlayProps = useAppUserOverlayProps({
    state,
    setState,
    initialProfileTab: profileInitialTab,
    setProfileInitialTab,
    reviewPopupType,
    setReviewPopupType,
    shouldShowOnboarding: userOverlayInput.shouldShowOnboarding,
    onboardingStep: userOverlayInput.onboardingStep,
    showOnboardingToast: userOverlayInput.showOnboardingToast,
    onboardingProgress: userOverlayInput.onboardingProgress,
    toastCompletedLabel: userOverlayInput.toastCompletedLabel,
    showOnboardingComplete: userOverlayInput.showOnboardingComplete,
    setConfirmModal,
    handleDeleteAccount,
    handleOpenDirectPayment,
    showAlertToast,
    onOnboardingSkip: userOverlayInput.onOnboardingSkip,
    onReopenOnboarding: userOverlayInput.onReopenOnboarding,
    onGoToDataSetup: userOverlayInput.onGoToDataSetup,
    onGoToSurgeryUpload: userOverlayInput.onGoToSurgeryUpload,
    onGoToInventoryAudit: userOverlayInput.onGoToInventoryAudit,
    onGoToFailManagement: userOverlayInput.onGoToFailManagement,
    onOnboardingCompleteClose: userOverlayInput.onOnboardingCompleteClose,
  });

  const globalOverlayPartialProps = useAppGlobalOverlayProps({
    planLimitModal: globalOverlayInput.planLimitModal,
    confirmModal,
    inventoryCompare: globalOverlayInput.inventoryCompare,
    showMobileDashboardNav,
    showMobilePublicNav: false,
    closePlanLimitModal: globalOverlayInput.closePlanLimitModal,
    handleOpenDirectPayment,
    setConfirmModal,
    handleConfirmApplyToInventory: globalOverlayInput.handleConfirmApplyToInventory,
    cancelInventoryCompare: globalOverlayInput.cancelInventoryCompare,
  });

  return {
    workspaceProps,
    userOverlayProps,
    globalOverlayPartialProps,
  };
}
