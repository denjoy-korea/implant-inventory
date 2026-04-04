import React from 'react';
import type { PublicShellRouteContentProps } from './publicShellRouteTypes';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const PublicAuthRouteSection = lazyWithRetry(() => import('./publicRoutes/PublicAuthRouteSection'));
const PublicServiceHubRouteSection = lazyWithRetry(() => import('./publicRoutes/PublicServiceHubRouteSection'));
const PublicSolutionRouteSection = lazyWithRetry(() => import('./publicRoutes/PublicSolutionRouteSection'));
const PublicBrandRouteSection = lazyWithRetry(() => import('./publicRoutes/PublicBrandRouteSection'));

const PublicShellRouteContent: React.FC<PublicShellRouteContentProps> = (props) => {
  return (
    <>
      <PublicAuthRouteSection
        currentView={props.currentView}
        inviteInfo={props.inviteInfo}
        mfaPendingEmail={props.mfaPendingEmail}
        preSelectedPlan={props.preSelectedPlan}
        onNavigate={props.onNavigate}
        onHandleNavigate={props.onHandleNavigate}
        onLoginSuccess={props.onLoginSuccess}
        onSetMfaPendingEmail={props.onSetMfaPendingEmail}
      />
      <PublicServiceHubRouteSection
        currentView={props.currentView}
        user={props.user}
        hospitalName={props.hospitalName}
        isSystemAdmin={props.isSystemAdmin}
        planState={props.planState}
        onNavigate={props.onNavigate}
        onHandleNavigate={props.onHandleNavigate}
        onProfileClick={props.onProfileClick}
        onLogout={props.onLogout}
      />
      <PublicSolutionRouteSection
        currentView={props.currentView}
        user={props.user}
        isSystemAdmin={props.isSystemAdmin}
        isLoggedIn={props.isLoggedIn}
        planState={props.planState}
        consultationPrefill={props.consultationPrefill}
        onGetStartedWithPlan={props.onGetStartedWithPlan}
        onGoToDenjoyLogin={props.onGoToDenjoyLogin}
        onGoToDenjoySignup={props.onGoToDenjoySignup}
        onHandleNavigate={props.onHandleNavigate}
        onNavigate={props.onNavigate}
        onSetConsultationPrefill={props.onSetConsultationPrefill}
        onPlanSelect={props.onPlanSelect}
        onRequestPayment={props.onRequestPayment}
        onLogout={props.onLogout}
      />
      <PublicBrandRouteSection
        currentView={props.currentView}
        user={props.user}
        isSystemAdmin={props.isSystemAdmin}
        onGoToDenjoyLogin={props.onGoToDenjoyLogin}
        onGoToDenjoySignup={props.onGoToDenjoySignup}
        onHandleNavigate={props.onHandleNavigate}
        onNavigate={props.onNavigate}
        onNavigateToCourse={props.onNavigateToCourse}
        onLogout={props.onLogout}
      />
    </>
  );
};

export default PublicShellRouteContent;
