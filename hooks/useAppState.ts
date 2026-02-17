/**
 * useAppState
 *
 * App.tsx 모노리스에서 분리된 상태 + 세션/Realtime 관리 훅.
 * - AppState 초기화
 * - Supabase 세션 확인 및 병원 데이터 로드
 * - Realtime 구독 (inventory / surgery / orders)
 * - 로그인 성공, 병원 탈퇴, 계정 삭제 핸들러
 */

import { useState, useEffect } from 'react';
import {
  AppState, User, ExcelRow,
} from '../types';
import { authService } from '../services/authService';
import { inventoryService } from '../services/inventoryService';
import { surgeryService } from '../services/surgeryService';
import { orderService } from '../services/orderService';
import { hospitalService } from '../services/hospitalService';
import { planService } from '../services/planService';
import { resetService } from '../services/resetService';
import { dbToInventoryItem, dbToExcelRow, dbToOrder, dbToUser } from '../services/mappers';
import { supabase } from '../services/supabaseClient';

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
};

export function useAppState() {
  const [state, setState] = useState<AppState>(INITIAL_STATE);

  /** 병원 데이터 로드 (로그인 후 / 세션 복원 시) */
  const loadHospitalData = async (user: User) => {
    if (!user.hospitalId || (user.status !== 'active' && user.status !== 'readonly')) {
      setState(prev => ({
        ...prev,
        user,
        currentView: 'dashboard',
        dashboardTab: 'overview',
        isLoading: false,
      }));
      return;
    }

    try {
      // 수술기록은 최근 2년치만 초기 로드 (성능 최적화)
      // 더 오래된 데이터는 SurgeryDashboard 날짜 필터로 서버사이드 조회
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      const fromDate = twoYearsAgo.toISOString().split('T')[0];

      const [inventoryData, surgeryData, ordersData, planState, membersData, hospitalData] = await Promise.all([
        inventoryService.getInventory(),
        surgeryService.getSurgeryRecords({ fromDate }),
        orderService.getOrders(),
        planService.checkPlanExpiry(user.hospitalId),
        hospitalService.getMembers(user.hospitalId),
        hospitalService.getHospitalById(user.hospitalId),
      ]);

      console.log('[useAppState] loadHospitalData:', {
        inventoryCount: inventoryData.length,
        surgeryCount: surgeryData.length,
        ordersCount: ordersData.length,
        hospitalName: hospitalData?.name,
        hospitalId: user.hospitalId,
      });

      const inventory = inventoryData.map(dbToInventoryItem);
      const surgeryRows = await Promise.all(surgeryData.map(dbToExcelRow));
      const orders = ordersData.map(dbToOrder);

      const wasReset = await resetService.checkScheduledReset(user.hospitalId);

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
        isLoading: false,
      }));

      if (wasReset) {
        alert('예약된 데이터 초기화가 완료되었습니다. 재고, 수술 기록, 주문 데이터가 모두 삭제되었습니다.');
      }
    } catch (error) {
      console.error('[useAppState] Data loading failed:', error);
      setState(prev => ({
        ...prev,
        user,
        currentView: 'dashboard',
        isLoading: false,
      }));
    }
  };

  /** 로그인 성공 콜백 */
  const handleLoginSuccess = async (user: User) => {
    setState(prev => ({ ...prev, isLoading: true }));
    await loadHospitalData(user);
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
        showProfile: false,
      }));
      alert('초기화되었습니다. 새로운 병원을 찾아주세요.');
    } catch {
      alert('병원 탈퇴에 실패했습니다.');
    }
  };

  /** 계정 삭제 */
  const handleDeleteAccount = async () => {
    try {
      const result = await authService.deleteAccount();
      if (result.success) {
        setState(prev => ({
          ...prev,
          user: null,
          currentView: 'landing',
          inventory: [],
          surgeryMaster: {},
          orders: [],
          fixtureData: null,
          showProfile: false,
        }));
        alert('회원 탈퇴가 완료되었습니다.');
      } else {
        alert(result.error || '회원 탈퇴에 실패했습니다.');
      }
    } catch {
      alert('회원 탈퇴에 실패했습니다.');
    }
  };

  // 세션 초기화 및 Auth 상태 변경 구독
  useEffect(() => {
    const initSession = async () => {
      try {
        const session = await authService.getSession();
        if (session?.user) {
          const profile = await authService.getProfileById();
          if (profile) {
            const user = dbToUser(profile);
            await loadHospitalData(user);
            return;
          }
        }
      } catch (error: any) {
        console.error('[useAppState] Session check failed:', error);
        if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
          await authService.signOut();
        }
      }
      setState(prev => ({ ...prev, isLoading: false }));
    };
    initSession();

    const { data: { subscription } } = authService.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_OUT') {
        setState(prev => ({
          ...prev,
          user: null,
          currentView: 'landing',
          inventory: [],
          orders: [],
          surgeryMaster: {},
          fixtureData: null,
          isLoading: false,
        }));
      }
    });

    return () => subscription.unsubscribe();
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
              ? { ...i, initialStock: updated.initialStock, manufacturer: updated.manufacturer, brand: updated.brand, size: updated.size }
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
        orderService.getOrders().then(ordersData => {
          setState(prev => ({ ...prev, orders: ordersData.map(dbToOrder) }));
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
