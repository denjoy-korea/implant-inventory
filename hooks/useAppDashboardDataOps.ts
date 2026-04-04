import React from 'react';
import type {
  AppState,
  FailCandidate,
  PlanType,
  User,
} from '../types';
import type { ConfirmModalConfig } from '../stores/uiStore';
import { useAppDashboardFixtureFlow } from './useAppDashboardFixtureFlow';
import { useAppDashboardInventoryOps } from './useAppDashboardInventoryOps';
import type {
  DashboardDataGlobalOverlayInput,
  DashboardDataUserOverlayInput,
  DashboardDataWorkspaceInput,
} from './useAppDashboardDataTypes';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppDashboardDataOpsParams {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  showAlertToast: NotifyFn;
  effectivePlan: PlanType;
  isHospitalAdmin: boolean;
  requiresBillingProgramSetup: boolean;
  billableItemCount: number;
  showMobileDashboardNav: boolean;
  mobileOrderNav: 'order' | 'receipt';
  autoOpenBaseStockEdit: boolean;
  autoOpenFailBulkModal: boolean;
  setAutoOpenBaseStockEdit: (value: boolean) => void;
  setAutoOpenFailBulkModal: (value: boolean) => void;
  setPendingFailCandidates: (value: FailCandidate[]) => void;
  setConfirmModal: (value: ConfirmModalConfig | null) => void;
}

export type {
  DashboardDataGlobalOverlayInput,
  DashboardDataUserOverlayInput,
  DashboardDataWorkspaceInput,
} from './useAppDashboardDataTypes';

export function useAppDashboardDataOps({
  state,
  setState,
  loadHospitalData,
  showAlertToast,
  effectivePlan,
  isHospitalAdmin,
  requiresBillingProgramSetup,
  billableItemCount,
  showMobileDashboardNav,
  mobileOrderNav,
  autoOpenBaseStockEdit,
  autoOpenFailBulkModal,
  setAutoOpenBaseStockEdit,
  setAutoOpenFailBulkModal,
  setPendingFailCandidates,
  setConfirmModal,
}: UseAppDashboardDataOpsParams) {
  const {
    surgeryUnregisteredItems,
    inventoryMasterInput,
    orderReturnInput,
  } = useAppDashboardInventoryOps({
    state,
    setState,
    effectivePlan,
    showAlertToast,
    showMobileDashboardNav,
    mobileOrderNav,
  });

  const {
    uploadingTypeRef,
    handleFileUpload,
    handleFailDetectionClose,
    handleBaseStockEditApplied,
    workspaceFixtureInput,
    userOverlayInput,
    globalOverlayInput,
  } = useAppDashboardFixtureFlow({
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
  });

  return {
    uploadingTypeRef,
    handleFileUpload,
    handleFailDetectionClose,
    surgeryUnregisteredItems,
    workspaceInput: {
      ...workspaceFixtureInput,
      inventoryMaster: {
        ...inventoryMasterInput,
        initialShowBaseStockEdit: autoOpenBaseStockEdit,
        onBaseStockEditApplied: handleBaseStockEditApplied,
      },
      ...orderReturnInput,
    } satisfies DashboardDataWorkspaceInput,
    userOverlayInput: userOverlayInput satisfies DashboardDataUserOverlayInput,
    globalOverlayInput: globalOverlayInput satisfies DashboardDataGlobalOverlayInput,
  };
}
