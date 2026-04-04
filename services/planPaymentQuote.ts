import { BillingCycle, PlanType, PLAN_NAMES, PLAN_PRICING } from '../types';

export interface PlanPaymentQuoteInput {
  plan: PlanType;
  billingCycle: BillingCycle;
  couponDiscountAmount?: number | null;
  upgradeCreditAmount?: number | null;
  upgradeSourceBillingId?: string | null;
  creditBalance?: number | null;
  creditUsedAmount?: number | null;
}

export interface PlanPaymentQuote {
  monthlyPrice: number;
  baseAmount: number;
  vatAmount: number;
  originalTotalAmount: number;
  couponDiscountAmount: number;
  baseAfterCoupon: number;
  totalAfterCoupon: number;
  appliedUpgradeCreditAmount: number;
  totalAfterUpgradeCredit: number;
  creditBalance: number;
  maxCreditUsable: number;
  appliedCreditBalance: number;
  payableTotal: number;
  yearlySaving: number;
  hasDeduction: boolean;
  orderName: string;
}

export function calcPlanBaseAmount(plan: PlanType, billingCycle: BillingCycle): number {
  return billingCycle === 'yearly'
    ? PLAN_PRICING[plan].yearlyPrice * 12
    : PLAN_PRICING[plan].monthlyPrice;
}

export function calcPlanTotalAmount(plan: PlanType, billingCycle: BillingCycle): number {
  return Math.round(calcPlanBaseAmount(plan, billingCycle) * 1.1);
}

export function buildPlanOrderName(plan: PlanType, billingCycle: BillingCycle): string {
  return `${PLAN_NAMES[plan]} 플랜 ${billingCycle === 'yearly' ? '연간' : '월간'} 결제`;
}

export function buildPlanPaymentQuote(input: PlanPaymentQuoteInput): PlanPaymentQuote {
  const { plan, billingCycle } = input;
  const monthlyPrice = billingCycle === 'yearly'
    ? PLAN_PRICING[plan].yearlyPrice
    : PLAN_PRICING[plan].monthlyPrice;
  const baseAmount = calcPlanBaseAmount(plan, billingCycle);
  const vatAmount = Math.round(baseAmount * 0.1);
  const originalTotalAmount = calcPlanTotalAmount(plan, billingCycle);

  const couponDiscountAmount = Math.max(0, Math.min(input.couponDiscountAmount ?? 0, baseAmount));
  const baseAfterCoupon = Math.max(0, baseAmount - couponDiscountAmount);
  const totalAfterCoupon = Math.round(baseAfterCoupon * 1.1);

  const requestedUpgradeCreditAmount = Math.max(0, input.upgradeCreditAmount ?? 0);
  const appliedUpgradeCreditAmount = input.upgradeSourceBillingId
    ? Math.min(requestedUpgradeCreditAmount, totalAfterCoupon)
    : 0;
  const totalAfterUpgradeCredit = totalAfterCoupon - appliedUpgradeCreditAmount;

  const requestedCreditUsage = Math.max(0, input.creditUsedAmount ?? 0);
  const creditBalance = Math.max(0, input.creditBalance ?? requestedCreditUsage);
  const maxCreditUsable = Math.max(0, Math.min(creditBalance, totalAfterUpgradeCredit));
  const appliedCreditBalance = Math.min(requestedCreditUsage, maxCreditUsable);
  const payableTotal = Math.max(0, totalAfterUpgradeCredit - appliedCreditBalance);

  const monthlyTotalPerYear = Math.round(PLAN_PRICING[plan].monthlyPrice * 12 * 1.1);
  const yearlySaving = billingCycle === 'yearly'
    ? monthlyTotalPerYear - originalTotalAmount
    : 0;

  return {
    monthlyPrice,
    baseAmount,
    vatAmount,
    originalTotalAmount,
    couponDiscountAmount,
    baseAfterCoupon,
    totalAfterCoupon,
    appliedUpgradeCreditAmount,
    totalAfterUpgradeCredit,
    creditBalance,
    maxCreditUsable,
    appliedCreditBalance,
    payableTotal,
    yearlySaving,
    hasDeduction: couponDiscountAmount > 0 || appliedUpgradeCreditAmount > 0 || appliedCreditBalance > 0,
    orderName: buildPlanOrderName(plan, billingCycle),
  };
}
