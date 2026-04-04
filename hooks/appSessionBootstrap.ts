import type { Dispatch, SetStateAction } from 'react';
import { AppState, User } from '../types';
import { authService } from '../services/authService';
import { errorIncludes } from '../utils/errors';
import { dbToUser } from '../services/mappers';
import { supabase } from '../services/supabaseClient';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface RunInitialSessionBootstrapParams {
  setState: Dispatch<SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  notify: NotifyFn;
  validateSessionToken: () => Promise<boolean>;
  startSessionPolling: () => void;
  markInitSessionHandled: () => void;
}

export const LOAD_TIMEOUT_MS = 45_000;

export async function runInitialSessionBootstrap({
  setState,
  loadHospitalData,
  notify,
  validateSessionToken,
  startSessionPolling,
  markInitSessionHandled,
}: RunInitialSessionBootstrapParams) {
  const timeoutId = setTimeout(() => {
    console.error('[appSessionBootstrap] initSession timed out, forcing isLoading: false');
    setState(prev => ({ ...prev, isLoading: false }));
  }, LOAD_TIMEOUT_MS);

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const linkSuccess = urlParams.get('link_success');
    if (linkSuccess) {
      window.history.replaceState({}, '', window.location.pathname);
      localStorage.setItem('_link_success_provider', linkSuccess);
    }

    const tokenHash = urlParams.get('token_hash');
    const tokenType = urlParams.get('type');
    if (tokenHash && tokenType === 'signup') {
      window.history.replaceState({}, '', window.location.pathname);
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'signup',
      });
      if (verifyError) {
        console.error('[appSessionBootstrap] 이메일 인증 실패:', verifyError);
        setState(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }

    const session = await authService.getSession();
    if (session?.user) {
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      if (!expiresAt || expiresAt < now + 60) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError || !refreshed.session) {
          console.warn('[appSessionBootstrap] Session refresh failed, signing out:', refreshError?.message);
          await authService.signOut();
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }
      }

      let profile = await authService.getProfileById(undefined, { decrypt: false });
      if (!profile) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        profile = await authService.getProfileById(undefined, { decrypt: false });
      }

      if (profile) {
        const valid = await validateSessionToken();
        if (!valid) {
          notify('다른 기기에서 로그인하여 자동 로그아웃됩니다.', 'error');
          setTimeout(() => authService.signOut(), 2000);
          setState(prev => ({ ...prev, isLoading: false }));
          return;
        }

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
        markInitSessionHandled();
        startSessionPolling();

        if (localStorage.getItem('_link_success_provider')) {
          setState(prev => ({ ...prev, showProfile: true }));
        }
        return;
      }
    }
  } catch (error: unknown) {
    console.error('[appSessionBootstrap] Session check failed:', error);
    if (errorIncludes(error, 'Refresh Token', 'Invalid')) {
      await authService.signOut();
    }
  } finally {
    clearTimeout(timeoutId);
  }

  setState(prev => ({ ...prev, isLoading: false }));
}
