import { useCallback, useEffect, useMemo, useState } from 'react';
import { pwaUpdateService, type PwaUpdateSnapshot } from '../services/pwaUpdateService';

export interface UsePwaUpdateResult extends PwaUpdateSnapshot {
  shouldShowPrompt: boolean;
  message: string;
  applyUpdate: () => void;
  deferUpdate: () => void;
}

export function usePwaUpdate(currentView: string): UsePwaUpdateResult {
  const [snapshot, setSnapshot] = useState<PwaUpdateSnapshot>(() => pwaUpdateService.getSnapshot());

  useEffect(() => {
    pwaUpdateService.setContextPage(currentView);
  }, [currentView]);

  useEffect(() => {
    const unsubscribe = pwaUpdateService.subscribe(setSnapshot);
    pwaUpdateService.start();
    return unsubscribe;
  }, []);

  const applyUpdate = useCallback(() => {
    void pwaUpdateService.applyUpdate();
  }, []);

  const deferUpdate = useCallback(() => {
    pwaUpdateService.deferUpdate();
  }, []);

  return useMemo(() => {
    const deferred = Boolean(snapshot.deferredUntil && snapshot.deferredUntil > Date.now());
    const shouldShowPrompt = snapshot.updateAvailable && (snapshot.forceUpdate || !deferred);
    return {
      ...snapshot,
      shouldShowPrompt,
      message: snapshot.releaseMessage,
      applyUpdate,
      deferUpdate,
    };
  }, [applyUpdate, deferUpdate, snapshot]);
}

