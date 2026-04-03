import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  AppState, BillingCycle, BillingProgram, DashboardTab,
  ExcelData, PLAN_LIMITS, PLAN_NAMES, PLAN_ORDER, PlanType, User, isSystemAdminRole,
} from '../types';
import { authService } from '../services/authService';
import { hospitalService } from '../services/hospitalService';
import { StockCalcSettings, DEFAULT_STOCK_CALC_SETTINGS } from '../services/hospitalSettingsService';
import { planService } from '../services/planService';
import { onboardingService } from '../services/onboardingService';
import { isExchangePrefix } from '../services/appUtils';
import { reviewService } from '../services/reviewService';
import { pageViewService } from '../services/pageViewService';
import { supabase } from '../services/supabaseClient';
import { useInventoryCompare } from './useInventoryCompare';
import { useFixtureEditControls } from './useFixtureEditControls';
import { useUIState } from './useUIState';
import { useOnboarding } from './useOnboarding';
import { useHashRouting } from './useHashRouting';
import { useReturnHandlers } from './useReturnHandlers';
import { useFileUpload } from './useFileUpload';
import { useSurgeryUnregistered } from './useSurgeryUnregistered';
import { useOrderHandlers } from './useOrderHandlers';
import { useInventorySync } from './useInventorySync';
import { useSurgeryManualFix } from './useSurgeryManualFix';
import { useBaseStockBatch } from './useBaseStockBatch';
import { useInviteFlow } from './useInviteFlow';
import { useRefreshSurgeryUsage } from './useRefreshSurgeryUsage';
import type { NudgeType } from '../components/UpgradeNudge';
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

