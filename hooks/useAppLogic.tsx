import React from 'react';
import {
  AppState,
  User,
} from '../types';
import { useHashRouting } from './useHashRouting';
import { useInviteFlow } from './useInviteFlow';
import { useAppShellEffects } from './useAppShellEffects';
import { useAppViewportScaffold } from './useAppViewportScaffold';
import { useAppBillingControls } from './useAppBillingControls';
import { useAppRolePlanContext } from './useAppRolePlanContext';
import { useAppSessionActions } from './useAppSessionActions';
import { useAppDashboardCoordinator } from './useAppDashboardCoordinator';
import { useUIStore } from '../stores/uiStore';
import { usePaymentStore } from '../stores/paymentStore';
import { useFailStore } from '../stores/failStore';

interface UseAppLogicParams {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  handleDeleteAccount: () => void;
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
  fixtureFileRef: React.RefObject<HTMLInputElement | null>;
  surgeryFileRef: React.RefObject<HTMLInputElement | null>;
  dashboardHeaderRef: React.RefObject<HTMLElement | null>;
}

export function useAppLogic({
  state,
  setState,
  loadHospitalData,
  handleDeleteAccount,
  showAlertToast,
  fixtureFileRef,
  surgeryFileRef,
  dashboardHeaderRef,
}: UseAppLogicParams) {
  // ── UI overlay state (Zustand stores) ────────────────────────
  const {
    reviewPopupType, setReviewPopupType,
    profileInitialTab, setProfileInitialTab,
    planLimitToast, setPlanLimitToast,
    showAuditHistory, setShowAuditHistory,
    autoOpenBaseStockEdit, setAutoOpenBaseStockEdit,
    autoOpenFailBulkModal, setAutoOpenFailBulkModal,
    confirmModal, setConfirmModal,
  } = useUIStore();
  const {
    directPayment: paymentModalState, setDirectPayment: setPaymentModalState,
    billingProgramSaving: billingProgramSavingState, setBillingProgramSaving,
    billingProgramError: billingProgramErrorState, setBillingProgramError,
  } = usePaymentStore();
  const { pendingFailCandidates, setPendingFailCandidates } = useFailStore();

  // ── Invite flow ───────────────────────────────────────────────
  const { inviteInfo, processingInvite } = useInviteFlow(state.user, setState, showAlertToast);

  const {
    isSystemAdmin,
    isHospitalMaster,
    isHospitalAdmin,
    effectiveAccessRole,
    isUltimatePlan,
    effectivePlan,
    isReadOnly,
    billableItemCount,
    failOrderCount,
    activeNudge,
  } = useAppRolePlanContext({
    state: {
      hospitalMasterAdminId: state.hospitalMasterAdminId,
      inventory: state.inventory,
      orders: state.orders,
      planState: state.planState,
      user: state.user,
    },
  });

  useAppShellEffects({ state, setState, isSystemAdmin });

  const {
    requiresBillingProgramSetup,
    showDashboardSidebar,
    isSidebarCollapsed, setIsSidebarCollapsed,
    isSidebarToggleVisible, setIsSidebarToggleVisible,
    isFinePointer,
    isMobileMenuOpen, setIsMobileMenuOpen,
    mobileOrderNav, setMobileOrderNav,
    dashboardHeaderHeight, isOffline,
    showMobileDashboardNav,
    showMobilePublicNav,
    mobilePrimaryTabs,
  } = useAppViewportScaffold({ state, isSystemAdmin, dashboardHeaderRef });

  const {
    directPayment,
    setDirectPayment,
    refreshPlanState,
    billingProgramSaving,
    billingProgramError,
    handleSelectBillingProgram,
    handleRefreshBillingProgram,
    handleOpenDirectPayment,
  } = useAppBillingControls({
    state,
    setState,
    loadHospitalData,
    showAlertToast,
    directPayment: paymentModalState,
    setDirectPayment: setPaymentModalState,
    billingProgramSaving: billingProgramSavingState,
    setBillingProgramSaving,
    billingProgramError: billingProgramErrorState,
    setBillingProgramError,
  });

  useHashRouting(state, effectiveAccessRole, setState);

  const { handleSignOut } = useAppSessionActions({ setState });
  const {
    uploadingTypeRef,
    handleFileUpload,
    handleFailDetectionClose,
    surgeryUnregisteredItems,
    workspaceProps,
    userOverlayProps,
    globalOverlayPartialProps,
  } = useAppDashboardCoordinator({
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
    requiresBillingProgramSetup,
    billableItemCount,
    failOrderCount,
    activeNudge,
    showMobileDashboardNav,
    mobileOrderNav,
    reviewPopupType,
    setReviewPopupType,
    profileInitialTab,
    setProfileInitialTab,
    planLimitToast,
    setPlanLimitToast,
    showAuditHistory,
    setShowAuditHistory,
    autoOpenBaseStockEdit,
    setAutoOpenBaseStockEdit,
    autoOpenFailBulkModal,
    setAutoOpenFailBulkModal,
    confirmModal,
    setConfirmModal,
    setPendingFailCandidates,
    handleOpenDirectPayment,
  });

  return {
    // State values needed in App.tsx directly
    isSystemAdmin, isHospitalAdmin, isHospitalMaster, isUltimatePlan, effectivePlan,
    effectiveAccessRole, isReadOnly, requiresBillingProgramSetup, showDashboardSidebar,
    isOffline, showMobileDashboardNav, showMobilePublicNav, dashboardHeaderHeight,
    isSidebarCollapsed, setIsSidebarCollapsed,
    isSidebarToggleVisible, setIsSidebarToggleVisible,
    isFinePointer, isMobileMenuOpen, setIsMobileMenuOpen,
    mobileOrderNav, setMobileOrderNav, mobilePrimaryTabs,
    // Invite
    inviteInfo, processingInvite,
    // File upload
    uploadingTypeRef, handleFileUpload,
    // Audit history
    setShowAuditHistory,
    // Review / profile
    // Direct payment
    directPayment, setDirectPayment,
    refreshPlanState,
    // Billing program
    billingProgramSaving, billingProgramError,
    handleSelectBillingProgram, handleRefreshBillingProgram,
    // Fail candidates
    pendingFailCandidates, setPendingFailCandidates, handleFailDetectionClose,
    // Common actions
    handleSignOut,
    handleOpenDirectPayment,
    billableItemCount,
    surgeryUnregisteredItems,
    // Prop bundles
    workspaceProps,
    userOverlayProps,
    globalOverlayPartialProps,
  };
}
