import {
  buildServicePurchaseOrderName,
  parsePaymentMetadata,
  type ServicePurchaseMetadataItem,
} from './paymentMetadata';
import { buildBillingSettlementSnapshot } from './billingSettlement';

export interface BillingDisplaySource {
  plan?: string | null;
  billing_cycle?: string | null;
  payment_method?: string | null;
  payment_ref?: string | null;
  description?: string | null;
  amount?: number | string | null;
  refund_amount?: number | string | null;
  credit_restore_amount?: number | string | null;
  original_amount?: number | string | null;
  discount_amount?: number | string | null;
  credit_used_amount?: number | string | null;
  upgrade_credit_amount?: number | string | null;
}

export type BillingDisplayKind = 'plan_payment' | 'service_purchase' | 'billing_event';

export interface BillingAmountBreakdown {
  supplyAmount: number | null;
  vatAmount: number | null;
  subtotalAmount: number | null;
  couponDiscountAmount: number;
  upgradeCreditAmount: number;
  creditUsedAmount: number;
  payableAmount: number | null;
  refundAmount: number;
  creditRestoreAmount: number;
  totalRecoveryAmount: number;
}

export interface BillingDisplayModel {
  kind: BillingDisplayKind;
  planLabel: string;
  cycleLabel: string | null;
  title: string;
  productLabel: string;
  paymentMethodLabel: string;
  referenceLabel: string | null;
  items: ServicePurchaseMetadataItem[];
  breakdown: BillingAmountBreakdown;
}

const BILLING_PLAN_LABELS: Record<string, string> = {
  free: 'Free',
  basic: 'Basic',
  plus: 'Plus',
  business: 'Business',
  ultimate: 'Ultimate',
  service_purchase: '서비스 구매',
};

const BILLING_CYCLE_LABELS: Record<string, string> = {
  monthly: '월간',
  yearly: '연간',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card: '카드 결제',
  transfer: '계좌이체',
  free: '무료 주문',
  trial: '체험',
  admin_manual: '관리자 수동',
  plan_change: '플랜 변경',
  self_cancel: '구독 해지',
  credit: '크레딧',
  credit_only: '크레딧',
  payment_teacher: '수기 결제',
};

function normalizeText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function toNonNegativeNumber(value: number | string | null | undefined): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? value : null;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }

  return null;
}

function buildGenericAmountBreakdown(
  payableAmount: number | null,
  creditUsedAmount: number,
  refundAmount: number,
  creditRestoreAmount: number,
): BillingAmountBreakdown {
  if (payableAmount === null) {
    return {
      supplyAmount: null,
      vatAmount: null,
      subtotalAmount: null,
      couponDiscountAmount: 0,
      upgradeCreditAmount: 0,
      creditUsedAmount,
      payableAmount: null,
      refundAmount,
      creditRestoreAmount,
      totalRecoveryAmount: refundAmount + creditRestoreAmount,
    };
  }

  const supplyAmount = Math.round(payableAmount / 1.1);
  const vatAmount = payableAmount - supplyAmount;

  return {
    supplyAmount,
    vatAmount,
    subtotalAmount: payableAmount,
    couponDiscountAmount: 0,
    upgradeCreditAmount: 0,
    creditUsedAmount,
    payableAmount,
    refundAmount,
    creditRestoreAmount,
    totalRecoveryAmount: refundAmount + creditRestoreAmount,
  };
}

function getBillingRecoveryAmounts(source: BillingDisplaySource): {
  refundAmount: number;
  creditRestoreAmount: number;
  totalRecoveryAmount: number;
} {
  const refundAmount = toNonNegativeNumber(source.refund_amount) ?? 0;
  const creditRestoreAmount = toNonNegativeNumber(source.credit_restore_amount) ?? 0;

  return {
    refundAmount,
    creditRestoreAmount,
    totalRecoveryAmount: refundAmount + creditRestoreAmount,
  };
}

export function getBillingPlanDisplayLabel(plan: string | null | undefined): string {
  if (!plan) return '결제';
  return BILLING_PLAN_LABELS[plan] ?? plan;
}

export function getBillingCycleDisplayLabel(billingCycle: string | null | undefined): string | null {
  if (!billingCycle) return null;
  return BILLING_CYCLE_LABELS[billingCycle] ?? billingCycle;
}

export function getBillingPaymentMethodDisplayLabel(paymentMethod: string | null | undefined): string {
  if (!paymentMethod) return '-';
  return PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;
}

