export type BillingRefundType = 'full' | 'prorata_monthly' | 'prorata_yearly' | 'none';

export interface BillingSettlementSource {
  plan?: string | null;
  billing_cycle?: string | null;
  created_at?: string | null;
  amount?: number | string | null;
  original_amount?: number | string | null;
  discount_amount?: number | string | null;
  credit_used_amount?: number | string | null;
  upgrade_credit_amount?: number | string | null;
}

export interface BillingSettlementSnapshot {
  cashPaidAmount: number;
  originalAmount: number | null;
  couponDiscountAmount: number;
  creditUsedAmount: number;
  upgradeCreditAmount: number;
  discountedSupplyAmount: number | null;
  discountedVatAmount: number | null;
  grossCommittedAmount: number;
}

export interface BillingRefundQuote {
  refundAmount: number;
  creditRestoreAmount: number;
  totalRecoveryAmount: number;
  refundType: BillingRefundType;
  reason: string;
  usedDays: number;
  totalDays: number;
  remainingRatio: number;
  dailyRate: number;
}

const REFUNDABLE_PAID_PLANS = new Set(['basic', 'plus', 'business']);

function toNonNegativeNumber(value: number | string | null | undefined): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  }

  return 0;
}

function toNullableNonNegativeNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const normalized = toNonNegativeNumber(value);
  return normalized > 0 || value === 0 || value === '0' ? normalized : null;
}

export function getBillingCycleTotalDays(billingCycle: string | null | undefined): number {
  return billingCycle === 'yearly' ? 360 : 30;
}

export function calcBillingDailyRate(
  paidAmount: number,
  billingCycle: string | null | undefined,
): number {
  return Math.ceil(paidAmount / getBillingCycleTotalDays(billingCycle) / 10) * 10;
}

export function calcBillingUsedDays(
  paidAt: string,
  billingCycle: string | null | undefined,
  now = Date.now(),
): number {
  const totalDays = getBillingCycleTotalDays(billingCycle);
  const elapsedDays = Math.ceil((now - new Date(paidAt).getTime()) / 86400000);
  return Math.min(totalDays, Math.max(0, elapsedDays));
}

export function calcBillingRemainingRatio(
  paidAt: string,
  billingCycle: string | null | undefined,
  now = Date.now(),
): number {
  const totalDays = getBillingCycleTotalDays(billingCycle);
  const usedDays = calcBillingUsedDays(paidAt, billingCycle, now);
  return Math.max(0, (totalDays - usedDays) / totalDays);
}

export function calcBillingRemainingValue(
  paidAmount: number,
  billingCycle: string | null | undefined,
  paidAt: string,
  now = Date.now(),
): number {
  const totalDays = getBillingCycleTotalDays(billingCycle);
  const usedDays = calcBillingUsedDays(paidAt, billingCycle, now);
  if (usedDays >= totalDays) return 0;

  const dailyRate = calcBillingDailyRate(paidAmount, billingCycle);
  const usedCharge = Math.min(dailyRate * usedDays, paidAmount);
  return Math.max(0, paidAmount - usedCharge);
}

export function buildBillingSettlementSnapshot(
  source: BillingSettlementSource,
): BillingSettlementSnapshot {
  const cashPaidAmount = toNonNegativeNumber(source.amount);
  const originalAmount = toNullableNonNegativeNumber(source.original_amount);
  const couponDiscountAmount = toNonNegativeNumber(source.discount_amount);
  const creditUsedAmount = toNonNegativeNumber(source.credit_used_amount);
  const upgradeCreditAmount = toNonNegativeNumber(source.upgrade_credit_amount);
  const discountedSupplyAmount = originalAmount === null
    ? null
    : Math.max(0, originalAmount - couponDiscountAmount);
  const discountedVatAmount = discountedSupplyAmount === null
    ? null
    : Math.round(discountedSupplyAmount * 0.1);

  return {
    cashPaidAmount,
    originalAmount,
    couponDiscountAmount,
    creditUsedAmount,
    upgradeCreditAmount,
    discountedSupplyAmount,
    discountedVatAmount,
    grossCommittedAmount: cashPaidAmount + creditUsedAmount + upgradeCreditAmount,
  };
}

export function calculateBillingRefundQuote(
  source: BillingSettlementSource,
  now = Date.now(),
): BillingRefundQuote {
  const plan = source.plan ?? null;
  const billingCycle = source.billing_cycle ?? 'monthly';
  const paidAt = source.created_at;
  const totalDays = getBillingCycleTotalDays(billingCycle);
  const usedDays = paidAt ? calcBillingUsedDays(paidAt, billingCycle, now) : totalDays;

  if (!paidAt || !plan || !REFUNDABLE_PAID_PLANS.has(plan)) {
    return {
      refundAmount: 0,
      creditRestoreAmount: 0,
      totalRecoveryAmount: 0,
      refundType: 'none',
      reason: '플랜 정보를 확인할 수 없어 자동 환불이 불가합니다. 고객지원으로 문의해 주세요.',
      usedDays,
      totalDays,
      remainingRatio: 0,
      dailyRate: 0,
    };
  }

  const settlement = buildBillingSettlementSnapshot(source);
  const remainingRatio = calcBillingRemainingRatio(paidAt, billingCycle, now);
  const refundAmount = calcBillingRemainingValue(settlement.cashPaidAmount, billingCycle, paidAt, now);
  const creditRestoreAmount = Math.round(settlement.creditUsedAmount * remainingRatio);
  const totalRecoveryAmount = refundAmount + creditRestoreAmount;
  const dailyRate = calcBillingDailyRate(settlement.cashPaidAmount, billingCycle);
  const refundType: BillingRefundType = totalRecoveryAmount > 0
    ? (billingCycle === 'yearly' ? 'prorata_yearly' : 'prorata_monthly')
    : 'none';

  if (totalRecoveryAmount <= 0) {
    return {
      refundAmount: 0,
      creditRestoreAmount: 0,
      totalRecoveryAmount: 0,
      refundType: 'none',
      reason: '이미 전체 구독 기간 이용이 완료되었습니다.',
      usedDays,
      totalDays,
      remainingRatio,
      dailyRate,
    };
  }

  const recoveryParts: string[] = [];
  if (refundAmount > 0) {
    recoveryParts.push(`카드 환불 ${refundAmount.toLocaleString('ko-KR')}원`);
  }
  if (creditRestoreAmount > 0) {
    recoveryParts.push(`보유 크레딧 ${creditRestoreAmount.toLocaleString('ko-KR')}원 복구`);
  }

  return {
    refundAmount,
    creditRestoreAmount,
    totalRecoveryAmount,
    refundType,
    reason: `일할 정산: ${usedDays}일 이용, 일할 ${dailyRate.toLocaleString('ko-KR')}원 기준, ${recoveryParts.join(' + ')}`,
    usedDays,
    totalDays,
    remainingRatio,
    dailyRate,
  };
}
