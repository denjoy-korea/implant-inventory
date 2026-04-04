import { useMemo } from 'react';
import type { AppState, PlanType } from '../types';
import { PLAN_LIMITS, isSystemAdminRole } from '../types';
import type { NudgeType } from '../components/UpgradeNudge';
import { isExchangePrefix } from '../services/appUtils';

interface UseAppRolePlanContextParams {
  state: Pick<AppState, 'hospitalMasterAdminId' | 'inventory' | 'orders' | 'planState' | 'user'>;
}

export function useAppRolePlanContext({ state }: UseAppRolePlanContextParams) {
  const isSystemAdmin = isSystemAdminRole(state.user?.role, state.user?.email);
  const isHospitalMaster = state.user?.role === 'master'
    || (!!state.user?.id && state.user.id === state.hospitalMasterAdminId);
  const isHospitalAdmin = isHospitalMaster || isSystemAdmin;
  const effectiveAccessRole = (isHospitalMaster || isSystemAdmin) ? 'master' : (state.user?.role ?? 'dental_staff');
  const isUltimatePlan = isSystemAdmin || state.planState?.plan === 'ultimate';
  const effectivePlan: PlanType = isUltimatePlan ? 'ultimate' : (state.planState?.plan ?? 'free');
  const isReadOnly = state.user?.status === 'readonly';

  const billableItemCount = useMemo(
    () => state.inventory.filter(item => !isExchangePrefix(item.manufacturer) && item.manufacturer !== '보험청구').length,
    [state.inventory],
  );
  const failOrderCount = useMemo(
    () => state.orders.filter(order => order.type === 'fail_exchange').length,
    [state.orders],
  );
  const activeNudge = useMemo<NudgeType | null>(() => {
    const planState = state.planState;
    if (!planState) return null;
    if (planState.plan === 'free' && planState.trialUsed && !planState.isTrialActive) return 'trial_expired';
    if (planState.plan === 'free' && !planState.trialUsed && planState.expiresAt && new Date(planState.expiresAt) < new Date()) return 'subscription_expired';
    if (planState.isTrialActive && planState.trialDaysRemaining <= 3) return 'trial_ending';
    if (planState.plan === 'free' && !planState.isTrialActive && planState.retentionDaysLeft !== undefined && planState.retentionDaysLeft <= 7) return 'data_expiry_warning';
    if (planState.plan === 'free' && !planState.isTrialActive && billableItemCount >= PLAN_LIMITS.free.maxItems * 0.9) return 'item_limit_warning';
    if (planState.plan === 'free' && !planState.isTrialActive && planState.uploadLimitExceeded === true) return 'upload_limit';
    if (planState.plan === 'free' && !planState.isTrialActive && failOrderCount > 0) return 'fail_locked';
    return null;
  }, [billableItemCount, failOrderCount, state.planState]);

  return {
    isSystemAdmin,
    isHospitalMaster,
    isHospitalAdmin,
    effectiveAccessRole,
    isUltimatePlan,
    effectivePlan,
    isReadOnly,
    billableItemCount,
    failOrderCount,
    activeNudge,
  };
}
