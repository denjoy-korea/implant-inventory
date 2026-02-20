
import React, { useCallback, useEffect, useMemo, useRef, useState, Suspense, lazy } from 'react';
import { useAppState } from './hooks/useAppState';
/* ── Static imports (always needed) ── */
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ManufacturerToggle from './components/ManufacturerToggle';
import ExcelTable from './components/ExcelTable';
import BrandChart from './components/BrandChart';
import LengthFilter from './components/LengthFilter';
import FixtureWorkflowGuide from './components/FixtureWorkflowGuide';
import MigrationBanner from './components/MigrationBanner';
import PlanBadge from './components/PlanBadge';
import ReadOnlyBanner from './components/ReadOnlyBanner';
import FeatureGate from './components/FeatureGate';
import NewDataModal from './components/NewDataModal';
import ConfirmModal from './components/ConfirmModal';
import InventoryCompareModal, { CompareItem } from './components/InventoryCompareModal';
import ErrorBoundary from './components/ErrorBoundary';

/* ── Lazy imports (route-level code splitting) ── */
const LandingPage = lazy(() => import('./components/LandingPage'));
const AuthForm = lazy(() => import('./components/AuthForm'));
const PricingPage = lazy(() => import('./components/PricingPage'));
const ContactPage = lazy(() => import('./components/ContactPage'));
const ValuePage = lazy(() => import('./components/ValuePage'));
const AnalyzePage = lazy(() => import('./components/AnalyzePage'));
const NoticeBoard = lazy(() => import('./components/NoticeBoard'));
const DashboardOverview = lazy(() => import('./components/DashboardOverview'));
const InventoryManager = lazy(() => import('./components/InventoryManager'));
const InventoryAudit = lazy(() => import('./components/InventoryAudit'));
const RawDataUploadGuide = lazy(() => import('./components/RawDataUploadGuide'));
const SurgeryDashboard = lazy(() => import('./components/SurgeryDashboard'));
const FailManager = lazy(() => import('./components/FailManager'));
const OrderManager = lazy(() => import('./components/OrderManager'));
const MemberManager = lazy(() => import('./components/MemberManager'));
const SettingsHub = lazy(() => import('./components/SettingsHub'));
const AuditLogViewer = lazy(() => import('./components/AuditLogViewer'));
const AdminPanel = lazy(() => import('./components/AdminPanel'));
const SystemAdminDashboard = lazy(() => import('./components/SystemAdminDashboard'));
const StaffWaitingRoom = lazy(() => import('./components/StaffWaitingRoom'));
const UserProfile = lazy(() => import('./components/UserProfile'));
import { AppState, ExcelData, ExcelRow, User, View, DashboardTab, UploadType, InventoryItem, ExcelSheet, Order, OrderStatus, Hospital, PlanType, BillingCycle, PLAN_NAMES, PLAN_LIMITS, SurgeryUnregisteredItem, SurgeryUnregisteredSample, canAccessTab } from './types';
import { parseExcelFile, downloadExcelFile } from './services/excelService';
import { extractLengthFromSize } from './services/sizeUtils';
import { normalizeLength } from './components/LengthFilter';
import { getSizeMatchKey, toCanonicalSize } from './services/sizeNormalizer';
import { authService } from './services/authService';
import { inventoryService } from './services/inventoryService';
import { surgeryService } from './services/surgeryService';
import { orderService } from './services/orderService';
import { hospitalService } from './services/hospitalService';
import { planService } from './services/planService';
import { makePaymentService } from './services/makePaymentService';
import { securityMaintenanceService } from './services/securityMaintenanceService';
import { dbToExcelRow, dbToOrder, fixIbsImplant } from './services/mappers';
import { supabase } from './services/supabaseClient';
import { operationLogService } from './services/operationLogService';
import { resetService } from './services/resetService';
import { normalizeSurgery, normalizeInventory } from './services/normalizationService';
import { useToast } from './hooks/useToast';
import { UNLIMITED_DAYS, DAYS_PER_MONTH, LOW_STOCK_RATIO } from './constants';

/* ── Hash Routing Helpers ── */
const VIEW_HASH: Record<View, string> = {
  landing: '', login: 'login', signup: 'signup', invite: 'invite', dashboard: 'dashboard',
  admin_panel: 'admin', pricing: 'pricing', contact: 'contact',
  value: 'value', analyze: 'analyze', notices: 'notices',
};
const TAB_HASH: Record<DashboardTab, string> = {
  overview: '', fixture_upload: 'upload', fixture_edit: 'edit',
  inventory_master: 'inventory', inventory_audit: 'audit',
  surgery_database: 'surgery', fail_management: 'fail',
  order_management: 'orders', member_management: 'members',
  surgery_upload: 'surgery-upload', settings: 'settings',
  audit_log: 'audit-log',
};
const HASH_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_HASH).filter(([, v]) => v).map(([k, v]) => [v, k])
) as Record<string, View>;
const HASH_TO_TAB = Object.fromEntries(
  Object.entries(TAB_HASH).filter(([, v]) => v).map(([k, v]) => [v, k])
) as Record<string, DashboardTab>;

function buildHash(view: View, tab: DashboardTab): string {
  if (view === 'dashboard') {
    const t = TAB_HASH[tab];
    return t ? `#/dashboard/${t}` : '#/dashboard';
  }
  return view === 'landing' ? '#/' : `#/${VIEW_HASH[view]}`;
}

function parseHash(hash: string): { view: View; tab?: DashboardTab } {
  const path = hash.replace(/^#\/?/, '');
  const [first, second] = path.split('/').filter(Boolean);
  if (!first) return { view: 'landing' };
  if (first === 'dashboard') {
    return { view: 'dashboard', tab: second ? (HASH_TO_TAB[second] || 'overview') : 'overview' };
  }
  return { view: HASH_TO_VIEW[first] || 'landing' };
}

function manufacturerAliasKey(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';

  // FAIL 카테고리는 일반 제조사와 중복키가 섞이지 않도록 별도 네임스페이스 유지
  const compact = value.toLowerCase().replace(/\s+/g, '');
  if (compact.startsWith('수술중fail')) {
    return `fail:${normalizeInventory(value)}`;
  }

  return normalizeSurgery(value).replace(/implant/g, '');
}

function buildInventoryDuplicateKey(item: Pick<InventoryItem, 'manufacturer' | 'brand' | 'size'>): string {
  const fixed = fixIbsImplant(String(item.manufacturer || ''), String(item.brand || ''));
  const canonicalSize = toCanonicalSize(String(item.size || ''), fixed.manufacturer);
  const manufacturerKey = manufacturerAliasKey(fixed.manufacturer);
  const brandKey = normalizeInventory(fixed.brand);
  const sizeKey = getSizeMatchKey(canonicalSize, fixed.manufacturer);
  return `${manufacturerKey}|${brandKey}|${sizeKey}`;
}

type BrandSizeFormatEntry = {
  manufacturerKey: string;
  allowedSizeTexts: Set<string>;
};

type BrandSizeFormatIndex = Map<string, BrandSizeFormatEntry[]>;

function normalizeSizeTextStrict(raw: string): string {
  return String(raw || '').trim();
}

function isManufacturerAliasMatch(left: string, right: string): boolean {
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

function buildBrandSizeFormatIndex(inventoryItems: InventoryItem[]): BrandSizeFormatIndex {
  const index: BrandSizeFormatIndex = new Map();

  inventoryItems
    .filter(item =>
      !item.manufacturer.startsWith('수술중FAIL_') &&
      item.manufacturer !== '보험청구' &&
      item.brand !== '보험임플란트'
    )
    .forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const manufacturerKey = normalizeSurgery(fixed.manufacturer);
      const brandKey = normalizeSurgery(fixed.brand);
      const sizeKey = getSizeMatchKey(item.size, fixed.manufacturer);
      const sizeText = normalizeSizeTextStrict(item.size);
      if (!manufacturerKey || !brandKey || !sizeKey || !sizeText) return;

      const bsKey = `${brandKey}|${sizeKey}`;
      const list = index.get(bsKey) || [];
      let entry = list.find(v => v.manufacturerKey === manufacturerKey);
      if (!entry) {
        entry = { manufacturerKey, allowedSizeTexts: new Set<string>() };
        list.push(entry);
      }
      entry.allowedSizeTexts.add(sizeText);
      index.set(bsKey, list);
    });

  return index;
}

function hasRegisteredBrandSize(
  formatIndex: BrandSizeFormatIndex,
  manufacturer: string,
  brand: string,
  size: string
): boolean {
  const rowManufacturer = normalizeSurgery(manufacturer);
  const rowBrand = normalizeSurgery(brand);
  const rowSizeKey = getSizeMatchKey(size, manufacturer);
  const bsKey = `${rowBrand}|${rowSizeKey}`;
  const candidates = formatIndex.get(bsKey) || [];
  return candidates.some(candidate => isManufacturerAliasMatch(rowManufacturer, candidate.manufacturerKey));
}

function isListBasedSurgeryInput(
  formatIndex: BrandSizeFormatIndex,
  manufacturer: string,
  brand: string,
  size: string
): boolean {
  const rowManufacturer = normalizeSurgery(manufacturer);
  const rowBrand = normalizeSurgery(brand);
  const rowSizeKey = getSizeMatchKey(size, manufacturer);
  const rowSizeText = normalizeSizeTextStrict(size);
  const bsKey = `${rowBrand}|${rowSizeKey}`;
  const candidates = formatIndex.get(bsKey) || [];
  return candidates.some(candidate =>
    isManufacturerAliasMatch(rowManufacturer, candidate.manufacturerKey) &&
    candidate.allowedSizeTexts.has(rowSizeText)
  );
}

