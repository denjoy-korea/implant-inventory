
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useAppState } from './hooks/useAppState';
/* ── Static imports (always needed) ── */
import Sidebar from './components/Sidebar';
import NewDataModal from './components/NewDataModal';
import ErrorBoundary from './components/ErrorBoundary';
import MobileDashboardNav from './components/dashboard/MobileDashboardNav';
import AppGlobalOverlays from './components/app/AppGlobalOverlays';
import DashboardHeader from './components/app/DashboardHeader';
import type { NudgeType } from './components/UpgradeNudge';
import type { LimitType } from './components/PlanLimitToast';

/* ── Lazy imports (route-level code splitting) ── */
const DashboardGuardedContent = lazy(() => import('./components/app/DashboardGuardedContent'));
const AppPublicRouteSection = lazy(() => import('./components/app/AppPublicRouteSection'));
const SystemAdminDashboard = lazy(() => import('./components/SystemAdminDashboard'));
const AppUserOverlayStack = lazy(() => import('./components/app/AppUserOverlayStack'));
import AccountSuspendedScreen from './components/AccountSuspendedScreen';
import { ExcelData, ExcelRow, User, DashboardTab, UploadType, InventoryItem, ExcelSheet, Order, OrderStatus, Hospital, PlanType, PLAN_LIMITS, SurgeryUnregisteredItem, DbOrder, DbOrderItem, canAccessTab } from './types';
// excelService는 xlsx(~500 kB)를 포함하므로 이벤트 시점에 동적 import
import { getSizeMatchKey, toCanonicalSize, isIbsImplantManufacturer } from './services/sizeNormalizer';
import { authService } from './services/authService';
import { inventoryService } from './services/inventoryService';
import { surgeryService } from './services/surgeryService';
import { orderService } from './services/orderService';
import { planService } from './services/planService';
import { securityMaintenanceService } from './services/securityMaintenanceService';
import { dbToExcelRow, dbToOrder, fixIbsImplant } from './services/mappers';
import { supabase } from './services/supabaseClient';
import { operationLogService } from './services/operationLogService';
import { onboardingService } from './services/onboardingService';
import { normalizeSurgery, normalizeInventory } from './services/normalizationService';
import { manufacturerAliasKey } from './services/appUtils';
import { useToast } from './hooks/useToast';
import { DAYS_PER_MONTH, LOW_STOCK_RATIO } from './constants';
import { buildHash, parseHash, VIEW_HASH, TAB_HASH, HASH_TO_VIEW, HASH_TO_TAB } from './appRouting';
import { reviewService, ReviewType } from './services/reviewService';
import { pageViewService } from './services/pageViewService';
import { useInventoryCompare } from './hooks/useInventoryCompare';
import { useFixtureEditControls } from './hooks/useFixtureEditControls';
import { getDashboardTabTitle } from './components/dashboard/dashboardTabTitle';
import {
  appendUnregisteredSample,
  buildBrandSizeFormatIndex,
  buildUnregisteredSample,
  hasRegisteredBrandSize,
  isListBasedSurgeryInput,
  isManufacturerAliasMatch,
  normalizeSizeTextStrict,
} from './services/surgeryUnregisteredUtils';

declare global {
  // eslint-disable-next-line no-var
  var __securityMaintenanceService: typeof securityMaintenanceService | undefined;
}


const SIDEBAR_AUTO_COLLAPSE_WIDTH = 1360;
const MOBILE_VIEWPORT_MAX_WIDTH = 767;

const SURGERY_UPLOAD_STEPS = [
  '파일을 읽는 중...',
  '수술기록 분석 중...',
  '재고 마스터와 비교 중...',
  '데이터 등록 중...',
];
const FIXTURE_UPLOAD_STEPS = [
  '파일을 읽는 중...',
  '재료 목록 파싱 중...',
  '데이터 처리 중...',
  '잠시만 기다려 주세요...',
];

