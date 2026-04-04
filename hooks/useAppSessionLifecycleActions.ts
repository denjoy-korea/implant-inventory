import { useCallback } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AppState, User } from '../types';
import { authService } from '../services/authService';
import { pageViewService } from '../services/pageViewService';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppSessionLifecycleActionsParams {
  setState: Dispatch<SetStateAction<AppState>>;
  loadUserContext: (user: User) => Promise<void>;
  notify: NotifyFn;
  startSessionPolling: () => void;
  stopSessionPolling: () => void;
  resetToSignedOutState: () => void;
}

export function useAppSessionLifecycleActions({
  setState,
  loadUserContext,
  notify,
  startSessionPolling,
  stopSessionPolling,
  resetToSignedOutState,
}: UseAppSessionLifecycleActionsParams) {
  const handleLoginSuccess = useCallback(async (user: User) => {
    setState(prev => ({ ...prev, isLoading: true }));
    pageViewService.markConverted(user.id, user.hospitalId || null);
    await loadUserContext(user);
    startSessionPolling();
  }, [loadUserContext, setState, startSessionPolling]);

  const handleDeleteAccount = useCallback(async () => {
    try {
      const result = await authService.deleteAccount();
      if (result.success) {
        stopSessionPolling();
        resetToSignedOutState();
        notify('회원 탈퇴가 완료되었습니다.', 'success');
        return;
      }

      const session = await authService.getSession().catch(() => null);
      if (!session?.user) {
        stopSessionPolling();
        resetToSignedOutState();
        notify('회원 탈퇴가 완료되었습니다.', 'success');
      } else {
        notify(result.error || '회원 탈퇴에 실패했습니다.', 'error');
      }
    } catch (error) {
      const session = await authService.getSession().catch(() => null);
      if (!session?.user) {
        stopSessionPolling();
        resetToSignedOutState();
        notify('회원 탈퇴가 완료되었습니다.', 'success');
        return;
      }
      const message = error instanceof Error ? error.message : '회원 탈퇴에 실패했습니다.';
      notify(message, 'error');
    }
  }, [notify, resetToSignedOutState, stopSessionPolling]);

  return {
    handleLoginSuccess,
    handleDeleteAccount,
  };
}
