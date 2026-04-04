import type { PlanType } from '../types';
import { PLAN_LIMITS } from '../types';
import { planService } from '../services/planService';
import { serviceEntitlementService } from '../services/serviceEntitlementService';

export async function resolvePlanStateWithEntitlements(hospitalId: string) {
  let planState = await planService.checkPlanExpiry(hospitalId);

  try {
    const subscriptions = await serviceEntitlementService.getHospitalSubscriptions(hospitalId);
    const inventorySub = subscriptions.find((subscription) => subscription.serviceCode === 'implant_inventory');
    if (inventorySub?.servicePlanCode) {
      const entitlementPlan = inventorySub.servicePlanCode as PlanType;
      if (Object.prototype.hasOwnProperty.call(PLAN_LIMITS, entitlementPlan)) {
        planState = { ...planState, plan: entitlementPlan };
      }
    }
  } catch (error) {
    console.warn('[appHospitalPlanState] serviceEntitlementService fallback to planService:', error);
  }

  return planState;
}

export function getSurgeryFromDate(plan: PlanType): string {
  const retentionMonths = PLAN_LIMITS[plan]?.viewMonths ?? 24;
  const effectiveMonths = Math.min(retentionMonths, 24);
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - effectiveMonths);
  return fromDate.toISOString().split('T')[0];
}
