import React from 'react';
import type { AppState, FailCandidate, User } from '../types';
import type { ConfirmModalConfig } from '../stores/uiStore';
import type { ReviewType } from '../services/reviewService';
import type { DashboardWorkspaceSectionProps } from '../components/app/DashboardWorkspaceSection';
import type { AppUserOverlayStackProps } from '../components/app/AppUserOverlayStack';
import { useAppReviewPopup } from './useAppReviewPopup';
import { useAppDashboardDataOps } from './useAppDashboardDataOps';
import { useAppDashboardSurfaceProps } from './useAppDashboardSurfaceProps';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppDashboardCoordinatorParams {
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
  requiresBillingProgramSetup: boolean;
  billableItemCount: number;
  failOrderCount: number;
  activeNudge: DashboardWorkspaceSectionProps['activeNudge'];
  showMobileDashboardNav: boolean;
  mobileOrderNav: 'order' | 'receipt';
  reviewPopupType: ReviewType | null;
  setReviewPopupType: (value: ReviewType | null) => void;
  profileInitialTab: AppUserOverlayStackProps['initialProfileTab'];
  setProfileInitialTab: (value: AppUserOverlayStackProps['initialProfileTab']) => void;
  planLimitToast: DashboardWorkspaceSectionProps['planLimitToast'];
  setPlanLimitToast: (value: DashboardWorkspaceSectionProps['planLimitToast']) => void;
  showAuditHistory: boolean;
  setShowAuditHistory: (value: boolean) => void;
  autoOpenBaseStockEdit: boolean;
  setAutoOpenBaseStockEdit: (value: boolean) => void;
  autoOpenFailBulkModal: boolean;
  setAutoOpenFailBulkModal: (value: boolean) => void;
  confirmModal: ConfirmModalConfig | null;
  setConfirmModal: (value: ConfirmModalConfig | null) => void;
  setPendingFailCandidates: (value: FailCandidate[]) => void;
  handleOpenDirectPayment: (plan: import('../types').PlanType, billing?: import('../types').BillingCycle, isRenewal?: boolean) => void;
}

export function useAppDashboardCoordinator({
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
}: UseAppDashboardCoordinatorParams) {
  useAppReviewPopup({
    user: state.user,
    currentView: state.currentView,
    reviewPopupType,
    setReviewPopupType,
  });

  const {
    uploadingTypeRef,
    handleFileUpload,
    handleFailDetectionClose,
    surgeryUnregisteredItems,
    workspaceInput,
    userOverlayInput,
    globalOverlayInput,
  } = useAppDashboardDataOps({
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
  });

  const {
    workspaceProps,
    userOverlayProps,
    globalOverlayPartialProps,
  } = useAppDashboardSurfaceProps({
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
  });

  return {
    uploadingTypeRef,
    handleFileUpload,
    handleFailDetectionClose,
    surgeryUnregisteredItems,
    workspaceProps,
    userOverlayProps,
    globalOverlayPartialProps,
  };
}
