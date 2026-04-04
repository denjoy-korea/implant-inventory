import type { Dispatch, SetStateAction } from 'react';
import { AppState, User } from '../types';
import { useAppAuthSessionFlow } from './useAppAuthSessionFlow';
import { useAppLocationSync } from './useAppLocationSync';
import { useAppSessionLifecycleActions } from './useAppSessionLifecycleActions';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppSessionLifecycleParams {
  setState: Dispatch<SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  loadUserContext: (user: User) => Promise<void>;
  notify: NotifyFn;
  resetToSignedOutState: () => void;
  clearHospitalLoadInFlight?: () => void;
}

export function useAppSessionLifecycle({
  setState,
  loadHospitalData,
  loadUserContext,
  notify,
  resetToSignedOutState,
  clearHospitalLoadInFlight,
}: UseAppSessionLifecycleParams) {
  const { startSessionPolling, stopSessionPolling } = useAppAuthSessionFlow({
    setState,
    loadHospitalData,
    loadUserContext,
    notify,
    resetToSignedOutState,
    clearHospitalLoadInFlight,
  });

  useAppLocationSync({ setState });

  const { handleLoginSuccess, handleDeleteAccount } = useAppSessionLifecycleActions({
    setState,
    loadUserContext,
    notify,
    startSessionPolling,
    stopSessionPolling,
    resetToSignedOutState,
  });

  return {
    handleLoginSuccess,
    handleDeleteAccount,
    startSessionPolling,
    stopSessionPolling,
  };
}
