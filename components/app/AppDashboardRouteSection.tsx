import React, { Suspense } from 'react';
import type { DashboardTab, PlanType, UploadType, User, UserRole, AppState, BillingProgram } from '../../types';
import { getDashboardTabTitle } from '../dashboard/dashboardTabTitle';
import ErrorBoundary from '../ErrorBoundary';
import BillingProgramGate from '../BillingProgramGate';
import MobileDashboardNav from '../dashboard/MobileDashboardNav';
import DashboardHeader from './DashboardHeader';
import type { DashboardWorkspaceSectionProps } from './DashboardWorkspaceSection';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const DashboardGuardedContent = lazyWithRetry(() => import('./DashboardGuardedContent'));
const SystemAdminDashboard = lazyWithRetry(() => import('../SystemAdminDashboard'));

interface AppDashboardRouteSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  loadHospitalData: (user: User) => Promise<void>;
  handleSignOut: () => Promise<void>;
  suspenseFallback: React.ReactNode;
  dashboardHeaderRef: React.RefObject<HTMLElement | null>;
  fixtureFileRef: React.RefObject<HTMLInputElement | null>;
  surgeryFileRef: React.RefObject<HTMLInputElement | null>;
  isSystemAdmin: boolean;
  isHospitalMaster: boolean;
  isUltimatePlan: boolean;
  effectivePlan: PlanType;
  effectiveAccessRole: UserRole;
  requiresBillingProgramSetup: boolean;
  showMobileDashboardNav: boolean;
  setIsMobileMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  mobileOrderNav: 'order' | 'receipt';
  setMobileOrderNav: React.Dispatch<React.SetStateAction<'order' | 'receipt'>>;
  mobilePrimaryTabs: DashboardTab[];
  processingInvite: boolean;
  handleFileUpload: (file: File, type: UploadType) => Promise<boolean> | boolean;
  setShowAuditHistory: (value: boolean) => void;
  billingProgramSaving: boolean;
  billingProgramError: string;
  handleSelectBillingProgram: (program: BillingProgram) => Promise<void>;
  handleRefreshBillingProgram: () => Promise<void>;
  billableItemCount: number;
  workspaceProps: Omit<DashboardWorkspaceSectionProps, 'state' | 'setState'>;
  onOpenSupportChat: () => void;
}

const AppDashboardRouteSection: React.FC<AppDashboardRouteSectionProps> = ({
  state,
  setState,
  loadHospitalData,
  handleSignOut,
  suspenseFallback,
  dashboardHeaderRef,
  fixtureFileRef,
  surgeryFileRef,
  isSystemAdmin,
  isHospitalMaster,
  isUltimatePlan,
  effectivePlan,
  effectiveAccessRole,
  requiresBillingProgramSetup,
  showMobileDashboardNav,
  setIsMobileMenuOpen,
  mobileOrderNav,
  setMobileOrderNav,
  mobilePrimaryTabs,
  processingInvite,
  handleFileUpload,
  setShowAuditHistory,
  billingProgramSaving,
  billingProgramError,
  handleSelectBillingProgram,
  handleRefreshBillingProgram,
  billableItemCount,
  workspaceProps,
  onOpenSupportChat,
}) => {
  if (requiresBillingProgramSetup) {
    return (
      <BillingProgramGate
        canConfigure={isHospitalMaster}
        isSaving={billingProgramSaving}
        errorMessage={billingProgramError}
        onSubmit={handleSelectBillingProgram}
        onRefresh={handleRefreshBillingProgram}
        onSignOut={handleSignOut}
      />
    );
  }

  if (isSystemAdmin && state.adminViewMode !== 'user') {
    return (
      <ErrorBoundary>
        <Suspense fallback={suspenseFallback}>
          <SystemAdminDashboard
            onLogout={handleSignOut}
            onToggleView={() => setState(prev => ({ ...prev, adminViewMode: 'user' }))}
            onGoHome={() => setState(prev => ({ ...prev, currentView: 'homepage' }))}
          />
        </Suspense>
      </ErrorBoundary>
    );
  }

  return (
    <>
      <DashboardHeader
        dashboardHeaderRef={dashboardHeaderRef}
        fixtureFileRef={fixtureFileRef}
        surgeryFileRef={surgeryFileRef}
        showMobileDashboardNav={showMobileDashboardNav}
        dashboardTab={state.dashboardTab}
        fixtureDataExists={Boolean(state.fixtureData)}
        user={state.user}
        planState={state.planState}
        isUltimatePlan={isUltimatePlan}
        effectivePlan={effectivePlan}
        billableItemCount={billableItemCount}
        memberCount={state.memberCount}
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        onFileUpload={(file, type) => {
          void handleFileUpload(file, type);
        }}
        onOpenAuditHistory={() => setShowAuditHistory(true)}
        onRequestResetFixtureEdit={() => setState(prev => ({
          ...prev,
          fixtureData: null,
          fixtureFileName: null,
          isFixtureLengthExtracted: false,
          fixtureBackup: null,
          selectedFixtureIndices: {},
          dashboardTab: 'fixture_upload',
        }))}
        onOpenProfile={() => setState(prev => ({ ...prev, showProfile: true }))}
        onGoHome={() => setState(prev => ({ ...prev, currentView: 'homepage' }))}
        onLogout={handleSignOut}
        onOpenContactForm={() => setState(prev => ({ ...prev, currentView: 'contact' }))}
        onOpenSupportChat={onOpenSupportChat}
      />
      <main className="flex-1 overflow-x-clip">
        <ErrorBoundary>
          <Suspense fallback={suspenseFallback}>
            {processingInvite ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
                <p className="text-sm text-slate-500 font-medium">초대를 처리하고 있습니다...</p>
              </div>
            ) : (
              <DashboardGuardedContent
                state={state}
                setState={setState}
                isSystemAdmin={isSystemAdmin}
                loadHospitalData={loadHospitalData}
                onLogoutToLanding={handleSignOut}
                workspaceProps={workspaceProps}
              />
            )}
          </Suspense>
        </ErrorBoundary>
      </main>
      {showMobileDashboardNav && (
        <MobileDashboardNav
          mobilePrimaryTabs={mobilePrimaryTabs}
          dashboardTab={state.dashboardTab}
          userPermissions={state.user?.permissions}
          effectiveAccessRole={effectiveAccessRole}
          lastOrderNav={mobileOrderNav}
          onOrderNavChange={setMobileOrderNav}
          onTabChange={(tab) => setState(prev => ({ ...prev, dashboardTab: tab }))}
          getDashboardTabTitle={getDashboardTabTitle}
        />
      )}
    </>
  );
};

export default AppDashboardRouteSection;
