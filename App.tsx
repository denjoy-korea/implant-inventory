import React, { useRef, useState } from 'react';
import { useAppState } from './hooks/useAppState';
import { useToast } from './hooks/useToast';
import { usePwaUpdate } from './hooks/usePwaUpdate';
import { useAppLogic } from './hooks/useAppLogic';
import { securityMaintenanceService } from './services/securityMaintenanceService';
import AppShellFrame from './components/app/AppShellFrame';
import AppShellOverlays from './components/app/AppShellOverlays';
import { FileUploadLoadingOverlay } from './components/FileUploadLoadingOverlay';

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
    pendingFailCandidates, handleFailDetectionClose,
    handleSignOut,
    billableItemCount, surgeryUnregisteredItems,
    workspaceProps, userOverlayProps, globalOverlayPartialProps,
  } = useAppLogic({
    state, setState, loadHospitalData, handleDeleteAccount,
    showAlertToast, fixtureFileRef, surgeryFileRef, dashboardHeaderRef,
  });

  // Initial loading screen
  if (state.isLoading && (!state.user || state.currentView === 'login' || state.currentView === 'signup')) {
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
  const openSupportChat = () => setSupportChatOpenRequest((prev) => prev + 1);
  const openContactForm = () => setState(prev => ({ ...prev, currentView: 'contact' }));

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

      <AppShellFrame
        state={state}
        setState={setState}
        loadHospitalData={loadHospitalData}
        handleLoginSuccess={handleLoginSuccess}
        handleSignOut={handleSignOut}
        showAlertToast={showAlertToast}
        suspenseFallback={suspenseFallback}
        dashboardHeaderRef={dashboardHeaderRef}
        fixtureFileRef={fixtureFileRef}
        surgeryFileRef={surgeryFileRef}
        isSystemAdmin={isSystemAdmin}
        isHospitalAdmin={isHospitalAdmin}
        isHospitalMaster={isHospitalMaster}
        isUltimatePlan={isUltimatePlan}
        effectivePlan={effectivePlan}
        effectiveAccessRole={effectiveAccessRole}
        requiresBillingProgramSetup={requiresBillingProgramSetup}
        showDashboardSidebar={showDashboardSidebar}
        showMobileDashboardNav={showMobileDashboardNav}
        isSidebarCollapsed={isSidebarCollapsed}
        setIsSidebarCollapsed={setIsSidebarCollapsed}
        isSidebarToggleVisible={isSidebarToggleVisible}
        setIsSidebarToggleVisible={setIsSidebarToggleVisible}
        isFinePointer={isFinePointer}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        mobileOrderNav={mobileOrderNav}
        setMobileOrderNav={setMobileOrderNav}
        mobilePrimaryTabs={mobilePrimaryTabs}
        inviteInfo={inviteInfo}
        processingInvite={processingInvite}
        handleFileUpload={handleFileUpload}
        setShowAuditHistory={setShowAuditHistory}
        billingProgramSaving={billingProgramSaving}
        billingProgramError={billingProgramError}
        handleSelectBillingProgram={handleSelectBillingProgram}
        handleRefreshBillingProgram={handleRefreshBillingProgram}
        billableItemCount={billableItemCount}
        surgeryUnregisteredCount={surgeryUnregisteredItems.length}
        workspaceProps={workspaceProps}
        onOpenSupportChat={openSupportChat}
      />

      <AppShellOverlays
        currentView={state.currentView}
        user={state.user}
        hospitalName={state.hospitalName}
        effectivePlan={effectivePlan}
        userOverlayProps={userOverlayProps}
        globalOverlayPartialProps={globalOverlayPartialProps}
        directPayment={directPayment}
        setDirectPayment={setDirectPayment}
        refreshPlanState={refreshPlanState}
        showAlertToast={showAlertToast}
        pendingFailCandidates={pendingFailCandidates}
        handleFailDetectionClose={handleFailDetectionClose}
        showMobileDashboardNav={showMobileDashboardNav}
        showMobilePublicNav={showMobilePublicNav}
        onOpenContactForm={openContactForm}
        supportChatOpenRequest={supportChatOpenRequest}
        pwaUpdate={pwaUpdate}
        alertToast={alertToast}
      />
    </div>
  );
};

export default App;
