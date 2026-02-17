
import React, { useCallback, useEffect, useMemo, useRef, Suspense, lazy } from 'react';
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
import { AppState, ExcelData, ExcelRow, User, View, DashboardTab, UploadType, InventoryItem, ExcelSheet, Order, OrderStatus, Hospital, PlanType, BillingCycle, PLAN_NAMES, PLAN_LIMITS } from './types';
import { parseExcelFile, downloadExcelFile, extractLengthFromSize } from './services/excelService';
import { normalizeLength } from './components/LengthFilter';
import { getSizeMatchKey } from './services/sizeNormalizer';
import { authService } from './services/authService';
import { inventoryService } from './services/inventoryService';
import { surgeryService } from './services/surgeryService';
import { orderService } from './services/orderService';
import { hospitalService } from './services/hospitalService';
import { planService } from './services/planService';
import { makePaymentService } from './services/makePaymentService';
import { securityMaintenanceService } from './services/securityMaintenanceService';
import { dbToExcelRow } from './services/mappers';
import { supabase } from './services/supabaseClient';
import { operationLogService } from './services/operationLogService';
import { resetService } from './services/resetService';

/* ── Hash Routing Helpers ── */
const VIEW_HASH: Record<View, string> = {
  landing: '', login: 'login', signup: 'signup', dashboard: 'dashboard',
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

  const {
    state,
    setState,
    loadHospitalData,
    handleLoginSuccess,
    handleLeaveHospital: _handleLeaveHospital,
    handleDeleteAccount,
  } = useAppState();

  // UserProfile expects () => void; hook expects (user: User) so wrap with current user
  const handleLeaveHospital = useCallback(() => {
    if (state.user) _handleLeaveHospital(state.user);
  }, [_handleLeaveHospital, state.user]);

  const [planLimitModal, setPlanLimitModal] = React.useState<{ currentCount: number; newCount: number; maxItems: number } | null>(null);
  const [showAuditHistory, setShowAuditHistory] = React.useState(false);

  const isSystemAdmin = state.user?.role === 'admin';
  const isHospitalAdmin = state.user?.role === 'master' || isSystemAdmin;
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

  useEffect(() => {
    if (state.isLoading) return;
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
      skipHashSync.current = true;
      setState(prev => ({
        ...prev,
        currentView: view,
        ...(tab !== undefined ? { dashboardTab: tab } : {}),
      }));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [state.user]);

  /* ── Hash Routing: Initial load ── */
  useEffect(() => {
    if (state.isLoading) return;
    const hash = window.location.hash;
    if (hash && hash !== '#/' && hash !== '#' && hash !== '') {
      const { view, tab } = parseHash(hash);
      if (view === 'dashboard' && !state.user) return;
      if (view === 'admin_panel' && state.user?.role !== 'admin') return;
      if (view !== state.currentView || (tab && tab !== state.dashboardTab)) {
        skipHashSync.current = true;
        setState(prev => ({ ...prev, currentView: view, ...(tab ? { dashboardTab: tab } : {}) }));
      }
    } else {
      window.history.replaceState(null, '', buildHash(state.currentView, state.dashboardTab));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.isLoading]);

  // 문자열 정규화 (공백 제거, 대소문자 통일, 특수기호 및 접두어 치환)
  const normalize = useCallback((str: string) => {
    return String(str || "")
      .trim()
      .toLowerCase()
      .replace(/보험임플란트/g, '')
      .replace(/수술중fail/g, '')
      .replace(/[\s\-\_\.\(\)]/g, '')
      .replace(/[Φφ]/g, 'd');
  }, []);

  const syncInventoryWithUsageAndOrders = useCallback(() => {
    setState(prev => {
      const records = prev.surgeryMaster['수술기록지'] || [];
      if (records.length === 0 && prev.inventory.length === 0) return prev;

      // Calculate global period for monthly average
      let minTime = Infinity;
      let maxTime = -Infinity;

      records.forEach(row => {
        const dateStr = row['날짜'];
        if (dateStr) {
          const t = new Date(dateStr).getTime();
          if (!isNaN(t)) {
            if (t < minTime) minTime = t;
            if (t > maxTime) maxTime = t;
          }
        }
      });

      const periodInMonths = (minTime === Infinity || maxTime === -Infinity || minTime === maxTime)
        ? 1
        : Math.max(1, (maxTime - minTime) / (1000 * 60 * 60 * 24 * 30.44));

      const updatedInventory = prev.inventory.map(item => {
        // 수술중FAIL_ / 보험청구 접두어 아이템은 카테고리 마커이므로 사용량 계산 건너뜀
        const isCategory = item.manufacturer.startsWith('수술중FAIL_') || item.manufacturer === '보험청구';
        if (isCategory) {
          return { ...item, usageCount: 0, currentStock: item.initialStock + (item.stockAdjustment ?? 0), recommendedStock: 0, monthlyAvgUsage: 0, dailyMaxUsage: 0 };
        }

        let totalUsage = 0;
        const dailyUsage: Record<string, number> = {};

        const targetM = normalize(item.manufacturer);
        const targetB = normalize(item.brand);
        const targetS = getSizeMatchKey(item.size, item.manufacturer);

        records.forEach(row => {
          const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
          if (isTotalRow) return;

          // 실제 임플란트를 사용한 건만 카운트 (식립 + 수술중 FAIL)
          // 청구·골이식만·기타는 재고 소모가 없으므로 제외
          const cls = String(row['구분'] || '');
          if (cls !== '식립' && cls !== '수술중 FAIL') return;
          // 수술기록에 [GBR Only]가 포함된 건은 골이식만이므로 제외
          const record = String(row['수술기록'] || '');
          if (record.includes('[GBR Only]')) return;

          const rowM = normalize(row['제조사']);
          const rowB = normalize(row['브랜드']);
          const rowS = getSizeMatchKey(String(row['규격(SIZE)'] || ''), String(row['제조사'] || ''));

          // 제조사 포함관계 및 브랜드/규격 정확 매칭 (사이즈는 직경+길이 키로 비교)
          const isMatch = (rowM.includes(targetM) || targetM.includes(rowM) || rowM === targetM) &&
            rowB === targetB &&
            rowS === targetS;

          if (isMatch) {
            const qtyValue = row['갯수'] !== undefined ? Number(row['갯수']) : 0;
            const validQty = isNaN(qtyValue) ? 0 : qtyValue;
            totalUsage += validQty;

            const dateKey = String(row['날짜'] || 'unknown');
            dailyUsage[dateKey] = (dailyUsage[dateKey] || 0) + validQty;
          }
        });

        const dailyMax = Object.values(dailyUsage).length > 0 ? Math.max(...Object.values(dailyUsage)) : 0;
        const monthlyAvg = Number((totalUsage / periodInMonths).toFixed(1));

        // 입고 완료된 주문 수량 합산
        let totalReceived = 0;
        prev.orders.filter(o => o.status === 'received').forEach(order => {
          if (normalize(order.manufacturer) === targetM) {
            order.items.forEach(orderItem => {
              if (normalize(orderItem.brand) === targetB && getSizeMatchKey(orderItem.size, order.manufacturer) === targetS) {
                totalReceived += Number(orderItem.quantity || 0);
              }
            });
          }
        });

        const currentStock = item.initialStock + (item.stockAdjustment ?? 0) + totalReceived - totalUsage;
        const recommended = Math.max(dailyMax * 2, Math.ceil(monthlyAvg));

        return {
          ...item,
          usageCount: totalUsage,
          currentStock: currentStock,
          recommendedStock: recommended,
          monthlyAvgUsage: monthlyAvg,
          dailyMaxUsage: dailyMax
        };
      });
      return { ...prev, inventory: updatedInventory };
    });
  }, [normalize]);

  useEffect(() => {
    syncInventoryWithUsageAndOrders();
  }, [state.surgeryMaster, state.orders, state.inventory.length, syncInventoryWithUsageAndOrders]);

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
          alert(`${planLabel} 수술기록 업로드가 가능합니다.\n다음 업로드 가능일: ${formatted}\n\n더 자주 업로드하려면 플랜을 업그레이드해 주세요.`);
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

            return {
              ...row,
              '구분': classification,
              '갯수': quantity,
              '제조사': manufacturer,
              '브랜드': brand,
              '규격(SIZE)': size,
              '골질': row['골질'] || boneQuality,
              '초기고정': row['초기고정'] || initialFixation,
            };
          });

          newSurgeryMaster[targetSheetName] = [...(newSurgeryMaster[targetSheetName] || []), ...cleanedRows];
          setState(prev => ({ ...prev, isLoading: false, surgeryFileName: file.name, surgeryMaster: newSurgeryMaster, dashboardTab: 'surgery_database' }));

          // Supabase에 수술기록 저장
          if (state.user?.hospitalId) {
            const savedRecords = await surgeryService.bulkInsertFromExcel(cleanedRows, state.user.hospitalId);
            if (savedRecords.length > 0) {
              const savedRows = await Promise.all(savedRecords.map(dbToExcelRow));
              setState(prev => ({
                ...prev,
                surgeryMaster: { ...prev.surgeryMaster, [targetSheetName]: [...(prev.surgeryMaster[targetSheetName] || []).filter(r => !r._id || !cleanedRows.some(cr => cr['날짜'] === r['날짜'] && cr['환자정보'] === r['환자정보'])), ...savedRows] }
              }));
              operationLogService.logOperation('surgery_upload', `수술기록 ${savedRecords.length}건 업로드 (${file.name})`);
            }
          }
        } else {
          alert("'수술기록지' 시트를 찾을 수 없습니다.");
          setState(prev => ({ ...prev, isLoading: false }));
        }
      } else {
        const initialIndices: Record<string, Set<number>> = {};
        Object.keys(parsed.sheets).forEach(name => {
          initialIndices[name] = new Set(parsed.sheets[name].rows.map((_, i) => i));
        });
        setState(prev => ({ ...prev, isLoading: false, fixtureData: parsed, fixtureFileName: file.name, selectedFixtureIndices: initialIndices, dashboardTab: 'fixture_edit' }));
        operationLogService.logOperation('raw_data_upload', `픽스쳐 데이터 업로드 (${file.name})`);
      }
    } catch (error) {
      alert("엑셀 파일 처리에 실패했습니다.");
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
      alert('주문 상태 변경에 실패했습니다.');
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

    // Update local state
    setState(prev => {
      let nextSurgeryMaster = { ...prev.surgeryMaster };
      if (order.type === 'fail_exchange') {
        const sheetName = '수술기록지';
        const rows = [...(nextSurgeryMaster[sheetName] || [])];
        const totalToProcess = order.items.reduce((sum, item) => sum + item.quantity, 0);
        const targetM = normalize(order.manufacturer);
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
        orders: [order, ...prev.orders],
        surgeryMaster: nextSurgeryMaster,
        dashboardTab: 'order_management'
      };
    });

    // Supabase에 주문 저장
    if (state.user?.hospitalId) {
      await orderService.createOrder(
        { hospital_id: state.user.hospitalId, type: order.type, manufacturer: order.manufacturer, date: order.date, manager: order.manager, status: order.status, received_date: order.receivedDate || null },
        order.items.map(i => ({ brand: i.brand, size: i.size, quantity: i.quantity }))
      );
      operationLogService.logOperation('order_create', `${order.type === 'fail_exchange' ? 'FAIL 교환' : '보충'} 주문 생성 (${order.manufacturer}, ${order.items.length}건)`, { type: order.type, manufacturer: order.manufacturer });
      if (failRecordIds.length > 0) {
        await surgeryService.markFailExchanged(failRecordIds);
      }
    }
  }, [normalize, state.user?.hospitalId, state.surgeryMaster]);

  const handleUpdateCell = useCallback((index: number, column: string, value: any, type: 'fixture' | 'surgery', sheetName?: string) => {
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

  const handleBulkToggle = useCallback((filters: Record<string, string>, targetUnused: boolean) => {
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
  }, []);

  const handleExpandFailClaim = useCallback(() => {
    setState(prev => {
      const currentData = prev.fixtureData;
      if (!currentData) return prev;
      const activeSheet = currentData.sheets[currentData.activeSheetName];
      const activeRows = activeSheet.rows.filter(row => row['사용안함'] !== true);
      if (activeRows.length === 0) return prev;

      // FAIL 복제: 제조사 앞에 "수술중FAIL_" 접두어
      const failRows = activeRows.map(row => ({
        ...row,
        '제조사': `수술중FAIL_${row['제조사'] || ''}`,
      }));

      // 보험청구 행 1개
      const insuranceRow: Record<string, any> = {};
      activeSheet.columns.forEach(col => { insuranceRow[col] = ''; });
      insuranceRow['제조사'] = '보험청구';
      insuranceRow['브랜드'] = '보험청구';
      const sizeCol = activeSheet.columns.find(c => /규격|사이즈|SIZE|size/i.test(c));
      if (sizeCol) insuranceRow[sizeCol] = '2단계 청구';
      insuranceRow['사용안함'] = false;

      const newRows = [...activeSheet.rows, ...failRows, insuranceRow];
      const newSheets = { ...currentData.sheets, [currentData.activeSheetName]: { ...activeSheet, rows: newRows } };
      return { ...prev, fixtureData: { ...currentData, sheets: newSheets } };
    });
  }, []);

  const handleLengthToggle = useCallback((normalizedTarget: string, setUnused: boolean) => {
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
  }, []);

  const virtualSurgeryData = useMemo(() => {
    const masterRows = state.surgeryMaster['수술기록지'];
    if (!masterRows || masterRows.length === 0) return null;
    const sortedColumns = ['날짜', '환자정보', '치아번호', '갯수', '수술기록', '구분', '제조사', '브랜드', '규격(SIZE)', '골질', '초기고정'];
    return { sheets: { '수술기록지': { name: '수술기록지', columns: sortedColumns, rows: masterRows } }, activeSheetName: '수술기록지' } as ExcelData;
  }, [state.surgeryMaster]);

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
          onTabChange={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
          fixtureData={state.fixtureData}
          surgeryData={state.surgeryData}
          isAdmin={isHospitalAdmin}
          isMaster={state.user?.role === 'master' || isSystemAdmin}
          plan={effectivePlan}
          hospitalName={state.hospitalName}
          userRole={state.user?.role}
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
                      if (window.confirm('현재 작업 중인 데이터가 모두 초기화됩니다. 계속하시겠습니까?')) {
                        setState(prev => ({
                          ...prev,
                          fixtureData: null,
                          fixtureFileName: null,
                          isFixtureLengthExtracted: false,
                          fixtureBackup: null,
                          selectedFixtureIndices: {},
                          dashboardTab: 'fixture_upload'
                        }));
                      }
                    }} className="px-3 py-1.5 text-slate-400 hover:text-rose-500 font-medium rounded-lg text-xs transition-colors flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      초기화
                    </button>
                    <div className="h-4 w-px bg-slate-200 mx-2"></div>
                    <button onClick={async () => {
                      try {
                        await downloadExcelFile(
                          state.fixtureData!,
                          state.selectedFixtureIndices[state.fixtureData!.activeSheetName] || new Set(),
                          state.fixtureFileName!
                        );
                      } catch (error) {
                        console.error('[App] Excel download failed:', error);
                        alert('엑셀 다운로드 중 오류가 발생했습니다.');
                      }
                    }} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg text-xs hover:bg-slate-50 hover:text-slate-900 transition-all flex items-center gap-1.5 shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      엑셀 다운로드
                    </button>
                    <button onClick={async () => {
                      if (!state.fixtureData) return;
                      const activeSheet = state.fixtureData.sheets[state.fixtureData.activeSheetName];
                      const newItems = activeSheet.rows.filter(row => row['사용안함'] !== true).map((row, idx) => ({
                        id: `sync_${Date.now()}_${idx}`,
                        manufacturer: String(row['제조사'] || row['Manufacturer'] || '기타'),
                        brand: String(row['브랜드'] || row['Brand'] || '기타'),
                        size: String(row['규격(SIZE)'] || row['규격'] || row['사이즈'] || row['Size'] || row['size'] || ''),
                        initialStock: 0,
                        stockAdjustment: 0,
                        usageCount: 0,
                        currentStock: 0,
                        recommendedStock: 5,
                        monthlyAvgUsage: 0,
                        dailyMaxUsage: 0,
                      })).filter(ni => !state.inventory.some(inv => normalize(inv.manufacturer) === normalize(ni.manufacturer) && normalize(inv.brand) === normalize(ni.brand) && getSizeMatchKey(inv.size, inv.manufacturer) === getSizeMatchKey(ni.size, ni.manufacturer)));
                      // 플랜 품목 수 제한 적용 (수술중FAIL_ / 보험청구 제외)
                      const planMaxItems = PLAN_LIMITS[effectivePlan].maxItems;
                      const billableNew = newItems.filter(i => !i.manufacturer.startsWith('수술중FAIL_') && i.manufacturer !== '보험청구').length;
                      const totalAfterAdd = billableItemCount + billableNew;
                      if (planMaxItems !== Infinity && totalAfterAdd > planMaxItems) {
                        setPlanLimitModal({ currentCount: billableItemCount, newCount: billableNew, maxItems: planMaxItems });
                        return;
                      }
                      const itemsToAdd = newItems;
                      if (itemsToAdd.length > 0) {
                        setState(prev => ({ ...prev, inventory: [...prev.inventory, ...itemsToAdd], dashboardTab: 'inventory_master' }));
                        // Supabase에 일괄 저장
                        if (state.user?.hospitalId) {
                          const dbItems = itemsToAdd.map(ni => ({ hospital_id: state.user!.hospitalId, manufacturer: ni.manufacturer, brand: ni.brand, size: ni.size, initial_stock: ni.initialStock, stock_adjustment: 0 }));
                          const saved = await inventoryService.bulkInsert(dbItems);
                          if (saved.length > 0) {
                            setState(prev => ({ ...prev, inventory: prev.inventory.map((item, idx) => { const match = saved.find(s => s.manufacturer === item.manufacturer && s.brand === item.brand && s.size === item.size); return match ? { ...item, id: match.id } : item; }) }));
                            operationLogService.logOperation('data_processing', `재고 마스터 반영 ${saved.length}건`, { count: saved.length });
                          } else {
                            console.error('[App] bulkInsert 실패: 0개 저장됨. hospitalId:', state.user!.hospitalId);
                            alert('⚠️ 재고 데이터를 서버에 저장하지 못했습니다.\n새로고침 시 데이터가 사라질 수 있습니다.\n\n콘솔(F12)에서 에러 상세를 확인해주세요.');
                          }
                        }
                      } else {
                        alert("새로 추가할 품목이 없거나 이미 마스터에 존재합니다.");
                      }
                    }} className="px-3 py-1.5 bg-indigo-600 text-white font-bold rounded-lg text-xs shadow-md shadow-indigo-200 hover:bg-indigo-700 hover:translate-y-[-1px] transition-all flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                      재고 마스터 반영
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {state.user && (
                    <div className="flex items-center gap-2.5">
                      {(() => {
                        const remaining = state.planState?.daysUntilExpiry ?? 9999;
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
                            {remaining >= 9999 ? '무기한' : `${remaining}일 남음`}
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
                          isMaster={state.user?.role === 'master'}
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
                            <FixtureWorkflowGuide />
                            <ManufacturerToggle sheet={state.fixtureData.sheets[state.fixtureData.activeSheetName]} onToggle={(m, u) => handleBulkToggle({ '제조사': m }, u)} />
                            <FeatureGate feature="brand_analytics" plan={effectivePlan}>
                              <BrandChart data={state.fixtureData.sheets[state.fixtureData.activeSheetName]} onToggleBrand={(m, b, u) => handleBulkToggle({ '제조사': m, '브랜드': b }, u)} />
                            </FeatureGate>
                            <LengthFilter sheet={state.fixtureData.sheets[state.fixtureData.activeSheetName]} onToggleLength={handleLengthToggle} />
                            <ExcelTable data={state.fixtureData} selectedIndices={state.selectedFixtureIndices[state.fixtureData.activeSheetName] || new Set()} onToggleSelect={() => { }} onToggleAll={() => { }} onUpdateCell={(idx, col, val) => handleUpdateCell(idx, col, val, 'fixture')} onSheetChange={(name) => setState(prev => ({ ...prev, fixtureData: { ...prev.fixtureData!, activeSheetName: name } }))} onExpandFailClaim={handleExpandFailClaim} />
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
                          onUpdateStock={async (id, val) => {
                            const prevInventory = state.inventory;
                            setState(prev => ({ ...prev, inventory: prev.inventory.map(i => i.id === id ? { ...i, initialStock: val, currentStock: val - i.usageCount } : i) }));
                            try {
                              await inventoryService.updateItem(id, { initial_stock: val });
                              operationLogService.logOperation('base_stock_edit', `기초재고 수정 (${val}개)`, { inventoryId: id, value: val });
                            } catch (error) {
                              console.error('[App] 기초재고 수정 실패, 롤백:', error);
                              setState(prev => ({ ...prev, inventory: prevInventory }));
                              alert('기초재고 수정에 실패했습니다.');
                            }
                          }}
                          onDeleteInventoryItem={async (id) => {
                            const delItem = state.inventory.find(i => i.id === id);
                            const prevInventory = state.inventory;
                            setState(prev => ({ ...prev, inventory: prev.inventory.filter(i => i.id !== id) }));
                            try {
                              await inventoryService.deleteItem(id);
                              operationLogService.logOperation('item_delete', `품목 삭제: ${delItem?.brand || ''} ${delItem?.size || ''}`, { inventoryId: id });
                            } catch (error) {
                              console.error('[App] 품목 삭제 실패, 롤백:', error);
                              setState(prev => ({ ...prev, inventory: prevInventory }));
                              alert('품목 삭제에 실패했습니다.');
                            }
                          }}
                          onAddInventoryItem={async (ni) => {
                            const isBillable = !ni.manufacturer.startsWith('수술중FAIL_') && ni.manufacturer !== '보험청구';
                            if (isBillable && !planService.canAddItem(effectivePlan, billableItemCount)) {
                              const req = planService.getRequiredPlanForItems(billableItemCount + 1);
                              alert(`품목 수 제한(${PLAN_LIMITS[effectivePlan].maxItems}개)에 도달했습니다. ${PLAN_NAMES[req]} 이상으로 업그레이드해 주세요.`);
                              return;
                            }
                            setState(prev => ({ ...prev, inventory: [...prev.inventory, ni] }));
                            if (state.user?.hospitalId) {
                              const result = await inventoryService.addItem({ hospital_id: state.user.hospitalId, manufacturer: ni.manufacturer, brand: ni.brand, size: ni.size, initial_stock: ni.initialStock, stock_adjustment: 0 });
                              if (result) setState(prev => ({ ...prev, inventory: prev.inventory.map(i => i.id === ni.id ? { ...i, id: result.id } : i) }));
                            }
                            operationLogService.logOperation('manual_item_add', `품목 수동 추가: ${ni.brand} ${ni.size}`, { manufacturer: ni.manufacturer, brand: ni.brand, size: ni.size });
                          }}
                          onUpdateInventoryItem={async (ui) => {
                            setState(prev => ({ ...prev, inventory: prev.inventory.map(i => i.id === ui.id ? ui : i) }));
                            await inventoryService.updateItem(ui.id, { manufacturer: ui.manufacturer, brand: ui.brand, size: ui.size, initial_stock: ui.initialStock });
                          }}
                          surgeryData={virtualSurgeryData}
                          onQuickOrder={(item) => handleAddOrder({ id: `order_${Date.now()}`, type: 'replenishment', manufacturer: item.manufacturer, date: new Date().toISOString().split('T')[0], items: [{ brand: item.brand, size: item.size, quantity: Math.max(5, item.recommendedStock - item.currentStock) }], manager: state.user?.name || '관리자', status: 'ordered' })}
                        />
                      )}
                      {state.dashboardTab === 'inventory_audit' && (
                        <InventoryAudit
                          inventory={state.inventory}
                          hospitalId={state.user?.hospitalId || ''}
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
                                alert('주문 삭제에 실패했습니다.');
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
                          isMaster={state.user?.role === 'master' || isSystemAdmin}
                          isStaff={state.user?.role === 'staff'}
                          plan={effectivePlan}
                          hospitalId={state.user?.hospitalId}
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
              {state.currentView === 'login' && <AuthForm type="login" onSuccess={handleLoginSuccess} onSwitch={() => setState(p => ({ ...p, currentView: 'signup' }))} />}
              {state.currentView === 'signup' && <AuthForm type="signup" onSuccess={handleLoginSuccess} onSwitch={() => setState(p => ({ ...p, currentView: 'login' }))} />}
              {state.currentView === 'admin_panel' && isSystemAdmin && <AdminPanel />}
              {state.currentView === 'pricing' && (
                <PricingPage
                  onGetStarted={() => setState(p => ({ ...p, currentView: state.user ? 'login' : 'signup' }))}
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
                        alert(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.`);
                      } else {
                        alert('플랜 변경 권한이 없습니다. 병원 관리자만 플랜을 변경할 수 있습니다.');
                      }
                    } catch (err) {
                      console.error('[App] Plan change error:', err);
                      alert('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.');
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
                        alert('결제 요청이 완료되었습니다. 입력하신 연락처로 결제 안내 문자가 발송됩니다.');
                        const ps = await planService.getHospitalPlan(state.user!.hospitalId!);
                        setState(prev => ({ ...prev, planState: ps, currentView: 'dashboard', dashboardTab: 'overview' }));
                        return true;
                      } else {
                        alert(result.error || '결제 요청에 실패했습니다. 다시 시도해주세요.');
                        return false;
                      }
                    } catch (err) {
                      console.error('[App] Payment request error:', err);
                      alert('결제 요청 중 오류가 발생했습니다. 다시 시도해주세요.');
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
    </div >
  );
};

export default App;
