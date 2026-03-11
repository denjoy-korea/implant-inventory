import React, { Suspense, useRef, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { useToast } from './hooks/useToast';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import { useAppLogic } from './hooks/useAppLogic';
import { canAccessTab } from './types';
import { securityMaintenanceService } from './services/securityMaintenanceService';
import { authService } from './services/authService';
import { getDashboardTabTitle } from './components/dashboard/dashboardTabTitle';
import Sidebar from './components/Sidebar';
import ErrorBoundary from './components/ErrorBoundary';
import BillingProgramGate from './components/BillingProgramGate';
import MobileDashboardNav from './components/dashboard/MobileDashboardNav';
import AppGlobalOverlays from './components/app/AppGlobalOverlays';
import DashboardHeader from './components/app/DashboardHeader';
import AccountSuspendedScreen from './components/AccountSuspendedScreen';
import { FileUploadLoadingOverlay } from './components/FileUploadLoadingOverlay';
import { lazyWithRetry } from './utils/lazyWithRetry';

/* ── Lazy imports ── */
const FailDetectionModal = lazyWithRetry(() => import('./components/fail/FailDetectionModal'));
const DashboardGuardedContent = lazyWithRetry(() => import('./components/app/DashboardGuardedContent'));
const AppPublicRouteSection = lazyWithRetry(() => import('./components/app/AppPublicRouteSection'));
const SystemAdminDashboard = lazyWithRetry(() => import('./components/SystemAdminDashboard'));
const AppUserOverlayStack = lazyWithRetry(() => import('./components/app/AppUserOverlayStack'));
const DirectPaymentModal = lazyWithRetry(() => import('./components/DirectPaymentModal'));
const SupportChatWidget = lazyWithRetry(() => import('./components/support/SupportChatWidget'));

declare global {
  // eslint-disable-next-line no-var
  var __securityMaintenanceService: typeof securityMaintenanceService | undefined;
}

// Dev convenience: expose maintenance helpers
if (import.meta.env.DEV) {
  globalThis.__securityMaintenanceService = securityMaintenanceService;
}

const App: React.FC = () => {
  const fixtureFileRef = useRef<HTMLInputElement>(null);
  const surgeryFileRef = useRef<HTMLInputElement>(null);
  const dashboardHeaderRef = useRef<HTMLElement>(null);
  const [supportChatOpenRequest, setSupportChatOpenRequest] = useState(0);

  const { toast: alertToast, showToast: showAlertToast } = useToast(3500);
  const { state, setState, loadHospitalData, handleLoginSuccess, handleDeleteAccount } = useAppState(showAlertToast);
  const pwaUpdate = usePwaUpdate(state.currentView);

  const {
    isSystemAdmin, isHospitalAdmin, isHospitalMaster, isUltimatePlan, effectivePlan,
    effectiveAccessRole, requiresBillingProgramSetup, showDashboardSidebar,
    isOffline, showMobileDashboardNav, showMobilePublicNav, dashboardHeaderHeight,
    isSidebarCollapsed, setIsSidebarCollapsed, isSidebarToggleVisible, setIsSidebarToggleVisible,
    isFinePointer, isMobileMenuOpen, setIsMobileMenuOpen,
    mobileOrderNav, setMobileOrderNav, mobilePrimaryTabs,
    inviteInfo, processingInvite, uploadingTypeRef, handleFileUpload, setShowAuditHistory,
    directPayment, setDirectPayment, refreshPlanState,
    billingProgramSaving, billingProgramError, handleSelectBillingProgram, handleRefreshBillingProgram,
    pendingFailCandidates, setPendingFailCandidates, handleFailDetectionClose,
    billableItemCount, surgeryUnregisteredItems,
    workspaceProps, userOverlayProps, globalOverlayPartialProps,
  } = useAppLogic({
    state, setState, loadHospitalData, handleDeleteAccount,
    showAlertToast, fixtureFileRef, surgeryFileRef, dashboardHeaderRef,
  });

  // Initial loading screen
  if (state.isLoading && !state.user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  const suspenseFallback = (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
    </div>
  );

  const signOut = async () => { await authService.signOut(); setState(prev => ({ ...prev, user: null, currentView: 'landing' })); };

  return (
    <div
      className="min-h-screen bg-slate-50 flex"
      style={{ ['--dashboard-header-height' as string]: `${dashboardHeaderHeight}px` } as React.CSSProperties}
    >
      {state.isLoading && state.user && uploadingTypeRef.current !== null && (
        <FileUploadLoadingOverlay type={uploadingTypeRef.current} />
      )}

      {isOffline && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[240] px-3 py-2 rounded-xl bg-amber-500 text-white text-xs font-black shadow-lg">
          오프라인 모드: 연결 후 자동 동기화됩니다.
        </div>
      )}

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
          onTabChange={(tab) => {
            if (!canAccessTab(tab, state.user?.permissions, effectiveAccessRole)) return;
            setState(prev => ({ ...prev, dashboardTab: tab }));
            if (showMobileDashboardNav) setIsMobileMenuOpen(false);
          }}
          isCollapsed={showMobileDashboardNav ? true : isSidebarCollapsed}
          onToggleCollapse={() => {
            if (showMobileDashboardNav) { setIsMobileMenuOpen(false); }
            else { setIsSidebarCollapsed(prev => !prev); setIsSidebarToggleVisible(false); }
          }}
          isMobile={showMobileDashboardNav}
          onRequestClose={() => setIsMobileMenuOpen(false)}
          fixtureData={state.fixtureData}
          surgeryData={state.surgeryData}
          surgeryUnregisteredCount={surgeryUnregisteredItems.length}
          isAdmin={isHospitalAdmin}
          isMaster={isHospitalMaster || isSystemAdmin}
          plan={effectivePlan}
          hospitalName={state.hospitalName}
          userRole={state.user?.role}
          userPermissions={state.user?.permissions}
          onReturnToAdmin={isSystemAdmin ? () => setState(prev => ({ ...prev, adminViewMode: 'admin' })) : undefined}
          userName={state.user?.name}
          onProfileClick={() => setState(prev => ({ ...prev, showProfile: true }))}
          onUpgrade={workspaceProps.onOpenProfilePlan}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {state.currentView === 'suspended' ? (
          <AccountSuspendedScreen userEmail={state.user?.email} onSignOut={signOut} />
        ) : state.currentView === 'dashboard' ? (
          requiresBillingProgramSetup ? (
            <BillingProgramGate
              canConfigure={isHospitalMaster}
              isSaving={billingProgramSaving}
              errorMessage={billingProgramError}
              onSubmit={handleSelectBillingProgram}
              onRefresh={handleRefreshBillingProgram}
              onSignOut={signOut}
            />
          ) : isSystemAdmin && state.adminViewMode !== 'user' ? (
            <ErrorBoundary>
              <Suspense fallback={suspenseFallback}>
                <SystemAdminDashboard
                  onLogout={signOut}
                  onToggleView={() => setState(prev => ({ ...prev, adminViewMode: 'user' }))}
                  onGoHome={() => setState(prev => ({ ...prev, currentView: 'landing' }))}
                />
              </Suspense>
            </ErrorBoundary>
          ) : (
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
                onFileUpload={(file, type) => handleFileUpload(file, type)}
                onOpenAuditHistory={() => setShowAuditHistory(true)}
                onRequestResetFixtureEdit={() => setState(prev => ({
                  ...prev, fixtureData: null, fixtureFileName: null,
                  isFixtureLengthExtracted: false, fixtureBackup: null,
                  selectedFixtureIndices: {}, dashboardTab: 'fixture_upload',
                }))}
                onOpenProfile={() => setState(prev => ({ ...prev, showProfile: true }))}
                onGoHome={() => setState(prev => ({ ...prev, currentView: 'landing' }))}
                onLogout={signOut}
                onOpenContactForm={() => setState(prev => ({ ...prev, currentView: 'contact' }))}
                onOpenSupportChat={() => setSupportChatOpenRequest((prev) => prev + 1)}
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
                        onLogoutToLanding={signOut}
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
          )
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

      <Suspense fallback={null}>
        <AppUserOverlayStack {...userOverlayProps} />
      </Suspense>

      {directPayment && (
        <Suspense fallback={null}>
          <DirectPaymentModal
            plan={directPayment.plan}
            billing={directPayment.billing}
            user={state.user}
            hospitalName={state.hospitalName}
            planState={state.planState}
            onDismiss={() => setDirectPayment(null)}
            onSuccess={async () => { await refreshPlanState(); setDirectPayment(null); }}
          />
        </Suspense>
      )}

      {pendingFailCandidates.length > 0 && state.user?.hospitalId && (
        <Suspense fallback={null}>
          <FailDetectionModal
            candidates={pendingFailCandidates}
            hospitalId={state.user.hospitalId}
            currentUserName={state.user.name}
            onClose={handleFailDetectionClose}
          />
        </Suspense>
      )}

      {state.user && state.user.role !== 'admin' && state.currentView !== 'suspended' && (
        <Suspense fallback={null}>
          <SupportChatWidget
            user={state.user}
            hospitalName={state.hospitalName}
            plan={effectivePlan}
            liftForBottomNav={showMobileDashboardNav || showMobilePublicNav}
            onOpenContactForm={() => setState(prev => ({ ...prev, currentView: 'contact' }))}
            openRequestToken={supportChatOpenRequest}
          />
        </Suspense>
      )}

      <AppGlobalOverlays
        {...globalOverlayPartialProps}
        pwaUpdateBar={{
          isVisible: pwaUpdate.shouldShowPrompt,
          isForceUpdate: pwaUpdate.forceUpdate,
          message: pwaUpdate.message,
          isApplying: pwaUpdate.isApplying,
          onApply: pwaUpdate.applyUpdate,
          onLater: pwaUpdate.deferUpdate,
        }}
        alertToast={alertToast}
      />
    </div>
  );
};

export default App;
