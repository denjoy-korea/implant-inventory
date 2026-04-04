import React, { Suspense } from 'react';
import type { AppState, FailCandidate, PlanType } from '../../types';
import { PLAN_NAMES } from '../../types/plan';
import type { Toast, ToastType } from '../../hooks/useToast';
import type { UsePwaUpdateResult } from '../../hooks/usePwaUpdate';
import type { DirectPaymentConfig } from '../../stores/paymentStore';
import AppGlobalOverlays, { type AppGlobalOverlaysProps } from './AppGlobalOverlays';
import type { AppUserOverlayStackProps } from './AppUserOverlayStack';
import { lazyWithRetry } from '../../utils/lazyWithRetry';

const FailDetectionModal = lazyWithRetry(() => import('../fail/FailDetectionModal'));
const AppUserOverlayStack = lazyWithRetry(() => import('./AppUserOverlayStack'));
const DirectPaymentModal = lazyWithRetry(() => import('../DirectPaymentModal'));
const SupportChatWidget = lazyWithRetry(() => import('../support/SupportChatWidget'));

type GlobalOverlayPartialProps = Omit<AppGlobalOverlaysProps, 'pwaUpdateBar' | 'alertToast'>;

interface AppShellOverlaysProps {
  currentView: AppState['currentView'];
  user: AppState['user'];
  hospitalName: string;
  effectivePlan: PlanType;
  userOverlayProps: AppUserOverlayStackProps;
  globalOverlayPartialProps: GlobalOverlayPartialProps;
  directPayment: DirectPaymentConfig | null;
  setDirectPayment: (value: DirectPaymentConfig | null) => void;
  refreshPlanState: () => Promise<void>;
  showAlertToast: (message: string, type: ToastType) => void;
  pendingFailCandidates: FailCandidate[];
  handleFailDetectionClose: () => void;
  showMobileDashboardNav: boolean;
  showMobilePublicNav: boolean;
  onOpenContactForm: () => void;
  supportChatOpenRequest: number;
  pwaUpdate: UsePwaUpdateResult;
  alertToast: Toast | null;
}

const AppShellOverlays: React.FC<AppShellOverlaysProps> = ({
  currentView,
  user,
  hospitalName,
  effectivePlan,
  userOverlayProps,
  globalOverlayPartialProps,
  directPayment,
  setDirectPayment,
  refreshPlanState,
  showAlertToast,
  pendingFailCandidates,
  handleFailDetectionClose,
  showMobileDashboardNav,
  showMobilePublicNav,
  onOpenContactForm,
  supportChatOpenRequest,
  pwaUpdate,
  alertToast,
}) => {
  return (
    <>
      <Suspense fallback={null}>
        <AppUserOverlayStack {...userOverlayProps} />
      </Suspense>

      {directPayment && (
        <Suspense fallback={null}>
          <DirectPaymentModal
            plan={directPayment.plan}
            billing={directPayment.billing}
            user={user}
            hospitalName={hospitalName}
            planState={userOverlayProps.planState}
            onDismiss={() => setDirectPayment(null)}
            onSuccess={async () => {
              await refreshPlanState();
              if (directPayment.isRenewal && directPayment.plan) {
                showAlertToast(`${PLAN_NAMES[directPayment.plan]} 플랜이 갱신되었습니다.`, 'success');
              }
              setDirectPayment(null);
            }}
          />
        </Suspense>
      )}

      {pendingFailCandidates.length > 0 && user?.hospitalId && (
        <Suspense fallback={null}>
          <FailDetectionModal
            candidates={pendingFailCandidates}
            hospitalId={user.hospitalId}
            currentUserName={user.name}
            onClose={handleFailDetectionClose}
          />
        </Suspense>
      )}

      {user && user.role !== 'admin' && currentView !== 'suspended' && (
        <Suspense fallback={null}>
          <SupportChatWidget
            user={user}
            hospitalName={hospitalName}
            plan={effectivePlan}
            liftForBottomNav={showMobileDashboardNav || showMobilePublicNav}
            onOpenContactForm={onOpenContactForm}
            openRequestToken={supportChatOpenRequest}
            hideLauncher
          />
        </Suspense>
      )}

      <AppGlobalOverlays
        {...globalOverlayPartialProps}
        pwaUpdateBar={{
          isVisible: pwaUpdate.shouldShowPrompt,
          isForceUpdate: pwaUpdate.forceUpdate,
          message: pwaUpdate.message,
          isApplying: pwaUpdate.isApplying,
          onApply: pwaUpdate.applyUpdate,
          onLater: pwaUpdate.deferUpdate,
        }}
        alertToast={alertToast}
      />
    </>
  );
};

export default AppShellOverlays;
