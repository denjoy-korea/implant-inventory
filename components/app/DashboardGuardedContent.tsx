import React from 'react';
import { AppState, PLAN_NAMES, User } from '../../types';
import PausedAccountScreen from '../PausedAccountScreen';
import StaffWaitingRoom from '../StaffWaitingRoom';
import DashboardWorkspaceSection, { DashboardWorkspaceSectionProps } from './DashboardWorkspaceSection';
import { supabase } from '../../services/supabaseClient';
import { resetService } from '../../services/resetService';

interface DashboardGuardedContentProps {
  state: AppState;
  setState: React.Dispatch<React.SetStateAction<AppState>>;
  isSystemAdmin: boolean;
  loadHospitalData: (user: User) => Promise<void>;
  onLogoutToLanding: () => Promise<void>;
  workspaceProps: Omit<DashboardWorkspaceSectionProps, 'state' | 'setState'>;
}

const DashboardGuardedContent: React.FC<DashboardGuardedContentProps> = ({
  state,
  setState,
  isSystemAdmin,
  loadHospitalData,
  onLogoutToLanding,
  workspaceProps,
}) => {
  if (state.user?.status === 'paused') {
    return (
      <PausedAccountScreen
        userName={state.user.name}
        planName={state.planState ? PLAN_NAMES[state.planState.plan] : 'Free'}
        onResume={async () => {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser || !state.user) return;

          const ok = await resetService.resumeAccount(authUser.id);
          if (!ok) return;

          const updated = { ...state.user, status: 'active' as const };
          setState(prev => ({ ...prev, user: updated, isLoading: true }));
          await loadHospitalData(updated);
        }}
        onCancelPlan={async () => {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (!authUser || !state.user?.hospitalId || !state.user) return;

          const ok = await resetService.cancelPlanAndResume(authUser.id, state.user.hospitalId);
          if (!ok) return;

          const updated = { ...state.user, status: 'active' as const };
          setState(prev => ({ ...prev, user: updated, isLoading: true }));
          await loadHospitalData(updated);
        }}
        onLogout={onLogoutToLanding}
      />
    );
  }

  if (state.user?.role === 'dental_staff' && state.user?.status !== 'active' && state.user?.status !== 'readonly' && !isSystemAdmin) {
    return (
      <StaffWaitingRoom
        currentUser={state.user}
        onUpdateUser={(updatedUser) => setState(prev => ({ ...prev, user: updatedUser }))}
        onLogout={onLogoutToLanding}
      />
    );
  }

  return <DashboardWorkspaceSection state={state} setState={setState} {...workspaceProps} />;
};

export default DashboardGuardedContent;
