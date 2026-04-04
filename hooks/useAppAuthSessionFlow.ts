import { useEffect, useRef } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AppState, User } from '../types';
import { authService } from '../services/authService';
import { warmupCryptoService } from '../services/cryptoUtils';
import { runInitialSessionBootstrap } from './appSessionBootstrap';
import {
  handleSignedInAuthEvent,
  handleSignedOutAuthEvent,
} from './appAuthStateHandlers';
import { useAppSessionPolling } from './useAppSessionPolling';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppAuthSessionFlowParams {
  setState: Dispatch<SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  loadUserContext: (user: User) => Promise<void>;
  notify: NotifyFn;
  resetToSignedOutState: () => void;
  clearHospitalLoadInFlight?: () => void;
}

export function useAppAuthSessionFlow({
  setState,
  loadHospitalData,
  loadUserContext,
  notify,
  resetToSignedOutState,
  clearHospitalLoadInFlight,
}: UseAppAuthSessionFlowParams) {
  const signedInInFlightRef = useRef<Promise<void> | null>(null);
  const lastSignedInAtRef = useRef(0);
  const initSessionHandledRef = useRef(false);
  const loadHospitalDataRef = useRef(loadHospitalData);
  const loadUserContextRef = useRef(loadUserContext);

  loadHospitalDataRef.current = loadHospitalData;
  loadUserContextRef.current = loadUserContext;

  const {
    startSessionPolling,
    stopSessionPolling,
    validateSessionToken,
  } = useAppSessionPolling({ notify });

  useEffect(() => {
    warmupCryptoService();
    void runInitialSessionBootstrap({
      setState,
      loadHospitalData: loadHospitalDataRef.current,
      notify,
      validateSessionToken,
      startSessionPolling,
      markInitSessionHandled: () => {
        initSessionHandledRef.current = true;
      },
    });

    const { data: { subscription } } = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        handleSignedOutAuthEvent({
          signedInInFlightRef,
          initSessionHandledRef,
          clearHospitalLoadInFlight,
          stopSessionPolling,
          resetToSignedOutState,
        });
      }

      if (event === 'SIGNED_IN') {
        handleSignedInAuthEvent({
          sessionEmail: session?.user?.email,
          initSessionHandledRef,
          lastSignedInAtRef,
          signedInInFlightRef,
          loadUserContext: loadUserContextRef.current,
          startSessionPolling,
        });
      }
    });

    return () => {
      subscription.unsubscribe();
      stopSessionPolling();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    startSessionPolling,
    stopSessionPolling,
  };
}
