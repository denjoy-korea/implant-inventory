import { useEffect, useRef } from 'react';
import React from 'react';
import { AppState, DashboardTab, User, UserRole, View, canAccessTab, isSystemAdminIdentity } from '../types';
import { buildHash, parseHash } from '../appRouting';

interface HashRoutingState {
  isLoading: boolean;
  currentView: View;
  dashboardTab: DashboardTab;
  user: User | null;
}

export function useHashRouting(
  state: HashRoutingState,
  effectiveAccessRole: UserRole,
  setState: React.Dispatch<React.SetStateAction<AppState>>,
) {
  const skipHashSync = useRef(false);
  const isFirstHashSync = useRef(true);

  /* ── Hash Routing: State → URL ── */
  useEffect(() => {
    if (state.isLoading) return;
    if (isFirstHashSync.current) { isFirstHashSync.current = false; return; }
    if (skipHashSync.current) { skipHashSync.current = false; return; }
    const hash = buildHash(state.currentView, state.dashboardTab);
    if (window.location.hash !== hash) {
      window.history.pushState(null, '', hash);
    }
  }, [state.currentView, state.dashboardTab, state.isLoading]);

  /* ── Hash Routing: URL → State (back/forward) ── */
  useEffect(() => {
    const onPopState = () => {
      const { view, tab } = parseHash(window.location.hash);
      if (view === 'dashboard' && !state.user) return;
      if (view === 'admin_panel' && !isSystemAdminIdentity(state.user)) return;
      const guardedTab = (tab !== undefined && !canAccessTab(tab, state.user?.permissions, effectiveAccessRole))
        ? 'overview' : tab;
      skipHashSync.current = true;
      setState(prev => ({
        ...prev,
        currentView: view,
        ...(guardedTab !== undefined ? { dashboardTab: guardedTab } : {}),
      }));
    };
    window.addEventListener('popstate', onPopState);
    window.addEventListener('hashchange', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
      window.removeEventListener('hashchange', onPopState);
    };
  }, [effectiveAccessRole, state.user]);

  /* ── Hash Routing: Initial load ── */
  useEffect(() => {
    if (state.isLoading) return;
    const hash = window.location.hash;
    if (hash && hash !== '#/' && hash !== '#' && hash !== '') {
      const { view, tab } = parseHash(hash);
      if (view === 'dashboard' && !state.user) {
        sessionStorage.setItem('_pending_redirect_hash', hash);
        return;
      }
      if (view === 'admin_panel' && !isSystemAdminIdentity(state.user)) return;
      const resolvedTab = (tab && !canAccessTab(tab, state.user?.permissions, effectiveAccessRole))
        ? 'overview' : tab;
      if (view !== state.currentView || (resolvedTab && resolvedTab !== state.dashboardTab)) {
        skipHashSync.current = true;
        setState(prev => ({ ...prev, currentView: view, ...(resolvedTab ? { dashboardTab: resolvedTab } : {}) }));
      }
    } else {
      window.history.replaceState(null, '', buildHash(state.currentView, state.dashboardTab));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveAccessRole, state.isLoading]);

  /* ── Hash Routing: 로그인 후 딥링크 복원 ── */
  useEffect(() => {
    if (!state.user || state.isLoading) return;
    const pendingHash = sessionStorage.getItem('_pending_redirect_hash');
    if (!pendingHash) return;
    sessionStorage.removeItem('_pending_redirect_hash');
    const { view, tab } = parseHash(pendingHash);
    if (view !== 'dashboard') return;
    const resolvedTab = (tab && !canAccessTab(tab, state.user.permissions, effectiveAccessRole))
      ? 'overview' : tab;
    skipHashSync.current = true;
    setState(prev => ({ ...prev, currentView: view, ...(resolvedTab ? { dashboardTab: resolvedTab } : {}) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.user?.id, state.isLoading]);
}