export function buildBillingDisplayModel(source: BillingDisplaySource): BillingDisplayModel {
  const metadata = parsePaymentMetadata(source.description);
  const payableAmount = toNonNegativeNumber(source.amount);
  const settlement = buildBillingSettlementSnapshot(source);
  const recovery = getBillingRecoveryAmounts(source);
  const referenceLabel = normalizeText(source.payment_ref);
  const hasStoredCashAmount = source.amount !== undefined && source.amount !== null;

  if (metadata?.kind === 'plan_payment') {
    const planLabel = getBillingPlanDisplayLabel(metadata.plan);
    const cycleLabel = getBillingCycleDisplayLabel(metadata.billingCycle);
    const supplyAmount = settlement.discountedSupplyAmount ?? Math.max(0, metadata.baseAmount - metadata.couponDiscountAmount);
    const vatAmount = settlement.discountedVatAmount ?? Math.round(supplyAmount * 0.1);
    const subtotalAmount = supplyAmount + vatAmount;
    const productLabel = metadata.product.title || metadata.orderName;

    return {
      kind: 'plan_payment',
      planLabel,
      cycleLabel,
      title: cycleLabel ? `${planLabel} (${cycleLabel})` : planLabel,
      productLabel,
      paymentMethodLabel: getBillingPaymentMethodDisplayLabel(source.payment_method),
      referenceLabel,
      items: [],
      breakdown: {
        supplyAmount,
        vatAmount,
        subtotalAmount,
        couponDiscountAmount: settlement.couponDiscountAmount || metadata.couponDiscountAmount,
        upgradeCreditAmount: settlement.upgradeCreditAmount || metadata.upgradeCreditAmount,
        creditUsedAmount: settlement.creditUsedAmount || metadata.creditUsedAmount,
        payableAmount: hasStoredCashAmount ? settlement.cashPaidAmount : metadata.payableAmount,
        refundAmount: recovery.refundAmount,
        creditRestoreAmount: recovery.creditRestoreAmount,
        totalRecoveryAmount: recovery.totalRecoveryAmount,
      },
    };
  }

  if (metadata?.kind === 'service_purchase') {
    const supplyAmount = metadata.items.reduce((sum, item) => sum + item.price, 0);
    const resolvedPayableAmount = hasStoredCashAmount ? settlement.cashPaidAmount : metadata.payableAmount;
    const vatAmount = resolvedPayableAmount === null ? null : Math.max(0, resolvedPayableAmount - supplyAmount);
    const productLabel = metadata.product.title || metadata.orderName;

    return {
      kind: 'service_purchase',
      planLabel: getBillingPlanDisplayLabel('service_purchase'),
      cycleLabel: null,
      title: productLabel,
      productLabel,
      paymentMethodLabel: getBillingPaymentMethodDisplayLabel(source.payment_method),
      referenceLabel,
      items: metadata.items,
      breakdown: {
        supplyAmount,
        vatAmount,
        subtotalAmount: resolvedPayableAmount,
        couponDiscountAmount: 0,
        upgradeCreditAmount: 0,
        creditUsedAmount: settlement.creditUsedAmount,
        payableAmount: resolvedPayableAmount,
        refundAmount: recovery.refundAmount,
        creditRestoreAmount: recovery.creditRestoreAmount,
        totalRecoveryAmount: recovery.totalRecoveryAmount,
      },
    };
  }

  const planLabel = getBillingPlanDisplayLabel(source.plan);
  const cycleLabel = getBillingCycleDisplayLabel(source.billing_cycle);
  const title = cycleLabel ? `${planLabel} (${cycleLabel})` : planLabel;
  const productLabel = normalizeText(source.description)
    ?? (source.plan === 'service_purchase' ? '서비스 구매' : title);

  return {
    kind: source.plan === 'service_purchase' ? 'service_purchase' : 'billing_event',
    planLabel,
    cycleLabel,
    title,
    productLabel,
    paymentMethodLabel: getBillingPaymentMethodDisplayLabel(source.payment_method),
    referenceLabel,
    items: source.plan === 'service_purchase' ? [] : [],
    breakdown: settlement.discountedSupplyAmount !== null && settlement.discountedVatAmount !== null
      ? {
          supplyAmount: settlement.discountedSupplyAmount,
          vatAmount: settlement.discountedVatAmount,
          subtotalAmount: settlement.cashPaidAmount,
          couponDiscountAmount: settlement.couponDiscountAmount,
          upgradeCreditAmount: settlement.upgradeCreditAmount,
          creditUsedAmount: settlement.creditUsedAmount,
          payableAmount,
          refundAmount: recovery.refundAmount,
          creditRestoreAmount: recovery.creditRestoreAmount,
          totalRecoveryAmount: recovery.totalRecoveryAmount,
        }
      : buildGenericAmountBreakdown(
          payableAmount,
          settlement.creditUsedAmount,
          recovery.refundAmount,
          recovery.creditRestoreAmount,
        ),
  };
}

export function buildLegacyServicePurchaseDisplayTitle(items: ServicePurchaseMetadataItem[]): string {
  return buildServicePurchaseOrderName(items);
}
