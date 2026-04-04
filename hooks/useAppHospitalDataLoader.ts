import { useCallback, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, User } from '../types';
import {
  buildHospitalLoadFailureState,
  buildHospitalReadyState,
  buildInventoryDataState,
} from './appStatePresets';
import { handleHospitalLoadGuard } from './appHospitalLoadGuard';
import {
  loadResolvedHospitalUser,
  scheduleHospitalUserBackgroundDecrypt,
} from './appHospitalUserResolver';
import { loadHospitalContextSnapshot } from './appHospitalContextLoader';
import {
  loadHospitalWorkspaceSnapshot,
  scheduleHospitalSurgeryDecrypt,
} from './appHospitalWorkspaceLoader';
import { creditService } from '../services/creditService';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppHospitalDataLoaderParams {
  setState: Dispatch<SetStateAction<AppState>>;
  notify: NotifyFn;
}

export function useAppHospitalDataLoader({
  setState,
  notify,
}: UseAppHospitalDataLoaderParams) {
  const hospitalLoadInFlightRef = useRef<{ key: string; promise: Promise<void> } | null>(null);

  const backgroundDecryptUser = useCallback((userId: string) => {
    scheduleHospitalUserBackgroundDecrypt({
      userId,
      setState,
      logPrefix: '[useAppHospitalDataLoader] profile background decrypt failed:',
    });
  }, [setState]);

  const loadHospitalData = useCallback(async (user: User) => {
    const loadKey = `${user.id}:${user.hospitalId}:${user.status}:${user.role}`;
    const inFlight = hospitalLoadInFlightRef.current;
    if (inFlight && inFlight.key === loadKey) {
      return inFlight.promise;
    }

    const promise = (async () => {
      if (handleHospitalLoadGuard({
        user,
        setState,
        onBackgroundDecrypt: backgroundDecryptUser,
      })) {
        return;
      }

      try {
        const [workspaceSnapshot, hospitalContext, userResolution, creditInfo] = await Promise.all([
          loadHospitalWorkspaceSnapshot(user),
          loadHospitalContextSnapshot(user),
          loadResolvedHospitalUser(user),
          creditService.getCreditInfo().catch(() => ({ userCreditBalance: 0 })),
        ]);
        const { resolvedUser, hasDecryptedProfile } = userResolution;

        setState(prev => buildHospitalReadyState(prev, {
          user: resolvedUser,
          inventory: workspaceSnapshot.inventory,
          surgeryMaster: workspaceSnapshot.surgeryMaster,
          orders: workspaceSnapshot.orders,
          planState: workspaceSnapshot.planState,
          memberCount: hospitalContext.memberCount,
          hospitalName: hospitalContext.hospitalName,
          hospitalMasterAdminId: hospitalContext.hospitalMasterAdminId,
          hospitalWorkDays: hospitalContext.hospitalWorkDays,
          hospitalBillingProgram: hospitalContext.hospitalBillingProgram,
          hospitalBizFileUrl: hospitalContext.hospitalBizFileUrl,
          userCreditBalance: creditInfo.userCreditBalance,
        }));

        if (workspaceSnapshot.wasReset) {
          notify('예약된 데이터 초기화가 완료되었습니다. 재고, 수술 기록, 주문 데이터가 모두 삭제되었습니다.', 'info');
        } else {
          scheduleHospitalSurgeryDecrypt({
            user: resolvedUser,
            surgeryData: workspaceSnapshot.surgeryData,
            setState,
            logPrefix: '[useAppHospitalDataLoader] surgery background decrypt failed, masked rows preserved:',
          });
        }

        if (!hasDecryptedProfile) void backgroundDecryptUser(user.id);
      } catch (error) {
        console.error('[useAppHospitalDataLoader] loadHospitalData failed:', error);
        setState(prev => buildHospitalLoadFailureState(prev, user));
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
  }, [backgroundDecryptUser, notify, setState]);

  const loadUserContext = useCallback(async (user: User) => {
    if (handleHospitalLoadGuard({
      user,
      setState,
      onBackgroundDecrypt: backgroundDecryptUser,
    })) {
      return;
    }

    try {
      const [hospitalContext, userResolution, creditInfo] = await Promise.all([
        loadHospitalContextSnapshot(user),
        loadResolvedHospitalUser(user),
        creditService.getCreditInfo().catch(() => ({ userCreditBalance: 0 })),
      ]);
      const { resolvedUser, hasDecryptedProfile } = userResolution;

      setState(prev => buildHospitalReadyState(prev, {
        user: resolvedUser,
        inventory: prev.inventory,
        surgeryMaster: prev.surgeryMaster,
        orders: prev.orders,
        planState: hospitalContext.planState,
        memberCount: hospitalContext.memberCount,
        hospitalName: hospitalContext.hospitalName,
        hospitalMasterAdminId: hospitalContext.hospitalMasterAdminId,
        hospitalWorkDays: hospitalContext.hospitalWorkDays,
        hospitalBillingProgram: hospitalContext.hospitalBillingProgram,
        hospitalBizFileUrl: hospitalContext.hospitalBizFileUrl,
        userCreditBalance: creditInfo.userCreditBalance,
      }));

      if (!hasDecryptedProfile) void backgroundDecryptUser(user.id);
    } catch (error) {
      console.error('[useAppHospitalDataLoader] loadUserContext failed:', error);
      setState(prev => buildHospitalLoadFailureState(prev, user));
    }
  }, [backgroundDecryptUser, setState]);

  const loadInventoryData = useCallback(async (user: User) => {
    if (!user.hospitalId) return;

    try {
      const workspaceSnapshot = await loadHospitalWorkspaceSnapshot(user);

      setState(prev => buildInventoryDataState(prev, {
        planState: workspaceSnapshot.planState,
        inventory: workspaceSnapshot.inventory,
        surgeryMaster: workspaceSnapshot.surgeryMaster,
        orders: workspaceSnapshot.orders,
      }));

      if (workspaceSnapshot.wasReset) {
        notify('예약된 데이터 초기화가 완료되었습니다. 재고, 수술 기록, 주문 데이터가 모두 삭제되었습니다.', 'info');
      } else {
        scheduleHospitalSurgeryDecrypt({
          user,
          surgeryData: workspaceSnapshot.surgeryData,
          setState,
          logPrefix: '[useAppHospitalDataLoader] inventory refresh surgery decrypt failed:',
        });
      }
    } catch (error) {
      console.error('[useAppHospitalDataLoader] loadInventoryData failed:', error);
    }
  }, [notify, setState]);

  const clearHospitalLoadInFlight = useCallback(() => {
    hospitalLoadInFlightRef.current = null;
  }, []);

  return {
    loadHospitalData,
    loadUserContext,
    loadInventoryData,
    clearHospitalLoadInFlight,
  };
}
