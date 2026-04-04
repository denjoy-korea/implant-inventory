import { useState } from 'react';
import {
  BillingCycle,
  HospitalPlanState,
  PlanType,
  PLAN_LIMITS,
  PLAN_NAMES,
  PLAN_ORDER,
  User,
} from '../types';
import { ToastType } from './useToast';
import { hospitalService } from '../services/hospitalService';
import { buildPlanPaymentQuote } from '../services/planPaymentQuote';
import { tossPaymentService } from '../services/tossPaymentService';
import { planService } from '../services/planService';

type PendingPlanChange = { plan: PlanType; billing: BillingCycle } | null;
type DowngradeCreditDetail = Awaited<ReturnType<typeof planService.estimateDowngradeCreditDetail>>;

interface UsePublicPlanActionsOptions {
  user: User | null;
  planState: HospitalPlanState | null;
  onPlanStateActivated: (planState: HospitalPlanState) => void;
  showAlertToast: (message: string, type: ToastType) => void;
}

export function usePublicPlanActions({
  user,
  planState,
  onPlanStateActivated,
  showAlertToast,
}: UsePublicPlanActionsOptions) {
  const hospitalId = user?.hospitalId;
  const [downgradePending, setDowngradePending] = useState<PendingPlanChange>(null);
  const [downgradeCreditDetail, setDowngradeCreditDetail] = useState<DowngradeCreditDetail>(null);
  const [memberSelectPending, setMemberSelectPending] = useState<PendingPlanChange>(null);

  const refreshPlanState = async () => {
    if (!hospitalId) return;
    const nextPlanState = await planService.getHospitalPlan(hospitalId);
    onPlanStateActivated(nextPlanState);
  };

  const executePlanChange = async (
    plan: PlanType,
    billing: BillingCycle,
    memberIdsToSuspend?: string[],
  ) => {
    if (!hospitalId) return;

    try {
      const ok = await planService.changePlan(hospitalId, plan, billing, memberIdsToSuspend);
      if (ok) {
        await refreshPlanState();
        const suspendCount = memberIdsToSuspend?.length ?? 0;
        const memberNote = suspendCount > 0
          ? ` ${suspendCount}명의 멤버 접근이 제한되었습니다.`
          : '';
        showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${memberNote}`, 'success');
        return;
      }

      showAlertToast('플랜 변경 권한이 없습니다. 병원 관리자만 플랜을 변경할 수 있습니다.', 'error');
    } catch (err) {
      console.error('[usePublicPlanActions] Plan change error:', err);
      showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const handlePlanSelect = hospitalId
    ? async (plan: PlanType, billing: BillingCycle) => {
      const currentPlan = planState?.plan ?? 'free';

      if (plan === currentPlan && currentPlan !== 'free') {
        const paymentQuote = buildPlanPaymentQuote({
          plan,
          billingCycle: billing,
          creditBalance: planState?.creditBalance ?? 0,
          creditUsedAmount: planState?.creditBalance ?? 0,
        });
        const result = await tossPaymentService.requestPayment({
          hospitalId,
          plan,
          billingCycle: billing,
          customerName: user?.name || '',
          paymentMethod: 'card',
          creditUsedAmount: paymentQuote.appliedCreditBalance || undefined,
        });
        if (result.error && result.error !== 'user_cancel') {
          showAlertToast(result.error, 'error');
        }
        return;
      }

      const isDowngrade = PLAN_ORDER[plan] < PLAN_ORDER[currentPlan];
      if (isDowngrade) {
        const creditDetail = await planService.estimateDowngradeCreditDetail(hospitalId, currentPlan, plan);
        setDowngradeCreditDetail(creditDetail);
        setDowngradePending({ plan, billing });
        return;
      }

      await executePlanChange(plan, billing);
    }
    : undefined;

  const handleRequestPayment = hospitalId
    ? async (
      plan: PlanType,
      billing: BillingCycle,
      contactName: string,
      _contactPhone: string,
      paymentMethod: 'card' | 'transfer',
      _receiptType?: 'cash_receipt' | 'tax_invoice'
    ) => {
      const result = await tossPaymentService.requestPayment({
        hospitalId,
        plan,
        billingCycle: billing,
        customerName: contactName.trim(),
        paymentMethod,
      });

      if (result.error && result.error !== 'user_cancel') {
        throw new Error(result.error);
      }
      if (result.error === 'user_cancel') {
        return false;
      }
      return true;
    }
    : undefined;

  const confirmDowngrade = async () => {
    if (!downgradePending || !hospitalId) return;

    const { plan, billing } = downgradePending;
    setDowngradePending(null);

    const newMaxUsers = PLAN_LIMITS[plan].maxUsers;
    if (newMaxUsers !== Infinity) {
      const count = await hospitalService.getActiveMemberCount(hospitalId);
      if (count > newMaxUsers) {
        setMemberSelectPending({ plan, billing });
        return;
      }
    }

    try {
      const result = await planService.executeDowngrade(hospitalId, plan, billing);
      await refreshPlanState();
      const creditMsg = result.creditAdded > 0
        ? ` ${result.creditAdded.toLocaleString('ko-KR')}원이 크레딧으로 적립되었습니다.`
        : '';
      showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${creditMsg}`, 'success');
    } catch {
      showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
  };

  const confirmMemberSelection = async (memberIdsToSuspend: string[]) => {
    if (!memberSelectPending || !hospitalId) return;

    const { plan, billing } = memberSelectPending;
    setMemberSelectPending(null);

    try {
      const result = await planService.executeDowngrade(hospitalId, plan, billing);
      await planService.suspendMembersForDowngrade(hospitalId, memberIdsToSuspend);
      await refreshPlanState();

      const creditMsg = result.creditAdded > 0
        ? ` ${result.creditAdded.toLocaleString('ko-KR')}원이 크레딧으로 적립되었습니다.`
        : '';
      const memberNote = memberIdsToSuspend.length > 0
        ? ` ${memberIdsToSuspend.length}명의 멤버 접근이 제한되었습니다.`
        : '';
      showAlertToast(`${PLAN_NAMES[plan]} 플랜으로 변경되었습니다.${creditMsg}${memberNote}`, 'success');
    } catch {
      showAlertToast('플랜 변경 중 오류가 발생했습니다. 다시 시도해주세요.', 'error');
    }
  };

  return {
    downgradePending,
    setDowngradePending,
    downgradeCreditDetail,
    memberSelectPending,
    setMemberSelectPending,
    handlePlanSelect,
    handleRequestPayment,
    confirmDowngrade,
    confirmMemberSelection,
  };
}
