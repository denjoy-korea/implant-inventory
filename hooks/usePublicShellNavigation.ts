import { useCallback } from 'react';
import type { PlanType, View } from '../types';
import { VIEW_PATH } from '../appRouting';
import { redirectToDenjoyAuth } from '../components/app/publicShellAuth';

interface UsePublicShellNavigationParams {
  currentView: View;
  onNavigate: (view: View) => void;
}

export function usePublicShellNavigation({
  currentView,
  onNavigate,
}: UsePublicShellNavigationParams) {
  const goToDenjoyLogin = useCallback(() => {
    redirectToDenjoyAuth('login', { source: currentView });
  }, [currentView]);

  const goToDenjoySignup = useCallback((plan?: PlanType) => {
    redirectToDenjoyAuth('signup', { plan, source: currentView });
  }, [currentView]);

  const handleNavigate = useCallback((targetView: View) => {
    if (targetView === 'login' || targetView === 'signup') {
      onNavigate(targetView);
      return;
    }

    const pathForView = VIEW_PATH[targetView];
    if (pathForView) {
      window.history.pushState(null, '', pathForView);
    }
    onNavigate(targetView);
  }, [onNavigate]);

  const handleAnalyzeEntry = useCallback(() => {
    onNavigate('analyze');
  }, [onNavigate]);

  const handleNavigateToCourse = useCallback((slug: string) => {
    window.history.pushState(null, '', `/courses/${slug}`);
    onNavigate('courses');
  }, [onNavigate]);

  return {
    goToDenjoyLogin,
    goToDenjoySignup,
    handleNavigate,
    handleAnalyzeEntry,
    handleNavigateToCourse,
  };
}
