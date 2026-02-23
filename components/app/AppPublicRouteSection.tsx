import React, { Suspense, lazy } from 'react';
import { AppState, HospitalPlanState, PlanType, User, View } from '../../types';
import { ToastType } from '../../hooks/useToast';
import { authService } from '../../services/authService';
import ErrorBoundary from '../ErrorBoundary';

const PublicAppShell = lazy(() => import('./PublicAppShell'));

interface InviteInfo {
  token: string;
  email: string;
  name: string;
  hospitalName: string;
}

interface AppPublicRouteSectionProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  isSystemAdmin: boolean;
  inviteInfo: InviteInfo | null;
  suspenseFallback: React.ReactNode;
  onLoginSuccess: (user: User) => void;
  showAlertToast: (message: string, type: ToastType) => void;
}

const AppPublicRouteSection: React.FC<AppPublicRouteSectionProps> = ({
  state,
  setState,
  isSystemAdmin,
  inviteInfo,
  suspenseFallback,
  onLoginSuccess,
  showAlertToast,
}) => {
  return (
    <ErrorBoundary>
      <Suspense fallback={suspenseFallback}>
        <PublicAppShell
          currentView={state.currentView}
          user={state.user}
          isSystemAdmin={isSystemAdmin}
          preSelectedPlan={state.preSelectedPlan}
          planState={state.planState}
          inviteInfo={inviteInfo}
          mfaPendingEmail={state.mfaPendingEmail}
          onNavigate={(view: View) => setState(prev => ({ ...prev, currentView: view }))}
          onTabNavigate={(tab) => setState(prev => ({ ...prev, currentView: 'dashboard', dashboardTab: tab }))}
          onProfileClick={() => setState(prev => ({ ...prev, showProfile: true }))}
          onLoginSuccess={onLoginSuccess}
          onLogout={() => {
            void authService.signOut().then(() => {
              setState(prev => ({ ...prev, user: null, currentView: 'landing' }));
            });
          }}
          onSetMfaPendingEmail={(email) => setState(prev => ({ ...prev, mfaPendingEmail: email }))}
          onGetStartedWithPlan={(plan?: PlanType) => setState(prev => ({ ...prev, currentView: prev.user ? 'dashboard' : 'signup', preSelectedPlan: plan }))}
          onPlanStateActivated={(planState: HospitalPlanState) => setState(prev => ({ ...prev, planState, currentView: 'dashboard', dashboardTab: 'overview' }))}
          showAlertToast={showAlertToast}
        />
      </Suspense>
    </ErrorBoundary>
  );
};

export default AppPublicRouteSection;
