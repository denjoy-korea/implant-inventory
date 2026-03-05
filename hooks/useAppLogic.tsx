import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState, BillingCycle, BillingProgram, DashboardTab,
  ExcelData, FailCandidate, PLAN_LIMITS, PlanType, User,
} from '../types';
import { authService } from '../services/authService';
import { hospitalService } from '../services/hospitalService';
import { StockCalcSettings, DEFAULT_STOCK_CALC_SETTINGS } from '../services/hospitalSettingsService';
import { planService } from '../services/planService';
import { onboardingService } from '../services/onboardingService';
import { isExchangePrefix } from '../services/appUtils';
import { reviewService, ReviewType } from '../services/reviewService';
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
import type { LimitType } from '../components/PlanLimitToast';

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
  // ── UI overlay state ──────────────────────────────────────────
  const [reviewPopupType, setReviewPopupType] = useState<ReviewType | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'info' | 'plan' | 'security' | 'reviews' | undefined>(undefined);
  const [planLimitToast, setPlanLimitToast] = useState<LimitType | null>(null);
  const [directPayment, setDirectPayment] = useState<{ plan: PlanType; billing: BillingCycle } | null>(null);
  const [billingProgramSaving, setBillingProgramSaving] = useState(false);
  const [billingProgramError, setBillingProgramError] = useState('');
  const [pendingFailCandidates, setPendingFailCandidates] = useState<FailCandidate[]>([]);
  const [showAuditHistory, setShowAuditHistory] = useState(false);
  const [autoOpenBaseStockEdit, setAutoOpenBaseStockEdit] = useState(false);
  const [autoOpenFailBulkModal, setAutoOpenFailBulkModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    title: string; message: string; tip?: string;
    confirmLabel?: string; confirmColor?: 'indigo' | 'rose' | 'amber' | 'emerald';
    icon?: React.ReactNode; onConfirm: () => void;
  } | null>(null);

  // ── Review popup ──────────────────────────────────────────────
  useEffect(() => {
    const user = state.user;
    if (!user || state.currentView !== 'dashboard' || reviewPopupType) return;
    if (user.role === 'admin') return;
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
      state.user?.role !== 'admin' && !state.hospitalBillingProgram
    );
    if (requiresBillingProgramSetup) return;
    if (billingProgramError) setBillingProgramError('');
    if (billingProgramSaving) setBillingProgramSaving(false);
  }, [billingProgramError, billingProgramSaving, state]);

  // ── Invite flow ───────────────────────────────────────────────
  const { inviteInfo, processingInvite } = useInviteFlow(state.user, setState, showAlertToast);

  // ── Role / plan derivations ───────────────────────────────────
  const isSystemAdmin = state.user?.role === 'admin';
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
      setState(prev => ({ ...prev, currentView: prev.user ? 'dashboard' : 'landing' }));
    }
  }, [state.currentView, isSystemAdmin, setState]);

  useEffect(() => {
    if (!state.isLoading && state.user && (state.currentView === 'login' || state.currentView === 'signup')) {
      setState(prev => ({ ...prev, currentView: 'dashboard' }));
    }
  }, [state.isLoading, state.user, state.currentView, setState]);

  useEffect(() => { pageViewService.track(state.currentView); }, [state.currentView]);

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

  const handleOpenDirectPayment = useCallback((plan: PlanType, billing: BillingCycle = 'monthly') => {
    setDirectPayment({ plan, billing });
  }, []);

  // ── Fixture edit ──────────────────────────────────────────────
  const {
    enabledManufacturers, hasSavedPoint, isDirtyAfterSave, restoreToast, saveToast,
    formattedSavedAt, fixtureRestoreDiffCount, restorePanelRef,
    handleBulkToggle, handleManufacturerToggle, handleLengthToggle,
    handleRestoreToSavedPoint, handleSaveSettings, handleExpandFailClaim, handleUpdateCell,
  } = useFixtureEditControls({ fixtureData: state.fixtureData, setState, showAlertToast });

  const handleSaveSettingsAndProceed = useCallback((): boolean => {
    const saved = handleSaveSettings();
    if (!saved) return false;
    if (state.currentView !== 'dashboard') return true;
    if (state.dashboardTab !== 'fixture_edit') return true;
    if (!state.user?.hospitalId) return true;
    if (!isHospitalAdmin) return true;
    if (firstIncompleteStep !== 3 && firstIncompleteStep !== 4) return true;
    onboardingService.markFixtureSaved(state.user.hospitalId);
    onboardingService.clearDismissed(state.user.hospitalId);
    setOnboardingDismissed(false);
    setForcedOnboardingStep(4);
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
      setForcedOnboardingStep(4);
      setState(prev => ({ ...prev, dashboardTab: 'overview' }));
    },
  });

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

  const surgeryUnregisteredItems = useSurgeryUnregistered(state.surgeryMaster, state.inventory);

  // ── Common sign-out helper ────────────────────────────────────
  const handleSignOut = useCallback(async () => {
    await authService.signOut();
    setState(prev => ({ ...prev, user: null, currentView: 'landing' }));
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
    handleManufacturerToggle, handleBulkToggle, handleLengthToggle, handleRestoreToSavedPoint,
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
    onCloseProfile: () => {
      setState(prev => ({ ...prev, showProfile: false }));
      setProfileInitialTab(undefined);
    },
    onDeleteAccount: handleDeleteAccount,
    onChangePlan: (plan: PlanType, billing: BillingCycle) => {
      setState(prev => ({ ...prev, showProfile: false }));
      handleOpenDirectPayment(plan, billing);
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
    onUpgradePlan: () => { closePlanLimitModal(); handleOpenDirectPayment('basic'); },
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
    // Billing program
    billingProgramSaving, billingProgramError,
    handleSelectBillingProgram, handleRefreshBillingProgram,
    // Fail candidates
    pendingFailCandidates, setPendingFailCandidates,
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