function FileUploadLoadingOverlay({ type }: { type: UploadType | null }) {
  const steps = type === 'surgery' ? SURGERY_UPLOAD_STEPS : FIXTURE_UPLOAD_STEPS;
  const [stepIndex, setStepIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(true);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setStepIndex(i => (i + 1) % steps.length);
        setVisible(true);
      }, 300);
    }, 700);
    return () => clearInterval(interval);
  }, [steps.length]);

  return (
    <div className="fixed inset-0 z-[300] bg-white/70 backdrop-blur-sm flex items-center justify-center">
      <div className="flex flex-col items-center gap-4 bg-white rounded-3xl shadow-2xl border border-slate-100 px-12 py-9">
        <div className="w-11 h-11 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
        <p
          className="text-sm text-slate-600 font-medium text-center min-w-[9rem] transition-all duration-300"
          style={{ opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(5px)' }}
        >
          {steps[stepIndex]}
        </p>
      </div>
    </div>
  );
}

const App: React.FC = () => {
  const fixtureFileRef = useRef<HTMLInputElement>(null);
  const surgeryFileRef = useRef<HTMLInputElement>(null);
  const dashboardHeaderRef = useRef<HTMLElement>(null);
  const uploadingTypeRef = useRef<UploadType | null>(null);

  const { toast: alertToast, showToast: showAlertToast } = useToast(3500);

  const {
    state,
    setState,
    loadHospitalData,
    handleLoginSuccess,
    handleLeaveHospital: _handleLeaveHospital,
    handleDeleteAccount,
  } = useAppState(showAlertToast);

  // 후기 팝업 state
  const [reviewPopupType, setReviewPopupType] = useState<ReviewType | null>(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  // localStorage 영속 상태 + 메모리 상태 합산 (새로고침/재로그인 후에도 유지)
  const _obHid = state.user?.hospitalId;
  const effectiveDismissed = onboardingDismissed || (_obHid ? onboardingService.isDismissed(_obHid) : false);
  const [planLimitToast, setPlanLimitToast] = useState<LimitType | null>(null);

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
      }).catch(() => {});
    }).catch(() => {});
  }, [state.user, state.currentView, reviewPopupType]);

  // UserProfile expects () => void; hook expects (user: User) so wrap with current user
  const handleLeaveHospital = useCallback(() => {
    if (state.user) _handleLeaveHospital(state.user);
  }, [_handleLeaveHospital, state.user]);

  const [showAuditHistory, setShowAuditHistory] = React.useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarToggleVisible, setIsSidebarToggleVisible] = useState(false);
  const [isFinePointer, setIsFinePointer] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [isNarrowViewport, setIsNarrowViewport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dashboardHeaderHeight, setDashboardHeaderHeight] = useState(44);
  const [isOffline, setIsOffline] = useState<boolean>(() => (
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  ));

  // 초대 토큰 상태
  const [inviteInfo, setInviteInfo] = React.useState<{
    token: string; email: string; name: string; hospitalName: string;
  } | null>(null);

  // URL ?invite=TOKEN 감지 → 초대 수락 뷰로 전환
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('invite');
    if (!token || state.user) return;

    supabase
      .from('member_invitations')
      .select('email, name, hospitals(name)')
      .eq('token', token)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
      .then(({ data }) => {
        if (!data) {
          setState(prev => ({ ...prev, currentView: 'login' }));
          return;
        }
        const hospitalName = (data.hospitals as { name: string }[] | null)?.[0]?.name ?? '치과';
        setInviteInfo({ token, email: data.email, name: data.name, hospitalName });
        setState(prev => ({ ...prev, currentView: 'invite' }));
        // URL에서 토큰 파라미터 제거 (보안)
        const url = new URL(window.location.href);
        url.searchParams.delete('invite');
        window.history.replaceState(null, '', url.toString());
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  const showDashboardSidebar = state.currentView === 'dashboard' && (!isSystemAdmin || state.adminViewMode === 'user');
  const showStandardDashboardHeader = state.currentView === 'dashboard' && !(isSystemAdmin && state.adminViewMode !== 'user');
  const showMobileDashboardNav = showDashboardSidebar && showStandardDashboardHeader && isNarrowViewport;
  const mobilePrimaryTabs: DashboardTab[] = ['overview', 'inventory_master', 'order_management', 'fail_management'];
  const mobileMoreTabs: DashboardTab[] = ['settings', 'fixture_upload', 'fixture_edit', 'member_management', 'audit_log'];
  const isMoreTabActive = mobileMoreTabs.includes(state.dashboardTab);

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
    if (state.user && (state.currentView === 'login' || state.currentView === 'signup')) {
      setState(prev => ({ ...prev, currentView: 'dashboard' }));
    }
  }, [state.user, state.currentView]);

  // 공개 페이지 뷰 트래킹
  useEffect(() => {
    pageViewService.track(state.currentView);
  }, [state.currentView]);

  // sticky 섹션들이 참조할 대시보드 헤더 높이 동기화
  useEffect(() => {
    if (!showStandardDashboardHeader) return;

    const headerEl = dashboardHeaderRef.current;
    if (!headerEl) return;

    const syncHeaderHeight = () => {
      const measured = Math.round(headerEl.getBoundingClientRect().height);
      if (measured > 0) {
        setDashboardHeaderHeight(prev => (prev === measured ? prev : measured));
      }
    };

    syncHeaderHeight();
    window.addEventListener('resize', syncHeaderHeight);

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(syncHeaderHeight);
      observer.observe(headerEl);
    }

    return () => {
      window.removeEventListener('resize', syncHeaderHeight);
      observer?.disconnect();
    };
  }, [showStandardDashboardHeader, state.dashboardTab]);

  useEffect(() => {
    if (!showDashboardSidebar) {
      setIsMobileViewport(false);
      setIsMobileMenuOpen(false);
      return;
    }

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_VIEWPORT_MAX_WIDTH}px)`);
    const syncViewport = () => {
      const isMobile = mediaQuery.matches;
      setIsMobileViewport(isMobile);
      if (!isMobile) {
        setIsMobileMenuOpen(false);
      }
    };

    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, [showDashboardSidebar]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const syncNetworkStatus = () => setIsOffline(!window.navigator.onLine);
    syncNetworkStatus();
    window.addEventListener('online', syncNetworkStatus);
    window.addEventListener('offline', syncNetworkStatus);
    return () => {
      window.removeEventListener('online', syncNetworkStatus);
      window.removeEventListener('offline', syncNetworkStatus);
    };
  }, []);

  useEffect(() => {
    if (!showMobileDashboardNav || !isMobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showMobileDashboardNav, isMobileMenuOpen]);

  // 터치 환경에서는 hover가 없으므로 사이드바 열기 버튼을 항상 노출
  useEffect(() => {
    if (!showDashboardSidebar) return;
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    const syncPointerMode = () => setIsFinePointer(mediaQuery.matches);

    syncPointerMode();
    mediaQuery.addEventListener('change', syncPointerMode);
    return () => mediaQuery.removeEventListener('change', syncPointerMode);
  }, [showDashboardSidebar]);

  // 화면이 좁아지면 사이드바 자동 접기
  useEffect(() => {
    if (!showDashboardSidebar) {
      setIsSidebarToggleVisible(false);
      setIsNarrowViewport(false);
      return;
    }

    const syncSidebarForViewport = () => {
      const isNarrow = window.innerWidth <= SIDEBAR_AUTO_COLLAPSE_WIDTH;
      setIsNarrowViewport(isNarrow);
      if (isNarrow) {
        setIsSidebarCollapsed(true);
      }
    };

    syncSidebarForViewport();
    window.addEventListener('resize', syncSidebarForViewport);
    return () => window.removeEventListener('resize', syncSidebarForViewport);
  }, [showDashboardSidebar]);

  // Notion 스타일 단축키: Ctrl/Cmd + \
  useEffect(() => {
    if (!showDashboardSidebar) return;

    const handleSidebarShortcut = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey)) return;
      if (event.key !== '\\') return;
      event.preventDefault();
      setIsSidebarCollapsed(prev => !prev);
      setIsSidebarToggleVisible(false);
    };

    window.addEventListener('keydown', handleSidebarShortcut);
    return () => window.removeEventListener('keydown', handleSidebarShortcut);
  }, [showDashboardSidebar]);

  /** 플랜 품목 수 계산 시 수술중FAIL_ / 보험청구 제외 */
  const countBillableItems = useCallback((items: InventoryItem[]) => {
    return items.filter(i =>
      !i.manufacturer.startsWith('수술중FAIL_') && i.manufacturer !== '보험청구'
    ).length;
  }, []);

  const billableItemCount = useMemo(() => countBillableItems(state.inventory), [state.inventory, countBillableItems]);

  const activeNudge = useMemo<NudgeType | null>(() => {
    const ps = state.planState;
    if (!ps) return null;
    // T5: 체험 만료 (Free로 복귀, 체험 사용됨)
    if (ps.plan === 'free' && ps.trialUsed && !ps.isTrialActive) return 'trial_expired';
    // T4: 체험 D-3 이하 (아직 체험 중)
    if (ps.isTrialActive && ps.trialDaysRemaining <= 3) return 'trial_ending';
    // T1: 데이터 보관 만료 D-7 (planService에 retentionDaysLeft 필드 추가 후 활성화)
    // T1: 데이터 보관 만료 D-7 (planService에 retentionDaysLeft 추가 후 자동 활성화)
    if (ps.plan === 'free' && !ps.isTrialActive && ps.retentionDaysLeft !== undefined && ps.retentionDaysLeft <= 7) return 'data_expiry_warning';
    // T2: Free 플랜 재고 품목 90% 이상
    if (ps.plan === 'free' && !ps.isTrialActive && billableItemCount >= PLAN_LIMITS.free.maxItems * 0.9) return 'item_limit_warning';
    // T3: 업로드 한도 초과 (planService에 uploadLimitExceeded 추가 후 자동 활성화)
    if (ps.plan === 'free' && !ps.isTrialActive && ps.uploadLimitExceeded === true) return 'upload_limit';
    return null;
  }, [state.planState, billableItemCount]);

  // 7단계 기준 첫 번째 미완료 단계 계산 (뷰/탭 조건 없이 순수 진행 상태만)
  const firstIncompleteStep = (() => {
    if (!isHospitalAdmin) return null;
    if (state.user?.status !== 'active') return null;
    const hid = state.user?.hospitalId ?? '';
    // Step 1은 localStorage만 체크 — DB 로딩 완료 전에도 즉시 표시 가능
    if (!onboardingService.isWelcomeSeen(hid)) return 1;
    // 이후 단계는 DB 데이터 필요 → 로딩 완료 후 체크
    if (state.isLoading) return null;
    if (!onboardingService.isFixtureDownloaded(hid)) return 2;
    if (state.inventory.length === 0 && !state.fixtureData) return 3;
    if (!onboardingService.isSurgeryDownloaded(hid)) return 4;
    const hasSurgery = Object.values(state.surgeryMaster).some(rows => rows.length > 0);
    if (!hasSurgery) return 5;
    if (!onboardingService.isFailAuditDone(hid)) return 6;
    return null;
  })();

  const onboardingStep = (() => {
    if (effectiveDismissed) return null;
    if (state.currentView !== 'dashboard') return null;
    if (
      state.dashboardTab === 'fixture_upload' ||
      state.dashboardTab === 'fixture_edit' ||
      state.dashboardTab === 'surgery_database' ||
      state.dashboardTab === 'fail_management' ||
      state.dashboardTab === 'inventory_audit'
    ) return null;
    return firstIncompleteStep;
  })();
  const shouldShowOnboarding = onboardingStep !== null;

  const ONBOARDING_STEP_PROGRESS: Record<number, number> = { 1: 0, 2: 0, 3: 15, 4: 30, 5: 50, 6: 70, 7: 85 };
  const showOnboardingToast = effectiveDismissed && firstIncompleteStep !== null;
  const onboardingProgress = firstIncompleteStep ? (ONBOARDING_STEP_PROGRESS[firstIncompleteStep] ?? 0) : 100;

  // 세션 초기화, Realtime 구독은 useAppState 훅에서 처리

  /* ── Hash Routing: State → URL ── */
  const skipHashSync = useRef(false);
  // 초기 로드 시 buildHash가 URL의 해시를 덮어쓰지 않도록 첫 번째 실행을 건너뜀
  const isFirstHashSync = useRef(true);

  useEffect(() => {
    if (state.isLoading) return;
    if (isFirstHashSync.current) { isFirstHashSync.current = false; return; }
    if (skipHashSync.current) { skipHashSync.current = false; return; }
    const hash = buildHash(state.currentView, state.dashboardTab);
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
  }, [state.currentView, state.dashboardTab, state.isLoading]);

  /* ── Hash Routing: URL → State (back/forward) ── */
  useEffect(() => {
    const onPopState = () => {
      const { view, tab } = parseHash(window.location.hash);
      if (view === 'dashboard' && !state.user) return;
      if (view === 'admin_panel' && state.user?.role !== 'admin') return;
      const guardedTab = (tab !== undefined && !canAccessTab(tab, state.user?.permissions, effectiveAccessRole))
        ? 'overview' : tab;
      skipHashSync.current = true;
      setState(prev => ({
        ...prev,
        currentView: view,
        ...(guardedTab !== undefined ? { dashboardTab: guardedTab } : {}),
      }));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [effectiveAccessRole, state.user]);

  /* ── Hash Routing: Initial load ── */
  useEffect(() => {
    if (state.isLoading) return;
    const hash = window.location.hash;
    if (hash && hash !== '#/' && hash !== '#' && hash !== '') {
      const { view, tab } = parseHash(hash);
      if (view === 'dashboard' && !state.user) return;
      if (view === 'admin_panel' && state.user?.role !== 'admin') return;
      // 권한 없는 탭으로 URL 직접 접근 시 overview로 fallback
      const resolvedTab = (tab && !canAccessTab(tab, state.user?.permissions, effectiveAccessRole))
        ? 'overview' : tab;
      if (view !== state.currentView || (resolvedTab && resolvedTab !== state.dashboardTab)) {
        skipHashSync.current = true;
        setState(prev => ({ ...prev, currentView: view, ...(resolvedTab ? { dashboardTab: resolvedTab } : {}) }));
      }
    } else {
      window.history.replaceState(null, '', buildHash(state.currentView, state.dashboardTab));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAccessRole, state.isLoading]);

  // 문자열 정규화: 수술기록 매칭용 (normalizeSurgery), 재고 비교용 (normalizeInventory)
  // → services/normalizationService.ts 에서 import
  const normalize = normalizeSurgery;

  const computeUsageByInventoryFromRecords = useCallback((records: Array<{
    date: string | null;
    classification: string;
    manufacturer: string | null;
    brand: string | null;
    size: string | null;
    quantity: number;
    surgery_record: string | null;
  }>, inventoryItems: InventoryItem[]) => {
    type SurgeryEntry = { totalQty: number };
    const surgeryMap = new Map<string, SurgeryEntry>();
    const formatIndex = buildBrandSizeFormatIndex(inventoryItems);

    records.forEach(row => {
      const cls = String(row.classification || '');
      if (cls !== '식립' && cls !== '수술중 FAIL') return;
      const record = String(row.surgery_record || '');
      if (record.includes('[GBR Only]')) return;

      const rawManufacturer = String(row.manufacturer || '');
      const rawBrand = String(row.brand || '');
      const rawSize = String(row.size || '');
      if (!isListBasedSurgeryInput(formatIndex, rawManufacturer, rawBrand, rawSize)) return;

      const rowM = normalize(rawManufacturer);
      const rowB = normalize(rawBrand);
      const rowS = getSizeMatchKey(rawSize, rawManufacturer);
      const key = `${rowM}|${rowB}|${rowS}`;
      const qtyValue = row.quantity !== undefined ? Number(row.quantity) : 0;
      const validQty = isNaN(qtyValue) ? 0 : qtyValue;
      const existing = surgeryMap.get(key);
      if (existing) {
        existing.totalQty += validQty;
      } else {
        surgeryMap.set(key, { totalQty: validQty });
      }
    });

    const usageByInventoryId: Record<string, number> = {};
    inventoryItems.forEach(item => {
      const isCategory = item.manufacturer.startsWith('수술중FAIL_') || item.manufacturer === '보험청구';
      if (isCategory) return;

      const targetM = normalize(item.manufacturer);
      const targetB = normalize(item.brand);
      const targetS = getSizeMatchKey(item.size, item.manufacturer);
      let totalUsage = 0;

      surgeryMap.forEach((entry, key) => {
        const [rowM, rowB, rowS] = key.split('|');
        if (
          (rowM.includes(targetM) || targetM.includes(rowM) || rowM === targetM) &&
          rowB === targetB &&
          rowS === targetS
        ) {
          totalUsage += entry.totalQty;
        }
      });

      usageByInventoryId[item.id] = totalUsage;
    });

    return usageByInventoryId;
  }, [normalize]);

  const syncInventoryWithUsageAndOrders = useCallback(() => {
    setState(prev => {
      const records = prev.surgeryMaster['수술기록지'] || [];
      if (records.length === 0 && prev.inventory.length === 0) return prev;

      // ── 1회 순회: 기간 계산 + 수술기록 집계 (O(records)) ──────────────────
      let minTime = Infinity;
      let maxTime = -Infinity;

      // key: `${normM}|${normB}|${normS}` → { totalQty, dailyQty, normM }
      type SurgeryEntry = { totalQty: number; dailyQty: Record<string, number>; normM: string };
      const surgeryMap = new Map<string, SurgeryEntry>();
      const formatIndex = buildBrandSizeFormatIndex(prev.inventory);

      records.forEach(row => {
        const dateStr = row['날짜'];
        if (dateStr) {
          const t = new Date(dateStr as string | number).getTime();
          if (!isNaN(t)) {
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
          }
        }

        const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
        if (isTotalRow) return;

        const cls = String(row['구분'] || '');
        if (cls !== '식립' && cls !== '수술중 FAIL') return;
        const record = String(row['수술기록'] || '');
        if (record.includes('[GBR Only]')) return;

        const rawManufacturer = String(row['제조사'] || '');
        const rawBrand = String(row['브랜드'] || '');
        const rawSize = String(row['규격(SIZE)'] || '');
        if (!isListBasedSurgeryInput(formatIndex, rawManufacturer, rawBrand, rawSize)) return;

        const rowM = normalize(rawManufacturer);
        const rowB = normalize(rawBrand);
        const rowS = getSizeMatchKey(rawSize, rawManufacturer);
        const key = `${rowM}|${rowB}|${rowS}`;

        const qtyValue = row['갯수'] !== undefined ? Number(row['갯수']) : 0;
        const validQty = isNaN(qtyValue) ? 0 : qtyValue;
        const dateKey = String(dateStr || 'unknown');

        const existing = surgeryMap.get(key);
        if (existing) {
          existing.totalQty += validQty;
          existing.dailyQty[dateKey] = (existing.dailyQty[dateKey] || 0) + validQty;
        } else {
          surgeryMap.set(key, { totalQty: validQty, dailyQty: { [dateKey]: validQty }, normM: rowM });
        }
      });

      const periodInMonths = (minTime === Infinity || maxTime === -Infinity || minTime === maxTime)
        ? 1
        : Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * DAYS_PER_MONTH));

      // ── 1회 순회: 입고완료 주문 집계 (O(orders × items)) ──────────────────
      // key: `${normM}|${normB}|${normS}` → totalReceived
      const receivedMap = new Map<string, number>();
      prev.orders.filter(o => o.status === 'received').forEach(order => {
        const normOM = normalize(order.manufacturer);
        order.items.forEach(orderItem => {
          const normOB = normalize(orderItem.brand);
          const normOS = getSizeMatchKey(orderItem.size, order.manufacturer);
          const key = `${normOM}|${normOB}|${normOS}`;
          receivedMap.set(key, (receivedMap.get(key) ?? 0) + Number(orderItem.quantity || 0));
        });
      });

      // 지난달 prefix: 데이터 최신 날짜의 전달 기준
      const _lastDataDate = maxTime !== -Infinity ? new Date(maxTime) : new Date();
      const _ldMonth = _lastDataDate.getMonth(); // 0-indexed
      const _prevMonthYear = _ldMonth === 0 ? _lastDataDate.getFullYear() - 1 : _lastDataDate.getFullYear();
      const _prevMonth = _ldMonth === 0 ? 12 : _ldMonth; // 1-indexed
      const lastMonthPrefix = `${_prevMonthYear}-${String(_prevMonth).padStart(2, '0')}`;

      // ── inventory 매핑: lookup O(inventory × surgeryMap keys) → 실질 O(n) ──
      const updatedInventory = prev.inventory.map(item => {
        const isCategory = item.manufacturer.startsWith('수술중FAIL_') || item.manufacturer === '보험청구';
        if (isCategory) {
          return {
            ...item,
            usageCount: 0,
            currentStock: item.initialStock + (item.stockAdjustment ?? 0),
            recommendedStock: 0,
            monthlyAvgUsage: 0,
            dailyMaxUsage: 0,
            predictedDailyUsage: 0,
            forecastConfidence: 0,
          };
        }

        const targetM = normalize(item.manufacturer);
        const targetB = normalize(item.brand);
        const targetS = getSizeMatchKey(item.size, item.manufacturer);

        let totalUsage = 0;
        const mergedDailyQty: Record<string, number> = {};

        // 제조사 포함관계 매칭 유지 (rowM.includes(targetM) || targetM.includes(rowM))
        surgeryMap.forEach((entry, key) => {
          const [rowM, rowB, rowS] = key.split('|');
          if (
            (rowM.includes(targetM) || targetM.includes(rowM) || rowM === targetM) &&
            rowB === targetB &&
            rowS === targetS
          ) {
            totalUsage += entry.totalQty;
            for (const [day, qty] of Object.entries(entry.dailyQty)) {
              mergedDailyQty[day] = (mergedDailyQty[day] || 0) + qty;
            }
          }
        });

        const dailyMax = Object.values(mergedDailyQty).length > 0 ? Math.max(...Object.values(mergedDailyQty)) : 0;
        const monthlyAvg = Number((totalUsage / periodInMonths).toFixed(1));
        const lastMonthUsage = Object.entries(mergedDailyQty)
          .filter(([day]) => day.startsWith(lastMonthPrefix))
          .reduce((sum, [, qty]) => sum + qty, 0);

        const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
        const datedEntries = Object.entries(mergedDailyQty)
          .map(([day, qty]) => ({ day, qty: Number(qty) || 0, time: new Date(day).getTime() }))
          .filter(({ day, time }) => !!day && day !== 'unknown' && Number.isFinite(time))
          .sort((a, b) => a.time - b.time);

        const dailyQtyByDate = new Map<string, number>();
        datedEntries.forEach(entry => {
          const key = entry.day.slice(0, 10);
          dailyQtyByDate.set(key, (dailyQtyByDate.get(key) ?? 0) + entry.qty);
        });

        const toDateKey = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        };

        // "활동일 평균"이 아닌 "캘린더 평균" 기준으로 계산 (과대추정 방지)
        const getWindowAvg = (days: number, offsetDays = 0) => {
          if (days <= 0) return 0;
          let total = 0;
          for (let i = offsetDays; i < offsetDays + days; i += 1) {
            const date = new Date(_lastDataDate);
            date.setDate(date.getDate() - i);
            total += dailyQtyByDate.get(toDateKey(date)) ?? 0;
          }
          return total / days;
        };

        const recent14Avg = getWindowAvg(14, 0);
        const recent30Avg = getWindowAvg(30, 0);
        const previous30Avg = getWindowAvg(30, 30);
        const monthlyDailyAvg = monthlyAvg / DAYS_PER_MONTH;

        const trendRatio = previous30Avg > 0
          ? recent30Avg / previous30Avg
          : recent30Avg > 0
            ? 1.05
            : 1;
        const trendFactor = clamp(trendRatio, 0.8, 1.25);

        const volatilityBase = Math.max(recent30Avg, monthlyDailyAvg, 0.2);
        const volatilityRatio = dailyMax > 0 ? dailyMax / volatilityBase : 1;
        const volatilityFactor = clamp(1 + Math.max(0, volatilityRatio - 1) * 0.05, 1, 1.15);

        const baseForecastDaily = recent14Avg > 0
          ? (recent14Avg * 0.6) + (recent30Avg * 0.3) + (monthlyDailyAvg * 0.1)
          : recent30Avg > 0
            ? (recent30Avg * 0.7) + (monthlyDailyAvg * 0.3)
            : monthlyDailyAvg;

        const fallbackDaily = totalUsage > 0 ? Math.max(monthlyDailyAvg, 1 / DAYS_PER_MONTH) : 0;
        const predictedDailyUsage = Number(
          Math.max(0, (baseForecastDaily || fallbackDaily) * trendFactor * volatilityFactor).toFixed(2)
        );

        const sampleDensityScore = clamp(datedEntries.length / 30, 0, 1);
        const trendStabilityScore = previous30Avg > 0 && recent30Avg > 0
          ? 1 - clamp(Math.abs(recent30Avg - previous30Avg) / Math.max(previous30Avg, 0.1), 0, 1)
          : 0.6;
        const forecastConfidence = Number(
          clamp(0.35 + (sampleDensityScore * 0.45) + (trendStabilityScore * 0.2), 0.35, 0.95).toFixed(2)
        );

        const exactKey = `${targetM}|${targetB}|${targetS}`;
        const totalReceived = receivedMap.get(exactKey) ?? 0;

        const currentStock = item.initialStock + (item.stockAdjustment ?? 0) + totalReceived - totalUsage;
        // 권장량은 보수적으로 유지: 예측값은 긴급도 전용으로만 사용
        const demandBase = Math.max(monthlyAvg, lastMonthUsage);
        const recommended = Math.max(Math.ceil(demandBase), dailyMax * 2, 1);

        // 마지막 사용일: mergedDailyQty의 날짜 키 중 최신값
        const lastUsedDate = totalUsage > 0 && datedEntries.length > 0
          ? datedEntries[datedEntries.length - 1].day
          : null;

        return {
          ...item,
          usageCount: totalUsage,
          currentStock,
          recommendedStock: recommended,
          monthlyAvgUsage: monthlyAvg,
          dailyMaxUsage: dailyMax,
          predictedDailyUsage,
          forecastConfidence,
          lastMonthUsage,
          lastUsedDate,
        };
      });
      return { ...prev, inventory: updatedInventory };
    });
  }, [normalize]);

  useEffect(() => {
    syncInventoryWithUsageAndOrders();
  }, [state.surgeryMaster, state.orders, state.inventory.length, syncInventoryWithUsageAndOrders]);

  const refreshLatestSurgeryUsage = useCallback(async (): Promise<Record<string, number> | null> => {
    const hospitalId = state.user?.hospitalId;
    if (!hospitalId) return null;

    try {
      const retentionMonths = PLAN_LIMITS[effectivePlan]?.retentionMonths ?? 24;
      const effectiveMonths = Math.min(retentionMonths, 24);
      const fromDateObj = new Date();
      fromDateObj.setMonth(fromDateObj.getMonth() - effectiveMonths);
      const fromDate = fromDateObj.toISOString().split('T')[0];

      const latestRecords = await surgeryService.getSurgeryUsageRecords({ fromDate });
      const usageMap = computeUsageByInventoryFromRecords(latestRecords, state.inventory);
      return usageMap;
    } catch (error) {
      console.error('[App] 최신 수술기록 재조회 실패:', error);
      showAlertToast('최신 수술기록 조회에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      return null;
    }
  }, [computeUsageByInventoryFromRecords, effectivePlan, showAlertToast, state.inventory, state.user?.hospitalId]);

  const resolveManualSurgeryInput = useCallback(async (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
  }): Promise<{
    checked: number;
    found: number;
    applicable: number;
    alreadyFixed: number;
    updated: number;
    failed: number;
    notFound: number;
    appliedManufacturer: string;
    appliedBrand: string;
    appliedSize: string;
  }> => {
    const sheetName = '수술기록지';
    const rows = state.surgeryMaster[sheetName] || [];
    const idSet = Array.from(new Set((params.recordIds || []).filter(Boolean)));

    const fixedTarget = fixIbsImplant(
      String(params.targetManufacturer || '').trim(),
      String(params.targetBrand || '').trim()
    );
    const canonicalTargetSize = toCanonicalSize(String(params.targetSize || '').trim(), fixedTarget.manufacturer);
    const targetSizeKey = getSizeMatchKey(canonicalTargetSize, fixedTarget.manufacturer);
    const targetBrandKey = normalizeSurgery(fixedTarget.brand);
    const targetManufacturerKey = normalizeSurgery(fixedTarget.manufacturer);

    // 동일 제조사-브랜드-규격 키를 가진 기존 재고 규격 표기를 우선 사용 (목록 기반 표기 통일)
    const preferredInventoryItem = state.inventory.find(item => {
      if (item.manufacturer.startsWith('수술중FAIL_')) return false;
      if (item.manufacturer === '보험청구' || item.brand === '보험임플란트') return false;
      const itemFixed = fixIbsImplant(item.manufacturer, item.brand);
      return (
        normalizeSurgery(itemFixed.brand) === targetBrandKey &&
        isManufacturerAliasMatch(normalizeSurgery(itemFixed.manufacturer), targetManufacturerKey) &&
        getSizeMatchKey(item.size, itemFixed.manufacturer) === targetSizeKey
      );
    });
    const appliedSize = preferredInventoryItem?.size || canonicalTargetSize;

    const formatIndex = buildBrandSizeFormatIndex(state.inventory);

    let found = 0;
    let alreadyFixed = 0;
    let notFound = 0;
    const applicableIds: string[] = [];

    for (const id of idSet) {
      const row = rows.find(r => String(r._id || '') === id);
      if (!row) {
        notFound += 1;
        continue;
      }
      found += 1;

      const rowManufacturer = String(row['제조사'] || '').trim();
      const rowBrand = String(row['브랜드'] || '').trim();
      const rowSize = String(row['규격(SIZE)'] || '').trim();
      const rowHasRegisteredCombo = hasRegisteredBrandSize(formatIndex, rowManufacturer, rowBrand, rowSize);
      const rowIsListBased = isListBasedSurgeryInput(formatIndex, rowManufacturer, rowBrand, rowSize);

      if (rowIsListBased || !rowHasRegisteredCombo) {
        alreadyFixed += 1;
        continue;
      }
      applicableIds.push(id);
    }

    if (params.verifyOnly) {
      return {
        checked: idSet.length,
        found,
        applicable: applicableIds.length,
        alreadyFixed,
        updated: 0,
        failed: 0,
        notFound,
        appliedManufacturer: fixedTarget.manufacturer,
        appliedBrand: fixedTarget.brand,
        appliedSize,
      };
    }

    if (applicableIds.length === 0) {
      return {
        checked: idSet.length,
        found,
        applicable: 0,
        alreadyFixed,
        updated: 0,
        failed: 0,
        notFound,
        appliedManufacturer: fixedTarget.manufacturer,
        appliedBrand: fixedTarget.brand,
        appliedSize,
      };
    }

    const successIds: string[] = [];
    let failed = 0;

    if (state.user?.hospitalId) {
      const updateResults = await Promise.all(
        applicableIds.map(async (id) => {
          const updated = await surgeryService.updateRecord(id, {
            manufacturer: fixedTarget.manufacturer,
            brand: fixedTarget.brand,
            size: appliedSize,
          });
          return { id, ok: !!updated };
        })
      );

      updateResults.forEach(result => {
        if (result.ok) {
          successIds.push(result.id);
        } else {
          failed += 1;
        }
      });
    } else {
      successIds.push(...applicableIds);
    }

    if (successIds.length > 0) {
      const successIdSet = new Set(successIds);
      setState(prev => {
        const prevRows = prev.surgeryMaster[sheetName] || [];
        const nextRows = prevRows.map(row => {
          const rowId = String(row._id || '');
          if (!successIdSet.has(rowId)) return row;
          return {
            ...row,
            '제조사': fixedTarget.manufacturer,
            '브랜드': fixedTarget.brand,
            '규격(SIZE)': appliedSize,
          };
        });
        return {
          ...prev,
          surgeryMaster: {
            ...prev.surgeryMaster,
            [sheetName]: nextRows,
          },
        };
      });
    }

    return {
      checked: idSet.length,
      found,
      applicable: applicableIds.length,
      alreadyFixed,
      updated: successIds.length,
      failed,
      notFound,
      appliedManufacturer: fixedTarget.manufacturer,
      appliedBrand: fixedTarget.brand,
      appliedSize,
    };
  }, [state.inventory, state.surgeryMaster, state.user?.hospitalId]);

  const applyBaseStockBatch = useCallback(async (changes: Array<{ id: string; initialStock: number; nextCurrentStock: number }>) => {
    if (changes.length === 0) return;

    const prevInventory = state.inventory;
    const changeMap = new Map(changes.map(change => [change.id, change]));

    setState(prev => ({
      ...prev,
      inventory: prev.inventory.map(item => {
        const change = changeMap.get(item.id);
        if (!change) return item;
        return {
          ...item,
          initialStock: change.initialStock,
          currentStock: change.nextCurrentStock,
        };
      }),
    }));

    try {
      const BATCH_SIZE = 20;
      for (let i = 0; i < changes.length; i += BATCH_SIZE) {
        const batch = changes.slice(i, i + BATCH_SIZE);
        const results = await Promise.all(
          batch.map(change => inventoryService.updateItem(change.id, { initial_stock: change.initialStock }))
        );
        if (results.some(result => !result)) {
          throw new Error('batch_update_failed');
        }
      }

      operationLogService.logOperation(
        'base_stock_edit',
        `기초재고 일괄 수정 (${changes.length}개)`,
        { count: changes.length }
      );
    } catch (error) {
      console.error('[App] 기초재고 일괄 저장 실패, 롤백:', error);
      setState(prev => ({ ...prev, inventory: prevInventory }));
      showAlertToast('기초재고 일괄 저장에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      throw error;
    }
  }, [setState, showAlertToast, state.inventory]);

  const handleFileUpload = async (file: File, type: UploadType, sizeCorrections?: Map<string, string>) => {
    uploadingTypeRef.current = type;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      // 수술기록 업로드 빈도 제한 체크
      if (type === 'surgery' && state.user?.hospitalId) {
        const lastUpload = await surgeryService.getLastUploadDate(state.user.hospitalId);
        const uploadCheck = planService.canUploadSurgery(effectivePlan, lastUpload);
        if (!uploadCheck.allowed && uploadCheck.nextAvailableDate) {
          const nextDate = uploadCheck.nextAvailableDate;
          const formatted = `${nextDate.getFullYear()}년 ${nextDate.getMonth() + 1}월 ${nextDate.getDate()}일`;
          const planLabel = effectivePlan === 'free' ? '무료 플랜은 월 1회' : '베이직 플랜은 주 1회';
          showAlertToast(`${planLabel} 수술기록 업로드가 가능합니다. 다음 업로드 가능일: ${formatted}`, 'error');
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      const { parseExcelFile } = await import('./services/excelService');
      const parsed = await parseExcelFile(file);
      if (type === 'surgery') {
        const targetSheetName = '수술기록지';
        const newSurgeryMaster = { ...state.surgeryMaster };

        if (parsed.sheets[targetSheetName]) {
          const originalSheet = parsed.sheets[targetSheetName];
          const cleanedRows: ExcelRow[] = originalSheet.rows.filter(row => {
            const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
            const contentCount = Object.values(row).filter(val => val !== null && val !== undefined && String(val).trim() !== "").length;
            return !isTotalRow && contentCount > 1;
          }).map(row => {
            const desc = String(row['수술기록'] || row['수술내용'] || row['픽스쳐'] || row['규격'] || row['품명'] || "");
            const toothStr = String(row['치아번호'] || "").trim();

            let quantity = 0;
            if (toothStr !== "") {
              quantity = toothStr.includes(',') ? toothStr.split(',').length : 1;
            } else if (desc !== "") {
              quantity = 1;
            }

            let classification = "식립";
            let manufacturer = "";
            let brand = "";
            let size = "";
            let boneQuality = "";
            let initialFixation = "";

            if (desc.includes('[GBR Only]')) classification = "골이식만";
            else if (desc.includes('수술중FAIL_')) classification = "수술중 FAIL";
            else if (desc.includes('보험임플란트')) classification = "청구";

            if (classification === "골이식만") {
              const mMatch = desc.match(/\[(.*?)\]/);
              manufacturer = mMatch ? mMatch[1] : "GBR Only";
              const bMatch = desc.match(/\]\s*(G.*?\))/);
              brand = bMatch ? bMatch[1] : "";
            }
            else if (desc.includes('-')) {
              const mainParts = desc.split('-').map(p => p.trim());
              let rawM = mainParts[0];
              manufacturer = rawM.replace('수술중FAIL_', '').replace('보험임플란트', '').trim();
              if (manufacturer === "" && mainParts.length > 1) {
                manufacturer = mainParts[1];
              }

              const detailsStr = mainParts.slice(1).join('-');
              const slashSegments = detailsStr.split('/').map(s => s.trim());
              const brandSizeStr = slashSegments[0] || "";
              const sizeIndicatorMatch = brandSizeStr.match(/([DdLlMm]\:|[Φφ]|(?:\s|^)[DdLlMm]\s|(?:\s|^)\d)/);

              if (sizeIndicatorMatch && sizeIndicatorMatch.index !== undefined) {
                brand = brandSizeStr.substring(0, sizeIndicatorMatch.index).trim();
                size = brandSizeStr.substring(sizeIndicatorMatch.index).trim();
              } else {
                const fallbackMatch = brandSizeStr.match(/^([a-zA-Z\s\d-]+(?:\s[IVX]+)?)/);
                brand = fallbackMatch ? fallbackMatch[1].trim() : brandSizeStr;
                if (fallbackMatch) size = brandSizeStr.substring(fallbackMatch[0].length).trim();
              }

              if (manufacturer === "" || manufacturer === "보험임플란트") {
                manufacturer = brand;
              }

              // 골질/초기고정 파싱 (슬래시 구분)
              for (let i = 1; i < slashSegments.length; i++) {
                const seg = slashSegments[i];
                if (seg.startsWith('골질')) boneQuality = seg.replace('골질', '').trim();
                else if (seg.startsWith('초기고정')) initialFixation = seg.replace('초기고정', '').trim();
              }
            } else {
              manufacturer = desc.replace('보험임플란트', '').replace('수술중FAIL_', '').trim();
            }

            const fixedMfr = fixIbsImplant(manufacturer, brand);
            return {
              ...row,
              '구분': classification,
              '갯수': quantity,
              '제조사': fixedMfr.manufacturer,
              '브랜드': fixedMfr.brand,
              '규격(SIZE)': isIbsImplantManufacturer(fixedMfr.manufacturer) ? size : toCanonicalSize(size, fixedMfr.manufacturer),
              '골질': row['골질'] || boneQuality,
              '초기고정': row['초기고정'] || initialFixation,
            };
          });

          // Supabase에 수술기록 저장 (중복 자동 skip) — DB 결과 기반으로 UI 상태 업데이트
          if (state.user?.hospitalId) {
            const { records: savedRecords, inserted, skipped } = await surgeryService.bulkInsertFromExcel(cleanedRows, state.user.hospitalId);

            if (skipped > 0 && inserted === 0) {
              // 전부 중복 → UI에 아무것도 추가하지 않고 알림만
              showAlertToast(`이미 저장된 데이터입니다. (${skipped}건 중복 감지, 새로 저장된 건 없음)`, 'info');
              setState(prev => ({ ...prev, isLoading: false }));
              return;
            }

            if (inserted > 0) {
              // DB에 실제 저장된 레코드만 UI에 반영
              const savedRows = await Promise.all(savedRecords.map(dbToExcelRow));
              newSurgeryMaster[targetSheetName] = [
                ...(newSurgeryMaster[targetSheetName] || []),
                ...savedRows,
              ];
              setState(prev => ({
                ...prev,
                isLoading: false,
                surgeryFileName: file.name,
                surgeryMaster: newSurgeryMaster,
                dashboardTab: 'surgery_database',
              }));
              operationLogService.logOperation(
                'surgery_upload',
                `수술기록 ${inserted}건 저장${skipped > 0 ? `, ${skipped}건 중복 skip` : ''} (${file.name})`
              );
            }
          } else {
            // 비로그인 상태: DB 저장 없이 로컬 상태만 (레거시 동작)
            newSurgeryMaster[targetSheetName] = [...(newSurgeryMaster[targetSheetName] || []), ...cleanedRows];
            setState(prev => ({ ...prev, isLoading: false, surgeryFileName: file.name, surgeryMaster: newSurgeryMaster, dashboardTab: 'surgery_database' }));
          }
        } else {
          showAlertToast("'수술기록지' 시트를 찾을 수 없습니다.", 'error');
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        // 픽스쳐 데이터: IBS Implant 제조사/브랜드 교정 후 저장
        const fixedSheets = { ...parsed.sheets };
        Object.keys(fixedSheets).forEach(name => {
          fixedSheets[name] = {
            ...fixedSheets[name],
            rows: fixedSheets[name].rows.map(row => {
              const fixed = fixIbsImplant(
                String(row['제조사'] || row['Manufacturer'] || ''),
                String(row['브랜드'] || row['Brand'] || '')
              );
              const rawSize = String(
                row['규격(SIZE)'] ||
                row['규격'] ||
                row['사이즈'] ||
                row['Size'] ||
                row['size'] ||
                ''
              );
              return {
                ...row,
                '제조사': fixed.manufacturer,
                '브랜드': fixed.brand,
                '규격(SIZE)': sizeCorrections?.get(rawSize.trim()) ?? (isIbsImplantManufacturer(fixed.manufacturer) ? rawSize : toCanonicalSize(rawSize, fixed.manufacturer)),
              };
            }),
          };
        });
        const fixedParsed = { ...parsed, sheets: fixedSheets };
        const initialIndices: Record<string, Set<number>> = {};
        Object.keys(fixedParsed.sheets).forEach(name => {
          initialIndices[name] = new Set(fixedParsed.sheets[name].rows.map((_, i) => i));
        });
        setState(prev => ({ ...prev, isLoading: false, fixtureData: fixedParsed, fixtureFileName: file.name, selectedFixtureIndices: initialIndices, dashboardTab: 'fixture_edit' }));
        operationLogService.logOperation('raw_data_upload', `픽스쳐 데이터 업로드 (${file.name})`);
      }
    } catch (error) {
      showAlertToast('엑셀 파일 처리에 실패했습니다.', 'error');
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const refreshOrdersFromServer = useCallback(async () => {
    if (!state.user?.hospitalId) return false;

    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('hospital_id', state.user.hospitalId)
      .order('created_at', { ascending: false });

    if (error || !data) {
      console.error('[App] 주문 목록 재동기화 실패:', error);
      return false;
    }

    const mappedOrders = (data as (DbOrder & { order_items: DbOrderItem[] })[]).map(dbToOrder);
    setState(prev => ({ ...prev, orders: mappedOrders }));
    return true;
  }, [setState, state.user?.hospitalId]);

  const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const currentOrder = state.orders.find(o => o.id === orderId);
    if (!currentOrder) {
      showAlertToast('주문을 찾을 수 없습니다. 화면을 새로고침해 주세요.', 'error');
      return;
    }

    const nextReceivedDate = status === 'received'
      ? new Date().toISOString().split('T')[0]
      : undefined;

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? { ...o, status, receivedDate: nextReceivedDate }
          : o
      )
    }));

    const result = await orderService.updateStatus(orderId, status, {
      expectedCurrentStatus: currentOrder.status,
      receivedDate: nextReceivedDate,
    });

    if (result.ok) {
      operationLogService.logOperation('order_status_update', `주문 상태 변경: ${status}`, { orderId, status });
      return;
    }

    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o =>
        o.id === orderId
          ? { ...o, status: currentOrder.status, receivedDate: currentOrder.receivedDate }
          : o
      )
    }));

    if (result.reason === 'conflict') {
      const latestStatusText = result.currentStatus === 'received' ? '입고완료' : '입고대기';
      showAlertToast(`다른 사용자가 이미 ${latestStatusText}로 변경했습니다. 최신 주문 목록을 다시 불러옵니다.`, 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    if (result.reason === 'not_found') {
      showAlertToast('주문이 이미 삭제되어 상태를 변경할 수 없습니다. 최신 주문 목록을 다시 불러옵니다.', 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    showAlertToast('주문 상태 변경에 실패했습니다.', 'error');
  }, [refreshOrdersFromServer, setState, showAlertToast, state.orders]);

  const handleDeleteOrder = useCallback(async (orderId: string) => {
    const currentOrder = state.orders.find(o => o.id === orderId);
    if (!currentOrder) {
      showAlertToast('주문을 찾을 수 없습니다. 이미 삭제되었을 수 있습니다.', 'info');
      return;
    }

    setState(prev => ({
      ...prev,
      orders: prev.orders.filter(o => o.id !== orderId)
    }));

    const result = await orderService.deleteOrder(orderId, {
      expectedCurrentStatus: currentOrder.status,
    });

    if (result.ok) {
      operationLogService.logOperation('order_delete', '주문 삭제', { orderId });
      return;
    }

    if (result.reason === 'not_found') {
      showAlertToast('주문이 이미 삭제되어 목록에서 제거되었습니다.', 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    setState(prev => {
      if (prev.orders.some(o => o.id === currentOrder.id)) return prev;
      return { ...prev, orders: [currentOrder, ...prev.orders] };
    });

    if (result.reason === 'conflict') {
      const latestStatusText = result.currentStatus === 'received' ? '입고완료' : '입고대기';
      showAlertToast(`다른 사용자가 주문 상태를 ${latestStatusText}로 변경하여 삭제가 취소되었습니다. 최신 주문 목록을 다시 불러옵니다.`, 'info');
      const synced = await refreshOrdersFromServer();
      if (!synced) {
        showAlertToast('주문 목록 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.', 'error');
      }
      return;
    }

    showAlertToast('주문 삭제에 실패했습니다.', 'error');
  }, [refreshOrdersFromServer, setState, showAlertToast, state.orders]);

  const handleAddOrder = useCallback(async (order: Order) => {
    // Pre-calculate fail record IDs for Supabase update
    let failRecordIds: string[] = [];
    if (order.type === 'fail_exchange') {
      const rows = state.surgeryMaster['수술기록지'] || [];
      const totalToProcess = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const targetM = normalize(order.manufacturer);
      failRecordIds = rows
        .filter(row => row['구분'] === '수술중 FAIL' && normalize(String(row['제조사'] ?? '')) === targetM)
        .sort((a, b) => String(a['날짜'] ?? '').localeCompare(String(b['날짜'] ?? '')))
        .slice(0, totalToProcess)
        .filter(r => r._id)
        .map(r => r._id as string);
    }

    const applyOrderToState = (nextOrder: Order, markFailAsExchanged: boolean) => {
      setState(prev => {
        let nextSurgeryMaster = { ...prev.surgeryMaster };
        if (nextOrder.type === 'fail_exchange' && markFailAsExchanged) {
          const sheetName = '수술기록지';
          const rows = [...(nextSurgeryMaster[sheetName] || [])];
          const totalToProcess = nextOrder.items.reduce((sum, item) => sum + item.quantity, 0);
          const targetM = normalize(nextOrder.manufacturer);
          const failIndices = rows
            .map((row, idx) => ({ row, idx }))
            .filter(({ row }) => row['구분'] === '수술중 FAIL' && normalize(String(row['제조사'] ?? '')) === targetM)
            .sort((a, b) => String(a.row['날짜'] ?? '').localeCompare(String(b.row['날짜'] ?? '')))
            .map(item => item.idx);
          const indicesToUpdate = failIndices.slice(0, totalToProcess);
          indicesToUpdate.forEach(idx => {
            rows[idx] = { ...rows[idx], '구분': 'FAIL 교환완료' };
          });
          nextSurgeryMaster[sheetName] = rows;
        }
        // Realtime이 먼저 추가했을 경우 중복 방지
        const alreadyExists = prev.orders.some(o => o.id === nextOrder.id);
        return {
          ...prev,
          orders: alreadyExists ? prev.orders : [nextOrder, ...prev.orders],
          surgeryMaster: nextSurgeryMaster,
          // fail_exchange 주문은 FailManager 화면에 교환 이력이 표시되므로 탭 이동 없음
          // replenishment 주문만 order_management 탭으로 이동
          ...(nextOrder.type !== 'fail_exchange' ? { dashboardTab: 'order_management' as const } : {}),
        };
      });
    };

    // 비로그인/로컬 모드: 기존 동작 유지
    if (!state.user?.hospitalId) {
      applyOrderToState(order, order.type === 'fail_exchange');
      return;
    }

    // 서버 모드: 저장 성공 이후에만 상태 반영 (일관성 우선)
    try {
      const created = await orderService.createOrder(
        {
          hospital_id: state.user.hospitalId,
          type: order.type,
          manufacturer: order.manufacturer,
          date: order.date,
          manager: order.manager,
          status: order.status,
          received_date: order.receivedDate || null
        },
        order.items.map(i => ({ brand: i.brand, size: i.size, quantity: i.quantity }))
      );

      if (!created) {
        showAlertToast('주문 저장에 실패했습니다. 다시 시도해주세요.', 'error');
        return;
      }

      let failUpdateSucceeded = true;
      if (order.type === 'fail_exchange' && failRecordIds.length > 0) {
        failUpdateSucceeded = await surgeryService.markFailExchanged(failRecordIds);
      }

      const savedOrder = dbToOrder(created);
      applyOrderToState(savedOrder, order.type === 'fail_exchange' && failUpdateSucceeded);

      operationLogService.logOperation(
        'order_create',
        `${order.type === 'fail_exchange' ? 'FAIL 교환' : '보충'} 주문 생성 (${order.manufacturer}, ${order.items.length}건)`,
        { type: order.type, manufacturer: order.manufacturer }
      );

      if (order.type === 'fail_exchange' && failRecordIds.length > 0 && !failUpdateSucceeded) {
        showAlertToast('주문은 저장되었지만 FAIL 교환 상태 반영에 실패했습니다. 잠시 후 다시 확인해주세요.', 'error');
      }
    } catch (error) {
      console.error('[App] 주문 생성 실패:', error);
      showAlertToast('주문 생성 중 오류가 발생했습니다.', 'error');
    }
  }, [state.user?.hospitalId, state.surgeryMaster, showAlertToast]);

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
    markDirtyAfterSave,
  } = useFixtureEditControls({
    fixtureData: state.fixtureData,
    setState,
    showAlertToast,
  });

  const handleUpdateCell = useCallback((index: number, column: string, value: boolean | string | number, type: 'fixture' | 'surgery', sheetName?: string) => {
    if (type === 'fixture' && column === '사용안함') {
      markDirtyAfterSave();
    }
    setState(prev => {
      if (type === 'surgery' && sheetName) {
        const newMasterRows = [...(prev.surgeryMaster[sheetName] || [])];
        newMasterRows[index] = { ...newMasterRows[index], [column]: value };
        return { ...prev, surgeryMaster: { ...prev.surgeryMaster, [sheetName]: newMasterRows } };
      }
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];
      const newRows = [...activeSheet.rows];
      newRows[index] = { ...newRows[index], [column]: value };
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, [markDirtyAfterSave]);

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
      message: '현재 설정 상태를 재고 마스터에 반영합니다.\n반영 후 재고 현황 페이지로 이동합니다.',
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

  const surgeryUnregisteredItems = useMemo<SurgeryUnregisteredItem[]>(() => {
    const rows = state.surgeryMaster['수술기록지'] || [];
    if (rows.length === 0) return [];

    const formatIndex = buildBrandSizeFormatIndex(state.inventory);

    const missingMap = new Map<string, SurgeryUnregisteredItem>();

    rows.forEach((row) => {
      const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
      if (isTotalRow) return;

      const cls = String(row['구분'] || '').trim();
      if (cls !== '식립' && cls !== '수술중 FAIL') return;

      const surgeryRecord = String(row['수술기록'] || '');
      if (surgeryRecord.includes('[GBR Only]')) return;

      const manufacturer = String(row['제조사'] || '').trim();
      const brand = String(row['브랜드'] || '').trim();
      const size = String(row['규격(SIZE)'] || '').trim();

      if (!manufacturer && !brand && !size) return;
      if (manufacturer.startsWith('수술중FAIL_')) return;
      if (manufacturer === '보험청구' || brand === '보험임플란트') return;

      const qtyRaw = row['갯수'] !== undefined ? Number(row['갯수']) : 1;
      const qty = Number.isFinite(qtyRaw) ? qtyRaw : 1;
      const sample = buildUnregisteredSample(row);

      const normM = normalizeSurgery(manufacturer);
      const normB = normalizeSurgery(brand);
      const normS = getSizeMatchKey(size, manufacturer);
      const hasRegisteredCombo = hasRegisteredBrandSize(formatIndex, manufacturer, brand, size);
      const isListBased = isListBasedSurgeryInput(formatIndex, manufacturer, brand, size);
      if (isListBased) return;

      const itemKey = hasRegisteredCombo
        ? `${normM}|${normB}|${normS}|manual:${normalizeSizeTextStrict(size)}`
        : `${normM}|${normB}|${normS}`;
      const existing = missingMap.get(itemKey);
      const rowId = String(row._id || '').trim();
      if (existing) {
        existing.usageCount += qty;
        appendUnregisteredSample(existing, sample);
        if (rowId) {
          const currentIds = existing.recordIds ?? [];
          if (!currentIds.includes(rowId)) {
            existing.recordIds = [...currentIds, rowId];
          }
        }
      } else {
        missingMap.set(itemKey, {
          manufacturer: manufacturer || '-',
          brand: brand || '-',
          size: size || '-',
          usageCount: qty,
          reason: hasRegisteredCombo ? 'non_list_input' : 'not_in_inventory',
          samples: [sample],
          recordIds: rowId ? [rowId] : [],
        });
      }
    });

    return Array.from(missingMap.values()).sort((a, b) => b.usageCount - a.usageCount);
  }, [state.surgeryMaster, state.inventory]);

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
      {state.isLoading && state.user && (
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
          isCollapsed={showMobileDashboardNav ? !isMobileMenuOpen : isSidebarCollapsed}
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

      {showMobileDashboardNav && isMobileMenuOpen && (
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 z-[270] bg-slate-900/35 backdrop-blur-[1px]"
          aria-label="메뉴 닫기"
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
          isSystemAdmin && state.adminViewMode !== 'user' ? (
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
                    {/* Dashboard routing based on Approval Status */}
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
                            onSaveSettings: handleSaveSettings,
                            onUpdateFixtureCell: (idx, col, val) => handleUpdateCell(idx, col, val, 'fixture'),
                            onFixtureSheetChange: (name) => setState(prev => ({ ...prev, fixtureData: { ...prev.fixtureData!, activeSheetName: name } })),
                            onExpandFailClaim: handleExpandFailClaim,
                            onRequestFixtureExcelDownload: requestFixtureExcelDownload,
                            onRequestApplyFixtureToInventory: requestApplyFixtureToInventory,
                          },
                          inventoryMaster: {
                            virtualSurgeryData,
                            applyBaseStockBatch,
                            refreshLatestSurgeryUsage,
                            resolveManualSurgeryInput,
                            onShowAlertToast: showAlertToast,
                          },
                          onLoadHospitalData: loadHospitalData,
                          onGoToPricing: () => setState(prev => ({ ...prev, currentView: 'pricing' })),
                          onDismissPlanLimitToast: () => setPlanLimitToast(null),
                          onUpgradeFromPlanLimitToast: () => {
                            setPlanLimitToast(null);
                            setState(prev => ({ ...prev, currentView: 'pricing' }));
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
                          onAddOrder: handleAddOrder,
                          onUpdateOrderStatus: handleUpdateOrderStatus,
                          onDeleteOrder: handleDeleteOrder,
                        }}
                      />
                  </Suspense>
                </ErrorBoundary>
              </main>
              {showMobileDashboardNav && (
                <MobileDashboardNav
                  mobilePrimaryTabs={mobilePrimaryTabs}
                  dashboardTab={state.dashboardTab}
                  userPermissions={state.user?.permissions}
                  effectiveAccessRole={effectiveAccessRole}
                  isMoreTabActive={isMoreTabActive}
                  onOpenMoreMenu={() => setIsMobileMenuOpen(true)}
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
          planState={state.planState}
          hospitalName={state.hospitalName}
          inventory={state.inventory}
          reviewPopupType={reviewPopupType}
          shouldShowOnboarding={shouldShowOnboarding}
          onboardingStep={onboardingStep}
          showOnboardingToast={showOnboardingToast}
          onboardingProgress={onboardingProgress}
          onCloseProfile={() => setState(prev => ({ ...prev, showProfile: false }))}
          onLeaveHospital={handleLeaveHospital}
          onDeleteAccount={handleDeleteAccount}
          onChangePlan={() => setState(prev => ({ ...prev, showProfile: false, currentView: 'pricing' }))}
          onReviewSubmitted={() => {
            setReviewPopupType(null);
            showAlertToast('후기를 남겨주셔서 감사합니다!', 'success');
          }}
          onDismissReview={() => setReviewPopupType(null)}
          onOnboardingComplete={async () => {
            if (!state.user) return;
            setOnboardingDismissed(true);
            await loadHospitalData(state.user);
          }}
          onOnboardingSkip={() => {
            if (state.user?.hospitalId) onboardingService.markDismissed(state.user.hospitalId);
            setOnboardingDismissed(true);
          }}
          onReopenOnboarding={() => {
            if (state.user?.hospitalId) onboardingService.clearDismissed(state.user.hospitalId);
            setOnboardingDismissed(false);
            setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'overview' }));
          }}
          onGoToDataSetup={(file?: File, sizeCorrections?: Map<string, string>) => {
            if (file) {
              setState(prev => ({ ...prev, currentView: 'dashboard' }));
              handleFileUpload(file, 'fixture', sizeCorrections);
            } else {
              setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fixture_upload' }));
            }
          }}
          onGoToSurgeryUpload={(file?: File) => {
            if (file) {
              setState(prev => ({ ...prev, currentView: 'dashboard' }));
              handleFileUpload(file, 'surgery');
            } else {
              setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'surgery_database' }));
            }
          }}
          onGoToFailManagement={() => {
            setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: 'fail_management' }));
          }}
        />
      </Suspense>

      <AppGlobalOverlays
        planLimitModal={planLimitModal}
        confirmModal={confirmModal}
        inventoryCompare={inventoryCompare}
        alertToast={alertToast}
        showMobileDashboardNav={showMobileDashboardNav}
        onClosePlanLimitModal={closePlanLimitModal}
        onUpgradePlan={() => {
          closePlanLimitModal();
          setState(prev => ({ ...prev, currentView: 'pricing' }));
        }}
        onCloseConfirmModal={() => setConfirmModal(null)}
        onConfirmInventoryCompare={handleConfirmApplyToInventory}
        onCancelInventoryCompare={cancelInventoryCompare}
      />
    </div >
  );
};

export default App;
