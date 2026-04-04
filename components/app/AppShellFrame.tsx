import React from 'react';
import type { DashboardTab, PlanType, UploadType, User, UserRole, AppState, BillingProgram } from '../../types';
import type { ToastType } from '../../hooks/useToast';
import AccountSuspendedScreen from '../AccountSuspendedScreen';
import type { DashboardWorkspaceSectionProps } from './DashboardWorkspaceSection';
import { lazyWithRetry } from '../../utils/lazyWithRetry';
import AppSidebarChrome from './AppSidebarChrome';
import AppDashboardRouteSection from './AppDashboardRouteSection';

const AppPublicRouteSection = lazyWithRetry(() => import('./AppPublicRouteSection'));

interface InviteInfo {
  token: string;
  email: string;
  name: string;
  hospitalName: string;
}

interface AppShellFrameProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  handleLoginSuccess: (user: User) => void;
  handleSignOut: () => Promise<void>;
  showAlertToast: (message: string, type: ToastType) => void;
  suspenseFallback: React.ReactNode;
  dashboardHeaderRef: React.RefObject<HTMLElement | null>;
  fixtureFileRef: React.RefObject<HTMLInputElement | null>;
  surgeryFileRef: React.RefObject<HTMLInputElement | null>;
  isSystemAdmin: boolean;
  isHospitalAdmin: boolean;
  isHospitalMaster: boolean;
  isUltimatePlan: boolean;
  effectivePlan: PlanType;
  effectiveAccessRole: UserRole;
  requiresBillingProgramSetup: boolean;
  showDashboardSidebar: boolean;
  showMobileDashboardNav: boolean;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  isSidebarToggleVisible: boolean;
  setIsSidebarToggleVisible: React.Dispatch<React.SetStateAction<boolean>>;
  isFinePointer: boolean;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOrderNav: 'order' | 'receipt';
  setMobileOrderNav: React.Dispatch<React.SetStateAction<'order' | 'receipt'>>;
  mobilePrimaryTabs: DashboardTab[];
  inviteInfo: InviteInfo | null;
  processingInvite: boolean;
  handleFileUpload: (file: File, type: UploadType) => Promise<boolean> | boolean;
  setShowAuditHistory: (value: boolean) => void;
  billingProgramSaving: boolean;
  billingProgramError: string;
  handleSelectBillingProgram: (program: BillingProgram) => Promise<void>;
  handleRefreshBillingProgram: () => Promise<void>;
  billableItemCount: number;
  surgeryUnregisteredCount: number;
  workspaceProps: Omit<DashboardWorkspaceSectionProps, 'state' | 'setState'>;
  onOpenSupportChat: () => void;
}

const AppShellFrame: React.FC<AppShellFrameProps> = ({
  state,
  setState,
  loadHospitalData,
  handleLoginSuccess,
  handleSignOut,
  showAlertToast,
  suspenseFallback,
  dashboardHeaderRef,
  fixtureFileRef,
  surgeryFileRef,
  isSystemAdmin,
  isHospitalAdmin,
  isHospitalMaster,
  isUltimatePlan,
  effectivePlan,
  effectiveAccessRole,
  requiresBillingProgramSetup,
  showDashboardSidebar,
  showMobileDashboardNav,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  isSidebarToggleVisible,
  setIsSidebarToggleVisible,
  isFinePointer,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  mobileOrderNav,
  setMobileOrderNav,
  mobilePrimaryTabs,
  inviteInfo,
  processingInvite,
  handleFileUpload,
  setShowAuditHistory,
  billingProgramSaving,
  billingProgramError,
  handleSelectBillingProgram,
  handleRefreshBillingProgram,
  billableItemCount,
  surgeryUnregisteredCount,
  workspaceProps,
  onOpenSupportChat,
}) => {
  return (
    <>
      <AppSidebarChrome
        state={state}
        setState={setState}
        showDashboardSidebar={showDashboardSidebar}
        showMobileDashboardNav={showMobileDashboardNav}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isSidebarToggleVisible={isSidebarToggleVisible}
        setIsSidebarToggleVisible={setIsSidebarToggleVisible}
        isFinePointer={isFinePointer}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        effectivePlan={effectivePlan}
        effectiveAccessRole={effectiveAccessRole}
        isHospitalAdmin={isHospitalAdmin}
        isHospitalMaster={isHospitalMaster}
        isSystemAdmin={isSystemAdmin}
        surgeryUnregisteredCount={surgeryUnregisteredCount}
        onOpenSupportChat={onOpenSupportChat}
        onOpenProfilePlan={workspaceProps.onOpenProfilePlan}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {state.currentView === 'suspended' ? (
          <AccountSuspendedScreen userEmail={state.user?.email} onSignOut={handleSignOut} />
        ) : state.currentView === 'dashboard' ? (
          <AppDashboardRouteSection
            state={state}
            setState={setState}
            loadHospitalData={loadHospitalData}
            handleSignOut={handleSignOut}
            suspenseFallback={suspenseFallback}
            dashboardHeaderRef={dashboardHeaderRef}
            fixtureFileRef={fixtureFileRef}
            surgeryFileRef={surgeryFileRef}
            isSystemAdmin={isSystemAdmin}
            isHospitalMaster={isHospitalMaster}
            isUltimatePlan={isUltimatePlan}
            effectivePlan={effectivePlan}
            effectiveAccessRole={effectiveAccessRole}
            requiresBillingProgramSetup={requiresBillingProgramSetup}
            showMobileDashboardNav={showMobileDashboardNav}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            mobileOrderNav={mobileOrderNav}
            setMobileOrderNav={setMobileOrderNav}
            mobilePrimaryTabs={mobilePrimaryTabs}
            processingInvite={processingInvite}
            handleFileUpload={handleFileUpload}
            setShowAuditHistory={setShowAuditHistory}
            billingProgramSaving={billingProgramSaving}
            billingProgramError={billingProgramError}
            handleSelectBillingProgram={handleSelectBillingProgram}
            handleRefreshBillingProgram={handleRefreshBillingProgram}
            billableItemCount={billableItemCount}
            workspaceProps={workspaceProps}
            onOpenSupportChat={onOpenSupportChat}
          />
        ) : (
          <AppPublicRouteSection
            state={state}
            setState={setState}
            isSystemAdmin={isSystemAdmin}
            inviteInfo={inviteInfo}
            suspenseFallback={suspenseFallback}
            onLoginSuccess={handleLoginSuccess}
            showAlertToast={showAlertToast}
          />
        )}
      </div>
    </>
  );
};

export default AppShellFrame;
