
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useAppState } from './hooks/useAppState';
/* ── Static imports (always needed) ── */
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import BillingProgramGate from './components/BillingProgramGate';
import MobileDashboardNav from './components/dashboard/MobileDashboardNav';
import AppGlobalOverlays from './components/app/AppGlobalOverlays';
import DashboardHeader from './components/app/DashboardHeader';
import type { NudgeType } from './components/UpgradeNudge';
import type { LimitType } from './components/PlanLimitToast';

/* ── Lazy imports (route-level code splitting) ── */
const FailDetectionModal = lazy(() => import('./components/fail/FailDetectionModal'));
const DashboardGuardedContent = lazy(() => import('./components/app/DashboardGuardedContent'));
const AppPublicRouteSection = lazy(() => import('./components/app/AppPublicRouteSection'));
const SystemAdminDashboard = lazy(() => import('./components/SystemAdminDashboard'));
const AppUserOverlayStack = lazy(() => import('./components/app/AppUserOverlayStack'));
const DirectPaymentModal = lazy(() => import('./components/DirectPaymentModal'));
import AccountSuspendedScreen from './components/AccountSuspendedScreen';
import { ExcelData, DashboardTab, InventoryItem, PlanType, BillingCycle, PLAN_LIMITS, BillingProgram, canAccessTab, FailCandidate } from './types';
// excelService는 xlsx(~500 kB)를 포함하므로 이벤트 시점에 동적 import
import { authService } from './services/authService';
import { hospitalService } from './services/hospitalService';
import { StockCalcSettings, DEFAULT_STOCK_CALC_SETTINGS } from './services/hospitalSettingsService';
import { planService } from './services/planService';
import { securityMaintenanceService } from './services/securityMaintenanceService';
import { supabase } from './services/supabaseClient';
import { onboardingService } from './services/onboardingService';
import { isExchangePrefix } from './services/appUtils';
import { useToast } from './hooks/useToast';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import { reviewService, ReviewType } from './services/reviewService';
import { pageViewService } from './services/pageViewService';
import { useInventoryCompare } from './hooks/useInventoryCompare';
import { useFixtureEditControls } from './hooks/useFixtureEditControls';
import { useUIState } from './hooks/useUIState';
import { useOnboarding } from './hooks/useOnboarding';
import { useHashRouting } from './hooks/useHashRouting';
import { useReturnHandlers } from './hooks/useReturnHandlers';
import { useFileUpload } from './hooks/useFileUpload';
import { useSurgeryUnregistered } from './hooks/useSurgeryUnregistered';
import { useOrderHandlers } from './hooks/useOrderHandlers';
import { useInventorySync } from './hooks/useInventorySync';
import { useSurgeryManualFix } from './hooks/useSurgeryManualFix';
import { useBaseStockBatch } from './hooks/useBaseStockBatch';
import { useInviteFlow } from './hooks/useInviteFlow';
import { useRefreshSurgeryUsage } from './hooks/useRefreshSurgeryUsage';
import { FileUploadLoadingOverlay } from './components/FileUploadLoadingOverlay';
import { getDashboardTabTitle } from './components/dashboard/dashboardTabTitle';

declare global {
  // eslint-disable-next-line no-var
  var __securityMaintenanceService: typeof securityMaintenanceService | undefined;
}



