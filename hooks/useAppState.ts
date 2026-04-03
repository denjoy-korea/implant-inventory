/**
 * useAppState
 *
 * App.tsx 모노리스에서 분리된 상태 + 세션/Realtime 관리 훅.
 * - AppState 초기화
 * - Supabase 세션 확인 및 병원 데이터 로드
 * - Realtime 구독 (inventory / surgery / orders)
 * - 로그인 성공, 병원 탈퇴, 계정 삭제 핸들러
 */

import { useState, useEffect, useRef } from 'react';
import {
  AppState, User, ExcelRow, DEFAULT_WORK_DAYS, PLAN_LIMITS, DbOrder, PlanType, View, isSystemAdminRole,
} from '../types';
import { authService } from '../services/authService';
import { errorIncludes } from '../utils/errors';
import { inventoryService } from '../services/inventoryService';
import { surgeryService } from '../services/surgeryService';
import { orderService } from '../services/orderService';
import { hospitalService } from '../services/hospitalService';
import { planService } from '../services/planService';
import { serviceEntitlementService } from '../services/serviceEntitlementService';
import { resetService } from '../services/resetService';
import { dbToInventoryItem, dbToExcelRow, dbToExcelRowBatch, dbToExcelRowBatchMasked, dbToOrder, dbToUser } from '../services/mappers';
import { warmupCryptoService, waitForWarmup } from '../services/cryptoUtils';
import { supabase } from '../services/supabaseClient';
import { pageViewService } from '../services/pageViewService';
import { onboardingService } from '../services/onboardingService';
import { PATH_TO_VIEW } from '../appRouting';

const INITIAL_STATE: AppState = {
  fixtureData: null,
  surgeryData: null,
  fixtureFileName: null,
  surgeryFileName: null,
  inventory: [],
  orders: [],
  surgeryMaster: {},
  activeSurgerySheetName: '수술기록지',
  selectedFixtureIndices: {},
  selectedSurgeryIndices: {},
  isLoading: true,
  user: null,
  currentView: 'homepage',
  dashboardTab: 'overview',
  isFixtureLengthExtracted: false,
  fixtureBackup: null,
  showProfile: false,
  adminViewMode: 'admin',
  planState: null,
  memberCount: 0,
  hospitalName: '',
  hospitalMasterAdminId: '',
  hospitalWorkDays: DEFAULT_WORK_DAYS,
  hospitalBillingProgram: null,
  hospitalBizFileUrl: null,
};

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

const SESSION_POLL_INTERVAL_MS = 60_000;
const SESSION_TOKEN_KEY = 'dentweb_session_token';
const LOAD_TIMEOUT_MS = 45_000; // 대용량 초기 동기화(복호화 포함) 여유 시간 확보

const getInitialState = (): AppState => {
  if (typeof window === 'undefined') return INITIAL_STATE;
  const path = window.location.pathname;

  // 1. VIEW_PATH 역방향 조회 (정확한 경로 매칭)
  let view: View | undefined = PATH_TO_VIEW[path];

  // 2. /inventory/** 하위 경로 처리 (analyze, value, pricing 등)
  if (!view && path.startsWith('/inventory/')) {
    const sub = path.replace('/inventory', '');
    view = PATH_TO_VIEW[sub] as View | undefined;
  }

  // 3. 레거시 hash 폴백: #/implant-inventory → landing
  if (!view) {
    const hash = window.location.hash;
    if (hash === '#/implant-inventory' || hash === '#/implant-inventory/') {
      view = 'landing';
    }
  }

  // 4. 수동 예외: /admin → admin_panel (PATH_TO_VIEW에 없으므로)
  if (!view && path === '/admin') view = 'admin_panel';

  return { ...INITIAL_STATE, currentView: view ?? INITIAL_STATE.currentView };
};

