import type { MutableRefObject } from 'react';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';
import { completeSignedInTransition } from './appSignedInTransition';

interface HandleSignedOutAuthEventParams {
  signedInInFlightRef: MutableRefObject<Promise<void> | null>;
  initSessionHandledRef: MutableRefObject<boolean>;
  clearHospitalLoadInFlight?: () => void;
  stopSessionPolling: () => void;
  resetToSignedOutState: () => void;
}

interface HandleSignedInAuthEventParams {
  sessionEmail?: string;
  initSessionHandledRef: MutableRefObject<boolean>;
  lastSignedInAtRef: MutableRefObject<number>;
  signedInInFlightRef: MutableRefObject<Promise<void> | null>;
  loadUserContext: (emailUser: import('../types').User) => Promise<void>;
  startSessionPolling: () => void;
}

export function handleSignedOutAuthEvent({
  signedInInFlightRef,
  initSessionHandledRef,
  clearHospitalLoadInFlight,
  stopSessionPolling,
  resetToSignedOutState,
}: HandleSignedOutAuthEventParams) {
  signedInInFlightRef.current = null;
  initSessionHandledRef.current = false;
  clearHospitalLoadInFlight?.();
  stopSessionPolling();
  resetToSignedOutState();
}

export function handleSignedInAuthEvent({
  sessionEmail,
  initSessionHandledRef,
  lastSignedInAtRef,
  signedInInFlightRef,
  loadUserContext,
  startSessionPolling,
}: HandleSignedInAuthEventParams) {
  if (initSessionHandledRef.current) return;
  if (authService.consumeLoginTimedOut()) {
    void supabase.auth.signOut();
    return;
  }

  const now = Date.now();
  if (now - lastSignedInAtRef.current < 800) return;
  lastSignedInAtRef.current = now;
  if (signedInInFlightRef.current) return;

  const task = completeSignedInTransition({
    sessionEmail,
    loadUserContext,
    startSessionPolling,
  });

  signedInInFlightRef.current = task;
  void task.finally(() => {
    if (signedInInFlightRef.current === task) {
      signedInInFlightRef.current = null;
    }
  });
}
