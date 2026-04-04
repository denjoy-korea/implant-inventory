import React from 'react';
import type {
  AppState,
  FailCandidate,
  PlanType,
  User,
} from '../types';
import type { ConfirmModalConfig } from '../stores/uiStore';
import { useFileUpload } from './useFileUpload';
import { useOnboarding } from './useOnboarding';
import { useAppOnboardingActions } from './useAppOnboardingActions';
import { useAppInventoryCompareFlow } from './useAppInventoryCompareFlow';
import { useFixtureEditControls } from './useFixtureEditControls';
import type {
  DashboardDataGlobalOverlayInput,
  DashboardDataUserOverlayInput,
  DashboardFixtureWorkspaceInput,
} from './useAppDashboardDataTypes';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppDashboardFixtureFlowParams {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  showAlertToast: NotifyFn;
  effectivePlan: PlanType;
  isHospitalAdmin: boolean;
  requiresBillingProgramSetup: boolean;
  billableItemCount: number;
  autoOpenFailBulkModal: boolean;
  setAutoOpenBaseStockEdit: (value: boolean) => void;
  setAutoOpenFailBulkModal: (value: boolean) => void;
  setPendingFailCandidates: (value: FailCandidate[]) => void;
  setConfirmModal: (value: ConfirmModalConfig | null) => void;
}

export function useAppDashboardFixtureFlow({
  state,
  setState,
  loadHospitalData,
  showAlertToast,
  effectivePlan,
  isHospitalAdmin,
  requiresBillingProgramSetup,
  billableItemCount,
  autoOpenFailBulkModal,
  setAutoOpenBaseStockEdit,
  setAutoOpenFailBulkModal,
  setPendingFailCandidates,
  setConfirmModal,
}: UseAppDashboardFixtureFlowParams) {
  const { handleFileUpload, uploadingTypeRef } = useFileUpload({
    hospitalBillingProgram: state.hospitalBillingProgram,
    user: state.user,
    surgeryMaster: state.surgeryMaster,
    effectivePlan,
    setState,
    showAlertToast,
    setPendingFailCandidates,
  });

  const {
    setOnboardingDismissed,
    setForcedOnboardingStep,
    toastCompletedLabel, showOnboardingComplete, setShowOnboardingComplete,
    firstIncompleteStep, onboardingStep, shouldShowOnboarding,
    showOnboardingToast, onboardingProgress,
  } = useOnboarding({
    user: state.user,
    isLoading: state.isLoading,
    currentView: state.currentView,
    dashboardTab: state.dashboardTab,
    inventoryLength: state.inventory.length,
    surgeryMaster: state.surgeryMaster,
    requiresBillingProgramSetup,
    planState: state.planState,
  });

  const {
    enabledManufacturers, hasSavedPoint, isDirtyAfterSave, restoreToast, saveToast,
    formattedSavedAt, fixtureRestoreDiffCount, restorePanelRef,
    handleBulkToggle, handleMarkUnusedBySurgery, handleManufacturerToggle, handleLengthToggle,
    handleRestoreToSavedPoint, handleSaveSettings, handleExpandFailClaim, handleUpdateCell,
  } = useFixtureEditControls({ fixtureData: state.fixtureData, setState, showAlertToast });

  const {
    handleSaveSettingsAndProceed,
    handleFixtureInventoryApplied,
    handleFailDetectionClose,
    handleBaseStockEditApplied,
    handleAuditSessionComplete,
    handleFailAuditDone,
    handleResumeOnboarding,
    handleOnboardingSkip,
    handleReopenOnboarding,
    handleGoToDataSetup,
    handleGoToSurgeryUpload,
    handleGoToInventoryAudit,
    handleGoToFailManagement,
    handleOnboardingCompleteClose,
  } = useAppOnboardingActions({
    state,
    isHospitalAdmin,
    firstIncompleteStep,
    handleSaveSettings,
    handleFileUpload,
    loadHospitalData,
    setState,
    setPendingFailCandidates,
    setOnboardingDismissed,
    setForcedOnboardingStep,
    setAutoOpenBaseStockEdit,
    setAutoOpenFailBulkModal,
    setShowOnboardingComplete,
  });

  const {
    inventoryCompare,
    planLimitModal,
    requestFixtureExcelDownload,
    requestApplyFixtureToInventory,
    handleConfirmApplyToInventory,
    closePlanLimitModal,
    cancelInventoryCompare,
  } = useAppInventoryCompareFlow({
    fixtureData: state.fixtureData,
    selectedFixtureIndices: state.selectedFixtureIndices,
    inventory: state.inventory,
    user: state.user,
    setState,
    effectivePlan,
    billableItemCount,
    setConfirmModal,
    showAlertToast,
    onAppliedSuccess: handleFixtureInventoryApplied,
  });

  return {
    uploadingTypeRef,
    handleFileUpload,
    handleFailDetectionClose,
    handleBaseStockEditApplied,
    workspaceFixtureInput: {
      fixtureEditState: {
        enabledManufacturers,
        hasSavedPoint,
        isDirtyAfterSave,
        restoreToast,
        saveToast,
        formattedSavedAt,
        fixtureRestoreDiffCount,
        restorePanelRef,
      },
      fixtureEditActions: {
        onManufacturerToggle: handleManufacturerToggle,
        onBulkToggle: handleBulkToggle,
        onMarkUnusedBySurgery: handleMarkUnusedBySurgery,
        onLengthToggle: handleLengthToggle,
        onRestoreToSavedPoint: handleRestoreToSavedPoint,
        onSaveSettings: handleSaveSettingsAndProceed,
        onUpdateFixtureCell: (idx: number, col: string, val: boolean | string | number) => handleUpdateCell(idx, col, val, 'fixture'),
        onExpandFailClaim: handleExpandFailClaim,
        onRequestFixtureExcelDownload: requestFixtureExcelDownload,
        onRequestApplyFixtureToInventory: requestApplyFixtureToInventory,
      },
      onAuditSessionComplete: handleAuditSessionComplete,
      initialShowFailBulkModal: autoOpenFailBulkModal,
      onFailAuditDone: handleFailAuditDone,
      onboardingStep: firstIncompleteStep,
      onResumeOnboarding: handleResumeOnboarding,
    } satisfies DashboardFixtureWorkspaceInput,
    userOverlayInput: {
      shouldShowOnboarding,
      onboardingStep,
      showOnboardingToast,
      onboardingProgress,
      toastCompletedLabel,
      showOnboardingComplete,
      onOnboardingSkip: handleOnboardingSkip,
      onReopenOnboarding: handleReopenOnboarding,
      onGoToDataSetup: handleGoToDataSetup,
      onGoToSurgeryUpload: handleGoToSurgeryUpload,
      onGoToInventoryAudit: handleGoToInventoryAudit,
      onGoToFailManagement: handleGoToFailManagement,
      onOnboardingCompleteClose: handleOnboardingCompleteClose,
    } satisfies DashboardDataUserOverlayInput,
    globalOverlayInput: {
      planLimitModal,
      inventoryCompare,
      closePlanLimitModal,
      handleConfirmApplyToInventory,
      cancelInventoryCompare,
    } satisfies DashboardDataGlobalOverlayInput,
  };
}
