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
  AppState, User, ExcelRow, DEFAULT_WORK_DAYS, PLAN_LIMITS, DbOrder, PlanType,
} from '../types';
import { authService } from '../services/authService';
import { errorIncludes } from '../utils/errors';
import { inventoryService } from '../services/inventoryService';
import { surgeryService } from '../services/surgeryService';
import { orderService } from '../services/orderService';
import { hospitalService } from '../services/hospitalService';
import { planService } from '../services/planService';
import { resetService } from '../services/resetService';
import { dbToInventoryItem, dbToExcelRow, dbToExcelRowBatch, dbToOrder, dbToUser } from '../services/mappers';
import { supabase } from '../services/supabaseClient';
import { pageViewService } from '../services/pageViewService';
import { onboardingService } from '../services/onboardingService';

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
  currentView: 'landing',
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
};

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

const SESSION_POLL_INTERVAL_MS = 60_000;
const SESSION_TOKEN_KEY = 'dentweb_session_token';
const LOAD_TIMEOUT_MS = 20_000; // 20초 초과 시 스피너 강제 해제

export function useAppState(onNotify?: NotifyFn) {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const notify = onNotify ?? ((msg: string, _type?: string) => console.warn('[useAppState] notify fallback:', msg));
  const sessionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /** 병원 데이터 로드 (로그인 후 / 세션 복원 시) */
  const loadHospitalData = async (user: User) => {
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
        isLoading: false,
      }));
      return;
    }

    if (!user.hospitalId || (user.status !== 'active' && user.status !== 'readonly')) {
      setState(prev => ({
        ...prev,
        user,
        currentView: 'dashboard',
        dashboardTab: 'overview',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        isLoading: false,
      }));
      return;
    }

    try {
      // 수술기록 초기 로드 범위:
      // - DB에는 최대 24개월치 보관 (자동삭제 스케줄로 관리)
      // - 프론트엔드 로드는 플랜별 retentionMonths 기준으로 제한
      //   (Free=3, Basic=6, Plus=12, Business=24, Ultimate=999)
      // - planState 조회 전이므로 일단 planService.checkPlanExpiry를 통해 플랜 확인
      //   → 실용적 방법: 플랜을 먼저 확인한 후 fromDate 결정
      const planStateForDate = await planService.checkPlanExpiry(user.hospitalId);
      const retentionMonths = PLAN_LIMITS[planStateForDate.plan]?.retentionMonths ?? 24;
      // 보관 기간이 24개월을 넘어도 DB에는 최대 24개월치만 존재하므로 max 24
      const effectiveMonths = Math.min(retentionMonths, 24);
      const fromDateObj = new Date();
      fromDateObj.setMonth(fromDateObj.getMonth() - effectiveMonths);
      const fromDate = fromDateObj.toISOString().split('T')[0];

      const [inventoryData, surgeryData, ordersData, membersData, hospitalData] = await Promise.all([
        inventoryService.getInventory(),
        surgeryService.getSurgeryRecords({ fromDate }),
        orderService.getOrders(),
        hospitalService.getMembers(user.hospitalId),
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
      const surgeryRows = await dbToExcelRowBatch(surgeryData);
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
        currentView: 'dashboard',
        dashboardTab: 'overview',
        inventory: wasReset ? [] : inventory,
        surgeryMaster: wasReset ? {} as Record<string, ExcelRow[]> : { '수술기록지': surgeryRows },
        orders: wasReset ? [] : orders,
        planState,
        memberCount: membersData.length,
        hospitalName: hospitalData?.name || '',
        hospitalMasterAdminId: hospitalData?.masterAdminId || '',
        hospitalWorkDays: hospitalData?.workDays ?? DEFAULT_WORK_DAYS,
        hospitalBillingProgram: hospitalData?.billingProgram ?? null,
        isLoading: false,
      }));

      if (wasReset) {
        notify('예약된 데이터 초기화가 완료되었습니다. 재고, 수술 기록, 주문 데이터가 모두 삭제되었습니다.', 'info');
      }
    } catch (error) {
      console.error('[useAppState] Data loading failed:', error);
      setState(prev => ({
        ...prev,
        user,
        currentView: 'dashboard',
        hospitalName: '',
        hospitalMasterAdminId: '',
        hospitalWorkDays: DEFAULT_WORK_DAYS,
        hospitalBillingProgram: null,
        isLoading: false,
      }));
    }
  };

  /** 로그인 성공 콜백 */
  const handleLoginSuccess = async (user: User) => {
    setState(prev => ({ ...prev, isLoading: true }));
    pageViewService.markConverted(user.id, user.hospitalId || null);
    await loadHospitalData(user);
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
        currentView: 'landing',
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

  /** 세션 토큰 검증 — DB 토큰과 localStorage 토큰 비교 */
  const validateSessionToken = async (): Promise<boolean> => {
    const localToken = localStorage.getItem(SESSION_TOKEN_KEY);
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
      const profile = await authService.getProfileById();
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
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const profile = await authService.getProfileById();
      if (!profile) {
        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
        continue;
      }

      const hasHospitalLink = Boolean(profile.hospital_id);
      const canMissHospitalTemporarily = profile.role === 'admin' || profile.status === 'pending';
      if (hasHospitalLink || canMissHospitalTemporarily || attempt === maxAttempts - 1) {
        return profile;
      }

      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    return null;
  };

  // 세션 초기화 및 Auth 상태 변경 구독
  useEffect(() => {
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

          let profile = await authService.getProfileById();
          // 프로필 조회 실패 시 500ms 후 1회 재시도 (RPC 일시 오류 대응)
          if (!profile) {
            await new Promise(r => setTimeout(r, 500));
            profile = await authService.getProfileById();
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
                setState(prev => ({
                  ...prev,
                  currentView: 'mfa_otp',
                  mfaPendingEmail: profile.email,
                  isLoading: false,
                }));
                return;
              }
            }
            const user = dbToUser(profile);
            await loadHospitalData(user);
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
    const { data: { subscription } } = authService.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        stopSessionPolling();
        setState(prev => ({
          ...prev,
          user: null,
          currentView: 'landing',
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
        void (async () => {
          const profile = await waitForSignedInProfile();
          if (profile) {
            let user = dbToUser(profile);

            // 이메일 인증 완료 후 병원/워크스페이스 생성 (이메일 인증 ON 경로)
            // signUp()에서 authData.session이 없어 병원 생성을 건너뛴 경우 여기서 처리
            if (!user.hospitalId && localStorage.getItem('_pending_hospital_setup')) {
              const hospitalId = await authService.createHospitalForEmailConfirmed(profile.id);
              if (hospitalId) {
                // hospital_id가 업데이트된 최신 프로필 로드
                const updatedProfile = await authService.getProfileById();
                if (updatedProfile) {
                  user = dbToUser(updatedProfile);
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
            if (!localStorage.getItem(SESSION_TOKEN_KEY)) {
              try {
                const token = (crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`);
                await supabase.rpc('set_session_token', { p_token: token });
                localStorage.setItem(SESSION_TOKEN_KEY, token);
              } catch (e) {
                console.warn('[useAppState] social login session token setup failed:', e);
              }
            }
            startSessionPolling();
          }
        })();
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

  return {
    state,
    setState,
    loadHospitalData,
    handleLoginSuccess,
    handleLeaveHospital,
    handleDeleteAccount,
  };
}