const App: React.FC = () => {
  const fixtureFileRef = useRef<HTMLInputElement>(null);
  const surgeryFileRef = useRef<HTMLInputElement>(null);
  const dashboardHeaderRef = useRef<HTMLElement>(null);
  const { toast: alertToast, showToast: showAlertToast } = useToast(3500);

  const {
    state,
    setState,
    loadHospitalData,
    handleLoginSuccess,
    handleDeleteAccount,
  } = useAppState(showAlertToast);
  const pwaUpdate = usePwaUpdate(state.currentView);

  // 후기 팝업 state
  const [reviewPopupType, setReviewPopupType] = useState<ReviewType | null>(null);
  const [profileInitialTab, setProfileInitialTab] = useState<'info' | 'plan' | 'security' | 'reviews' | undefined>(undefined);
  const [planLimitToast, setPlanLimitToast] = useState<LimitType | null>(null);
  const [directPayment, setDirectPayment] = useState<{ plan: PlanType; billing: BillingCycle } | null>(null);
  const [billingProgramSaving, setBillingProgramSaving] = useState(false);
  const [billingProgramError, setBillingProgramError] = useState('');
  const [pendingFailCandidates, setPendingFailCandidates] = useState<FailCandidate[]>([]);

  // 대시보드 진입 시 후기 팝업 여부 확인
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


  const handleSelectBillingProgram = useCallback(async (program: BillingProgram) => {
    if (!state.user?.hospitalId) return;
    setBillingProgramSaving(true);
    setBillingProgramError('');
    try {
      await hospitalService.updateBillingProgram(state.user.hospitalId, program);
      setState(prev => ({ ...prev, hospitalBillingProgram: program }));
      showAlertToast('청구프로그램 설정이 저장되었습니다.', 'success');
    } catch (error) {
      const message = error instanceof Error ? error.message : '청구프로그램 저장에 실패했습니다.';
      setBillingProgramError(message);
    } finally {
      setBillingProgramSaving(false);
    }
  }, [setState, showAlertToast, state.user?.hospitalId]);

  const handleRefreshBillingProgram = useCallback(async () => {
    if (!state.user) return;
    setBillingProgramError('');
    await loadHospitalData(state.user);
  }, [loadHospitalData, state.user]);

  const [showAuditHistory, setShowAuditHistory] = React.useState(false);
  const [autoOpenBaseStockEdit, setAutoOpenBaseStockEdit] = useState(false);
  const [autoOpenFailBulkModal, setAutoOpenFailBulkModal] = useState(false);

  const { inviteInfo, processingInvite } = useInviteFlow(state.user, setState, showAlertToast);

  const isSystemAdmin = state.user?.role === 'admin';
  // role='master' 또는 본인이 해당 병원의 master_admin_id인 경우(staff 워크스페이스 포함)
  const isHospitalMaster = state.user?.role === 'master'
    || (!!state.user?.id && state.user.id === state.hospitalMasterAdminId);
  const isHospitalAdmin = isHospitalMaster || isSystemAdmin;
  const effectiveAccessRole = (isHospitalMaster || isSystemAdmin)
    ? 'master'
    : (state.user?.role ?? 'dental_staff');
  const isUltimatePlan = isSystemAdmin || state.planState?.plan === 'ultimate';
  const effectivePlan: PlanType = isUltimatePlan ? 'ultimate' : (state.planState?.plan ?? 'free');
  const isReadOnly = state.user?.status === 'readonly';

  const { handleFileUpload, uploadingTypeRef } = useFileUpload({
    hospitalBillingProgram: state.hospitalBillingProgram,
    user: state.user,
    surgeryMaster: state.surgeryMaster,
    effectivePlan,
    setState,
    showAlertToast,
    setPendingFailCandidates,
  });
  const requiresBillingProgramSetup = (
    state.currentView === 'dashboard' &&
    !!state.user?.hospitalId &&
    (state.user?.status === 'active' || state.user?.status === 'readonly') &&
    !isSystemAdmin &&
    !state.hospitalBillingProgram
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
    isFinePointer,
    isNarrowViewport,
    isMobileMenuOpen, setIsMobileMenuOpen,
    mobileOrderNav, setMobileOrderNav,
    dashboardHeaderHeight,
    isOffline,
    showMobileDashboardNav,
  } = useUIState({
    showDashboardSidebar,
    showStandardDashboardHeader,
    dashboardHeaderRef,
    dashboardTab: state.dashboardTab,
  });

  const isPublicBottomNavView =
    state.currentView === 'landing' ||
    state.currentView === 'value' ||
    state.currentView === 'pricing' ||
    state.currentView === 'contact' ||
    state.currentView === 'analyze' ||
    state.currentView === 'notices' ||
    state.currentView === 'reviews';
  const showMobilePublicNav = isPublicBottomNavView && isNarrowViewport;
  const mobilePrimaryTabs: DashboardTab[] = ['overview', 'inventory_master', 'order_management'];

  useEffect(() => {
    if (requiresBillingProgramSetup) return;
    if (billingProgramError) setBillingProgramError('');
    if (billingProgramSaving) setBillingProgramSaving(false);
  }, [billingProgramError, billingProgramSaving, requiresBillingProgramSetup]);

  // Dev convenience: expose maintenance helpers for one-off operations.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    globalThis.__securityMaintenanceService = securityMaintenanceService;
    return () => {
      delete globalThis.__securityMaintenanceService;
    };
  }, []);

  useEffect(() => {
    if (state.currentView === 'admin_panel' && !isSystemAdmin) {
      setState(prev => ({ ...prev, currentView: prev.user ? 'dashboard' : 'landing' }));
    }
  }, [state.currentView, isSystemAdmin]);

  useEffect(() => {
    if (!state.isLoading && state.user && (state.currentView === 'login' || state.currentView === 'signup')) {
      setState(prev => ({ ...prev, currentView: 'dashboard' }));
    }
  }, [state.isLoading, state.user, state.currentView]);

  // 공개 페이지 뷰 트래킹
  useEffect(() => {
    pageViewService.track(state.currentView);
  }, [state.currentView]);

  // ↑ Viewport / sidebar / network 상태는 hooks/useUIState.ts로 이동됨

  /** 플랜 품목 수 계산 시 수술중교환_ / 보험청구 제외 */
  const countBillableItems = useCallback((items: InventoryItem[]) => {
    return items.filter(i =>
      !isExchangePrefix(i.manufacturer) && i.manufacturer !== '보험청구'
    ).length;
  }, []);

  const billableItemCount = useMemo(() => countBillableItems(state.inventory), [state.inventory, countBillableItems]);

  /** Free 유저의 FAIL 기록 수 (Endowment Effect 넛지용) */
  const failOrderCount = useMemo(
    () => state.orders.filter(o => o.type === 'fail_exchange').length,
    [state.orders]
  );

  const activeNudge = useMemo<NudgeType | null>(() => {
    const ps = state.planState;
    if (!ps) return null;
    // T5: 체험 만료 (Free로 복귀, 체험 사용됨)
    if (ps.plan === 'free' && ps.trialUsed && !ps.isTrialActive) return 'trial_expired';
    // T7: 유료 구독 만료 (체험 미사용, expiresAt 경과)
    if (ps.plan === 'free' && !ps.trialUsed && ps.expiresAt && new Date(ps.expiresAt) < new Date()) return 'subscription_expired';
    // T4: 체험 D-3 이하 (아직 체험 중)
    if (ps.isTrialActive && ps.trialDaysRemaining <= 3) return 'trial_ending';
    // T1: 데이터 보관 만료 D-7
    if (ps.plan === 'free' && !ps.isTrialActive && ps.retentionDaysLeft !== undefined && ps.retentionDaysLeft <= 7) return 'data_expiry_warning';
    // T2: Free 플랜 재고 품목 90% 이상
    if (ps.plan === 'free' && !ps.isTrialActive && billableItemCount >= PLAN_LIMITS.free.maxItems * 0.9) return 'item_limit_warning';
    // T3: 업로드 한도 초과
    if (ps.plan === 'free' && !ps.isTrialActive && ps.uploadLimitExceeded === true) return 'upload_limit';
    // T6: FAIL 기록 있는데 관리 기능 잠김 (Endowment Effect)
    if (ps.plan === 'free' && !ps.isTrialActive && failOrderCount > 0) return 'fail_locked';
    return null;
  }, [state.planState, billableItemCount, failOrderCount]);

  // 온보딩 상태는 hooks/useOnboarding.ts로 이동됨
  const {
    onboardingDismissed,
    setOnboardingDismissed,
    forcedOnboardingStep,
    setForcedOnboardingStep,
    toastCompletedLabel,
    showOnboardingComplete,
    setShowOnboardingComplete,
    firstIncompleteStep,
    onboardingStep,
    shouldShowOnboarding,
    showOnboardingToast,
    onboardingProgress,
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

  // 세션 초기화, Realtime 구독은 useAppState 훅에서 처리

  useHashRouting(state, effectiveAccessRole, setState);

  const { resolveManualSurgeryInput } = useSurgeryManualFix(
    state.surgeryMaster,
    state.inventory,
    state.user?.hospitalId,
    setState,
  );

  const { applyBaseStockBatch } = useBaseStockBatch(
    state.inventory,
    state.user?.hospitalId,
    setState,
    showAlertToast,
  );





  // 권장재고 산출 설정 — ref로 최신 값 유지 (stale closure 방지)
  const stockCalcSettingsRef = useRef<StockCalcSettings>(DEFAULT_STOCK_CALC_SETTINGS);

  // ═══════════════════════════════════════════════════════════════
  // 재고 동기화 (Inventory Sync) → hooks/useInventorySync.ts
  // ═══════════════════════════════════════════════════════════════
  const { syncInventoryWithUsageAndOrders, computeUsageByInventoryFromRecords } = useInventorySync(
    state.surgeryMaster,
    state.orders,
    state.inventory.length,
    setState,
    stockCalcSettingsRef,
  );

  const { refreshLatestSurgeryUsage } = useRefreshSurgeryUsage(
    state.user?.hospitalId,
    effectivePlan,
    state.inventory,
    computeUsageByInventoryFromRecords,
    showAlertToast,
  );

  // ═══════════════════════════════════════════════════════════════
  // 반품 관리 (Return Requests) → hooks/useReturnHandlers.ts
  // ═══════════════════════════════════════════════════════════════
  const {
    returnRequests,
    handleCreateReturn,
    handleUpdateReturnStatus,
    handleCompleteReturn,
    handleDeleteReturn,
    handleStockCalcSettingsChange,
  } = useReturnHandlers({
    hospitalId: state.user?.hospitalId,
    inventory: state.inventory,
    user: state.user,
    setState,
    stockCalcSettingsRef,
    syncInventoryWithUsageAndOrders,
  });

  // ═══════════════════════════════════════════════════════════════
  // 발주 관리 (Order Handlers) → hooks/useOrderHandlers.ts
  // ═══════════════════════════════════════════════════════════════
  const {
    handleAddOrder,
    handleUpdateOrderStatus,
    handleDeleteOrder,
    handleCancelOrder,
    handleConfirmReceipt,
  } = useOrderHandlers({
    hospitalId: state.user?.hospitalId,
    orders: state.orders,
    inventory: state.inventory,
    surgeryMaster: state.surgeryMaster,
    user: state.user,
    setState,
    showAlertToast,
    handleCreateReturn,
  });

  const handleOpenDirectPayment = useCallback((plan: PlanType, billing: BillingCycle = 'monthly') => {
    setDirectPayment({ plan, billing });
  }, []);

  const {
    enabledManufacturers,
    hasSavedPoint,
    isDirtyAfterSave,
    restoreToast,
    saveToast,
    formattedSavedAt,
    fixtureRestoreDiffCount,
    restorePanelRef,
    handleBulkToggle,
    handleManufacturerToggle,
    handleLengthToggle,
    handleRestoreToSavedPoint,
    handleSaveSettings,
    handleExpandFailClaim,
    handleUpdateCell,
  } = useFixtureEditControls({
    fixtureData: state.fixtureData,
    setState,
    showAlertToast,
  });

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
  }, [
    firstIncompleteStep,
    handleSaveSettings,
    isHospitalAdmin,
    setState,
    state.currentView,
    state.dashboardTab,
    state.user?.hospitalId,
  ]);


  // 확인 모달 상태
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    tip?: string;
    confirmLabel?: string;
    confirmColor?: 'indigo' | 'rose' | 'amber' | 'emerald';
    icon?: React.ReactNode;
    onConfirm: () => void;
  } | null>(null);

  const {
    inventoryCompare,
    planLimitModal,
    handleApplyToInventory,
    handleConfirmApplyToInventory,
    cancelInventoryCompare,
    closePlanLimitModal,
  } = useInventoryCompare({
    fixtureData: state.fixtureData,
    inventory: state.inventory,
    user: state.user,
    setState,
    effectivePlan,
    billableItemCount,
    showAlertToast,
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

  const requestFixtureExcelDownload = useCallback(() => {
    if (!state.fixtureData) return;
    const fixtureData = state.fixtureData;
    const selectedIndices = state.selectedFixtureIndices[fixtureData.activeSheetName] || new Set();
    setConfirmModal({
      title: '엑셀 다운로드',
      message: '현재 설정 상태로 엑셀 파일을 다운로드합니다.',
      tip: '다운로드한 파일은 덴트웹 → 환경설정 → 임플란트 픽스처 설정에서 등록하세요.',
      confirmLabel: '다운로드',
      confirmColor: 'amber',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const now = new Date();
          const yyyymmdd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
          const { downloadExcelFile } = await import('./services/excelService');
          await downloadExcelFile(
            fixtureData,
            selectedIndices,
            `픽스쳐_${yyyymmdd}.xlsx`
          );
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
      confirmLabel: '반영하기',
      confirmColor: 'indigo',
      icon: <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
      onConfirm: () => {
        setConfirmModal(null);
        handleApplyToInventory();
      },
    });
  }, [handleApplyToInventory]);

  const virtualSurgeryData = useMemo(() => {
    const masterRows = state.surgeryMaster['수술기록지'];
    if (!masterRows || masterRows.length === 0) return null;
    const sortedColumns = ['날짜', '환자정보', '치아번호', '갯수', '수술기록', '구분', '제조사', '브랜드', '규격(SIZE)', '골질', '초기고정'];
    return { sheets: { '수술기록지': { name: '수술기록지', columns: sortedColumns, rows: masterRows } }, activeSheetName: '수술기록지' } as ExcelData;
  }, [state.surgeryMaster]);

  const surgeryUnregisteredItems = useSurgeryUnregistered(state.surgeryMaster, state.inventory);

  // 초기 세션 확인 중 로딩 화면
  if (state.isLoading && !state.user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  const suspenseFallback = (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div
      className="min-h-screen bg-slate-50 flex"
      style={{ ['--dashboard-header-height' as string]: `${dashboardHeaderHeight}px` } as React.CSSProperties}
    >
      {state.isLoading && state.user && uploadingTypeRef.current !== null && (
        <FileUploadLoadingOverlay type={uploadingTypeRef.current} />
      )}

      {isOffline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[240] px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-black shadow-lg">
          오프라인 모드: 연결 후 자동 동기화됩니다.
        </div>
      )}

      {showDashboardSidebar && isSidebarCollapsed && !showMobileDashboardNav && (
        <div
          className="fixed left-0 top-0 z-[260] h-20 w-20"
          onMouseEnter={() => {
            if (isFinePointer) setIsSidebarToggleVisible(true);
          }}
          onMouseLeave={() => setIsSidebarToggleVisible(false)}
        >
          <button
            type="button"
            onClick={() => {
              setIsSidebarCollapsed(false);
              setIsSidebarToggleVisible(false);
            }}
            className={`absolute left-3 top-3 h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-lg shadow-slate-300/40 transition-all duration-200 hover:border-indigo-300 hover:text-indigo-600 ${(!isFinePointer || isSidebarToggleVisible)
              ? 'opacity-100 translate-x-0 pointer-events-auto'
              : 'opacity-0 -translate-x-2 pointer-events-none'
              }`}
            title="사이드바 열기 (Ctrl/Cmd + \\)"
            aria-label="사이드바 열기"
          >
            <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 7l5 5-5 5M4 7l5 5-5 5" />
            </svg>
          </button>
        </div>
      )}

      {/* Sidebar - Only Visible in Dashboard for Non-Admin Users OR when Admin is simulating User View */}
      {showDashboardSidebar && (
        <Sidebar
          activeTab={state.dashboardTab}
          onTabChange={(tab) => {
            // 권한 없는 탭은 전환 차단
            if (!canAccessTab(tab, state.user?.permissions, effectiveAccessRole)) return;
            setState(prev => ({ ...prev, dashboardTab: tab }));
            if (showMobileDashboardNav) {
              setIsMobileMenuOpen(false);
            }
          }}
          isCollapsed={showMobileDashboardNav ? true : isSidebarCollapsed}
          onToggleCollapse={() => {
            if (showMobileDashboardNav) {
              setIsMobileMenuOpen(false);
            } else {
              setIsSidebarCollapsed(prev => !prev);
              setIsSidebarToggleVisible(false);
            }
          }}
          isMobile={showMobileDashboardNav}
          onRequestClose={() => setIsMobileMenuOpen(false)}
          fixtureData={state.fixtureData}
          surgeryData={state.surgeryData}
          surgeryUnregisteredCount={surgeryUnregisteredItems.length}
          isAdmin={isHospitalAdmin}
          isMaster={isHospitalMaster || isSystemAdmin}
          plan={effectivePlan}
          hospitalName={state.hospitalName}
          userRole={state.user?.role}
          userPermissions={state.user?.permissions}
          onReturnToAdmin={isSystemAdmin ? () => setState(prev => ({ ...prev, adminViewMode: 'admin' })) : undefined}
          userName={state.user?.name}
          onProfileClick={() => setState(prev => ({ ...prev, showProfile: true }))}
        />
      )}


      {/* Main Content Wrapper - System Admin has no Header in Dashboard UNLESS simulating User View */}
      <div className="flex-1 flex flex-col min-w-0">
        {state.currentView === 'suspended' ? (
          <AccountSuspendedScreen
            userEmail={state.user?.email}
            onSignOut={async () => {
              await authService.signOut();
              setState(prev => ({ ...prev, user: null, currentView: 'landing' }));
            }}
          />
        ) : state.currentView === 'dashboard' ? (
          requiresBillingProgramSetup ? (
            <BillingProgramGate
              canConfigure={isHospitalMaster}
              isSaving={billingProgramSaving}
              errorMessage={billingProgramError}
              onSubmit={handleSelectBillingProgram}
              onRefresh={handleRefreshBillingProgram}
              onSignOut={async () => {
                await authService.signOut();
                setState(prev => ({ ...prev, user: null, currentView: 'landing' }));
              }}
            />
          ) : isSystemAdmin && state.adminViewMode !== 'user' ? (
            /* System Admin Dashboard - Full Screen */
            <ErrorBoundary>
              <Suspense fallback={suspenseFallback}>
                <SystemAdminDashboard
                  onLogout={async () => { await authService.signOut(); setState(prev => ({ ...prev, user: null, currentView: 'landing' })); }}
                  onToggleView={() => setState(prev => ({ ...prev, adminViewMode: 'user' }))}
                  onGoHome={() => setState(prev => ({ ...prev, currentView: 'landing' }))}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            /* Standard Dashboard with Header */
            <>
              <DashboardHeader
                dashboardHeaderRef={dashboardHeaderRef}
                fixtureFileRef={fixtureFileRef}
                surgeryFileRef={surgeryFileRef}
                showMobileDashboardNav={showMobileDashboardNav}
                dashboardTab={state.dashboardTab}
                fixtureDataExists={Boolean(state.fixtureData)}
                user={state.user}
                planState={state.planState}
                isUltimatePlan={isUltimatePlan}
                effectivePlan={effectivePlan}
                billableItemCount={billableItemCount}
                memberCount={state.memberCount}
                onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
                onFileUpload={handleFileUpload}
                onOpenAuditHistory={() => setShowAuditHistory(true)}
                onRequestResetFixtureEdit={() => {
                  setConfirmModal({
                    title: '데이터 초기화',
                    message: '현재 작업 중인 데이터가 모두 초기화됩니다. 계속하시겠습니까?',
                    confirmLabel: '초기화',
                    confirmColor: 'rose',
                    onConfirm: () => {
                      setState(prev => ({
                        ...prev,
                        fixtureData: null,
                        fixtureFileName: null,
                        isFixtureLengthExtracted: false,
                        fixtureBackup: null,
                        selectedFixtureIndices: {},
                        dashboardTab: 'fixture_upload',
                      }));
                      setConfirmModal(null);
                    },
                  });
                }}
                onOpenProfile={() => setState(prev => ({ ...prev, showProfile: true }))}
                onGoHome={() => setState(prev => ({ ...prev, currentView: 'landing' }))}
                onLogout={async () => {
                  await authService.signOut();
                  setState(prev => ({ ...prev, user: null, currentView: 'landing' }));
                }}
              />

              <main className="flex-1" style={{ overflowX: 'clip' }}>
                <ErrorBoundary>
                  <Suspense fallback={suspenseFallback}>
                    {/* 초대 처리 중에는 병원 찾기 대신 로딩 표시 */}
                    {processingInvite ? (
                      <div className="flex flex-col items-center justify-center py-32 gap-4">
                        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                        <p className="text-sm text-slate-500 font-medium">초대를 처리하고 있습니다...</p>
                      </div>
                    ) : (
                      <DashboardGuardedContent
                        state={state}
                        setState={setState}
                        isSystemAdmin={isSystemAdmin}
                        loadHospitalData={loadHospitalData}
                        onLogoutToLanding={async () => {
                          await authService.signOut();
                          setState(prev => ({ ...prev, user: null, currentView: 'landing' }));
                        }}
                        workspaceProps={{
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
                            onUpdateFixtureCell: (idx, col, val) => handleUpdateCell(idx, col, val, 'fixture'),
                            onFixtureSheetChange: (name) => setState(prev => ({ ...prev, fixtureData: { ...prev.fixtureData!, activeSheetName: name } })),
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
                            // 온보딩이 아직 완료되지 않은 경우에만 step 7로 안내
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
                            // 온보딩이 이미 완료된 상태면 완료 모달 표시 생략
                            if (!wasAlreadyDone) setShowOnboardingComplete(true);
                            if (user) loadHospitalData(user); // 완료 후 대시보드 수치 갱신 (백그라운드)
                          },
                          orderHistoryOnly: showMobileDashboardNav && mobileOrderNav === 'receipt',
                          onboardingStep: firstIncompleteStep,
                          onResumeOnboarding: firstIncompleteStep != null ? () => {
                            const hid = state.user?.hospitalId ?? '';
                            onboardingService.clearDismissed(hid);
                            setOnboardingDismissed(false);
                            setForcedOnboardingStep(firstIncompleteStep);
                          } : undefined,
                        }}
                      />
                    )}
                  </Suspense>
                </ErrorBoundary>
              </main>
              {showMobileDashboardNav && (
                <MobileDashboardNav
                  mobilePrimaryTabs={mobilePrimaryTabs}
                  dashboardTab={state.dashboardTab}
                  userPermissions={state.user?.permissions}
                  effectiveAccessRole={effectiveAccessRole}
                  lastOrderNav={mobileOrderNav}
                  onOrderNavChange={setMobileOrderNav}
                  onTabChange={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
                  getDashboardTabTitle={getDashboardTabTitle}
                />
              )}
            </>
          )

        ) : (
          /* Non-Dashboard Views (Landing, Login, etc.) */
          <AppPublicRouteSection
            state={state}
            setState={setState}
            isSystemAdmin={isSystemAdmin}
            inviteInfo={inviteInfo}
            suspenseFallback={suspenseFallback}
            onLoginSuccess={handleLoginSuccess}
            showAlertToast={showAlertToast}
          />
        )}
      </div>

      <Suspense fallback={null}>
        <AppUserOverlayStack
          user={state.user}
          showProfile={state.showProfile}
          initialProfileTab={profileInitialTab}
          planState={state.planState}
          hospitalName={state.hospitalName}
          inventory={state.inventory}
          reviewPopupType={reviewPopupType}
          shouldShowOnboarding={shouldShowOnboarding}
          onboardingStep={onboardingStep}
          showOnboardingToast={showOnboardingToast}
          onboardingProgress={onboardingProgress}
          toastCompletedLabel={toastCompletedLabel}
          onCloseProfile={() => {
            setState(prev => ({ ...prev, showProfile: false }));
            setProfileInitialTab(undefined);
          }}
          onDeleteAccount={handleDeleteAccount}
          onChangePlan={(plan, billing) => {
            setState(prev => ({ ...prev, showProfile: false }));
            handleOpenDirectPayment(plan, billing);
          }}
          onReviewSubmitted={() => {
            setReviewPopupType(null);
            showAlertToast('후기를 남겨주셔서 감사합니다!', 'success');
          }}
          onDismissReview={() => setReviewPopupType(null)}
          onOnboardingSkip={(snooze: boolean) => {
            if (state.user?.hospitalId) {
              onboardingService.markDismissed(state.user.hospitalId);
              if (snooze) onboardingService.snoozeUntilTomorrow(state.user.hospitalId);
            }
            setForcedOnboardingStep(null);
            setOnboardingDismissed(true);
          }}
          onReopenOnboarding={() => {
            if (state.user?.hospitalId) {
              onboardingService.clearDismissed(state.user.hospitalId);
              onboardingService.clearSnooze(state.user.hospitalId);
            }
            setForcedOnboardingStep(null);
            setOnboardingDismissed(false);
            setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'overview' }));
          }}
          onGoToDataSetup={(file?: File, sizeCorrections?: Map<string, string>) => {
            if (file) {
              const hid = state.user?.hospitalId;
              setState(prev => ({ ...prev, currentView: 'dashboard' }));
              // markFixtureSaved는 업로드 성공 후에만 기록 (실패 시 Step 3 재진입 가능하도록)
              handleFileUpload(file, 'fixture', sizeCorrections).then(ok => {
                if (ok && hid) onboardingService.markFixtureSaved(hid);
              });
            } else {
              setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fixture_upload' }));
            }
          }}
          onGoToSurgeryUpload={async (file?: File) => {
            if (file) {
              setState(prev => ({ ...prev, currentView: 'dashboard' }));
              return await handleFileUpload(file, 'surgery');
            } else {
              setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'surgery_database' }));
              return false;
            }
          }}
          onGoToInventoryAudit={() => {
            setForcedOnboardingStep(null);
            setAutoOpenBaseStockEdit(true);
            setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'inventory_master' }));
          }}
          onGoToFailManagement={() => {
            setForcedOnboardingStep(null);
            setAutoOpenFailBulkModal(true);
            setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fail_management' }));
          }}
          showOnboardingComplete={showOnboardingComplete}
          onOnboardingCompleteClose={() => {
            setShowOnboardingComplete(false);
            setState(prev => ({ ...prev, dashboardTab: 'overview' }));
          }}
        />
      </Suspense>

      {directPayment && (
        <Suspense fallback={null}>
          <DirectPaymentModal
            plan={directPayment.plan}
            billing={directPayment.billing}
            user={state.user}
            hospitalName={state.hospitalName}
            onDismiss={() => setDirectPayment(null)}
          />
        </Suspense>
      )}

      {pendingFailCandidates.length > 0 && state.user?.hospitalId && (
        <Suspense fallback={null}>
          <FailDetectionModal
            candidates={pendingFailCandidates}
            hospitalId={state.user.hospitalId}
            currentUserName={state.user.name}
            onClose={() => setPendingFailCandidates([])}
          />
        </Suspense>
      )}

      <AppGlobalOverlays
        planLimitModal={planLimitModal}
        confirmModal={confirmModal}
        inventoryCompare={inventoryCompare}
        pwaUpdateBar={{
          isVisible: pwaUpdate.shouldShowPrompt,
          isForceUpdate: pwaUpdate.forceUpdate,
          message: pwaUpdate.message,
          isApplying: pwaUpdate.isApplying,
          onApply: pwaUpdate.applyUpdate,
          onLater: pwaUpdate.deferUpdate,
        }}
        alertToast={alertToast}
        showMobileDashboardNav={showMobileDashboardNav}
        showMobilePublicNav={showMobilePublicNav}
        onClosePlanLimitModal={closePlanLimitModal}
        onUpgradePlan={() => {
          closePlanLimitModal();
          handleOpenDirectPayment('basic');
        }}
        onCloseConfirmModal={() => setConfirmModal(null)}
        onConfirmInventoryCompare={handleConfirmApplyToInventory}
        onCancelInventoryCompare={cancelInventoryCompare}
      />
    </div>
  );
};

export default App;
