import { useCallback, useRef } from 'react';
import { authService } from '../services/authService';
import { supabase } from '../services/supabaseClient';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppSessionPollingParams {
  notify: NotifyFn;
}

export const SESSION_POLL_INTERVAL_MS = 60_000;
export const SESSION_TOKEN_KEY = 'dentweb_session_token';

export function useAppSessionPolling({
  notify,
}: UseAppSessionPollingParams) {
  const sessionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const notifyRef = useRef(notify);

  notifyRef.current = notify;

  const validateSessionToken = useCallback(async (): Promise<boolean> => {
    const localToken = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!localToken) return true;

    try {
      const { data: dbToken, error } = await supabase.rpc('get_session_token');
      if (error) return true;
      if (dbToken === null) return true;
      return dbToken === localToken;
    } catch {
      return true;
    }
  }, []);

  const checkProfileExists = useCallback(async (): Promise<boolean> => {
    try {
      const profile = await authService.getProfileById(undefined, { decrypt: false });
      return profile !== null;
    } catch {
      return true;
    }
  }, []);

  const stopSessionPolling = useCallback(() => {
    if (sessionPollRef.current) {
      clearInterval(sessionPollRef.current);
      sessionPollRef.current = null;
    }
  }, []);

  const startSessionPolling = useCallback(() => {
    if (sessionPollRef.current) return;

    sessionPollRef.current = setInterval(async () => {
      const profileExists = await checkProfileExists();
      if (!profileExists) {
        stopSessionPolling();
        notifyRef.current('계정이 삭제되었거나 병원에서 방출되었습니다.', 'error');
        setTimeout(() => authService.signOut(), 2000);
        return;
      }

      const valid = await validateSessionToken();
      if (!valid) {
        stopSessionPolling();
        notifyRef.current('다른 기기에서 로그인하여 자동 로그아웃됩니다.', 'error');
        setTimeout(() => authService.signOut(), 2000);
      }
    }, SESSION_POLL_INTERVAL_MS);
  }, [checkProfileExists, stopSessionPolling, validateSessionToken]);

  return {
    startSessionPolling,
    stopSessionPolling,
    validateSessionToken,
  };
}