const LAST_ACTIVE_TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

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
    directPayment, setDirectPayment,
    billingProgramSaving, setBillingProgramSaving,
    billingProgramError, setBillingProgramError,
  } = usePaymentStore();
  const { pendingFailCandidates, setPendingFailCandidates } = useFailStore();

  // ── Review popup ──────────────────────────────────────────────
  useEffect(() => {
    const user = state.user;
    if (!user || state.currentView !== 'dashboard' || reviewPopupType) return;
    if (isSystemAdminRole(user.role, user.email)) return;
    supabase.auth.getUser().then(({ data }) => {
      const accountCreatedAt = data.user?.created_at;
      if (!accountCreatedAt) return;
      reviewService.checkWritable(user.id, accountCreatedAt).then(status => {
        if (status.canInitial && !reviewService.isSnoozed(user.id, 'initial')) {
          setReviewPopupType('initial');
        } else if (status.can6Month && !reviewService.isSnoozed(user.id, '6month')) {
          setReviewPopupType('6month');
        }
      }).catch(() => { });
    }).catch(() => { });
  }, [state.user, state.currentView, reviewPopupType]);

  // ── Billing program ───────────────────────────────────────────
  const handleSelectBillingProgram = useCallback(async (program: BillingProgram) => {
    if (!state.user?.hospitalId) return;
    setBillingProgramSaving(true);
    setBillingProgramError('');
    try {
      await hospitalService.updateBillingProgram(state.user.hospitalId, program);
      setState(prev => ({ ...prev, hospitalBillingProgram: program }));
      showAlertToast('청구프로그램 설정이 저장되었습니다.', 'success');
    } catch (error) {
      setBillingProgramError(error instanceof Error ? error.message : '청구프로그램 저장에 실패했습니다.');
    } finally {
      setBillingProgramSaving(false);
    }
  }, [setState, showAlertToast, state.user?.hospitalId]);

  const handleRefreshBillingProgram = useCallback(async () => {
    if (!state.user) return;
    setBillingProgramError('');
    await loadHospitalData(state.user);
  }, [loadHospitalData, state.user]);

  useEffect(() => {
    const requiresBillingProgramSetup = (
      state.currentView === 'dashboard' && !!state.user?.hospitalId &&
      (state.user?.status === 'active' || state.user?.status === 'readonly') &&
      !isSystemAdminRole(state.user?.role, state.user?.email) && !state.hospitalBillingProgram
    );
    if (requiresBillingProgramSetup) return;
    if (billingProgramError) setBillingProgramError('');
    if (billingProgramSaving) setBillingProgramSaving(false);
  }, [billingProgramError, billingProgramSaving, state]);

  // ── Invite flow ───────────────────────────────────────────────
  const { inviteInfo, processingInvite } = useInviteFlow(state.user, setState, showAlertToast);

  // ── Role / plan derivations ───────────────────────────────────
  const isSystemAdmin = isSystemAdminRole(state.user?.role, state.user?.email);
  const isHospitalMaster = state.user?.role === 'master'
    || (!!state.user?.id && state.user.id === state.hospitalMasterAdminId);
  const isHospitalAdmin = isHospitalMaster || isSystemAdmin;
  const effectiveAccessRole = (isHospitalMaster || isSystemAdmin) ? 'master' : (state.user?.role ?? 'dental_staff');
  const isUltimatePlan = isSystemAdmin || state.planState?.plan === 'ultimate';
  const effectivePlan: PlanType = isUltimatePlan ? 'ultimate' : (state.planState?.plan ?? 'free');
  const isReadOnly = state.user?.status === 'readonly';

  // ── File upload ───────────────────────────────────────────────
  const { handleFileUpload, uploadingTypeRef } = useFileUpload({
    hospitalBillingProgram: state.hospitalBillingProgram,
    user: state.user,
    surgeryMaster: state.surgeryMaster,
    effectivePlan,
    setState,
    showAlertToast,
    setPendingFailCandidates,
  });

  // ── Derived display booleans ──────────────────────────────────
  const requiresBillingProgramSetup = (
    state.currentView === 'dashboard' && !!state.user?.hospitalId &&
    (state.user?.status === 'active' || state.user?.status === 'readonly') &&
    !isSystemAdmin && !state.hospitalBillingProgram
  );
  const showDashboardSidebar = state.currentView === 'dashboard'
    && !requiresBillingProgramSetup
    && (!isSystemAdmin || state.adminViewMode === 'user');
  const showStandardDashboardHeader = state.currentView === 'dashboard'
    && !requiresBillingProgramSetup
    && !(isSystemAdmin && state.adminViewMode !== 'user');

  const {
    isSidebarCollapsed, setIsSidebarCollapsed,
    isSidebarToggleVisible, setIsSidebarToggleVisible,
    isFinePointer, isNarrowViewport,
    isMobileMenuOpen, setIsMobileMenuOpen,
    mobileOrderNav, setMobileOrderNav,
    dashboardHeaderHeight, isOffline,
    showMobileDashboardNav,
  } = useUIState({ showDashboardSidebar, showStandardDashboardHeader, dashboardHeaderRef, dashboardTab: state.dashboardTab });

  const isPublicBottomNavView = ['landing', 'value', 'pricing', 'contact', 'analyze', 'notices', 'reviews'].includes(state.currentView);
  const showMobilePublicNav = isPublicBottomNavView && isNarrowViewport;
  const mobilePrimaryTabs: DashboardTab[] = ['overview', 'inventory_master', 'order_management'];

  // ── Global effects ────────────────────────────────────────────
  useEffect(() => {
    if (state.currentView === 'admin_panel' && !isSystemAdmin) {
      setState(prev => ({ ...prev, currentView: prev.user ? 'dashboard' : 'homepage' }));
    }
  }, [state.currentView, isSystemAdmin, setState]);

  useEffect(() => {
    if (!state.isLoading && state.user && (state.currentView === 'login' || state.currentView === 'signup')) {
      setState(prev => ({ ...prev, currentView: 'dashboard' }));
    }
  }, [state.isLoading, state.user, state.currentView, setState]);

  useEffect(() => { pageViewService.track(state.currentView); }, [state.currentView]);

  useEffect(() => {
    if (!state.user?.id) return;

    let unmounted = false;
    let inFlight = false;
    const touchLastActive = () => {
      if (unmounted || inFlight) return;
      inFlight = true;
      authService.touchLastActiveAt()
        .catch(() => { })
        .finally(() => { inFlight = false; });
    };

    touchLastActive();
    const intervalId = window.setInterval(touchLastActive, LAST_ACTIVE_TOUCH_INTERVAL_MS);
    const handleWindowFocus = () => touchLastActive();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') touchLastActive();
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unmounted = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.user?.id]);

  // ── Nudge / billing item count ────────────────────────────────
  const billableItemCount = useMemo(
    () => state.inventory.filter(i => !isExchangePrefix(i.manufacturer) && i.manufacturer !== '보험청구').length,
    [state.inventory]
  );
  const failOrderCount = useMemo(() => state.orders.filter(o => o.type === 'fail_exchange').length, [state.orders]);
  const activeNudge = useMemo<NudgeType | null>(() => {
    const ps = state.planState;
    if (!ps) return null;
    if (ps.plan === 'free' && ps.trialUsed && !ps.isTrialActive) return 'trial_expired';
    if (ps.plan === 'free' && !ps.trialUsed && ps.expiresAt && new Date(ps.expiresAt) < new Date()) return 'subscription_expired';
    if (ps.isTrialActive && ps.trialDaysRemaining <= 3) return 'trial_ending';
    if (ps.plan === 'free' && !ps.isTrialActive && ps.retentionDaysLeft !== undefined && ps.retentionDaysLeft <= 7) return 'data_expiry_warning';
    if (ps.plan === 'free' && !ps.isTrialActive && billableItemCount >= PLAN_LIMITS.free.maxItems * 0.9) return 'item_limit_warning';
    if (ps.plan === 'free' && !ps.isTrialActive && ps.uploadLimitExceeded === true) return 'upload_limit';
    if (ps.plan === 'free' && !ps.isTrialActive && failOrderCount > 0) return 'fail_locked';
    return null;
  }, [state.planState, billableItemCount, failOrderCount]);

  // ── Onboarding ────────────────────────────────────────────────
  const {
    setOnboardingDismissed,
    setForcedOnboardingStep,
    toastCompletedLabel, showOnboardingComplete, setShowOnboardingComplete,
    firstIncompleteStep, onboardingStep, shouldShowOnboarding,
    showOnboardingToast, onboardingProgress,
  } = useOnboarding({
    user: state.user, isLoading: state.isLoading, currentView: state.currentView,
    dashboardTab: state.dashboardTab, inventoryLength: state.inventory.length,
    surgeryMaster: state.surgeryMaster, requiresBillingProgramSetup,
    planState: state.planState,
  });

  useHashRouting(state, effectiveAccessRole, setState);

  // ── Core data hooks ───────────────────────────────────────────
  const { resolveManualSurgeryInput } = useSurgeryManualFix(
    state.surgeryMaster, state.inventory, state.user?.hospitalId, setState,
  );
  const { applyBaseStockBatch } = useBaseStockBatch(
    state.inventory, state.user?.hospitalId, setState, showAlertToast,
  );
  const stockCalcSettingsRef = useRef<StockCalcSettings>(DEFAULT_STOCK_CALC_SETTINGS);
  const { syncInventoryWithUsageAndOrders, computeUsageByInventoryFromRecords } = useInventorySync(
    state.surgeryMaster, state.orders, state.inventory.length, setState, stockCalcSettingsRef,
  );
  const { refreshLatestSurgeryUsage } = useRefreshSurgeryUsage(
    state.user?.hospitalId, effectivePlan, state.inventory,
    computeUsageByInventoryFromRecords, showAlertToast,
  );
  const {
    returnRequests, handleCreateReturn, handleUpdateReturnStatus,
    handleCompleteReturn, handleDeleteReturn, handleStockCalcSettingsChange,
  } = useReturnHandlers({
    hospitalId: state.user?.hospitalId, inventory: state.inventory,
    user: state.user, setState, stockCalcSettingsRef, syncInventoryWithUsageAndOrders,
  });
  const { handleAddOrder, handleUpdateOrderStatus, handleDeleteOrder, handleCancelOrder, handleConfirmReceipt } =
    useOrderHandlers({
      hospitalId: state.user?.hospitalId, orders: state.orders, inventory: state.inventory,
      surgeryMaster: state.surgeryMaster, user: state.user, setState, showAlertToast, handleCreateReturn,
    });

  const handleOpenDirectPayment = useCallback((plan: PlanType, billing: BillingCycle = 'monthly', isRenewal = false) => {
    setDirectPayment({ plan, billing, isRenewal });
  }, []);

  // ── Fixture edit ──────────────────────────────────────────────
  const {
    enabledManufacturers, hasSavedPoint, isDirtyAfterSave, restoreToast, saveToast,
    formattedSavedAt, fixtureRestoreDiffCount, restorePanelRef,
    handleBulkToggle, handleMarkUnusedBySurgery, handleManufacturerToggle, handleLengthToggle,
    handleRestoreToSavedPoint, handleSaveSettings, handleExpandFailClaim, handleUpdateCell,
  } = useFixtureEditControls({ fixtureData: state.fixtureData, setState, showAlertToast });

  const handleSaveSettingsAndProceed = useCallback((): boolean => {
    const saved = handleSaveSettings();
    if (!saved) return false;
    if (state.currentView !== 'dashboard') return true;
    if (state.dashboardTab !== 'fixture_edit') return true;
    if (!state.user?.hospitalId) return true;
    if (!isHospitalAdmin) return true;
    if (firstIncompleteStep !== 5 && firstIncompleteStep !== 6) return true;
    onboardingService.markFixtureSaved(state.user.hospitalId);
    onboardingService.clearDismissed(state.user.hospitalId);
    setOnboardingDismissed(false);
    setForcedOnboardingStep(6);
    setState(prev => ({ ...prev, dashboardTab: 'overview' }));
    return true;
  }, [firstIncompleteStep, handleSaveSettings, isHospitalAdmin, setState, state.currentView, state.dashboardTab, state.user?.hospitalId]);

  // ── Inventory compare ─────────────────────────────────────────
  const {
    inventoryCompare, planLimitModal,
    handleApplyToInventory, handleConfirmApplyToInventory,
    cancelInventoryCompare, closePlanLimitModal,
  } = useInventoryCompare({
    fixtureData: state.fixtureData, inventory: state.inventory,
    user: state.user, setState, effectivePlan, billableItemCount, showAlertToast,
    onAppliedSuccess: () => {
      const hid = state.user?.hospitalId ?? '';
      if (hid) {
        onboardingService.markWelcomeSeen(hid);
        onboardingService.markFixtureDownloaded(hid);
        onboardingService.markFixtureSaved(hid);
        onboardingService.clearDismissed(hid);
      }
      setOnboardingDismissed(false);
      setForcedOnboardingStep(6);
      setState(prev => ({ ...prev, dashboardTab: 'overview' }));
    },
  });

  // FAIL 감지 모달 닫기 — 온보딩 미완료 상태이면 wizard 자동 재개
  const handleFailDetectionClose = useCallback(() => {
    setPendingFailCandidates([]);
    if (firstIncompleteStep !== null) {
      const hid = state.user?.hospitalId ?? '';
      if (hid) onboardingService.clearDismissed(hid);
      setOnboardingDismissed(false);
      setForcedOnboardingStep(firstIncompleteStep);
    }
  }, [firstIncompleteStep, state.user?.hospitalId]);

  // ── Confirm callbacks ─────────────────────────────────────────
  const requestFixtureExcelDownload = useCallback(() => {
    if (!state.fixtureData) return;
    const fixtureData = state.fixtureData;
    const selectedIndices = state.selectedFixtureIndices[fixtureData.activeSheetName] || new Set();
    setConfirmModal({
      title: '엑셀 다운로드',
      message: '현재 설정 상태로 엑셀 파일을 다운로드합니다.',
      tip: '다운로드한 파일은 덴트웹 → 환경설정 → 임플란트 픽스처 설정에서 등록하세요.',
      confirmLabel: '다운로드', confirmColor: 'amber',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const now = new Date();
          const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
          const { downloadExcelFile } = await import('../services/excelService');
          await downloadExcelFile(fixtureData, selectedIndices, `픽스쳐_${yyyymmdd}.xlsx`);
        } catch (error) {
          console.error('[App] Excel download failed:', error);
          showAlertToast('엑셀 다운로드 중 오류가 발생했습니다.', 'error');
        }
      },
    });
  }, [state.fixtureData, state.selectedFixtureIndices, showAlertToast]);

  const requestApplyFixtureToInventory = useCallback(() => {
    setConfirmModal({
      title: '재고 마스터 반영',
      message: '현재 설정 상태를 재고 마스터에 반영합니다.\n반영 후 수술기록 업로드 가이드로 이동합니다.',
      tip: '엑셀 다운로드를 아직 하지 않으셨다면 먼저 다운로드해주세요.',
      confirmLabel: '반영하기', confirmColor: 'indigo',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
      onConfirm: () => { setConfirmModal(null); handleApplyToInventory(); },
    });
  }, [handleApplyToInventory]);

  // ── Surgery / inventory ───────────────────────────────────────
  const virtualSurgeryData = useMemo((): ExcelData | null => {
    const masterRows = state.surgeryMaster['수술기록지'];
    if (!masterRows || masterRows.length === 0) return null;
    const sortedColumns = ['날짜', '환자정보', '치아번호', '갯수', '수술기록', '구분', '제조사', '브랜드', '규격(SIZE)', '골질', '초기고정'];
    return { sheets: { '수술기록지': { name: '수술기록지', columns: sortedColumns, rows: masterRows } }, activeSheetName: '수술기록지' } as ExcelData;
  }, [state.surgeryMaster]);

  const surgeryUnregisteredItems = useSurgeryUnregistered(state.surgeryMaster, state.inventory, state.fixtureData);

  // ── Common sign-out helper ────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    await authService.signOut();
    setState(prev => ({ ...prev, user: null, currentView: 'homepage' }));
  }, [setState]);

  // ── workspaceProps bundle ─────────────────────────────────────
  const workspaceProps = useMemo(() => ({
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
    fixtureEdit: {
      enabledManufacturers,
      hasSavedPoint,
      isDirtyAfterSave,
      restoreToast,
      saveToast,
      formattedSavedAt,
      fixtureRestoreDiffCount,
      restorePanelRef,
      onManufacturerToggle: handleManufacturerToggle,
      onBulkToggle: handleBulkToggle,
      onMarkUnusedBySurgery: handleMarkUnusedBySurgery,
      onLengthToggle: handleLengthToggle,
      onRestoreToSavedPoint: handleRestoreToSavedPoint,
      onSaveSettings: handleSaveSettingsAndProceed,
      onUpdateFixtureCell: (idx: number, col: string, val: boolean | string | number) => handleUpdateCell(idx, col, val, 'fixture'),
      onFixtureSheetChange: (name: string) => setState(prev => ({ ...prev, fixtureData: { ...prev.fixtureData!, activeSheetName: name } })),
      onExpandFailClaim: handleExpandFailClaim,
      onRequestFixtureExcelDownload: requestFixtureExcelDownload,
      onRequestApplyFixtureToInventory: requestApplyFixtureToInventory,
    },
    inventoryMaster: {
      virtualSurgeryData,
      initialShowBaseStockEdit: autoOpenBaseStockEdit,
      onBaseStockEditApplied: () => {
        const hid = state.user?.hospitalId ?? '';
        onboardingService.markInventoryAuditSeen(hid);
        onboardingService.clearDismissed(hid);
        setOnboardingDismissed(false);
        setAutoOpenBaseStockEdit(false);
        setForcedOnboardingStep(7);
        setState(prev => ({ ...prev, dashboardTab: 'overview' }));
      },
      applyBaseStockBatch,
      refreshLatestSurgeryUsage,
      resolveManualSurgeryInput,
      onShowAlertToast: showAlertToast,
    },
    onLoadHospitalData: loadHospitalData,
    onGoToPricing: () => setState(prev => ({ ...prev, currentView: 'pricing' })),
    onOpenPaymentModal: handleOpenDirectPayment,
    onOpenProfilePlan: () => {
      setProfileInitialTab('plan');
      setState(prev => ({ ...prev, showProfile: true }));
    },
    onDismissPlanLimitToast: () => setPlanLimitToast(null),
    onUpgradeFromPlanLimitToast: () => {
      setPlanLimitToast(null);
      handleOpenDirectPayment('basic');
    },
    onStartOverviewTrial: async () => {
      if (state.user?.hospitalId) {
        const ok = await planService.startTrial(state.user.hospitalId);
        if (ok) {
          const ps = await planService.getHospitalPlan(state.user.hospitalId);
          setState(prev => ({ ...prev, planState: ps }));
        }
      }
    },
    onFixtureUploadClick: () => fixtureFileRef.current?.click(),
    onSurgeryUploadClick: () => surgeryFileRef.current?.click(),
    onCloseAuditHistory: () => setShowAuditHistory(false),
    returnRequests,
    showAlertToast,
    onAddOrder: handleAddOrder,
    onUpdateOrderStatus: handleUpdateOrderStatus,
    onConfirmReceipt: handleConfirmReceipt,
    onCancelOrder: handleCancelOrder,
    onDeleteOrder: handleDeleteOrder,
    onCreateReturn: handleCreateReturn,
    onUpdateReturnStatus: handleUpdateReturnStatus,
    onCompleteReturn: handleCompleteReturn,
    onDeleteReturn: handleDeleteReturn,
    stockCalcSettings: stockCalcSettingsRef.current,
    onStockCalcSettingsChange: handleStockCalcSettingsChange,
    onAuditSessionComplete: () => {
      const hid = state.user?.hospitalId ?? '';
      onboardingService.markInventoryAuditSeen(hid);
      if (!onboardingService.isFailAuditDone(hid)) {
        onboardingService.clearDismissed(hid);
        setOnboardingDismissed(false);
        setForcedOnboardingStep(7);
        setState(prev => ({ ...prev, dashboardTab: 'overview' }));
      }
    },
    initialShowFailBulkModal: autoOpenFailBulkModal,
    onFailBulkModalOpened: () => setAutoOpenFailBulkModal(false),
    onFailAuditDone: () => {
      const user = state.user;
      const hid = user?.hospitalId ?? '';
      const wasAlreadyDone = onboardingService.isFailAuditDone(hid);
      onboardingService.markFailAuditDone(hid);
      if (!wasAlreadyDone) setShowOnboardingComplete(true);
      if (user) loadHospitalData(user);
    },
    orderHistoryOnly: showMobileDashboardNav && mobileOrderNav === 'receipt',
    onboardingStep: firstIncompleteStep,
    onResumeOnboarding: firstIncompleteStep != null ? () => {
      const hid = state.user?.hospitalId ?? '';
      onboardingService.clearDismissed(hid);
      setOnboardingDismissed(false);
      setForcedOnboardingStep(firstIncompleteStep);
    } : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    effectivePlan, isHospitalAdmin, isHospitalMaster, isSystemAdmin, isReadOnly,
    activeNudge, failOrderCount, planLimitToast, billableItemCount, surgeryUnregisteredItems,
    showAuditHistory, enabledManufacturers, hasSavedPoint, isDirtyAfterSave, restoreToast,
    saveToast, formattedSavedAt, fixtureRestoreDiffCount, returnRequests,
    virtualSurgeryData, autoOpenBaseStockEdit, autoOpenFailBulkModal,
    firstIncompleteStep, showMobileDashboardNav, mobileOrderNav,
    handleManufacturerToggle, handleBulkToggle, handleMarkUnusedBySurgery, handleLengthToggle, handleRestoreToSavedPoint,
    handleSaveSettingsAndProceed, handleUpdateCell, handleExpandFailClaim,
    requestFixtureExcelDownload, requestApplyFixtureToInventory,
    applyBaseStockBatch, refreshLatestSurgeryUsage, resolveManualSurgeryInput,
    loadHospitalData, handleOpenDirectPayment,
    handleAddOrder, handleUpdateOrderStatus, handleConfirmReceipt, handleCancelOrder,
    handleDeleteOrder, handleCreateReturn, handleUpdateReturnStatus, handleCompleteReturn,
    handleDeleteReturn, handleStockCalcSettingsChange, showAlertToast,
    state.user?.hospitalId, setState,
  ]);

  // ── userOverlayProps bundle ───────────────────────────────────
  const userOverlayProps = useMemo(() => ({
    user: state.user,
    showProfile: state.showProfile,
    initialProfileTab: profileInitialTab,
    planState: state.planState,
    hospitalName: state.hospitalName,
    inventory: state.inventory,
    reviewPopupType,
    shouldShowOnboarding,
    onboardingStep,
    showOnboardingToast,
    onboardingProgress,
    toastCompletedLabel,
    onCloseProfile: async () => {
      setState(prev => ({ ...prev, showProfile: false }));
      setProfileInitialTab(undefined);
      // 프로필 닫힐 때 planState 갱신 (구독 취소·다운그레이드·크레딧 변경 반영)
      const hospitalId = state.user?.hospitalId;
      if (hospitalId) {
        try {
          const ps = await planService.getHospitalPlan(hospitalId);
          setState(prev => ({ ...prev, planState: ps }));
        } catch { /* silent */ }
      }
    },
    onDeleteAccount: handleDeleteAccount,
    onChangePlan: async (plan: PlanType, billing: BillingCycle) => {
      const currentPlan = state.planState?.plan ?? 'free';
      const isDowngrade = PLAN_ORDER[plan] < PLAN_ORDER[currentPlan] && currentPlan !== 'free';

      if (isDowngrade) {
        // 크레딧 예상 금액 미리 계산
        let creditPreview = 0;
        if (state.user?.hospitalId) {
          creditPreview = await planService.estimateDowngradeCredit(state.user.hospitalId, currentPlan, plan);
        }
        const creditMsg = creditPreview > 0
          ? `약 ${creditPreview.toLocaleString('ko-KR')}원이 크레딧으로 적립됩니다.\n다음 결제 시 원하는 금액만큼 사용할 수 있습니다.`
          : '잔여 구독 금액은 크레딧으로 적립되어 다음 결제 시 사용할 수 있습니다.';

        // 다운그레이드: 확인 후 즉시 전환 + 크레딧 적립
        setConfirmModal({
          title: `${PLAN_NAMES[currentPlan]} → ${PLAN_NAMES[plan]} 다운그레이드`,
          message: `${PLAN_NAMES[plan]} 플랜으로 즉시 전환됩니다.\n${creditMsg}`,
          confirmLabel: '다운그레이드',
          confirmColor: 'amber',
          onConfirm: async () => {
            setConfirmModal(null);
            setState(prev => ({ ...prev, showProfile: false }));
            if (!state.user?.hospitalId) return;
            try {
              const result = await planService.executeDowngrade(state.user.hospitalId, plan, billing);
              const ps = await planService.getHospitalPlan(state.user.hospitalId);
              setState(prev => ({ ...prev, planState: ps }));
              const creditMsg = result.creditAdded > 0
                ? ` ${result.creditAdded.toLocaleString('ko-KR')}원이 크레딧으로 적립되었습니다.`
                : '';
              showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${creditMsg}`, 'success');
            } catch {
              showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
            }
          },
        });
        return;
      }

      setState(prev => ({ ...prev, showProfile: false }));
      handleOpenDirectPayment(plan, billing, plan === currentPlan);
    },
    onReviewSubmitted: () => {
      setReviewPopupType(null);
      showAlertToast('후기를 남겨주셔서 감사합니다!', 'success');
    },
    onDismissReview: () => setReviewPopupType(null),
    onOnboardingSkip: (snooze: boolean) => {
      if (state.user?.hospitalId) {
        onboardingService.markDismissed(state.user.hospitalId);
        if (snooze) onboardingService.snoozeUntilTomorrow(state.user.hospitalId);
      }
      setForcedOnboardingStep(null);
      setOnboardingDismissed(true);
    },
    onReopenOnboarding: () => {
      if (state.user?.hospitalId) {
        onboardingService.clearDismissed(state.user.hospitalId);
        onboardingService.clearSnooze(state.user.hospitalId);
      }
      setForcedOnboardingStep(null);
      setOnboardingDismissed(false);
      setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'overview' }));
    },
    onGoToDataSetup: (file?: File, sizeCorrections?: Map<string, string>) => {
      if (file) {
        const hid = state.user?.hospitalId;
        setState(prev => ({ ...prev, currentView: 'dashboard' }));
        handleFileUpload(file, 'fixture', sizeCorrections).then(ok => {
          if (ok && hid) onboardingService.markFixtureSaved(hid);
        });
      } else {
        setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fixture_upload' }));
      }
    },
    onGoToSurgeryUpload: async (file?: File) => {
      if (file) {
        setState(prev => ({ ...prev, currentView: 'dashboard' }));
        return await handleFileUpload(file, 'surgery');
      } else {
        setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'surgery_database' }));
        return false;
      }
    },
    onGoToInventoryAudit: () => {
      setForcedOnboardingStep(null);
      setAutoOpenBaseStockEdit(true);
      setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'inventory_master' }));
    },
    onGoToFailManagement: () => {
      setForcedOnboardingStep(null);
      setAutoOpenFailBulkModal(true);
      setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fail_management' }));
    },
    showOnboardingComplete,
    onOnboardingCompleteClose: () => {
      setShowOnboardingComplete(false);
      setState(prev => ({ ...prev, dashboardTab: 'overview' }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [
    state.user, state.showProfile, state.planState, state.hospitalName, state.inventory,
    profileInitialTab, reviewPopupType, shouldShowOnboarding, onboardingStep,
    showOnboardingToast, onboardingProgress, toastCompletedLabel, showOnboardingComplete,
    handleDeleteAccount, handleOpenDirectPayment, handleFileUpload, showAlertToast, setState,
  ]);

  // ── globalOverlay partial props (pwaUpdateBar + alertToast added in App.tsx) ──
  const globalOverlayPartialProps = useMemo(() => ({
    planLimitModal,
    confirmModal,
    inventoryCompare,
    showMobileDashboardNav,
    showMobilePublicNav,
    onClosePlanLimitModal: closePlanLimitModal,
    onUpgradePlan: (plan: PlanType, billing: BillingCycle) => { handleOpenDirectPayment(plan, billing); },
    onCloseConfirmModal: () => setConfirmModal(null),
    onConfirmInventoryCompare: handleConfirmApplyToInventory,
    onCancelInventoryCompare: cancelInventoryCompare,
  }), [
    planLimitModal, confirmModal, inventoryCompare, showMobileDashboardNav, showMobilePublicNav,
    closePlanLimitModal, handleOpenDirectPayment, handleConfirmApplyToInventory, cancelInventoryCompare,
  ]);

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
    reviewPopupType, profileInitialTab, setProfileInitialTab,
    // Direct payment
    directPayment, setDirectPayment,
    refreshPlanState: async () => {
      const hospitalId = state.user?.hospitalId;
      if (!hospitalId) return;
      try {
        const ps = await planService.getHospitalPlan(hospitalId);
        setState(prev => ({ ...prev, planState: ps }));
      } catch { /* silent */ }
    },
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
