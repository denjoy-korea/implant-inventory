import React, { Suspense } from 'react';
import { BillingCycle, CLINIC_ROLE_LABELS, HospitalPlanState, InventoryItem, PlanType, User } from '../../types';
import { ReviewType, ReviewRole } from '../../services/reviewService';
import ErrorBoundary from '../ErrorBoundary';
import OnboardingToast from '../onboarding/OnboardingToast';
import OnboardingCompleteModal from '../OnboardingCompleteModal';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const OnboardingWizard = lazyWithRetry(() => import('../OnboardingWizard'));
const UserProfile = lazyWithRetry(() => import('../UserProfile'));
const ReviewPopup = lazyWithRetry(() => import('../ReviewPopup'));

interface AppUserOverlayStackProps {
  user: User | null;
  showProfile: boolean;
  initialProfileTab?: 'info' | 'plan' | 'security' | 'reviews';
  planState: HospitalPlanState | null;
  hospitalName: string;
  inventory: InventoryItem[];
  reviewPopupType: ReviewType | null;
  shouldShowOnboarding: boolean;
  onboardingStep: number | null;
  showOnboardingToast: boolean;
  onboardingProgress: number;
  toastCompletedLabel: string | null;
  onCloseProfile: () => void;
  onDeleteAccount: () => void;
  onChangePlan: (plan: PlanType, billing: BillingCycle) => void;
  onReviewSubmitted: () => void;
  onDismissReview: () => void;
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
  initialProfileTab,
  planState,
  hospitalName,
  inventory,
  reviewPopupType,
  shouldShowOnboarding,
  onboardingStep,
  showOnboardingToast,
  onboardingProgress,
  toastCompletedLabel,
  onCloseProfile,
  onDeleteAccount,
  onChangePlan,
  onReviewSubmitted,
  onDismissReview,
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
              onDeleteAccount={onDeleteAccount}
              onChangePlan={onChangePlan}
              initialTab={initialProfileTab}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {reviewPopupType && user && (() => {
        const initLastName = user.name ? user.name.charAt(0) : '';
        const initRole = user.clinicRole
          ? CLINIC_ROLE_LABELS[user.clinicRole]
          : undefined;
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
            plan={planState?.plan ?? 'free'}
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
          completedLabel={toastCompletedLabel}
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