export function useAppState(onNotify?: NotifyFn) {
  const [state, setState] = useState<AppState>(getInitialState);
  const notify = onNotify ?? ((msg: string, _type?: string) => console.warn('[useAppState] notify fallback:', msg));
  const sessionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hospitalLoadInFlightRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const signedInInFlightRef = useRef<Promise<void> | null>(null);
  const lastSignedInAtRef = useRef<number>(0);
  // initSession이 세션 복원 + loadHospitalData 완료 시 true → SIGNED_IN 중복 실행 방지
  const initSessionHandledRef = useRef(false);

  /** 백그라운드 프로필 복호화: decrypt: false로 빠르게 진입한 뒤 이름/이메일/전화번호 복원 */
  const backgroundDecryptUser = (userId: string) => {
    waitForWarmup()
      .then(() => authService.getProfileById(undefined, { decrypt: true }))
      .then((decryptedProfile) => {
        if (!decryptedProfile) return;
        const decryptedUser = dbToUser(decryptedProfile);
        setState((prev) => {
          if (prev.user?.id !== userId) return prev;
          return { ...prev, user: decryptedUser };
        });
      })
      .catch((e) => {
        console.warn('[useAppState] 프로필 백그라운드 복호화 실패:', e);
      });
  };

  /** 병원 데이터 로드 (로그인 후 / 세션 복원 시) */
  const loadHospitalData = async (user: User) => {
    const loadKey = `${user.id}:${user.hospitalId}:${user.status}:${user.role}`;
    const inFlight = hospitalLoadInFlightRef.current;
    if (inFlight && inFlight.key === loadKey) {
      return inFlight.promise;
    }

    const promise = (async () => {
    // paused 상태: 서비스 접근 차단 화면으로 라우팅
    if (user.status === 'paused') {
      setState(prev => ({
        ...prev,
        user,
        currentView: 'suspended',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        hospitalBizFileUrl: null,
        isLoading: false,
      }));
      // 백그라운드 프로필 복호화
      void backgroundDecryptUser(user.id);
      return;
    }

    const isAdminRole = isSystemAdminRole(user.role, user.email);
    if (!user.hospitalId || (!isAdminRole && user.status !== 'active' && user.status !== 'readonly')) {
      setState(prev => ({
        ...prev,
        user,
        currentView: 'mypage',
        dashboardTab: 'overview',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        hospitalBizFileUrl: null,
        isLoading: false,
      }));
      // 백그라운드 프로필 복호화
      void backgroundDecryptUser(user.id);
      return;
    }

    try {
      // 수술기록 초기 로드 범위:
      // - DB에는 최대 24개월치 보관 (자동삭제 스케줄로 관리)
      // - 프론트엔드 로드는 플랜별 retentionMonths 기준으로 제한
      //   (Free=3, Basic=12, Plus=24, Business=24, Ultimate=999)
      // - P1-C: hospital_service_subscriptions를 source of truth로 우선 시도
      //   → 성공 시 implant_inventory 구독의 service_plan_code 사용
      //   → 실패 시(개발 환경·테이블 미존재) planService 폴백 유지
      let planStateForDate = await planService.checkPlanExpiry(user.hospitalId);
      try {
        const subscriptions = await serviceEntitlementService.getHospitalSubscriptions(user.hospitalId);
        const inventorySub = subscriptions.find((s) => s.serviceCode === 'implant_inventory');
        if (inventorySub?.servicePlanCode) {
          // service_plan_code가 유효한 PlanType인지 확인 후 덮어씀
          const subPlan = inventorySub.servicePlanCode as PlanType;
          if (Object.prototype.hasOwnProperty.call(PLAN_LIMITS, subPlan)) {
            planStateForDate = { ...planStateForDate, plan: subPlan };
          }
        }
      } catch (entitlementErr) {
        // 개발 환경이 아닌데 실패하면 경고만 남기고 planService 결과 사용
        console.warn('[useAppState] serviceEntitlementService fallback to planService:', entitlementErr);
      }
      const retentionMonths = PLAN_LIMITS[planStateForDate.plan]?.viewMonths ?? 24;
      // 조회 허용 기간(viewMonths): Free=3, Basic=12, Plus/Business=24
      // DB 보관(retentionMonths)은 모두 24개월이지만 조회는 플랜별로 제한
      const effectiveMonths = Math.min(retentionMonths, 24);
      const fromDateObj = new Date();
      fromDateObj.setMonth(fromDateObj.getMonth() - effectiveMonths);
      const fromDate = fromDateObj.toISOString().split('T')[0];

      const [inventoryData, surgeryData, ordersData, membersData, hospitalData] = await Promise.all([
        inventoryService.getInventory(),
        surgeryService.getSurgeryRecords({ fromDate }),
        orderService.getOrders(),
        hospitalService.getActiveMemberCount(user.hospitalId),
        hospitalService.getHospitalById(user.hospitalId),
      ]);
      // 위에서 이미 조회한 planState 재사용 (중복 API 호출 방지)
      const planState = planStateForDate;

      // SEC-10: 민감 정보(hospitalId, hospitalName)는 개발 환경에서만 로깅
      if (import.meta.env.DEV) {
        console.log('[useAppState] loadHospitalData:', {
          inventoryCount: inventoryData.length,
          surgeryCount: surgeryData.length,
          ordersCount: ordersData.length,
          hospitalName: hospitalData?.name,
          hospitalId: user.hospitalId,
        });
      }

      const inventory = inventoryData.map(dbToInventoryItem);
      // 초기 진입은 복호화 대기 없이 마스킹 데이터로 즉시 렌더
      const surgeryRows = dbToExcelRowBatchMasked(surgeryData);
      const orders = ordersData.map(dbToOrder);

      // 기존 레코드 중 patient_info_hash 없는 것 백필 (028 마이그레이션 이후 1회성)
      surgeryService.backfillPatientInfoHash(user.hospitalId).catch(() => {});

      const wasReset = await resetService.checkScheduledReset(user.hospitalId);

      // DB에 저장된 온보딩 완료 플래그를 localStorage에 동기화 (다른 기기/브라우저 지원)
      if (hospitalData?.onboardingFlags) {
        onboardingService.syncFromDbFlags(user.hospitalId, hospitalData.onboardingFlags);
      }

      setState(prev => ({
        ...prev,
        user,
        currentView: 'mypage',
        dashboardTab: 'overview',
        inventory: wasReset ? [] : inventory,
        surgeryMaster: wasReset ? {} as Record<string, ExcelRow[]> : { '수술기록지': surgeryRows },
        orders: wasReset ? [] : orders,
        planState,
        memberCount: membersData,
        hospitalName: hospitalData?.name || '',
        hospitalMasterAdminId: hospitalData?.masterAdminId || '',
        hospitalWorkDays: hospitalData?.workDays ?? DEFAULT_WORK_DAYS,
        hospitalBillingProgram: hospitalData?.billingProgram ?? null,
        hospitalBizFileUrl: hospitalData?.bizFileUrl ?? null,
        isLoading: false,
      }));

      if (wasReset) {
        notify('예약된 데이터 초기화가 완료되었습니다. 재고, 수술 기록, 주문 데이터가 모두 삭제되었습니다.', 'info');
      }

      // 백그라운드 복호화: 워밍업 완료 대기 → warm 상태에서 빠르게 처리
      if (!wasReset && surgeryData.length > 0) {
        void waitForWarmup()
          .then(() => dbToExcelRowBatch(surgeryData))
          .then((decryptedRows) => {
            setState((prev) => {
              if (prev.user?.id !== user.id || prev.user?.hospitalId !== user.hospitalId) return prev;
              return {
                ...prev,
                surgeryMaster: {
                  ...prev.surgeryMaster,
                  '수술기록지': decryptedRows,
                },
              };
            });
          })
          .catch((e) => {
            console.warn('[useAppState] 수술기록 백그라운드 복호화 실패, 마스킹 유지:', e);
          });
      }

      // 백그라운드 프로필 복호화: 사용자 이름/이메일/전화번호 복원
      void backgroundDecryptUser(user.id);
    } catch (error) {
      console.error('[useAppState] Data loading failed:', error);
      setState(prev => ({
        ...prev,
        user,
        currentView: 'mypage',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        isLoading: false,
      }));
    }
    })();

    hospitalLoadInFlightRef.current = { key: loadKey, promise };
    try {
      await promise;
    } finally {
      if (hospitalLoadInFlightRef.current?.promise === promise) {
        hospitalLoadInFlightRef.current = null;
      }
    }
  };

  /**
   * loadUserContext — 로그인 직후 경량 컨텍스트 로드.
   * hospital 기본 정보, plan, 멤버 수만 조회하며 inventory/surgery/orders는 로드하지 않습니다.
   * 완료 후 'mypage' 뷰로 이동합니다.
   */
  const loadUserContext = async (user: User) => {
    if (user.status === 'paused') {
      setState(prev => ({
        ...prev,
        user,
        currentView: 'suspended',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        hospitalBizFileUrl: null,
        isLoading: false,
      }));
      void backgroundDecryptUser(user.id);
      return;
    }

    const isAdminRole = isSystemAdminRole(user.role, user.email);
    if (!user.hospitalId || (!isAdminRole && user.status !== 'active' && user.status !== 'readonly')) {
      setState(prev => ({
        ...prev,
        user,
        currentView: 'mypage',
        dashboardTab: 'overview',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        hospitalBizFileUrl: null,
        isLoading: false,
      }));
      void backgroundDecryptUser(user.id);
      return;
    }

    try {
      const [membersData, hospitalData, planState] = await Promise.all([
        hospitalService.getActiveMemberCount(user.hospitalId),
        hospitalService.getHospitalById(user.hospitalId),
        planService.checkPlanExpiry(user.hospitalId),
      ]);

      if (hospitalData?.onboardingFlags) {
        onboardingService.syncFromDbFlags(user.hospitalId, hospitalData.onboardingFlags);
      }

      setState(prev => ({
        ...prev,
        user,
        currentView: 'mypage',
        dashboardTab: 'overview',
        planState,
        memberCount: membersData,
        hospitalName: hospitalData?.name || '',
        hospitalMasterAdminId: hospitalData?.masterAdminId || '',
        hospitalWorkDays: hospitalData?.workDays ?? DEFAULT_WORK_DAYS,
        hospitalBillingProgram: hospitalData?.billingProgram ?? null,
        hospitalBizFileUrl: hospitalData?.bizFileUrl ?? null,
        isLoading: false,
      }));

      void backgroundDecryptUser(user.id);
    } catch (error) {
      console.error('[useAppState] loadUserContext failed:', error);
      setState(prev => ({
        ...prev,
        user,
        currentView: 'mypage',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        isLoading: false,
      }));
    }
  };

  /**
   * loadInventoryData — 대시보드 진입 시 호출되는 무거운 데이터 로드.
   * inventory, surgery, orders를 한 번에 조회합니다.
   * loadUserContext 이후 또는 직접 대시보드 URL로 진입 시 호출됩니다.
   */
  const loadInventoryData = async (user: User) => {
    if (!user.hospitalId) return;

    try {
      let planStateForDate = await planService.checkPlanExpiry(user.hospitalId);
      try {
        const subscriptions = await serviceEntitlementService.getHospitalSubscriptions(user.hospitalId);
        const inventorySub = subscriptions.find((s) => s.serviceCode === 'implant_inventory');
        if (inventorySub?.servicePlanCode) {
          const subPlan = inventorySub.servicePlanCode as PlanType;
          if (Object.prototype.hasOwnProperty.call(PLAN_LIMITS, subPlan)) {
            planStateForDate = { ...planStateForDate, plan: subPlan };
          }
        }
      } catch (entitlementErr) {
        console.warn('[useAppState] serviceEntitlementService fallback to planService:', entitlementErr);
      }
      const retentionMonths = PLAN_LIMITS[planStateForDate.plan]?.viewMonths ?? 24;
      const effectiveMonths = Math.min(retentionMonths, 24);
      const fromDateObj = new Date();
      fromDateObj.setMonth(fromDateObj.getMonth() - effectiveMonths);
      const fromDate = fromDateObj.toISOString().split('T')[0];

      const [inventoryData, surgeryData, ordersData] = await Promise.all([
        inventoryService.getInventory(),
        surgeryService.getSurgeryRecords({ fromDate }),
        orderService.getOrders(),
      ]);

      if (import.meta.env.DEV) {
        console.log('[useAppState] loadInventoryData:', {
          inventoryCount: inventoryData.length,
          surgeryCount: surgeryData.length,
          ordersCount: ordersData.length,
          hospitalId: user.hospitalId,
        });
      }

      const inventory = inventoryData.map(dbToInventoryItem);
      const surgeryRows = dbToExcelRowBatchMasked(surgeryData);
      const orders = ordersData.map(dbToOrder);

      surgeryService.backfillPatientInfoHash(user.hospitalId).catch(() => {});

      const wasReset = await resetService.checkScheduledReset(user.hospitalId);

      setState(prev => ({
        ...prev,
        planState: planStateForDate,
        inventory: wasReset ? [] : inventory,
        surgeryMaster: wasReset ? {} as Record<string, ExcelRow[]> : { '수술기록지': surgeryRows },
        orders: wasReset ? [] : orders,
      }));

      if (wasReset) {
        notify('예약된 데이터 초기화가 완료되었습니다. 재고, 수술 기록, 주문 데이터가 모두 삭제되었습니다.', 'info');
      }

      if (!wasReset && surgeryData.length > 0) {
        void waitForWarmup()
          .then(() => dbToExcelRowBatch(surgeryData))
          .then((decryptedRows) => {
            setState((prev) => {
              if (prev.user?.id !== user.id || prev.user?.hospitalId !== user.hospitalId) return prev;
              return {
                ...prev,
                surgeryMaster: { ...prev.surgeryMaster, '수술기록지': decryptedRows },
              };
            });
          })
          .catch((e) => {
            console.warn('[useAppState] 수술기록 백그라운드 복호화 실패, 마스킹 유지:', e);
          });
      }
    } catch (error) {
      console.error('[useAppState] loadInventoryData failed:', error);
    }
  };

  /** 로그인 성공 콜백 — loadUserContext만 호출 (경량), mypage로 이동 */
  const handleLoginSuccess = async (user: User) => {
    setState(prev => ({ ...prev, isLoading: true }));
    pageViewService.markConverted(user.id, user.hospitalId || null);
    await loadUserContext(user);
    startSessionPolling();
  };

  /** 병원 탈퇴 */
  const handleLeaveHospital = async (currentUser: User) => {
    try {
      await hospitalService.leaveHospital();
      const updatedUser = { ...currentUser, hospitalId: '', status: 'pending' as const };
      setState(prev => ({
        ...prev,
        user: updatedUser,
        inventory: [],
        surgeryMaster: {},
        orders: [],
        fixtureData: null,
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        showProfile: false,
      }));
      notify('초기화되었습니다. 새로운 병원을 찾아주세요.', 'info');
    } catch {
      notify('병원 탈퇴에 실패했습니다.', 'error');
    }
  };

  /** 계정 삭제 */
  const handleDeleteAccount = async () => {
    const resetToLanding = () => {
      stopSessionPolling();
      setState(prev => ({
        ...prev,
        user: null,
        currentView: 'homepage',
        inventory: [],
        surgeryMaster: {},
        orders: [],
        fixtureData: null,
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        showProfile: false,
        isLoading: false,
      }));
    };

    try {
      const result = await authService.deleteAccount();
      if (result.success) {
        resetToLanding();
        notify('회원 탈퇴가 완료되었습니다.', 'success');
        return;
      }

      // RPC 응답은 실패여도, 이미 auth 세션이 제거된 상태라면
      // 사용자 관점에서는 탈퇴 완료이므로 안전하게 landing으로 복귀시킨다.
      const session = await authService.getSession().catch(() => null);
      if (!session?.user) {
        resetToLanding();
        notify('회원 탈퇴가 완료되었습니다.', 'success');
      } else {
        notify(result.error || '회원 탈퇴에 실패했습니다.', 'error');
      }
    } catch (error) {
      const session = await authService.getSession().catch(() => null);
      if (!session?.user) {
        resetToLanding();
        notify('회원 탈퇴가 완료되었습니다.', 'success');
        return;
      }
      const message = error instanceof Error ? error.message : '회원 탈퇴에 실패했습니다.';
      notify(message, 'error');
    }
  };

  /** 세션 토큰 검증 — DB 토큰과 sessionStorage 토큰 비교 */
  const validateSessionToken = async (): Promise<boolean> => {
    const localToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!localToken) return true; // 토큰 없으면 구 세션이므로 무시

    try {
      const { data: dbToken, error } = await supabase.rpc('get_session_token');
      if (error) return true; // RPC 오류 시 로그아웃하지 않음
      if (dbToken === null) return true; // DB에 토큰 없으면 무시
      return dbToken === localToken;
    } catch {
      return true; // 네트워크 오류 시 로그아웃하지 않음
    }
  };

  /** 프로필 존재 확인 — 방출(kick)으로 계정 삭제된 경우 감지 */
  const checkProfileExists = async (): Promise<boolean> => {
    try {
      const profile = await authService.getProfileById(undefined, { decrypt: false });
      return profile !== null;
    } catch {
      return true; // 네트워크 오류 시 로그아웃하지 않음
    }
  };

  /** 세션 토큰 폴링 시작 */
  const startSessionPolling = () => {
    if (sessionPollRef.current) return; // 이미 실행 중
    sessionPollRef.current = setInterval(async () => {
      // 프로필 존재 확인 (방출 감지)
      const profileExists = await checkProfileExists();
      if (!profileExists) {
        clearInterval(sessionPollRef.current!);
        sessionPollRef.current = null;
        notify('계정이 삭제되었거나 병원에서 방출되었습니다.', 'error');
        setTimeout(() => authService.signOut(), 2000);
        return;
      }
      // 중복 로그인 검증
      const valid = await validateSessionToken();
      if (!valid) {
        clearInterval(sessionPollRef.current!);
        sessionPollRef.current = null;
        notify('다른 기기에서 로그인하여 자동 로그아웃됩니다.', 'error');
        setTimeout(() => authService.signOut(), 2000);
      }
    }, SESSION_POLL_INTERVAL_MS);
  };

  /** 세션 토큰 폴링 중지 */
  const stopSessionPolling = () => {
    if (sessionPollRef.current) {
      clearInterval(sessionPollRef.current);
      sessionPollRef.current = null;
    }
  };

  /**
   * SIGNED_IN 직후 profile.hospital_id가 트랜잭션 지연으로 비어 있는 경우가 있어
   * 짧게 재시도한 뒤 안정화된 프로필을 반환한다.
   */
  const waitForSignedInProfile = async () => {
    const sessionEmail = (await authService.getSession().catch(() => null))?.user?.email ?? null;
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const profile = await authService.getProfileById(undefined, { decrypt: false });
      if (!profile) {
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        continue;
      }

      const hasHospitalLink = Boolean(profile.hospital_id);
      const canMissHospitalTemporarily = isSystemAdminRole(profile.role, sessionEmail ?? profile.email) || profile.status === 'pending';
      if (hasHospitalLink || canMissHospitalTemporarily || attempt === maxAttempts - 1) {
        return profile;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  };

  // 세션 초기화 및 Auth 상태 변경 구독
  useEffect(() => {
    // Edge Function 콜드 스타트 방지: 인증 불요 hash 요청으로 런타임 워밍업
    warmupCryptoService();

    const initSession = async () => {
      const timeoutId = setTimeout(() => {
        console.error('[useAppState] initSession timed out, forcing isLoading: false');
        setState(prev => ({ ...prev, isLoading: false }));
      }, LOAD_TIMEOUT_MS);
      try {
        // 소셜 계정 연동 완료 처리: ?link_success=google|kakao
        const urlParams = new URLSearchParams(window.location.search);
        const linkSuccess = urlParams.get('link_success');
        if (linkSuccess) {
          window.history.replaceState({}, '', window.location.pathname);
          localStorage.setItem('_link_success_provider', linkSuccess);
        }

        // 이메일 인증 링크 처리: ?token_hash=xxx&type=signup
        const tokenHash = urlParams.get('token_hash');
        const tokenType = urlParams.get('type');
        if (tokenHash && tokenType === 'signup') {
          window.history.replaceState({}, '', window.location.pathname);
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'signup',
          });
          if (verifyError) {
            console.error('[useAppState] 이메일 인증 실패:', verifyError);
            setState(prev => ({ ...prev, isLoading: false }));
          }
          // 성공 시 SIGNED_IN 이벤트가 loadHospitalData 처리
          return;
        }

        const session = await authService.getSession();
        if (session?.user) {
          // JWT가 만료되었거나 곧 만료될 경우 선제적으로 갱신
          // getSession()은 localStorage만 읽어 만료된 토큰도 반환하므로,
          // RPC 호출 전에 반드시 refreshSession()으로 유효한 토큰 확보
          const expiresAt = session.expires_at; // unix seconds
          const now = Math.floor(Date.now() / 1000);
          if (!expiresAt || expiresAt < now + 60) {
            const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !refreshed.session) {
              console.warn('[useAppState] Session refresh failed, signing out:', refreshError?.message);
              await authService.signOut();
              setState(prev => ({ ...prev, isLoading: false }));
              return;
            }
          }

          let profile = await authService.getProfileById(undefined, { decrypt: false });
          // 프로필 조회 실패 시 500ms 후 1회 재시도 (RPC 일시 오류 대응)
          if (!profile) {
            await new Promise(r => setTimeout(r, 500));
            profile = await authService.getProfileById(undefined, { decrypt: false });
          }
          if (profile) {
            // 기존 세션 복원 시 토큰 유효성 1회 검증
            const valid = await validateSessionToken();
            if (!valid) {
              notify('다른 기기에서 로그인하여 자동 로그아웃됩니다.', 'error');
              setTimeout(() => authService.signOut(), 2000);
              setState(prev => ({ ...prev, isLoading: false }));
              return;
            }
            // MFA 활성화 여부 + 기기 신뢰 확인
            if (profile.mfa_enabled) {
              const isTrusted = await authService.checkTrustedDevice();
              if (!isTrusted) {
                let mfaPendingEmail = profile.email;
                const decryptedForMfa = await authService.getProfileById(undefined, { decrypt: true }).catch(() => null);
                if (decryptedForMfa?.email) mfaPendingEmail = decryptedForMfa.email;
                setState(prev => ({
                  ...prev,
                  currentView: 'mfa_otp',
                  mfaPendingEmail,
                  isLoading: false,
                }));
                return;
              }
            }
            const user = dbToUser(profile, session.user.email);
            await loadHospitalData(user);
            initSessionHandledRef.current = true;
            startSessionPolling();
            // 소셜 연동 완료 후 복귀 시 프로필 모달 자동 오픈
            if (localStorage.getItem('_link_success_provider')) {
              setState(prev => ({ ...prev, showProfile: true }));
            }
            return;
          }
        }
      } catch (error: unknown) {
        console.error('[useAppState] Session check failed:', error);
        if (errorIncludes(error, 'Refresh Token', 'Invalid')) {
          await authService.signOut();
        }
      } finally {
        clearTimeout(timeoutId);
      }
      setState(prev => ({ ...prev, isLoading: false }));
    };
    initSession();

    // ⚠️ Supabase v2는 SIGNED_IN / TOKEN_REFRESHED 이벤트에서 콜백을 내부적으로 await함.
    // async 콜백이 hang하면 signInWithPassword 자체도 블로킹되므로
    // SIGNED_IN 처리는 반드시 fire-and-forget (void IIFE) 으로 실행해야 함.
    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        signedInInFlightRef.current = null;
        hospitalLoadInFlightRef.current = null;
        initSessionHandledRef.current = false;
        stopSessionPolling();
        setState(prev => ({
          ...prev,
          user: null,
          currentView: 'homepage',
          inventory: [],
          orders: [],
          surgeryMaster: {},
          fixtureData: null,
          hospitalName: '',
          hospitalMasterAdminId: '',
          hospitalWorkDays: DEFAULT_WORK_DAYS,
          hospitalBillingProgram: null,
          isLoading: false,
        }));
      }
      // 이메일 인증 링크 클릭 → 토큰 교환 → SIGNED_IN 이벤트로 자동 대시보드 진입
      // fire-and-forget: 콜백을 즉시 반환해 signInWithPassword 블로킹 방지
      if (event === 'SIGNED_IN') {
        // initSession이 이미 세션 복원 + loadHospitalData를 완료한 경우 중복 실행 방지
        if (initSessionHandledRef.current) return;
        // 로그인 타임아웃 후 원래 요청이 늦게 완료된 경우 — 세션을 즉시 폐기
        if (authService.consumeLoginTimedOut()) {
          void supabase.auth.signOut();
          return;
        }
        const now = Date.now();
        // 초기 세션 복원/토큰 갱신 과정에서 중복 SIGNED_IN 이벤트가 짧게 연속 발행할 수 있음
        if (now - lastSignedInAtRef.current < 800) return;
        lastSignedInAtRef.current = now;
        if (signedInInFlightRef.current) return;

        const task = (async () => {
          const profile = await waitForSignedInProfile();
          if (profile) {
            let user = dbToUser(profile, session?.user?.email);

            // 이메일 인증 완료 후 병원/워크스페이스 생성 (이메일 인증 ON 경로)
            // signUp()에서 authData.session이 없어 병원 생성을 건너뛴 경우 여기서 처리
            if (!user.hospitalId && localStorage.getItem('_pending_hospital_setup')) {
                const hospitalId = await authService.createHospitalForEmailConfirmed(profile.id);
              if (hospitalId) {
                // hospital_id가 업데이트된 최신 프로필 로드
                const updatedProfile = await authService.getProfileById(undefined, { decrypt: false });
                if (updatedProfile) {
                  user = dbToUser(updatedProfile, session?.user?.email);
                }
              }
            }

            // 이메일 인증 완료 후 트라이얼 플랜 적용 (fallback: createHospitalForEmailConfirmed가 처리하지 못한 경우)
            const pendingPlan = localStorage.getItem('_pending_trial_plan') as PlanType | null;
            if (pendingPlan && pendingPlan !== 'free' && user.hospitalId) {
              localStorage.removeItem('_pending_trial_plan');
              await planService.startTrial(user.hospitalId, pendingPlan);
            }
            await loadHospitalData(user);
            // 소셜 로그인 시 세션 토큰 발급 (이메일 로그인은 signIn()에서 발급)
            if (!sessionStorage.getItem(SESSION_TOKEN_KEY)) {
              try {
                const token = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
                await supabase.rpc('set_session_token', { p_token: token });
                sessionStorage.setItem(SESSION_TOKEN_KEY, token);
              } catch (e) {
                console.warn('[useAppState] social login session token setup failed:', e);
              }
            }
            startSessionPolling();
          }
        })();

        signedInInFlightRef.current = task;
        void task.finally(() => {
          if (signedInInFlightRef.current === task) {
            signedInInFlightRef.current = null;
          }
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      stopSessionPolling();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Realtime 구독: 병원 데이터 실시간 동기화
  useEffect(() => {
    if (!state.user?.hospitalId || (state.user?.status !== 'active' && state.user?.status !== 'readonly')) return;

    const hospitalId = state.user.hospitalId;

    const inventoryChannel = inventoryService.subscribeToChanges(hospitalId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const newItem = dbToInventoryItem(payload.new);
        setState(prev => {
          if (prev.inventory.some(i => i.id === newItem.id)) return prev;
          return { ...prev, inventory: [...prev.inventory, newItem] };
        });
      } else if (payload.eventType === 'UPDATE') {
        const updated = dbToInventoryItem(payload.new);
        setState(prev => ({
          ...prev,
          inventory: prev.inventory.map(i =>
            i.id === updated.id
              ? (() => {
                // Preserve usage-derived metrics while applying stock deltas from realtime updates.
                const deltaInitial = updated.initialStock - i.initialStock;
                const deltaAdjustment = updated.stockAdjustment - (i.stockAdjustment ?? 0);
                return {
                  ...i,
                  initialStock: updated.initialStock,
                  stockAdjustment: updated.stockAdjustment,
                  currentStock: i.currentStock + deltaInitial + deltaAdjustment,
                  manufacturer: updated.manufacturer,
                  brand: updated.brand,
                  size: updated.size,
                };
              })()
              : i
          ),
        }));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setState(prev => ({ ...prev, inventory: prev.inventory.filter(i => i.id !== deletedId) }));
        }
      }
    });

    const surgeryChannel = surgeryService.subscribeToChanges(hospitalId, (payload) => {
      const sheetName = '수술기록지';

      if (payload.eventType === 'INSERT') {
        dbToExcelRow(payload.new)
          .then((newRow: ExcelRow) => {
            setState(prev => {
              const existing = prev.surgeryMaster[sheetName] || [];
              if (existing.some((r: ExcelRow) => r._id === newRow._id)) return prev;
              return { ...prev, surgeryMaster: { ...prev.surgeryMaster, [sheetName]: [...existing, newRow] } };
            });
          })
          .catch((error: unknown) => {
            console.error('[useAppState] Failed to map realtime surgery INSERT row:', error);
          });

      } else if (payload.eventType === 'UPDATE') {
        dbToExcelRow(payload.new)
          .then((updatedRow: ExcelRow) => {
            setState(prev => {
              const existing = prev.surgeryMaster[sheetName] || [];
              return {
                ...prev,
                surgeryMaster: {
                  ...prev.surgeryMaster,
                  [sheetName]: existing.map((r: ExcelRow) =>
                    r._id === updatedRow._id ? updatedRow : r
                  ),
                },
              };
            });
          })
          .catch((error: unknown) => {
            console.error('[useAppState] Failed to map realtime surgery UPDATE row:', error);
          });

      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setState(prev => {
            const existing = prev.surgeryMaster[sheetName] || [];
            return {
              ...prev,
              surgeryMaster: {
                ...prev.surgeryMaster,
                [sheetName]: existing.filter((r: ExcelRow) => r._id !== deletedId),
              },
            };
          });
        }
      }
    });

    const ordersChannel = orderService.subscribeToChanges(hospitalId, (payload) => {
      if (payload.eventType === 'INSERT') {
        const insertedId = (payload.new as { id?: string })?.id;
        if (!insertedId) return;
        // 전체 재조회(getOrders) 대신 새 주문 1건만 조회 → 기존 state.orders를 덮어쓰는 race condition 방지
        supabase
          .from('orders')
          .select('*, order_items(*)')
          .eq('id', insertedId)
          .single()
          .then(({ data, error }) => {
            if (error || !data) return;
            const newOrder = dbToOrder(data as DbOrder & { order_items: [] });
            setState(prev => {
              if (prev.orders.some(o => o.id === newOrder.id)) return prev;
              return { ...prev, orders: [newOrder, ...prev.orders] };
            });
          });
      } else if (payload.eventType === 'UPDATE') {
        const updated = payload.new;
        setState(prev => ({
          ...prev,
          orders: prev.orders.map(o =>
            o.id === updated.id
              ? { ...o, status: updated.status, receivedDate: updated.received_date || undefined }
              : o
          ),
        }));
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old?.id;
        if (deletedId) {
          setState(prev => ({ ...prev, orders: prev.orders.filter(o => o.id !== deletedId) }));
        }
      }
    });

    return () => {
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(surgeryChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [state.user?.hospitalId, state.user?.status]);

  // Handle external history navigation (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      let targetView: View = 'homepage';
      if (path === '/about') targetView = 'about';
      else if (path === '/consulting') targetView = 'consulting';
      else if (path === '/solutions') targetView = 'solutions';
      else if (path === '/courses') targetView = 'courses';
      else if (path === '/blog') targetView = 'blog';
      else if (path === '/community') targetView = 'community';
      else if (path === '/contact') targetView = 'contact';
      else if (path === '/pricing') targetView = 'pricing';
      
      setState(prev => ({ ...prev, currentView: targetView }));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  return {
    state,
    setState,
    loadHospitalData,
    loadUserContext,
    loadInventoryData,
    handleLoginSuccess,
    handleLeaveHospital,
    handleDeleteAccount,
  };
}
