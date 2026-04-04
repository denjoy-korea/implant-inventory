import React from 'react';
import type { DashboardTab, PlanType, UserRole, AppState } from '../../types';
import { canAccessTab } from '../../types';
import Sidebar from '../Sidebar';
import type { DashboardWorkspaceSectionProps } from './DashboardWorkspaceSection';

interface AppSidebarChromeProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  showDashboardSidebar: boolean;
  showMobileDashboardNav: boolean;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebarToggleVisible: boolean;
  setIsSidebarToggleVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isFinePointer: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  effectivePlan: PlanType;
  effectiveAccessRole: UserRole;
  isHospitalAdmin: boolean;
  isHospitalMaster: boolean;
  isSystemAdmin: boolean;
  surgeryUnregisteredCount: number;
  onOpenSupportChat: () => void;
  onOpenProfilePlan?: DashboardWorkspaceSectionProps['onOpenProfilePlan'];
}

const AppSidebarChrome: React.FC<AppSidebarChromeProps> = ({
  state,
  setState,
  showDashboardSidebar,
  showMobileDashboardNav,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isSidebarToggleVisible,
  setIsSidebarToggleVisible,
  isFinePointer,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  effectivePlan,
  effectiveAccessRole,
  isHospitalAdmin,
  isHospitalMaster,
  isSystemAdmin,
  surgeryUnregisteredCount,
  onOpenSupportChat,
  onOpenProfilePlan,
}) => {
  return (
    <>
      {showDashboardSidebar && isSidebarCollapsed && !showMobileDashboardNav && (
        <div
          className="fixed left-0 top-0 z-[260] h-20 w-20"
          onMouseEnter={() => { if (isFinePointer) setIsSidebarToggleVisible(true); }}
          onMouseLeave={() => setIsSidebarToggleVisible(false)}
        >
          <button
            type="button"
            onClick={() => { setIsSidebarCollapsed(false); setIsSidebarToggleVisible(false); }}
            className={`absolute left-3 top-3 h-10 w-10 rounded-xl border border-slate-200 bg-white text-slate-500 shadow-lg shadow-slate-300/40 transition-all duration-200 hover:border-indigo-300 hover:text-indigo-600 ${(!isFinePointer || isSidebarToggleVisible) ? 'opacity-100 translate-x-0 pointer-events-auto' : 'opacity-0 -translate-x-2 pointer-events-none'}`}
            title="사이드바 열기 (Ctrl/Cmd + \\)"
            aria-label="사이드바 열기"
          >
            <svg className="mx-auto h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 7l5 5-5 5M4 7l5 5-5 5" />
            </svg>
          </button>
        </div>
      )}

      {showDashboardSidebar && (
        <Sidebar
          activeTab={state.dashboardTab}
          onTabChange={(tab: DashboardTab) => {
            if (!canAccessTab(tab, state.user?.permissions, effectiveAccessRole)) return;
            setState(prev => ({ ...prev, dashboardTab: tab }));
            if (showMobileDashboardNav) setIsMobileMenuOpen(false);
          }}
          isCollapsed={showMobileDashboardNav ? true : isSidebarCollapsed}
          onToggleCollapse={() => {
            if (showMobileDashboardNav) {
              setIsMobileMenuOpen(false);
            } else {
              setIsSidebarCollapsed(prev => !prev);
              setIsSidebarToggleVisible(false);
            }
          }}
          isMobile={showMobileDashboardNav}
          onRequestClose={() => setIsMobileMenuOpen(false)}
          fixtureData={state.fixtureData}
          surgeryData={state.surgeryData}
          surgeryUnregisteredCount={surgeryUnregisteredCount}
          isAdmin={isHospitalAdmin}
          isMaster={isHospitalMaster || isSystemAdmin}
          plan={effectivePlan}
          hospitalName={state.hospitalName}
          userRole={state.user?.role}
          userPermissions={state.user?.permissions}
          onReturnToAdmin={isSystemAdmin ? () => setState(prev => ({ ...prev, adminViewMode: 'admin' })) : undefined}
          userName={state.user?.name}
          onProfileClick={() => setState(prev => ({ ...prev, showProfile: true }))}
          onUpgrade={onOpenProfilePlan}
          onOpenSupportChat={onOpenSupportChat}
        />
      )}
    </>
  );
};

export default AppSidebarChrome;
