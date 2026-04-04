/**
 * useAppState
 *
 * App.tsx 모노리스에서 분리된 상태 + 세션/Realtime 관리 훅.
 * - AppState 초기화
 * - Supabase 세션 확인 및 병원 데이터 로드
 * - Realtime 구독 (inventory / surgery / orders)
 * - 로그인 성공, 병원 탈퇴, 계정 삭제 핸들러
 */

import { useState } from 'react';
import {
  AppState, User, DEFAULT_WORK_DAYS,
} from '../types';
import { hospitalService } from '../services/hospitalService';
import { resolveInitialViewFromLocation } from '../appRouting';
import {
  buildLeaveHospitalState,
  buildSignedOutState,
} from './appStatePresets';
import { useAppSessionLifecycle } from './useAppSessionLifecycle';
import { useAppHospitalDataLoader } from './useAppHospitalDataLoader';
import { useAppRealtimeSync } from './useAppRealtimeSync';

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
  userCreditBalance: 0,
};

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

const getInitialState = (): AppState => {
  if (typeof window === 'undefined') return INITIAL_STATE;
  const view = resolveInitialViewFromLocation(window.location.pathname, window.location.hash);

  return { ...INITIAL_STATE, currentView: view ?? INITIAL_STATE.currentView };
};

export function useAppState(onNotify?: NotifyFn) {
  const [state, setState] = useState<AppState>(getInitialState);
  const notify = onNotify ?? ((msg: string, _type?: string) => console.warn('[useAppState] notify fallback:', msg));
  const {
    loadHospitalData,
    loadUserContext,
    loadInventoryData,
    clearHospitalLoadInFlight,
  } = useAppHospitalDataLoader({
    setState,
    notify,
  });

  const resetToSignedOutState = () => {
    setState(prev => buildSignedOutState(prev));
  };

  const { handleLoginSuccess, handleDeleteAccount } = useAppSessionLifecycle({
    notify,
    setState,
    loadHospitalData,
    loadUserContext,
    resetToSignedOutState,
    clearHospitalLoadInFlight,
  });

  /** 병원 탈퇴 */
  const handleLeaveHospital = async (currentUser: User) => {
    try {
      await hospitalService.leaveHospital();
      const updatedUser = { ...currentUser, hospitalId: '', status: 'pending' as const };
      setState(prev => buildLeaveHospitalState(prev, updatedUser));
      notify('초기화되었습니다. 새로운 병원을 찾아주세요.', 'info');
    } catch {
      notify('병원 탈퇴에 실패했습니다.', 'error');
    }
  };

  useAppRealtimeSync({
    user: state.user,
    setState,
  });

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
