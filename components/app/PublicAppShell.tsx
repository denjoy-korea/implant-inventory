import React from 'react';
import {
  DashboardTab,
  HospitalPlanState,
  PlanType,
  User,
  View,
} from '../../types';
import { ToastType } from '../../hooks/useToast';
import { usePublicShellNavigation } from '../../hooks/usePublicShellNavigation';
import { usePublicShellSurface } from '../../hooks/usePublicShellSurface';
import PublicShellRouteContent from './PublicShellRouteContent';
import PublicShellChrome from './PublicShellChrome';
import type { InviteInfo } from './publicShellRouteTypes';

interface PublicAppShellProps {
  currentView: View;
  user: User | null;
  hospitalName: string;
  isSystemAdmin: boolean;
  preSelectedPlan?: PlanType;
  planState: HospitalPlanState | null;
  userCreditBalance?: number;
  inviteInfo: InviteInfo | null;
  mfaPendingEmail?: string;
  onNavigate: (view: View) => void;
  onTabNavigate: (tab: DashboardTab) => void;
  onProfileClick: () => void;
  onLoginSuccess: (user: User) => void;
  onLogout: () => void | Promise<void>;
  onSetMfaPendingEmail: (email?: string) => void;
  onGetStartedWithPlan: (plan?: PlanType) => void;
  onPlanStateActivated: (planState: HospitalPlanState) => void;
  showAlertToast: (message: string, type: ToastType) => void;
}

const suspenseFallback = (
  <div className="flex items-center justify-center py-20">
    <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
  </div>
);

const PublicAppShell: React.FC<PublicAppShellProps> = ({
  currentView,
  user,
  hospitalName,
  isSystemAdmin,
  preSelectedPlan,
  planState,
  userCreditBalance = 0,
  inviteInfo,
  mfaPendingEmail,
  onNavigate,
  onTabNavigate,
  onProfileClick,
  onLoginSuccess,
  onLogout,
  onSetMfaPendingEmail,
  onGetStartedWithPlan,
  onPlanStateActivated,
  showAlertToast,
}) => {
  const {
    goToDenjoyLogin,
    goToDenjoySignup,
    handleNavigate,
    handleAnalyzeEntry,
    handleNavigateToCourse,
  } = usePublicShellNavigation({
    currentView,
    onNavigate,
  });
  const {
    isLoggedIn,
    isBrandPage,
    isServiceHubPage,
    usesHomepageHeader,
    hasPublicMobileBottomOffset,
    consultationPrefill,
    setConsultationPrefill,
    meta,
    downgradePending,
    setDowngradePending,
    downgradeDiff,
    downgradeCreditMsg,
    memberSelectPending,
    setMemberSelectPending,
    handlePlanSelect,
    handleRequestPayment,
    confirmDowngrade,
    confirmMemberSelection,
  } = usePublicShellSurface({
    currentView,
    user,
    planState,
    onPlanStateActivated,
    showAlertToast,
  });

  return (
    <PublicShellChrome
      currentView={currentView}
      user={user}
      isSystemAdmin={isSystemAdmin}
      isBrandPage={isBrandPage}
      isServiceHubPage={isServiceHubPage}
      usesHomepageHeader={usesHomepageHeader}
      hasPublicMobileBottomOffset={hasPublicMobileBottomOffset}
      meta={meta}
      downgradePending={downgradePending}
      downgradeDiff={downgradeDiff}
      downgradeCreditMsg={downgradeCreditMsg}
      memberSelectPending={memberSelectPending}
      planState={planState}
      suspenseFallback={suspenseFallback}
      onNavigate={handleNavigate}
      onTabNavigate={onTabNavigate}
      onProfileClick={onProfileClick}
      onLogout={onLogout}
      onGoToDenjoyLogin={goToDenjoyLogin}
      onGoToDenjoySignup={goToDenjoySignup}
      onAnalyzeEntry={handleAnalyzeEntry}
      confirmDowngrade={confirmDowngrade}
      confirmMemberSelection={confirmMemberSelection}
      setDowngradePending={setDowngradePending}
      setMemberSelectPending={setMemberSelectPending}
    >
      <PublicShellRouteContent
        currentView={currentView}
        user={user}
        hospitalName={hospitalName}
        isSystemAdmin={isSystemAdmin}
        isLoggedIn={isLoggedIn}
        preSelectedPlan={preSelectedPlan}
        planState={planState}
        userCreditBalance={userCreditBalance}
        inviteInfo={inviteInfo}
        mfaPendingEmail={mfaPendingEmail}
        consultationPrefill={consultationPrefill}
        onNavigate={onNavigate}
        onLoginSuccess={onLoginSuccess}
        onLogout={onLogout}
        onSetMfaPendingEmail={onSetMfaPendingEmail}
        onGetStartedWithPlan={onGetStartedWithPlan}
        onGoToDenjoyLogin={goToDenjoyLogin}
        onGoToDenjoySignup={goToDenjoySignup}
        onHandleNavigate={handleNavigate}
        onNavigateToCourse={handleNavigateToCourse}
        onProfileClick={onProfileClick}
        onSetConsultationPrefill={setConsultationPrefill}
        onPlanSelect={handlePlanSelect}
        onRequestPayment={handleRequestPayment}
      />
    </PublicShellChrome>
  );
};

export default PublicAppShell;