function maskPatientInfoForPreview(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '-';
  if (value.includes('*')) return value;

  const nameOnly = value.replace(/\(.*$/, '').trim();
  const maskedName = nameOnly.length <= 1
    ? `${nameOnly || '-'}*`
    : `${nameOnly[0]}${'*'.repeat(Math.max(1, nameOnly.length - 1))}`;

  const parenMatch = value.match(/\(([^)]*)\)/);
  if (!parenMatch) return maskedName;

  const inside = String(parenMatch[1] || '').trim();
  const maskedInside = '*'.repeat(Math.max(4, inside.length || 0));
  return `${maskedName}(${maskedInside})`;
}

function buildUnregisteredSample(row: ExcelRow): SurgeryUnregisteredSample {
  const date = String(row['날짜'] ?? row['수술일'] ?? '').trim() || '-';
  const patientRaw = String(row['환자정보'] ?? row['환자명'] ?? '').trim();
  const chartNumber = String(row['치아번호'] ?? row['차트번호'] ?? '').trim() || '-';
  const recordId = String(row._id || '').trim() || undefined;
  return {
    date,
    patientMasked: maskPatientInfoForPreview(patientRaw),
    chartNumber,
    recordId,
  };
}

function appendUnregisteredSample(
  target: SurgeryUnregisteredItem,
  sample: SurgeryUnregisteredSample,
  maxSamples = 3
) {
  const current = target.samples ?? [];
  const dedupKey = `${sample.recordId || ''}|${sample.date}|${sample.patientMasked}|${sample.chartNumber}`;
  const exists = current.some(v => `${v.recordId || ''}|${v.date}|${v.patientMasked}|${v.chartNumber}` === dedupKey);
  if (exists) return;
  target.samples = [...current, sample].slice(0, maxSamples);
}

