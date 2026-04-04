import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AppState } from '../types';
import { authService } from '../services/authService';
import { pageViewService } from '../services/pageViewService';

interface UseAppShellEffectsParams {
  state: AppState;
  setState: Dispatch<SetStateAction<AppState>>;
  isSystemAdmin: boolean;
}

const LAST_ACTIVE_TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

export function useAppShellEffects({
  state,
  setState,
  isSystemAdmin,
}: UseAppShellEffectsParams) {
  useEffect(() => {
    if (state.currentView === 'admin_panel' && !isSystemAdmin) {
      setState(prev => ({ ...prev, currentView: prev.user ? 'mypage' : 'homepage' }));
    }
  }, [state.currentView, isSystemAdmin, setState]);

  useEffect(() => {
    if (!state.isLoading && state.user && (state.currentView === 'login' || state.currentView === 'signup')) {
      setState(prev => ({ ...prev, currentView: 'mypage' }));
    }
  }, [state.isLoading, state.user, state.currentView, setState]);

  useEffect(() => {
    pageViewService.track(state.currentView);
  }, [state.currentView]);

  useEffect(() => {
    if (!state.user?.id) return;

    let unmounted = false;
    let inFlight = false;
    const touchLastActive = () => {
      if (unmounted || inFlight) return;
      inFlight = true;
      authService.touchLastActiveAt()
        .catch(() => { })
        .finally(() => { inFlight = false; });
    };

    touchLastActive();
    const intervalId = window.setInterval(touchLastActive, LAST_ACTIVE_TOUCH_INTERVAL_MS);
    const handleWindowFocus = () => touchLastActive();
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') touchLastActive();
    };

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      unmounted = true;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.user?.id]);
}
