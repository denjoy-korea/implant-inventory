import { useCallback, useMemo } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AppState, BillingCycle, PlanType } from '../types';
import { PLAN_NAMES, PLAN_ORDER } from '../types';
import { planService } from '../services/planService';
import type { AppUserOverlayStackProps } from '../components/app/AppUserOverlayStack';
import type { ReviewType } from '../services/reviewService';
import type { ConfirmModalConfig } from '../stores/uiStore';

type NotifyFn = (message: string, type: 'success' | 'error' | 'info') => void;

interface UseAppUserOverlayPropsParams {
  state: Pick<AppState, 'hospitalName' | 'inventory' | 'planState' | 'showProfile' | 'user'>;
  setState: Dispatch<SetStateAction<AppState>>;
  initialProfileTab: AppUserOverlayStackProps['initialProfileTab'];
  setProfileInitialTab: (value: AppUserOverlayStackProps['initialProfileTab']) => void;
  reviewPopupType: ReviewType | null;
  setReviewPopupType: (value: ReviewType | null) => void;
  shouldShowOnboarding: boolean;
  onboardingStep: number | null;
  showOnboardingToast: boolean;
  onboardingProgress: number;
  toastCompletedLabel: string | null;
  showOnboardingComplete: boolean;
  setConfirmModal: (value: ConfirmModalConfig | null) => void;
  handleDeleteAccount: AppUserOverlayStackProps['onDeleteAccount'];
  handleOpenDirectPayment: (plan: PlanType, billing?: BillingCycle, isRenewal?: boolean) => void;
  showAlertToast: NotifyFn;
  onOnboardingSkip: AppUserOverlayStackProps['onOnboardingSkip'];
  onReopenOnboarding: AppUserOverlayStackProps['onReopenOnboarding'];
  onGoToDataSetup: AppUserOverlayStackProps['onGoToDataSetup'];
  onGoToSurgeryUpload: AppUserOverlayStackProps['onGoToSurgeryUpload'];
  onGoToInventoryAudit: AppUserOverlayStackProps['onGoToInventoryAudit'];
  onGoToFailManagement: AppUserOverlayStackProps['onGoToFailManagement'];
  onOnboardingCompleteClose: AppUserOverlayStackProps['onOnboardingCompleteClose'];
}

export function useAppUserOverlayProps({
  state,
  setState,
  initialProfileTab,
  setProfileInitialTab,
  reviewPopupType,
  setReviewPopupType,
  shouldShowOnboarding,
  onboardingStep,
  showOnboardingToast,
  onboardingProgress,
  toastCompletedLabel,
  showOnboardingComplete,
  setConfirmModal,
  handleDeleteAccount,
  handleOpenDirectPayment,
  showAlertToast,
  onOnboardingSkip,
  onReopenOnboarding,
  onGoToDataSetup,
  onGoToSurgeryUpload,
  onGoToInventoryAudit,
  onGoToFailManagement,
  onOnboardingCompleteClose,
}: UseAppUserOverlayPropsParams): AppUserOverlayStackProps {
  const handleCloseProfile = useCallback(async () => {
    setState(prev => ({ ...prev, showProfile: false }));
    setProfileInitialTab(undefined);
    const hospitalId = state.user?.hospitalId;
    if (!hospitalId) return;
    try {
      const ps = await planService.getHospitalPlan(hospitalId);
      setState(prev => ({ ...prev, planState: ps }));
    } catch {
      // silent
    }
  }, [setProfileInitialTab, setState, state.user?.hospitalId]);

  const handleChangePlan = useCallback(async (plan: PlanType, billing: BillingCycle) => {
    const currentPlan = state.planState?.plan ?? 'free';
    const isDowngrade = PLAN_ORDER[plan] < PLAN_ORDER[currentPlan] && currentPlan !== 'free';

    if (isDowngrade) {
      let creditPreview = 0;
      if (state.user?.hospitalId) {
        creditPreview = await planService.estimateDowngradeCredit(state.user.hospitalId, currentPlan, plan);
      }
      const creditMsg = creditPreview > 0
        ? `약 ${creditPreview.toLocaleString('ko-KR')}원이 크레딧으로 적립됩니다.\n다음 결제 시 원하는 금액만큼 사용할 수 있습니다.`
        : '잔여 구독 금액은 크레딧으로 적립되어 다음 결제 시 사용할 수 있습니다.';

      setConfirmModal({
        title: `${PLAN_NAMES[currentPlan]} → ${PLAN_NAMES[plan]} 다운그레이드`,
        message: `${PLAN_NAMES[plan]} 플랜으로 즉시 전환됩니다.\n${creditMsg}`,
        confirmLabel: '다운그레이드',
        confirmColor: 'amber',
        onConfirm: async () => {
          setConfirmModal(null);
          setState(prev => ({ ...prev, showProfile: false }));
          if (!state.user?.hospitalId) return;
          try {
            const result = await planService.executeDowngrade(state.user.hospitalId, plan, billing);
            const ps = await planService.getHospitalPlan(state.user.hospitalId);
            setState(prev => ({ ...prev, planState: ps }));
            const creditAddedMsg = result.creditAdded > 0
              ? ` ${result.creditAdded.toLocaleString('ko-KR')}원이 크레딧으로 적립되었습니다.`
              : '';
            showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${creditAddedMsg}`, 'success');
          } catch {
            showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
          }
        },
      });
      return;
    }

    setState(prev => ({ ...prev, showProfile: false }));
    handleOpenDirectPayment(plan, billing, plan === currentPlan);
  }, [handleOpenDirectPayment, setConfirmModal, setState, showAlertToast, state.planState?.plan, state.user?.hospitalId]);

  const handleReviewSubmitted = useCallback(() => {
    setReviewPopupType(null);
    showAlertToast('후기를 남겨주셔서 감사합니다!', 'success');
  }, [setReviewPopupType, showAlertToast]);

  const handleDismissReview = useCallback(() => {
    setReviewPopupType(null);
  }, [setReviewPopupType]);

  return useMemo(() => ({
    user: state.user,
    showProfile: state.showProfile,
    initialProfileTab,
    planState: state.planState,
    hospitalName: state.hospitalName,
    inventory: state.inventory,
    reviewPopupType,
    shouldShowOnboarding,
    onboardingStep,
    showOnboardingToast,
    onboardingProgress,
    toastCompletedLabel,
    onCloseProfile: handleCloseProfile,
    onDeleteAccount: handleDeleteAccount,
    onChangePlan: handleChangePlan,
    onReviewSubmitted: handleReviewSubmitted,
    onDismissReview: handleDismissReview,
    onOnboardingSkip,
    onReopenOnboarding,
    onGoToDataSetup,
    onGoToSurgeryUpload,
    onGoToInventoryAudit,
    onGoToFailManagement,
    showOnboardingComplete,
    onOnboardingCompleteClose,
  }), [
    handleChangePlan,
    handleCloseProfile,
    handleDeleteAccount,
    handleDismissReview,
    handleReviewSubmitted,
    initialProfileTab,
    onGoToDataSetup,
    onGoToFailManagement,
    onGoToInventoryAudit,
    onGoToSurgeryUpload,
    onOnboardingCompleteClose,
    onOnboardingSkip,
    onReopenOnboarding,
    onboardingProgress,
    onboardingStep,
    reviewPopupType,
    shouldShowOnboarding,
    showOnboardingComplete,
    showOnboardingToast,
    state.hospitalName,
    state.inventory,
    state.planState,
    state.showProfile,
    state.user,
    toastCompletedLabel,
  ]);
}