/* ── 일시정지 상태 화면 ── */
const PausedAccountScreen: React.FC<{
  userName: string;
  planName: string;
  onResume: () => void;
  onCancelPlan: () => void;
  onLogout: () => void;
}> = ({ userName, planName, onResume, onCancelPlan, onLogout }) => {
  const [showCancelConfirm, setShowCancelConfirm] = React.useState(false);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-slate-800">{userName}님, 계정이 일시정지 상태입니다</h2>
          <p className="text-sm text-slate-500 mt-2">데이터 초기화가 완료되어 계정이 일시정지되었습니다.</p>
        </div>

        <div className="space-y-3">
          {/* 사용 재개 */}
          <button
            onClick={onResume}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-colors text-left"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="font-bold text-sm">사용 재개</p>
                <p className="text-xs text-indigo-200 mt-0.5">기존 {planName} 플랜을 유지하며 새로 시작합니다</p>
              </div>
            </div>
          </button>

          {/* 플랜 취소 */}
          {!showCancelConfirm ? (
            <button
              onClick={() => setShowCancelConfirm(true)}
              className="w-full px-6 py-4 bg-white border border-slate-200 rounded-2xl hover:border-slate-300 transition-colors text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-800">플랜 취소</p>
                  <p className="text-xs text-slate-500 mt-0.5">Free 플랜으로 전환 후 사용을 시작합니다</p>
                </div>
              </div>
            </button>
          ) : (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl">
              <div className="flex items-start gap-3 mb-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm font-bold text-amber-800">플랜을 취소하시겠습니까?</p>
                  <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                    취소 후 재구독 시, 기능 추가 및 유지관리 비용 변동으로 인해 <span className="font-bold">기존 요금이 보장되지 않을 수 있습니다.</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCancelConfirm(false)}
                  className="flex-1 px-3 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  돌아가기
                </button>
                <button
                  onClick={onCancelPlan}
                  className="flex-1 px-3 py-2 text-xs font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors"
                >
                  플랜 취소 후 시작
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="text-center mt-6">
          <button onClick={onLogout} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const fixtureFileRef = useRef<HTMLInputElement>(null);
  const surgeryFileRef = useRef<HTMLInputElement>(null);

  const { toast: alertToast, showToast: showAlertToast } = useToast(3500);

  const {
    state,
    setState,
    loadHospitalData,
    handleLoginSuccess,
    handleLeaveHospital: _handleLeaveHospital,
    handleDeleteAccount,
  } = useAppState(showAlertToast);

  // UserProfile expects () => void; hook expects (user: User) so wrap with current user
  const handleLeaveHospital = useCallback(() => {
    if (state.user) _handleLeaveHospital(state.user);
  }, [_handleLeaveHospital, state.user]);

  // 회원가입 후 pending trial 자동 시작
  const handleLoginSuccessWithTrial = useCallback(async (user: User) => {
    await handleLoginSuccess(user);
    const pendingTrialPlan = localStorage.getItem('denjoy_pending_trial') as PlanType | null;
    if (pendingTrialPlan && pendingTrialPlan !== 'free' && user.hospitalId && user.role === 'master') {
      localStorage.removeItem('denjoy_pending_trial');
      await planService.startTrial(user.hospitalId, pendingTrialPlan);
      // startTrial 반환값에 의존하지 않고 DB를 직접 재조회해 결과 검증
      const ps = await planService.getHospitalPlan(user.hospitalId);
      if (ps.isTrialActive) {
        setState(prev => ({ ...prev, planState: ps }));
        showAlertToast(`${PLAN_NAMES[pendingTrialPlan]} 14일 무료 체험이 시작됐습니다!`, 'success');
      }
    }
  }, [handleLoginSuccess, showAlertToast, setState]);

  const [planLimitModal, setPlanLimitModal] = React.useState<{ currentCount: number; newCount: number; maxItems: number } | null>(null);
  const [showAuditHistory, setShowAuditHistory] = React.useState(false);

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
        const hospitalName = (data.hospitals as any)?.name ?? '치과';
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

  // Dev convenience: expose maintenance helpers for one-off operations.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (globalThis as any).__securityMaintenanceService = securityMaintenanceService;
    return () => {
      delete (globalThis as any).__securityMaintenanceService;
    };
  }, []);

  useEffect(() => {
    if (state.currentView === 'admin_panel' && !isSystemAdmin) {
      setState(prev => ({ ...prev, currentView: prev.user ? 'dashboard' : 'landing' }));
    }
  }, [state.currentView, isSystemAdmin]);

  /** 플랜 품목 수 계산 시 수술중FAIL_ / 보험청구 제외 */
  const countBillableItems = useCallback((items: InventoryItem[]) => {
    return items.filter(i =>
      !i.manufacturer.startsWith('수술중FAIL_') && i.manufacturer !== '보험청구'
    ).length;
  }, []);

  const billableItemCount = useMemo(() => countBillableItems(state.inventory), [state.inventory, countBillableItems]);

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
          const t = new Date(dateStr).getTime();
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

  const handleFileUpload = async (file: File, type: UploadType) => {
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
              '규격(SIZE)': toCanonicalSize(size, fixedMfr.manufacturer),
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
                '규격(SIZE)': toCanonicalSize(rawSize, fixed.manufacturer),
                '사용안함': true
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

  const handleUpdateOrderStatus = useCallback(async (orderId: string, status: OrderStatus) => {
    const prevOrders = state.orders;
    setState(prev => ({
      ...prev,
      orders: prev.orders.map(o => o.id === orderId ? { ...o, status, receivedDate: status === 'received' ? new Date().toISOString() : undefined } : o)
    }));
    try {
      await orderService.updateStatus(orderId, status);
      operationLogService.logOperation('order_status_update', `주문 상태 변경: ${status}`, { orderId, status });
    } catch (error) {
      console.error('[App] 주문 상태 변경 실패, 롤백:', error);
      setState(prev => ({ ...prev, orders: prevOrders }));
      showAlertToast('주문 상태 변경에 실패했습니다.', 'error');
    }
  }, [state.orders]);

  const handleAddOrder = useCallback(async (order: Order) => {
    // Pre-calculate fail record IDs for Supabase update
    let failRecordIds: string[] = [];
    if (order.type === 'fail_exchange') {
      const rows = state.surgeryMaster['수술기록지'] || [];
      const totalToProcess = order.items.reduce((sum, item) => sum + item.quantity, 0);
      const targetM = normalize(order.manufacturer);
      failRecordIds = rows
        .filter(row => row['구분'] === '수술중 FAIL' && normalize(row['제조사']) === targetM)
        .sort((a, b) => String(a['날짜'] || '').localeCompare(String(b['날짜'] || '')))
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
            .filter(({ row }) => row['구분'] === '수술중 FAIL' && normalize(row['제조사']) === targetM)
            .sort((a, b) => String(a.row['날짜'] || '').localeCompare(String(b.row['날짜'] || '')))
            .map(item => item.idx);
          const indicesToUpdate = failIndices.slice(0, totalToProcess);
          indicesToUpdate.forEach(idx => {
            rows[idx] = { ...rows[idx], '구분': 'FAIL 교환완료' };
          });
          nextSurgeryMaster[sheetName] = rows;
        }
        return {
          ...prev,
          orders: [nextOrder, ...prev.orders],
          surgeryMaster: nextSurgeryMaster,
          dashboardTab: 'order_management'
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

  const handleUpdateCell = useCallback((index: number, column: string, value: boolean | string | number, type: 'fixture' | 'surgery', sheetName?: string) => {
    // 사용안함 체크박스 변경이면 dirty 표시
    if (type === 'fixture' && column === '사용안함') {
      setIsDirtyAfterSave(true);
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
  }, []);

  // 설정 저장/복구 상태 분리
  const [saveToast, setSaveToast] = useState<'idle' | 'saved'>('idle');
  const [restoreToast, setRestoreToast] = useState<'idle' | 'restored'>('idle');
  const saveToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoreToastTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // 마지막 저장 시각 (화면 표시용)
  const [savedAt, setSavedAt] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem('fixture_settings_v1');
      if (!raw) return null;
      const p = JSON.parse(raw);
      return p.savedAt ?? null;
    } catch { return null; }
  });
  // 저장 후 변경 여부 (dirty flag)
  const [isDirtyAfterSave, setIsDirtyAfterSave] = useState(false);
  // 저장 후 복구지점 패널로 스크롤 이동용 ref
  const restorePanelRef = React.useRef<HTMLDivElement>(null);

  // 재고 비교 모달 상태
  const [inventoryCompare, setInventoryCompare] = useState<{
    duplicates: CompareItem[];
    newItems: CompareItem[];
    fullNewItems: InventoryItem[];
  } | null>(null);

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

  // ManufacturerToggle에서 활성화된 제조사 목록 (BrandChart 탭 기준)
  // BrandChart에서 브랜드를 전체 해제해도 이 목록은 유지됨
  // ManufacturerToggle에서 직접 해제해야만 이 목록에서 제거됨
  const [enabledManufacturers, setEnabledManufacturers] = useState<string[]>([]);

  // fixtureData 변경 시 enabledManufacturers 초기화 (데이터 로드/변경 시)
  const fixtureSheet = state.fixtureData?.sheets?.[state.fixtureData?.activeSheetName ?? ''];
  useEffect(() => {
    if (!fixtureSheet) { setEnabledManufacturers([]); return; }
    const mfSet = new Set<string>();
    fixtureSheet.rows.forEach(r => {
      const m = String(r['제조사'] || '기타');
      if (r['사용안함'] !== true && !m.startsWith('수술중FAIL_') && m !== '보험청구') {
        mfSet.add(m);
      }
    });
    const nextEnabled = Array.from(mfSet).sort();
    setEnabledManufacturers(prev => {
      if (prev.length === 0) return nextEnabled;
      const prevSet = new Set(prev);
      nextEnabled.forEach(m => prevSet.add(m));
      const merged = Array.from(prevSet).sort();
      if (merged.length === prev.length && merged.every((m, i) => m === prev[i])) return prev;
      return merged;
    });
  }, [fixtureSheet]);

  const handleBulkToggle = useCallback((filters: Record<string, string>, targetUnused: boolean) => {
    setSaveToast('idle');
    setIsDirtyAfterSave(true);
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];
      const newRows = activeSheet.rows.map(row => {
        const matches = Object.entries(filters).every(([field, value]) => String(row[field] || '') === value);
        return matches ? { ...row, '사용안함': targetUnused } : row;
      });
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, [setSaveToast]);

  // ManufacturerToggle 전용 핸들러: enabledManufacturers도 함께 업데이트
  const handleManufacturerToggle = useCallback((manufacturer: string, isActive: boolean) => {
    // 데이터 토글
    handleBulkToggle({ '제조사': manufacturer }, isActive);
    // enabledManufacturers 업데이트
    setEnabledManufacturers(prev => {
      if (isActive) {
        // 비활성화: 목록에서 제거
        return prev.filter(m => m !== manufacturer);
      } else {
        // 활성화: 목록에 추가
        return prev.includes(manufacturer) ? prev : [...prev, manufacturer].sort();
      }
    });
  }, [handleBulkToggle]);

  const FIXTURE_SETTINGS_KEY = 'fixture_settings_v1';

  // 저장된 복구 지점이 있는지 여부
  const [hasSavedPoint, setHasSavedPoint] = useState<boolean>(() => {
    try { return !!localStorage.getItem(FIXTURE_SETTINGS_KEY); } catch { return false; }
  });

  // 현재 사용안함 상태를 localStorage에 저장
  // 각 행을 제조사+브랜드+사이즈 key로 식별 (인덱스는 순서 변경에 취약)
  const handleSaveSettings = useCallback(() => {
    const currentData = state.fixtureData;
    if (!currentData) return;
    const activeSheet = currentData.sheets[currentData.activeSheetName];
    // 사용안함=true인 행들의 식별 키 Set 저장
    const unusedKeys: string[] = activeSheet.rows
      .filter(row => row['사용안함'] === true)
      .map(row => [
        String(row['제조사'] || ''),
        String(row['브랜드'] || ''),
        String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || ''),
      ].join('\x00'));
    const payload = {
      sheetName: currentData.activeSheetName,
      unusedKeys,
      savedAt: new Date().toISOString(),
    };
    try {
      const serialized = JSON.stringify(payload);
      if (serialized.length > 5 * 1024 * 1024) {
        console.warn('[App] 설정 데이터가 5MB를 초과합니다. 저장하지 않습니다.');
        showAlertToast('설정 데이터가 너무 큽니다. 저장에 실패했습니다.', 'error');
        return;
      }
      localStorage.setItem(FIXTURE_SETTINGS_KEY, serialized);
      setHasSavedPoint(true);
      setSavedAt(payload.savedAt);
      setIsDirtyAfterSave(false);
    } catch {
      showAlertToast('설정 저장에 실패했습니다. 저장 공간이 부족할 수 있습니다.', 'error');
    }
    setSaveToast('saved');
    if (saveToastTimerRef.current) clearTimeout(saveToastTimerRef.current);
    saveToastTimerRef.current = setTimeout(() => setSaveToast('idle'), 2500);
    // 저장 후 복구지점 패널이 화면 상단에 오도록 스크롤
    requestAnimationFrame(() => {
      restorePanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [state.fixtureData, showAlertToast]);

  // 저장된 지점으로 사용안함 상태 복구
  const handleRestoreToSavedPoint = useCallback(() => {
    const currentData = state.fixtureData;
    if (!currentData) return;
    let payload: { sheetName: string; unusedKeys: string[] } | null = null;
    try {
      const raw = localStorage.getItem(FIXTURE_SETTINGS_KEY);
      if (!raw) return;
      // 크기 검증: 5MB 초과 시 파싱 건너뜀 (브라우저 메모리 보호)
      if (raw.length > 5 * 1024 * 1024) {
        console.warn('[App] localStorage 설정 데이터가 5MB를 초과합니다.');
        return;
      }
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    if (!payload || !Array.isArray(payload.unusedKeys)) return;
    const unusedKeySet = new Set(payload.unusedKeys);
    setState(prev => {
      const data = prev.fixtureData;
      if (!data) return prev;
      const activeSheet = data.sheets[data.activeSheetName];
      const newRows = activeSheet.rows.map(row => {
        const key = [
          String(row['제조사'] || ''),
          String(row['브랜드'] || ''),
          String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || ''),
        ].join('\x00');
        return { ...row, '사용안함': unusedKeySet.has(key) };
      });
      const newSheets = { ...data.sheets, [data.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...data, sheets: newSheets } };
    });
    setIsDirtyAfterSave(false);
    // 복구 후 enabledManufacturers도 재계산
    setEnabledManufacturers(() => {
      const data = state.fixtureData;
      if (!data) return [];
      const activeSheet = data.sheets[data.activeSheetName];
      const mfSet = new Set<string>();
      activeSheet.rows.forEach(row => {
        const key = [
          String(row['제조사'] || ''),
          String(row['브랜드'] || ''),
          String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || ''),
        ].join('\x00');
        const m = String(row['제조사'] || '기타');
        // 복구 후 상태: unusedKeySet에 없는 것이 활성
        if (!unusedKeySet.has(key) && !m.startsWith('수술중FAIL_') && m !== '보험청구') {
          mfSet.add(m);
        }
      });
      return Array.from(mfSet).sort();
    });
    setRestoreToast('restored');
    if (restoreToastTimerRef.current) clearTimeout(restoreToastTimerRef.current);
    restoreToastTimerRef.current = setTimeout(() => setRestoreToast('idle'), 2500);
  }, [state.fixtureData]);

  const handleExpandFailClaim = useCallback(() => {
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];

      // 이미 FAIL 확장이 실행된 경우 중복 방지
      const alreadyExpanded = activeSheet.rows.some(row =>
        String(row['제조사'] || '').startsWith('수술중FAIL_')
      );
      if (alreadyExpanded) return prev;

      const activeRows = activeSheet.rows.filter(row => row['사용안함'] !== true);
      if (activeRows.length === 0) return prev;

      // FAIL 복제: 제조사 앞에 "수술중FAIL_" 접두어
      const failRows = activeRows.map(row => ({
        ...row,
        '제조사': `수술중FAIL_${row['제조사'] || ''}`,
      }));

      // 보험청구 행 1개 (아직 없을 때만)
      const hasInsurance = activeSheet.rows.some(row => String(row['제조사'] || '') === '보험청구');
      const insuranceRows: Record<string, any>[] = [];
      if (!hasInsurance) {
        const insuranceRow: Record<string, any> = {};
        activeSheet.columns.forEach(col => { insuranceRow[col] = ''; });
        insuranceRow['제조사'] = '보험청구';
        insuranceRow['브랜드'] = '보험청구';
        const sizeCol = activeSheet.columns.find(c => /규격|사이즈|SIZE|size/i.test(c));
        if (sizeCol) insuranceRow[sizeCol] = '2단계 청구';
        insuranceRow['사용안함'] = false;
        insuranceRows.push(insuranceRow);
      }

      const newRows = [...activeSheet.rows, ...failRows, ...insuranceRows];
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, []);

  const handleLengthToggle = useCallback((normalizedTarget: string, setUnused: boolean) => {
    setSaveToast('idle');
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];

      // 활성 제조사+브랜드 조합 파악
      const activeCombos = new Set<string>();
      activeSheet.rows.forEach(row => {
        if (row['사용안함'] === true) return;
        activeCombos.add(`${row['제조사'] || ''}|||${row['브랜드'] || ''}`);
      });

      const newRows = activeSheet.rows.map(row => {
        const combo = `${row['제조사'] || ''}|||${row['브랜드'] || ''}`;
        if (!activeCombos.has(combo)) return row;

        const size = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || '');
        const raw = extractLengthFromSize(size);
        const normalized = raw ? normalizeLength(raw) : '';
        return normalized === normalizedTarget ? { ...row, '사용안함': setUnused } : row;
      });
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, [setSaveToast]);

  // STEP 6: 재고 마스터 반영 핸들러 (인라인에서 추출)
  // STEP 7: 재고 마스터 반영 — 비교 모달 표시
  const handleApplyToInventory = useCallback(() => {
    if (!state.fixtureData) return;
    const activeSheet = state.fixtureData.sheets[state.fixtureData.activeSheetName];
    if (!activeSheet || activeSheet.rows.length === 0) {
      showAlertToast('워크시트에 데이터가 없습니다.', 'error');
      return;
    }
    const allCandidates = activeSheet.rows
      .filter(row => row['사용안함'] !== true)
      .map((row, idx) => {
        const fixed = fixIbsImplant(
          String(row['제조사'] || row['Manufacturer'] || '기타'),
          String(row['브랜드'] || row['Brand'] || '기타')
        );
        const rawSize = String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || '');
        return {
          id: `sync_${Date.now()}_${idx}`,
          manufacturer: fixed.manufacturer,
          brand: fixed.brand,
          size: toCanonicalSize(rawSize, fixed.manufacturer),
          initialStock: 0,
          stockAdjustment: 0,
          usageCount: 0,
          currentStock: 0,
          recommendedStock: 5,
          monthlyAvgUsage: 0,
          dailyMaxUsage: 0,
        };
      });

    const duplicates: CompareItem[] = [];
    const newItems: typeof allCandidates = [];
    const existingKeys = new Set(state.inventory.map(inv => buildInventoryDuplicateKey(inv)));
    const pendingKeys = new Set<string>();

    allCandidates.forEach(ni => {
      const key = buildInventoryDuplicateKey(ni);
      const isDup = existingKeys.has(key) || pendingKeys.has(key);
      if (isDup) {
        duplicates.push({ manufacturer: ni.manufacturer, brand: ni.brand, size: ni.size });
      } else {
        newItems.push(ni);
        pendingKeys.add(key);
      }
    });

    // 플랜 품목 수 제한 체크 (수술중FAIL_ / 보험청구 제외)
    const planMaxItems = PLAN_LIMITS[effectivePlan].maxItems;
    const billableNew = newItems.filter(i => !i.manufacturer.startsWith('수술중FAIL_') && i.manufacturer !== '보험청구').length;
    const totalAfterAdd = billableItemCount + billableNew;
    if (planMaxItems !== Infinity && totalAfterAdd > planMaxItems) {
      setPlanLimitModal({ currentCount: billableItemCount, newCount: billableNew, maxItems: planMaxItems });
      return;
    }

    // 비교 모달 표시
    setInventoryCompare({
      duplicates,
      newItems: newItems.map(ni => ({ manufacturer: ni.manufacturer, brand: ni.brand, size: ni.size })),
      fullNewItems: newItems,
    });
  }, [state.fixtureData, state.inventory, effectivePlan, billableItemCount, showAlertToast]);

  // 비교 모달에서 확인 시 실제 저장
  const handleConfirmApplyToInventory = useCallback(async () => {
    if (!inventoryCompare) return;
    const newItems: InventoryItem[] = inventoryCompare.fullNewItems;
    setInventoryCompare(null);

    if (newItems.length === 0) return;

    // DB 저장이 필요한 경우: DB 성공 후 상태 반영 (롤백 불필요)
    if (state.user?.hospitalId) {
      try {
        const dbItems = newItems.map((ni) => ({
          hospital_id: state.user!.hospitalId,
          manufacturer: ni.manufacturer,
          brand: ni.brand,
          size: ni.size,
          initial_stock: ni.initialStock,
          stock_adjustment: 0,
        }));
        const saved = await inventoryService.bulkInsert(dbItems);
        if (saved.length > 0) {
          // DB 성공 → 서버 ID가 반영된 상태로 로컬 업데이트
          const itemsWithDbId = newItems.map(item => {
            const match = saved.find(s => s.manufacturer === item.manufacturer && s.brand === item.brand && s.size === item.size);
            return match ? { ...item, id: match.id } : item;
          });
          setState(prev => ({ ...prev, inventory: [...prev.inventory, ...itemsWithDbId], dashboardTab: 'inventory_master' }));
          showAlertToast(`${saved.length}개 품목을 재고 마스터에 반영했습니다.`, 'success');
          operationLogService.logOperation('data_processing', `재고 마스터 반영 ${saved.length}건`, { count: saved.length });
        } else {
          console.error('[App] bulkInsert 실패: 0개 저장됨. hospitalId:', state.user!.hospitalId);
          showAlertToast('서버 저장 실패 — 다시 시도해주세요.', 'error');
        }
      } catch (err) {
        console.error('[App] bulkInsert 예외:', err);
        showAlertToast('서버 저장 중 오류가 발생했습니다. 네트워크를 확인해주세요.', 'error');
      }
    } else {
      // 로그인 전(로컬 전용): 바로 상태에 반영
      setState(prev => ({ ...prev, inventory: [...prev.inventory, ...newItems], dashboardTab: 'inventory_master' }));
      showAlertToast(`${newItems.length}개 품목을 재고 마스터에 반영했습니다.`, 'success');
    }
  }, [inventoryCompare, state.user, showAlertToast]);

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
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Only Visible in Dashboard for Non-Admin Users OR when Admin is simulating User View */}
      {state.currentView === 'dashboard' && (!isSystemAdmin || state.adminViewMode === 'user') && (
        <Sidebar
          activeTab={state.dashboardTab}
          onTabChange={(tab) => {
            // 권한 없는 탭은 전환 차단
            if (!canAccessTab(tab, state.user?.permissions, effectiveAccessRole)) return;
            setState(prev => ({ ...prev, dashboardTab: tab }));
          }}
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
        />
      )}

      {/* Main Content Wrapper - System Admin has no Header in Dashboard UNLESS simulating User View */}
      <div className="flex-1 flex flex-col min-w-0">
        {state.currentView === 'dashboard' ? (
          isSystemAdmin && state.adminViewMode !== 'user' ? (
            /* System Admin Dashboard - Full Screen */
            <ErrorBoundary>
              <Suspense fallback={suspenseFallback}>
                <SystemAdminDashboard
                  onLogout={async () => { await authService.signOut(); setState(prev => ({ ...prev, user: null, currentView: 'landing' })); }}
                  onToggleView={() => setState(prev => ({ ...prev, adminViewMode: 'user' }))}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
            /* Standard Dashboard with Header */
            <>
              <header className="bg-white border-b border-slate-200 px-6 py-2.5 sticky top-0 z-[100] flex items-center justify-between">
                {/* Hidden file inputs */}
                <input type="file" ref={fixtureFileRef} accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'fixture'); e.target.value = ''; }} />
                <input type="file" ref={surgeryFileRef} accept=".xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f, 'surgery'); e.target.value = ''; }} />
                <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-400 font-medium">{new Date().getFullYear()}. {new Date().getMonth() + 1}. {new Date().getDate()}. {['일', '월', '화', '수', '목', '금', '토'][new Date().getDay()]}요일</span>
                  <div className="h-4 w-px bg-slate-200" />
                  <h1 className="text-sm font-bold text-slate-700">
                    {state.dashboardTab === 'overview' ? 'Overview' :
                      state.dashboardTab === 'fixture_upload' ? '로우데이터 업로드' :
                        state.dashboardTab === 'fixture_edit' ? '데이터 설정/가공' :
                          state.dashboardTab === 'inventory_master' ? '재고 마스터' :
                            state.dashboardTab === 'inventory_audit' ? '재고 실사' :
                              state.dashboardTab === 'surgery_database' ? '수술기록 DB' :
                                state.dashboardTab === 'fail_management' ? 'FAIL 관리' :
                                  state.dashboardTab === 'order_management' ? '주문 관리' :
                                    state.dashboardTab === 'member_management' ? '구성원 관리' :
                                      state.dashboardTab === 'settings' ? '설정' :
                                        state.dashboardTab === 'audit_log' ? '감사 로그' : '대시보드'}
                  </h1>
                  {/* Upload button for fixture_upload / surgery_database */}
                  {(state.dashboardTab === 'fixture_upload' || state.dashboardTab === 'surgery_database') && (
                    <button
                      onClick={() => (state.dashboardTab === 'fixture_upload' ? fixtureFileRef : surgeryFileRef).current?.click()}
                      className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-400 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all"
                      title=".xlsx 파일 업로드"
                      aria-label=".xlsx 파일 업로드"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </button>
                  )}
                  {/* Audit history button */}
                  {state.dashboardTab === 'inventory_audit' && (
                    <button
                      onClick={() => setShowAuditHistory(true)}
                      className="px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1"
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      실사 이력
                    </button>
                  )}
                  {/* Overview action buttons */}
                  {state.dashboardTab === 'overview' && (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => setState(prev => ({ ...prev, dashboardTab: 'fixture_upload' }))} className="px-3 py-1.5 text-[11px] font-bold text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                        업로드
                      </button>
                      <button onClick={() => setState(prev => ({ ...prev, dashboardTab: 'inventory_master' }))} className="px-3 py-1.5 text-[11px] font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-all flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                        재고 현황
                      </button>
                    </div>
                  )}
                </div>

                {/* Action Buttons for Fixture Edit */}
                {state.dashboardTab === 'fixture_edit' && state.fixtureData && (
                  <div className="flex items-center gap-2 absolute left-1/2 transform -translate-x-1/2">
                    <button onClick={() => {
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
                            dashboardTab: 'fixture_upload'
                          }));
                          setConfirmModal(null);
                        },
                      });
                    }} className="px-3 py-1.5 text-slate-400 hover:text-rose-500 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      초기화
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {state.user && (
                    <div className="flex items-center gap-2.5">
                      {(() => {
                        const remaining = state.planState?.daysUntilExpiry ?? UNLIMITED_DAYS;
                        return isUltimatePlan ? (
                          <span className="text-[11px] text-violet-500 font-medium flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            평생 이용
                          </span>
                        ) : state.planState?.isTrialActive ? (
                          <span className="text-[11px] font-medium flex items-center gap-1 text-amber-500">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            체험 {state.planState.trialDaysRemaining}일 남음
                          </span>
                        ) : state.planState?.plan === 'free' ? (
                          <span className="text-[11px] font-medium text-slate-400">무료 플랜</span>
                        ) : (
                          <span className={`text-[11px] font-medium flex items-center gap-1 ${remaining <= 30 ? 'text-rose-500' : 'text-slate-400'}`}>
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            {remaining >= UNLIMITED_DAYS ? '무기한' : `${remaining}일 남음`}
                          </span>
                        );
                      })()}
                      <div className="h-3.5 w-px bg-slate-200" />
                      <button
                        onClick={() => setState(prev => ({ ...prev, showProfile: true }))}
                        className="flex items-center gap-2 hover:bg-slate-50 px-2 py-1 rounded-lg transition-colors"
                      >
                        <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[11px]">{state.user.name.charAt(0)}</div>
                        <span className="text-sm font-medium text-slate-600">{state.user.name}님</span>
                      </button>
                      {isUltimatePlan ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-50 text-violet-600">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                          Ultimate
                        </span>
                      ) : (
                        <PlanBadge plan={effectivePlan} size="sm" />
                      )}
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
                        <span className="inline-flex items-center gap-0.5" title="등록 품목">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                          {billableItemCount}/{PLAN_LIMITS[effectivePlan].maxItems === Infinity ? '∞' : PLAN_LIMITS[effectivePlan].maxItems}
                        </span>
                        <span className="inline-flex items-center gap-0.5" title="구성원">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                          {state.memberCount}/{PLAN_LIMITS[effectivePlan].maxUsers === Infinity ? '∞' : PLAN_LIMITS[effectivePlan].maxUsers}
                        </span>
                      </div>
                    </div>
                  )}
                  <div className="h-4 w-px bg-slate-200" />
                  <button
                    onClick={() => setState(p => ({ ...p, currentView: 'landing' }))}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" /></svg>
                    홈
                  </button>
                  <button
                    onClick={async () => { await authService.signOut(); setState(prev => ({ ...prev, user: null, currentView: 'landing' })); }}
                    className="text-xs font-medium text-slate-400 hover:text-rose-500 transition-colors"
                  >
                    로그아웃
                  </button>
                </div>
              </header>

              <main className="flex-1" style={{ overflowX: 'clip' }}>
                <ErrorBoundary>
                <Suspense fallback={suspenseFallback}>
                {/* Dashboard routing based on Approval Status */
                  state.user?.status === 'paused' ? (
                    <PausedAccountScreen
                      userName={state.user.name}
                      planName={state.planState ? PLAN_NAMES[state.planState.plan] : 'Free'}
                      onResume={async () => {
                        const { data: { user: authUser } } = await supabase.auth.getUser();
                        if (!authUser) return;
                        const ok = await resetService.resumeAccount(authUser.id);
                        if (ok && state.user) {
                          const updated = { ...state.user, status: 'active' as const };
                          setState(prev => ({ ...prev, user: updated, isLoading: true }));
                          await loadHospitalData(updated);
                        }
                      }}
                      onCancelPlan={async () => {
                        const { data: { user: authUser } } = await supabase.auth.getUser();
                        if (!authUser || !state.user?.hospitalId) return;
                        const ok = await resetService.cancelPlanAndResume(authUser.id, state.user.hospitalId);
                        if (ok && state.user) {
                          const updated = { ...state.user, status: 'active' as const };
                          setState(prev => ({ ...prev, user: updated, isLoading: true }));
                          await loadHospitalData(updated);
                        }
                      }}
                      onLogout={async () => { await authService.signOut(); setState(prev => ({ ...prev, user: null, currentView: 'landing' })); }}
                    />
                  ) : state.user?.role === 'dental_staff' && state.user?.status !== 'active' && state.user?.status !== 'readonly' && !isSystemAdmin ? (
                    <StaffWaitingRoom
                      currentUser={state.user}
                      onUpdateUser={(updatedUser) => setState(prev => ({ ...prev, user: updatedUser }))}
                      onLogout={async () => { await authService.signOut(); setState(prev => ({ ...prev, user: null, currentView: 'landing' })); }}
                    />
                  ) : (
                    <div className="p-6 max-w-7xl mx-auto space-y-6">
                      {/* Migration Banner */}
                      {state.user && state.user.hospitalId && (
                        <MigrationBanner
                          user={state.user}
                          onMigrationComplete={async () => { if (state.user) await loadHospitalData(state.user); }}
                        />
                      )}
                      {/* Readonly User Banner */}
                      {state.user?.status === 'readonly' && (
                        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-amber-800">읽기 전용 모드</p>
                              <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                플랜 다운그레이드로 인해 읽기 전용 상태입니다. 데이터 조회는 가능하지만 추가/수정/삭제가 제한됩니다. 관리자에게 문의하세요.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {/* Read-Only Banner (Free plan item limit) */}
                      {state.planState && state.planState.plan === 'free' && billableItemCount > PLAN_LIMITS.free.maxItems && (
                        <ReadOnlyBanner
                          currentItemCount={billableItemCount}
                          maxItems={PLAN_LIMITS.free.maxItems}
                          onUpgrade={() => setState(prev => ({ ...prev, currentView: 'pricing' }))}
                        />
                      )}
                      {/* Dashboard Content */}
                      {state.dashboardTab === 'overview' && (
                        <DashboardOverview
                          inventory={state.inventory}
                          orders={state.orders}
                          surgeryMaster={state.surgeryMaster}
                          fixtureData={state.fixtureData}
                          onNavigate={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
                          isAdmin={isHospitalAdmin}
                          planState={state.planState}
                          isMaster={isHospitalMaster || isSystemAdmin}
                          onStartTrial={async () => {
                            if (state.user?.hospitalId) {
                              const ok = await planService.startTrial(state.user.hospitalId);
                              if (ok) {
                                const ps = await planService.getHospitalPlan(state.user.hospitalId);
                                setState(prev => ({ ...prev, planState: ps }));
                              }
                            }
                          }}
                          onGoToPricing={() => setState(prev => ({ ...prev, currentView: 'pricing' }))}
                        />
                      )}
                      {state.dashboardTab === 'member_management' && state.user && (
                        <FeatureGate feature="role_management" plan={effectivePlan}>
                          <MemberManager
                            currentUser={state.user}
                            onClose={() => setState(prev => ({ ...prev, dashboardTab: 'overview' }))}
                            planState={state.planState}
                            onGoToPricing={() => setState(prev => ({ ...prev, currentView: 'pricing' }))}
                          />
                        </FeatureGate>
                      )}
                      {state.dashboardTab === 'fixture_upload' && (
                        <RawDataUploadGuide
                          onUploadClick={() => fixtureFileRef.current?.click()}
                          hasExistingData={!!state.fixtureData}
                          onGoToEdit={() => setState(prev => ({ ...prev, dashboardTab: 'fixture_edit' }))}
                        />
                      )}
                      {state.dashboardTab === 'fixture_edit' && (
                        (state.fixtureData && state.fixtureData.sheets && state.fixtureData.activeSheetName && state.fixtureData.sheets[state.fixtureData.activeSheetName]) ? (
                          <div className="space-y-6">
                            {/* ── 워크플로우 가이드 ── */}
                            <FixtureWorkflowGuide completedSteps={(() => {
                              const sheet = state.fixtureData!.sheets[state.fixtureData!.activeSheetName];
                              const rows = sheet.rows;
                              const steps: number[] = [];
                              // STEP 1: 제조사 선택 — 사용안함 처리된 제조사가 1개 이상
                              const mfrs = new Set(rows.map(r => String(r['제조사'] || '')));
                              const disabledMfrs = new Set(rows.filter(r => r['사용안함'] === true).map(r => String(r['제조사'] || '')));
                              if (disabledMfrs.size > 0 || enabledManufacturers.length < mfrs.size) steps.push(1);
                              // STEP 2: 브랜드 필터링 — 사용안함 처리된 브랜드가 존재
                              const unusedBrands = rows.some(r => r['사용안함'] === true);
                              if (unusedBrands) steps.push(2);
                              // STEP 3: 길이 필터링 — (STEP2와 동일 조건, 길이 기반 사용안함 존재 시)
                              if (unusedBrands) steps.push(3);
                              // STEP 5: FAIL/청구 확장
                              const hasFailRows = rows.some(r => String(r['제조사'] || '').startsWith('수술중FAIL_'));
                              if (hasFailRows) steps.push(5);
                              // STEP 7: 재고 마스터 반영 — inventory에 fixture 데이터 존재
                              const hasInvFromFixture = state.inventory.length > 0;
                              if (hasInvFromFixture) steps.push(7);
                              return steps;
                            })()} />

                            {/* ── 제조사별 일괄 처리 ── */}
                            <ManufacturerToggle sheet={state.fixtureData.sheets[state.fixtureData.activeSheetName]} onToggle={handleManufacturerToggle} />

                            {/* ── 브랜드별 사용 설정 ── */}
                            <FeatureGate feature="brand_analytics" plan={effectivePlan}>
                              <BrandChart data={state.fixtureData.sheets[state.fixtureData.activeSheetName]} enabledManufacturers={enabledManufacturers} onToggleBrand={(m, b, u) => handleBulkToggle({ '제조사': m, '브랜드': b }, u)} onToggleAllBrands={(m, u) => handleBulkToggle({ '제조사': m }, u)} />
                            </FeatureGate>

                            {/* ── 길이별 필터 ── */}
                            <LengthFilter sheet={state.fixtureData.sheets[state.fixtureData.activeSheetName]} onToggleLength={handleLengthToggle} />

                            {/* ── 설정 저장 / 복구 패널 ── */}
                            <div ref={restorePanelRef}>
                            {(() => {
                              // 저장 지점과 현재 상태의 사용안함 차이 개수
                              const diffCount = (() => {
                                if (!hasSavedPoint || !state.fixtureData) return 0;
                                try {
                                  const raw = localStorage.getItem(FIXTURE_SETTINGS_KEY);
                                  if (!raw) return 0;
                                  const savedPayload = JSON.parse(raw) as { unusedKeys: string[] };
                                  const savedSet = new Set(savedPayload.unusedKeys);
                                  const activeSheet = state.fixtureData.sheets[state.fixtureData.activeSheetName];
                                  let diff = 0;
                                  activeSheet.rows.forEach(row => {
                                    const key = [
                                      String(row['제조사'] || ''),
                                      String(row['브랜드'] || ''),
                                      String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || ''),
                                    ].join('\x00');
                                    const savedUnused = savedSet.has(key);
                                    const currentUnused = row['사용안함'] === true;
                                    if (savedUnused !== currentUnused) diff++;
                                  });
                                  return diff;
                                } catch { return 0; }
                              })();

                              const formattedSavedAt = savedAt
                                ? (() => {
                                    try {
                                      const d = new Date(savedAt);
                                      const pad = (n: number) => String(n).padStart(2, '0');
                                      return `${d.getMonth() + 1}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
                                    } catch { return null; }
                                  })()
                                : null;

                              return (
                                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                                  {/* 상태 표시 헤더 */}
                                  <div className={`flex items-center justify-between px-5 py-3 border-b border-slate-100 ${isDirtyAfterSave && hasSavedPoint ? 'bg-amber-50' : 'bg-slate-50'}`}>
                                    <div className="flex items-center gap-2">
                                      <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                      </svg>
                                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">복구 지점</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {formattedSavedAt && (
                                        <span className="text-[11px] text-slate-400 font-medium">
                                          {formattedSavedAt} 저장
                                        </span>
                                      )}
                                      {isDirtyAfterSave && hasSavedPoint && diffCount > 0 && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-bold">
                                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                                          {diffCount}개 변경됨
                                        </span>
                                      )}
                                      {!isDirtyAfterSave && hasSavedPoint && (
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-bold">
                                          <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                          저장 상태와 동일
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* 버튼 영역 */}
                                  <div className="flex gap-3 p-4">
                                    {/* 복구 버튼 */}
                                    {hasSavedPoint && (
                                      <button
                                        type="button"
                                        onClick={handleRestoreToSavedPoint}
                                        disabled={!isDirtyAfterSave || diffCount === 0}
                                        title={!isDirtyAfterSave || diffCount === 0 ? '저장 지점과 동일한 상태입니다' : `${diffCount}개 항목을 저장 지점으로 복구합니다`}
                                        className={`flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 whitespace-nowrap ${
                                          restoreToast === 'restored'
                                            ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                                            : isDirtyAfterSave && diffCount > 0
                                            ? 'border-slate-300 bg-white text-slate-700 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 active:scale-[0.99] shadow-sm cursor-pointer'
                                            : 'border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed'
                                        }`}
                                      >
                                        {restoreToast === 'restored' ? (
                                          <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                            복구 완료
                                          </>
                                        ) : (
                                          <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                            </svg>
                                            {diffCount > 0 ? `저장 지점으로 복구 (${diffCount}개)` : '복구'}
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {/* 저장 버튼 */}
                                    <button
                                      type="button"
                                      onClick={handleSaveSettings}
                                      className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm border-2 transition-all duration-200 ${
                                        saveToast === 'saved'
                                          ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100'
                                          : isDirtyAfterSave || !hasSavedPoint
                                          ? 'bg-indigo-600 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 active:scale-[0.99] shadow-md shadow-indigo-100'
                                          : 'bg-slate-100 border-slate-100 text-slate-400 hover:bg-slate-200 hover:border-slate-200 active:scale-[0.99]'
                                      }`}
                                    >
                                      {saveToast === 'saved' ? (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                          저장 완료
                                        </>
                                      ) : (
                                        <>
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                                          </svg>
                                          {isDirtyAfterSave || !hasSavedPoint ? '지금 상태로 저장' : '저장됨'}
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              );
                            })()}
                            </div>

                            <ExcelTable data={state.fixtureData} selectedIndices={state.selectedFixtureIndices[state.fixtureData.activeSheetName] || new Set()} onToggleSelect={() => { }} onToggleAll={() => { }} onUpdateCell={(idx, col, val) => handleUpdateCell(idx, col, val, 'fixture')} onSheetChange={(name) => setState(prev => ({ ...prev, fixtureData: { ...prev.fixtureData!, activeSheetName: name } }))} onExpandFailClaim={handleExpandFailClaim} activeManufacturers={Array.from(new Set(state.fixtureData.sheets[state.fixtureData.activeSheetName].rows.filter(r => r['사용안함'] !== true).map(r => String(r['제조사'] || '')).filter(m => m && !m.startsWith('수술중FAIL_') && m !== '보험청구'))).sort()} />

                            {/* 하단 액션바 — STEP 6/7 (워크플로우 마지막 단계, 스크롤 후 자연스럽게 진입) */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">다음 단계</p>
                              <div className="flex flex-col sm:flex-row gap-3">
                                {/* STEP 6: 엑셀 다운로드 (먼저 — 재고 마스터 반영 후에는 페이지 이동되므로) */}
                                <button
                                  onClick={() => {
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
                                          await downloadExcelFile(
                                            state.fixtureData!,
                                            state.selectedFixtureIndices[state.fixtureData!.activeSheetName] || new Set(),
                                            `픽스쳐_${yyyymmdd}.xlsx`
                                          );
                                        } catch (error) {
                                          console.error('[App] Excel download failed:', error);
                                          showAlertToast('엑셀 다운로드 중 오류가 발생했습니다.', 'error');
                                        }
                                      },
                                    });
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-white border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 hover:border-slate-300 active:scale-[0.99] transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  STEP 6 — 엑셀 다운로드 (덴트웹용)
                                </button>
                                {/* STEP 7: 재고 마스터 반영 (나중 — 클릭 시 페이지 이동됨) */}
                                <button
                                  onClick={() => {
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
                                  }}
                                  className="flex-1 flex items-center justify-center gap-2.5 py-3.5 rounded-xl bg-indigo-600 text-white font-bold text-sm shadow-md shadow-indigo-200 hover:bg-indigo-700 active:scale-[0.99] transition-all"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                  STEP 7 — 재고 마스터 반영
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in-up">
                            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                              <svg className="w-10 h-10 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
                              </svg>
                            </div>
                            <div className="space-y-2">
                              <h3 className="text-xl font-bold text-slate-800">등록된 데이터가 없습니다</h3>
                              <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
                                현재 픽스쳐 데이터가 비어 있습니다.<br />
                                <span className="font-semibold text-indigo-600">로우데이터 업로드</span> 메뉴에서 엑셀 파일을 업로드해주세요.
                              </p>
                            </div>
                            <button
                              onClick={() => setState(prev => ({ ...prev, dashboardTab: 'fixture_upload' }))}
                              className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 group"
                            >
                              <span className="bg-white/20 p-1.5 rounded-lg group-hover:bg-white/30 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                                </svg>
                              </span>
                              <span>로우데이터 업로드하러 가기</span>
                            </button>
                          </div>
                        )
                      )}
                      {state.dashboardTab === 'inventory_master' && (
                        <InventoryManager
                          inventory={state.inventory}
                          isReadOnly={isReadOnly}
                          userId={state.user?.email}
                          hospitalId={state.user?.hospitalId}
                          plan={effectivePlan}
                          onUpdateStock={async (id, val, nextCurrentStock) => {
                            const prevInventory = state.inventory;
                            setState(prev => ({
                              ...prev,
                              inventory: prev.inventory.map(i =>
                                i.id === id
                                  ? {
                                    ...i,
                                    initialStock: val,
                                    currentStock: typeof nextCurrentStock === 'number' ? nextCurrentStock : (val - i.usageCount),
                                  }
                                  : i
                              ),
                            }));
                            try {
                              await inventoryService.updateItem(id, { initial_stock: val });
                              operationLogService.logOperation('base_stock_edit', `기초재고 수정 (${val}개)`, { inventoryId: id, value: val });
                            } catch (error) {
                              console.error('[App] 기초재고 수정 실패, 롤백:', error);
                              setState(prev => ({ ...prev, inventory: prevInventory }));
                              showAlertToast('기초재고 수정에 실패했습니다.', 'error');
                            }
                          }}
                          onBulkUpdateStocks={applyBaseStockBatch}
                          onDeleteInventoryItem={async (id) => {
                            const delItem = state.inventory.find(i => i.id === id);
                            const prevInventory = state.inventory;
                            // 정규 품목 삭제 시 수술중FAIL_ 연동 품목도 함께 찾기
                            // IBS Implant 계열은 fixIbsImplant 때문에 manufacturer/brand가 뒤바뀌어 있을 수 있으므로 양방향 매칭
                            let failCounterpartId: string | null = null;
                            if (delItem && !delItem.manufacturer.startsWith('수술중FAIL_') && delItem.manufacturer !== '보험청구') {
                              const failCounterpart = state.inventory.find(i => {
                                if (!i.manufacturer.startsWith('수술중FAIL_')) return false;
                                const rawBase = i.manufacturer.slice('수술중FAIL_'.length);
                                const sizeMatch = i.size === delItem.size;
                                // 일반 케이스: FAIL 제조사 베이스 = 정품목 제조사
                                if (rawBase === delItem.manufacturer && i.brand === delItem.brand && sizeMatch) return true;
                                // IBS Implant 역방향: FAIL 품목이 교정 전 brand명을 제조사로 가진 경우
                                if (rawBase === delItem.brand && i.brand === delItem.manufacturer && sizeMatch) return true;
                                return false;
                              });
                              if (failCounterpart) failCounterpartId = failCounterpart.id;
                            }
                            const idsToRemove = new Set([id, ...(failCounterpartId ? [failCounterpartId] : [])]);
                            setState(prev => ({ ...prev, inventory: prev.inventory.filter(i => !idsToRemove.has(i.id)) }));
                            try {
                              await inventoryService.deleteItem(id);
                              if (failCounterpartId) await inventoryService.deleteItem(failCounterpartId);
                              operationLogService.logOperation('item_delete', `품목 삭제: ${delItem?.brand || ''} ${delItem?.size || ''}`, { inventoryId: id });
                            } catch (error) {
                              console.error('[App] 품목 삭제 실패, 롤백:', error);
                              setState(prev => ({ ...prev, inventory: prevInventory }));
                              showAlertToast('품목 삭제에 실패했습니다.', 'error');
                            }
                          }}
                          onAddInventoryItem={async (ni) => {
                            const fixed = fixIbsImplant(ni.manufacturer, ni.brand);
                            const normalizedItem = {
                              ...ni,
                              manufacturer: fixed.manufacturer,
                              brand: fixed.brand,
                              size: toCanonicalSize(ni.size, fixed.manufacturer),
                            };
                            const incomingKey = buildInventoryDuplicateKey(normalizedItem);
                            const alreadyExists = state.inventory.some(inv => buildInventoryDuplicateKey(inv) === incomingKey);
                            if (alreadyExists) {
                              showAlertToast('이미 등록된 제조사/브랜드/규격입니다. 중복 등록되지 않았습니다.', 'info');
                              return false;
                            }

                            const isBillable = !normalizedItem.manufacturer.startsWith('수술중FAIL_') && normalizedItem.manufacturer !== '보험청구';
                            if (isBillable && !planService.canAddItem(effectivePlan, billableItemCount)) {
                              const req = planService.getRequiredPlanForItems(billableItemCount + 1);
                              showAlertToast(`품목 수 제한(${PLAN_LIMITS[effectivePlan].maxItems}개)에 도달했습니다. ${PLAN_NAMES[req]} 이상으로 업그레이드해 주세요.`, 'error');
                              return false;
                            }

                            let inserted = false;
                            if (state.user?.hospitalId) {
                              const result = await inventoryService.addItem({
                                hospital_id: state.user.hospitalId,
                                manufacturer: normalizedItem.manufacturer,
                                brand: normalizedItem.brand,
                                size: normalizedItem.size,
                                initial_stock: normalizedItem.initialStock,
                                stock_adjustment: ni.stockAdjustment ?? 0
                              });

                              if (!result) {
                                showAlertToast('품목 추가에 실패했습니다. (중복 또는 네트워크 오류)', 'error');
                                return false;
                              }

                              const savedItem: InventoryItem = {
                                id: result.id,
                                manufacturer: result.manufacturer,
                                brand: result.brand,
                                size: toCanonicalSize(result.size, result.manufacturer),
                                initialStock: result.initial_stock,
                                stockAdjustment: result.stock_adjustment ?? 0,
                                usageCount: 0,
                                currentStock: result.initial_stock + (result.stock_adjustment ?? 0),
                                recommendedStock: 5,
                                monthlyAvgUsage: 0,
                                dailyMaxUsage: 0,
                              };

                              setState(prev => {
                                const dupAfterSave = prev.inventory.some(inv => buildInventoryDuplicateKey(inv) === incomingKey);
                                if (dupAfterSave) return prev;
                                inserted = true;
                                return { ...prev, inventory: [...prev.inventory, savedItem] };
                              });
                            } else {
                              setState(prev => {
                                const dupInLocal = prev.inventory.some(inv => buildInventoryDuplicateKey(inv) === incomingKey);
                                if (dupInLocal) return prev;
                                inserted = true;
                                return { ...prev, inventory: [...prev.inventory, normalizedItem] };
                              });
                            }

                            if (inserted) {
                              operationLogService.logOperation('manual_item_add', `품목 수동 추가: ${normalizedItem.brand} ${normalizedItem.size}`, { manufacturer: normalizedItem.manufacturer, brand: normalizedItem.brand, size: normalizedItem.size });
                            }

                            return inserted;
                          }}
                          onUpdateInventoryItem={async (ui) => {
                            const fixed = fixIbsImplant(ui.manufacturer, ui.brand);
                            const normalizedItem = {
                              ...ui,
                              manufacturer: fixed.manufacturer,
                              brand: fixed.brand,
                              size: toCanonicalSize(ui.size, fixed.manufacturer),
                            };
                            setState(prev => ({ ...prev, inventory: prev.inventory.map(i => i.id === normalizedItem.id ? normalizedItem : i) }));
                            await inventoryService.updateItem(normalizedItem.id, { manufacturer: normalizedItem.manufacturer, brand: normalizedItem.brand, size: normalizedItem.size, initial_stock: normalizedItem.initialStock });
                          }}
                          surgeryData={virtualSurgeryData}
                          unregisteredFromSurgery={surgeryUnregisteredItems}
                          onRefreshLatestSurgeryUsage={refreshLatestSurgeryUsage}
                          onResolveManualInput={resolveManualSurgeryInput}
                          onQuickOrder={(item) => handleAddOrder({ id: `order_${Date.now()}`, type: 'replenishment', manufacturer: item.manufacturer, date: new Date().toISOString().split('T')[0], items: [{ brand: item.brand, size: item.size, quantity: Math.max(5, item.recommendedStock - item.currentStock) }], manager: state.user?.name || '관리자', status: 'ordered' })}
                        />
                      )}
                      {state.dashboardTab === 'inventory_audit' && (
                        <InventoryAudit
                          inventory={state.inventory}
                          hospitalId={state.user?.hospitalId || ''}
                          userName={state.user?.name}
                          onApplied={() => { if (state.user) loadHospitalData(state.user); }}
                          showHistory={showAuditHistory}
                          onCloseHistory={() => setShowAuditHistory(false)}
                        />
                      )}
                      {state.dashboardTab === 'surgery_database' && (
                        <SurgeryDashboard
                          rows={state.surgeryMaster['수술기록지'] || []}
                          onUpload={() => surgeryFileRef.current?.click()}
                          isLoading={state.isLoading}
                          unregisteredFromSurgery={surgeryUnregisteredItems}
                          onGoInventoryMaster={() => setState(prev => ({ ...prev, dashboardTab: 'inventory_master' }))}
                          hospitalWorkDays={state.hospitalWorkDays}
                          planState={state.planState}
                        />
                      )}
                      {state.dashboardTab === 'fail_management' && (
                        <FailManager
                          surgeryMaster={state.surgeryMaster}
                          inventory={state.inventory}
                          failOrders={state.orders.filter(o => o.type === 'fail_exchange')}
                          onAddFailOrder={handleAddOrder}
                          currentUserName={state.user?.name || '관리자'}
                          isReadOnly={isReadOnly}
                        />
                      )}
                      {state.dashboardTab === 'order_management' && (
                        <FeatureGate feature="one_click_order" plan={effectivePlan}>
                          <OrderManager
                            orders={state.orders}
                            inventory={state.inventory}
                            onUpdateOrderStatus={handleUpdateOrderStatus}
                            onDeleteOrder={async (id) => {
                              const prevOrders = state.orders;
                              setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== id) }));
                              try {
                                await orderService.deleteOrder(id);
                              } catch (error) {
                                console.error('[App] 주문 삭제 실패, 롤백:', error);
                                setState(prev => ({ ...prev, orders: prevOrders }));
                                showAlertToast('주문 삭제에 실패했습니다.', 'error');
                              }
                            }}
                            onQuickOrder={(item) => handleAddOrder({ id: `order_${Date.now()}`, type: 'replenishment', manufacturer: item.manufacturer, date: new Date().toISOString().split('T')[0], items: [{ brand: item.brand, size: item.size, quantity: Math.max(5, item.recommendedStock - item.currentStock) }], manager: state.user?.name || '관리자', status: 'ordered' })}
                            isReadOnly={isReadOnly}
                          />
                        </FeatureGate>
                      )}
                      {state.dashboardTab === 'settings' && (
                        <SettingsHub
                          onNavigate={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
                          isMaster={isHospitalMaster || isSystemAdmin}
                          isStaff={state.user?.role === 'staff'}
                          plan={effectivePlan}
                          hospitalId={state.user?.hospitalId}
                          hospitalWorkDays={state.hospitalWorkDays}
                          onWorkDaysChange={(workDays) => setState(prev => ({ ...prev, hospitalWorkDays: workDays }))}
                        />
                      )}
                      {state.dashboardTab === 'audit_log' && state.user?.hospitalId && (
                        <FeatureGate feature="audit_log" plan={effectivePlan}>
                          <AuditLogViewer hospitalId={state.user.hospitalId} />
                        </FeatureGate>
                      )}
                    </div>
                  )}
                </Suspense>
                </ErrorBoundary>
              </main>
            </>
          )

        ) : (
          /* Non-Dashboard Views (Landing, Login, etc.) */
          <div className="h-full flex flex-col">
            <Header
              onHomeClick={() => setState(p => ({ ...p, currentView: 'landing' }))}
              onLoginClick={() => setState(p => ({ ...p, currentView: 'login' }))}
              onSignupClick={() => setState(p => ({ ...p, currentView: 'signup' }))}
              onLogout={async () => { await authService.signOut(); setState(prev => ({ ...prev, user: null, currentView: 'landing' })); }}
              onNavigate={(v) => setState(p => ({ ...p, currentView: v }))}
              onTabNavigate={(t) => setState(p => ({ ...p, currentView: 'dashboard', dashboardTab: t }))}
              onProfileClick={() => setState(prev => ({ ...prev, showProfile: true }))}
              user={state.user}
              currentView={state.currentView}
              showLogo={true}
            />
            <main className="flex-1 overflow-x-hidden">
              <ErrorBoundary>
              <Suspense fallback={suspenseFallback}>
              {state.currentView === 'landing' && <LandingPage onGetStarted={() => setState(p => ({ ...p, currentView: 'login' }))} onAnalyze={() => setState(p => ({ ...p, currentView: 'analyze' }))} />}
              {state.currentView === 'login' && <AuthForm key="login" type="login" onSuccess={handleLoginSuccess} onSwitch={() => setState(p => ({ ...p, currentView: 'signup' }))} />}
              {state.currentView === 'signup' && <AuthForm key="signup" type="signup" onSuccess={handleLoginSuccessWithTrial} onSwitch={() => setState(p => ({ ...p, currentView: 'login' }))} onContact={() => setState(p => ({ ...p, currentView: 'contact' }))} />}
              {state.currentView === 'invite' && inviteInfo && (
                <AuthForm
                  type="invite"
                  inviteInfo={inviteInfo}
                  onSuccess={handleLoginSuccess}
                  onSwitch={() => setState(p => ({ ...p, currentView: 'login' }))}
                />
              )}
              {state.currentView === 'admin_panel' && isSystemAdmin && <AdminPanel />}
              {state.currentView === 'pricing' && (
                <PricingPage
                  onContact={() => setState(p => ({ ...p, currentView: 'contact' }))}
                  onGetStarted={() => setState(p => ({ ...p, currentView: state.user ? 'dashboard' : 'signup' }))}
                  currentPlan={state.planState?.plan}
                  isLoggedIn={!!state.user}
                  userName={state.user?.name}
                  userPhone={state.user?.phone || ''}
                  daysUntilExpiry={state.planState?.daysUntilExpiry}
                  onSelectPlan={state.user?.hospitalId ? async (plan: PlanType, billing: BillingCycle) => {
                    try {
                      const ok = await planService.changePlan(state.user!.hospitalId!, plan, billing);
                      if (ok) {
                        const ps = await planService.getHospitalPlan(state.user!.hospitalId!);
                        setState(prev => ({ ...prev, planState: ps, currentView: 'dashboard', dashboardTab: 'overview' }));
                        showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.`, 'success');
                      } else {
                        showAlertToast('플랜 변경 권한이 없습니다. 병원 관리자만 플랜을 변경할 수 있습니다.', 'error');
                      }
                    } catch (err) {
                      console.error('[App] Plan change error:', err);
                      showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
                    }
                  } : undefined}
                  onRequestPayment={state.user?.hospitalId ? async (plan, billing, contactName, contactPhone, paymentMethod, receiptType) => {
                    try {
                      const hospital = await hospitalService.getHospitalById(state.user!.hospitalId!);
                      const result = await makePaymentService.requestPayment({
                        hospitalId: state.user!.hospitalId!,
                        hospitalName: hospital?.name || '',
                        plan,
                        billingCycle: billing,
                        contactName,
                        contactPhone,
                        paymentMethod,
                        receiptType,
                      });
                      if (result.success) {
                        showAlertToast('결제 요청이 완료되었습니다. 입력하신 연락처로 결제 안내 문자가 발송됩니다.', 'success');
                        const ps = await planService.getHospitalPlan(state.user!.hospitalId!);
                        setState(prev => ({ ...prev, planState: ps, currentView: 'dashboard', dashboardTab: 'overview' }));
                        return true;
                      } else {
                        showAlertToast(result.error || '결제 요청에 실패했습니다. 다시 시도해주세요.', 'error');
                        return false;
                      }
                    } catch (err) {
                      console.error('[App] Payment request error:', err);
                      showAlertToast('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
                      return false;
                    }
                  } : undefined}
                />
              )}
              {state.currentView === 'contact' && (
                <ContactPage onGetStarted={() => setState(p => ({ ...p, currentView: 'signup' }))} />
              )}
              {state.currentView === 'value' && (
                <ValuePage
                  onGetStarted={() => setState(p => ({ ...p, currentView: 'signup' }))}
                  onContact={() => setState(p => ({ ...p, currentView: 'contact' }))}
                />
              )}
              {state.currentView === 'analyze' && (
                <AnalyzePage
                  onSignup={() => setState(p => ({ ...p, currentView: 'signup' }))}
                  onContact={() => setState(p => ({ ...p, currentView: 'contact' }))}
                />
              )}
              {state.currentView === 'notices' && (
                <div className="max-w-3xl mx-auto py-12 px-6">
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">업데이트 소식</h1>
                  <p className="text-slate-500 mb-8">DenJOY 서비스의 새로운 기능과 개선 사항을 확인하세요.</p>
                  <NoticeBoard isAdmin={isSystemAdmin} fullPage />
                </div>
              )}
              </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        )}
      </div>

      {
        state.showProfile && state.user && (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <UserProfile
                user={state.user}
                planState={state.planState}
                hospitalName={state.hospitalName}
                onClose={() => setState(prev => ({ ...prev, showProfile: false }))}
                onLeaveHospital={handleLeaveHospital}
                onDeleteAccount={handleDeleteAccount}
                onChangePlan={() => setState(prev => ({ ...prev, showProfile: false, currentView: 'pricing' }))}
              />
            </Suspense>
          </ErrorBoundary>
        )
      }

      {planLimitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">품목 수 제한 초과</h3>
              <p className="text-sm text-slate-500 mb-6">현재 플랜의 최대 품목 수를 초과하여<br />재고 마스터에 반영할 수 없습니다.</p>

              <div className="w-full bg-slate-50 rounded-2xl p-5 space-y-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">현재 등록</span>
                  <span className="text-sm font-black text-slate-700">{planLimitModal.currentCount}개</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">추가 대상</span>
                  <span className="text-sm font-black text-indigo-600">+{planLimitModal.newCount}개</span>
                </div>
                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-400">플랜 최대</span>
                  <span className="text-sm font-black text-rose-500">{planLimitModal.maxItems}개</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mb-6">플랜을 업그레이드하거나, 기존 품목을 정리한 후 다시 시도해주세요.</p>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setPlanLimitModal(null)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
              >
                닫기
              </button>
              <button
                onClick={() => { setPlanLimitModal(null); setState(prev => ({ ...prev, currentView: 'pricing' })); }}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                플랜 업그레이드
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 확인 모달 */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          tip={confirmModal.tip}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}

      {inventoryCompare && (
        <InventoryCompareModal
          duplicates={inventoryCompare.duplicates}
          newItems={inventoryCompare.newItems}
          onConfirm={handleConfirmApplyToInventory}
          onCancel={() => setInventoryCompare(null)}
        />
      )}

      {/* Alert Toast */}
      {alertToast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300 ${
          alertToast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
        }`}>
          {alertToast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {alertToast.message}
        </div>
      )}
    </div >
  );
};

export default App;
