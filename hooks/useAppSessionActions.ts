import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState } from '../types';
import { authService } from '../services/authService';

interface UseAppSessionActionsParams {
  setState: Dispatch<SetStateAction<AppState>>;
}

export function useAppSessionActions({ setState }: UseAppSessionActionsParams) {
  const handleSignOut = useCallback(async () => {
    await authService.signOut();
    setState(prev => ({ ...prev, user: null, currentView: 'homepage' }));
  }, [setState]);

  return {
    handleSignOut,
  };
}
