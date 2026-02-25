import React, { Suspense, lazy } from 'react';
import { CLINIC_ROLE_LABELS, HospitalPlanState, InventoryItem, User } from '../../types';
import { ReviewType, ReviewRole } from '../../services/reviewService';
import ErrorBoundary from '../ErrorBoundary';
import OnboardingToast from '../onboarding/OnboardingToast';
import OnboardingCompleteModal from '../OnboardingCompleteModal';

const OnboardingWizard = lazy(() => import('../OnboardingWizard'));
const UserProfile = lazy(() => import('../UserProfile'));
const ReviewPopup = lazy(() => import('../ReviewPopup'));

interface AppUserOverlayStackProps {
  user: User | null;
  showProfile: boolean;
  planState: HospitalPlanState | null;
  hospitalName: string;
  inventory: InventoryItem[];
  reviewPopupType: ReviewType | null;
  shouldShowOnboarding: boolean;
  onboardingStep: number | null;
  showOnboardingToast: boolean;
  onboardingProgress: number;
  onCloseProfile: () => void;
  onLeaveHospital: () => void;
  onDeleteAccount: () => void;
  onChangePlan: () => void;
  onReviewSubmitted: () => void;
  onDismissReview: () => void;
  onOnboardingComplete: () => Promise<void> | void;
  onOnboardingSkip: (snooze: boolean) => void;
  onReopenOnboarding: () => void;
  onGoToDataSetup: (file?: File, sizeCorrections?: Map<string, string>) => void;
  onGoToSurgeryUpload: (file?: File) => Promise<boolean> | boolean;
  onGoToInventoryAudit: () => void;
  onGoToFailManagement: () => void;
  showOnboardingComplete: boolean;
  onOnboardingCompleteClose: () => void;
}

const AppUserOverlayStack: React.FC<AppUserOverlayStackProps> = ({
  user,
  showProfile,
  planState,
  hospitalName,
  inventory,
  reviewPopupType,
  shouldShowOnboarding,
  onboardingStep,
  showOnboardingToast,
  onboardingProgress,
  onCloseProfile,
  onLeaveHospital,
  onDeleteAccount,
  onChangePlan,
  onReviewSubmitted,
  onDismissReview,
  onOnboardingComplete,
  onOnboardingSkip,
  onReopenOnboarding,
  onGoToDataSetup,
  onGoToSurgeryUpload,
  onGoToInventoryAudit,
  onGoToFailManagement,
  showOnboardingComplete,
  onOnboardingCompleteClose,
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
            inventory={inventory}
            onComplete={onOnboardingComplete}
            onSkip={onOnboardingSkip}
            onGoToDataSetup={onGoToDataSetup}
            onGoToSurgeryUpload={onGoToSurgeryUpload}
            onGoToInventoryAudit={onGoToInventoryAudit}
            onGoToFailManagement={onGoToFailManagement}
          />
        </Suspense>
      )}

      {showOnboardingToast && !shouldShowOnboarding && (
        <OnboardingToast
          progress={onboardingProgress}
          onClick={onReopenOnboarding}
        />
      )}

      {showOnboardingComplete && (
        <OnboardingCompleteModal
          onClose={onOnboardingCompleteClose}
          hospitalName={hospitalName || undefined}
          userName={user?.name || undefined}
        />
      )}
    </>
  );
};

export default AppUserOverlayStack;
