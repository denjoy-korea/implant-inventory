import type { RefObject } from 'react';
import { DashboardTab, AppState, usesPublicBottomOffset } from '../types';
import { useUIState } from './useUIState';

interface UseAppViewportScaffoldParams {
  state: Pick<AppState, 'adminViewMode' | 'currentView' | 'dashboardTab' | 'hospitalBillingProgram' | 'user'>;
  isSystemAdmin: boolean;
  dashboardHeaderRef: RefObject<HTMLElement | null>;
}

const MOBILE_PRIMARY_TABS: DashboardTab[] = ['overview', 'inventory_master', 'order_management'];

export function useAppViewportScaffold({
  state,
  isSystemAdmin,
  dashboardHeaderRef,
}: UseAppViewportScaffoldParams) {
  const requiresBillingProgramSetup = (
    state.currentView === 'dashboard' && !!state.user?.hospitalId &&
    (state.user?.status === 'active' || state.user?.status === 'readonly') &&
    !isSystemAdmin && !state.hospitalBillingProgram
  );
  const showDashboardSidebar = state.currentView === 'dashboard'
    && !requiresBillingProgramSetup
    && (!isSystemAdmin || state.adminViewMode === 'user');
  const showStandardDashboardHeader = state.currentView === 'dashboard'
    && !requiresBillingProgramSetup
    && !(isSystemAdmin && state.adminViewMode !== 'user');

  const {
    isSidebarCollapsed, setIsSidebarCollapsed,
    isSidebarToggleVisible, setIsSidebarToggleVisible,
    isFinePointer, isNarrowViewport,
    isMobileMenuOpen, setIsMobileMenuOpen,
    mobileOrderNav, setMobileOrderNav,
    dashboardHeaderHeight, isOffline,
    showMobileDashboardNav,
  } = useUIState({ showDashboardSidebar, showStandardDashboardHeader, dashboardHeaderRef, dashboardTab: state.dashboardTab });

  return {
    requiresBillingProgramSetup,
    showDashboardSidebar,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    isSidebarToggleVisible,
    setIsSidebarToggleVisible,
    isFinePointer,
    isMobileMenuOpen,
    setIsMobileMenuOpen,
    mobileOrderNav,
    setMobileOrderNav,
    dashboardHeaderHeight,
    isOffline,
    showMobileDashboardNav,
    showMobilePublicNav: usesPublicBottomOffset(state.currentView) && isNarrowViewport,
    mobilePrimaryTabs: MOBILE_PRIMARY_TABS,
  };
}
