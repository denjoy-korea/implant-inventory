import React from 'react';
import type { PlanType, User, View } from '../../../types';
import { lazyWithRetry } from '../../../utils/lazyWithRetry';
import type { InviteInfo } from '../publicShellRouteTypes';

const AuthForm = lazyWithRetry(() => import('../../AuthForm'));
const MfaOtpScreen = lazyWithRetry(() => import('../../MfaOtpScreen'));

interface PublicAuthRouteSectionProps {
  currentView: View;
  inviteInfo: InviteInfo | null;
  mfaPendingEmail?: string;
  preSelectedPlan?: PlanType;
  onNavigate: (view: View) => void;
  onHandleNavigate: (view: View) => void;
  onLoginSuccess: (user: User) => void;
  onSetMfaPendingEmail: (email?: string) => void;
}

const PublicAuthRouteSection: React.FC<PublicAuthRouteSectionProps> = ({
  currentView,
  inviteInfo,
  mfaPendingEmail,
  preSelectedPlan,
  onNavigate,
  onHandleNavigate,
  onLoginSuccess,
  onSetMfaPendingEmail,
}) => {
  if (currentView === 'login' || currentView === 'signup') {
    return (
      <AuthForm
        key={currentView}
        type={currentView}
        onSuccess={onLoginSuccess}
        onSwitch={() => onNavigate(currentView === 'login' ? 'signup' : 'login')}
        onMfaRequired={currentView === 'login' ? (email) => {
          onSetMfaPendingEmail(email);
          onNavigate('mfa_otp');
        } : undefined}
        onContact={currentView === 'signup' ? () => onNavigate('contact') : undefined}
        initialPlan={currentView === 'signup' ? preSelectedPlan : undefined}
      />
    );
  }

  if (currentView === 'mfa_otp' && mfaPendingEmail) {
    return (
      <MfaOtpScreen
        email={mfaPendingEmail}
        onVerified={() => window.location.reload()}
        onCancel={() => {
          onSetMfaPendingEmail(undefined);
          onHandleNavigate('login');
        }}
      />
    );
  }

  if (currentView === 'invite' && inviteInfo) {
    return (
      <AuthForm
        type="invite"
        inviteInfo={inviteInfo}
        onSuccess={onLoginSuccess}
        onSwitch={() => onHandleNavigate('login')}
      />
    );
  }

  return null;
};

export default PublicAuthRouteSection;
