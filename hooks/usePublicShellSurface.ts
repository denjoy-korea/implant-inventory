import { useMemo, useState } from 'react';
import type { HospitalPlanState, PlanType, User, View } from '../types';
import type { ToastType } from './useToast';
import { usePublicPlanActions } from './usePublicPlanActions';
import {
  isBrandView,
  isServiceHubView,
  usesHomepageHeaderShell,
  usesPublicBottomOffset,
} from '../types/app';
import {
  buildPublicShellDowngradeCreditMessage,
  buildPublicShellDowngradeDiff,
  getPublicShellMeta,
} from '../components/app/publicShellMeta';
import type { ConsultationPrefill } from '../components/app/publicShellRouteTypes';

interface UsePublicShellSurfaceParams {
  currentView: View;
  user: User | null;
  planState: HospitalPlanState | null;
  onPlanStateActivated: (planState: HospitalPlanState) => void;
  showAlertToast: (message: string, type: ToastType) => void;
}

export function usePublicShellSurface({
  currentView,
  user,
  planState,
  onPlanStateActivated,
  showAlertToast,
}: UsePublicShellSurfaceParams) {
  const [consultationPrefill, setConsultationPrefill] = useState<ConsultationPrefill>({ email: '' });

  const {
    downgradePending,
    setDowngradePending,
    downgradeCreditDetail,
    memberSelectPending,
    setMemberSelectPending,
    handlePlanSelect,
    handleRequestPayment,
    confirmDowngrade,
    confirmMemberSelection,
  } = usePublicPlanActions({
    user,
    planState,
    onPlanStateActivated,
    showAlertToast,
  });

  const meta = useMemo(() => getPublicShellMeta(currentView), [currentView]);
  const downgradeDiff = useMemo(() => (
    downgradePending
      ? buildPublicShellDowngradeDiff(planState?.plan ?? 'free', downgradePending.plan)
      : null
  ), [downgradePending, planState?.plan]);
  const downgradeCreditMsg = useMemo(() => (
    buildPublicShellDowngradeCreditMessage(downgradeCreditDetail, downgradePending?.plan)
  ), [downgradeCreditDetail, downgradePending?.plan]);

  return {
    isLoggedIn: Boolean(user),
    isBrandPage: isBrandView(currentView),
    isServiceHubPage: isServiceHubView(currentView),
    usesHomepageHeader: usesHomepageHeaderShell(currentView),
    hasPublicMobileBottomOffset: usesPublicBottomOffset(currentView),
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
  };
}
