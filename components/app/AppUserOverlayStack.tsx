import React, { Suspense, lazy } from 'react';
import { CLINIC_ROLE_LABELS, HospitalPlanState, User } from '../../types';
import { ReviewType, ReviewRole } from '../../services/reviewService';
import ErrorBoundary from '../ErrorBoundary';

const OnboardingWizard = lazy(() => import('../OnboardingWizard'));
const UserProfile = lazy(() => import('../UserProfile'));
const ReviewPopup = lazy(() => import('../ReviewPopup'));

interface AppUserOverlayStackProps {
  user: User | null;
  showProfile: boolean;
  planState: HospitalPlanState | null;
  hospitalName: string;
  reviewPopupType: ReviewType | null;
  shouldShowOnboarding: boolean;
  onboardingStep: number | null;
  onCloseProfile: () => void;
  onLeaveHospital: () => void;
  onDeleteAccount: () => void;
  onChangePlan: () => void;
  onReviewSubmitted: () => void;
  onDismissReview: () => void;
  onOnboardingComplete: () => Promise<void> | void;
  onOnboardingSkip: () => void;
  onGoToDataSetup: () => void;
  onGoToSurgeryUpload: () => void;
  onGoToFailManagement: () => void;
}

const AppUserOverlayStack: React.FC<AppUserOverlayStackProps> = ({
  user,
  showProfile,
  planState,
  hospitalName,
  reviewPopupType,
  shouldShowOnboarding,
  onboardingStep,
  onCloseProfile,
  onLeaveHospital,
  onDeleteAccount,
  onChangePlan,
  onReviewSubmitted,
  onDismissReview,
  onOnboardingComplete,
  onOnboardingSkip,
  onGoToDataSetup,
  onGoToSurgeryUpload,
  onGoToFailManagement,
}) => {
  return (
    <>
      {showProfile && user && (
        <ErrorBoundary>
          <Suspense fallback={null}>
            <UserProfile
              user={user}
              planState={planState}
              hospitalName={hospitalName}
              onClose={onCloseProfile}
              onLeaveHospital={onLeaveHospital}
              onDeleteAccount={onDeleteAccount}
              onChangePlan={onChangePlan}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {reviewPopupType && user && (() => {
        const initLastName = user.name ? user.name.charAt(0) : '';
        const initRole = user.clinicRole
          ? CLINIC_ROLE_LABELS[user.clinicRole]
          : user.role === 'master' ? '원장' : undefined;
        const initHospital = hospitalName ?? '';

        return (
          <ErrorBoundary>
            <Suspense fallback={null}>
              <ReviewPopup
                userId={user.id}
                reviewType={reviewPopupType}
                initialLastName={initLastName}
                initialRole={initRole as ReviewRole | undefined}
                initialHospital={initHospital}
                onSubmitted={onReviewSubmitted}
                onSnooze={onDismissReview}
                onClose={onDismissReview}
              />
            </Suspense>
          </ErrorBoundary>
        );
      })()}

      {shouldShowOnboarding && user && (
        <Suspense fallback={null}>
          <OnboardingWizard
            hospitalId={user.hospitalId ?? ''}
            hospitalName={hospitalName ?? user.name}
            initialStep={onboardingStep ?? 1}
            onComplete={onOnboardingComplete}
            onSkip={onOnboardingSkip}
            onGoToDataSetup={onGoToDataSetup}
            onGoToSurgeryUpload={onGoToSurgeryUpload}
            onGoToFailManagement={onGoToFailManagement}
          />
        </Suspense>
      )}
    </>
  );
};

export default AppUserOverlayStack;
