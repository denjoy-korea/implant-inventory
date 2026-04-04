import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import { AppState } from '../types';
import { resolveInitialViewFromLocation } from '../appRouting';

interface UseAppLocationSyncParams {
  setState: Dispatch<SetStateAction<AppState>>;
}

export function useAppLocationSync({ setState }: UseAppLocationSyncParams) {
  useEffect(() => {
    const handlePopState = () => {
      const targetView = resolveInitialViewFromLocation(window.location.pathname, window.location.hash) ?? 'homepage';
      setState(prev => ({ ...prev, currentView: targetView }));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [setState]);
}
