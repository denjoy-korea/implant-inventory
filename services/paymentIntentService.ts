import { BillingCycle, PlanType } from '../types';
import { buildPlanPaymentQuote } from './planPaymentQuote';
import { clearPendingPaymentRedirectState, storePendingPaymentRedirectState, type PendingPaymentType } from './paymentRedirectState';
import { supabase } from './supabaseClient';
import { isMissingIsTestPaymentColumnError, resolveIsTestPayment } from '../utils/paymentCompat';
import {
  buildServicePurchaseOrderName,
  createPlanPaymentMetadata,
  createServicePurchasePaymentMetadata,
  serializePaymentMetadata,
  type ServicePurchaseMetadataItem,
} from '../utils/paymentMetadata';

export interface HostedPaymentProvider {
  resolveClientKey: () => string | undefined;
  getMissingClientKeyMessage: () => string;
  ensureReady: () => Promise<void>;
  requestRedirect: (params: {
    clientKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    customerName?: string;
    paymentMethod: 'card' | 'transfer';
    successUrl: string;
    failUrl: string;
  }) => Promise<void>;
}

export interface PaymentIntentResult {
  error?: string;
  completed?: boolean;
}

export interface PlanPaymentIntentRequest {
  hospitalId: string;
  plan: PlanType;
  billingCycle: BillingCycle;
  customerName: string;
  paymentMethod: 'card' | 'transfer';
  couponId?: string;
  discountAmount?: number;
  upgradeCreditAmount?: number;
  upgradeSourceBillingId?: string;
  creditUsedAmount?: number;
}

export interface ServicePurchaseItem {
  id: string;
  name: string;
  price: number;
}

export interface ServicePurchasePaymentIntentRequest {
  hospitalId: string;
  customerName: string;
  cartStorageKey: string;
  items: ServicePurchaseItem[];
}

interface BillingInsertFallback {
  kind: 'fallback' | 'reject';
  payload?: Record<string, unknown>;
  message?: string;
  warning?: string;
}

interface HostedPaymentIntent {
  amount: number;
  orderName: string;
  customerName: string;
  paymentMethod: 'card' | 'transfer';
  pendingPaymentType: PendingPaymentType;
  pendingServiceCartKey?: string;
  billingInsertPayload: Record<string, unknown>;
  missingIsTestPaymentFallback?: BillingInsertFallback;
  handleZeroAmount?: (billingId: string) => Promise<PaymentIntentResult>;
}

function isUserCancelledHostedPayment(error: unknown): boolean {
  const hostedError = error as { code?: string; message?: string };
  return hostedError.code === 'USER_CANCEL' || hostedError.message?.includes('cancel') === true;
}

function getHostedPaymentErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  const hostedError = error as { message?: string };
  return hostedError.message || '결제 중 오류가 발생했습니다.';
}

function removeLocalStorageItem(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // localStorage unavailable
  }
}

async function insertBillingHistory(
  payload: Record<string, unknown>,
  isTestPayment: boolean,
): Promise<{ billingId: string | null; error: unknown }> {
  const { data, error } = await supabase
    .from('billing_history')
    .insert({
      ...payload,
      is_test_payment: isTestPayment,
      payment_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return { billingId: null, error };
  }

  return { billingId: data.id as string, error: null };
}

async function createBillingRecord(
  intent: HostedPaymentIntent,
): Promise<{ billingId: string | null; error: unknown }> {
  const isTestPayment = resolveIsTestPayment();
  const primary = await insertBillingHistory(intent.billingInsertPayload, isTestPayment);

  if (!primary.error && primary.billingId) {
    return primary;
  }

  if (!isMissingIsTestPaymentColumnError(primary.error)) {
    return primary;
  }

  const fallback = intent.missingIsTestPaymentFallback;
  if (!fallback) {
    return primary;
  }
  if (fallback.kind === 'reject') {
    return { billingId: null, error: new Error(fallback.message || '결제에 필요한 DB 업데이트가 아직 완료되지 않았습니다.') };
  }
  if (!fallback.payload) {
    return primary;
  }

  const { data, error } = await supabase
    .from('billing_history')
    .insert({
      ...fallback.payload,
      payment_status: 'pending',
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return { billingId: null, error };
  }

  if (fallback.warning) {
    console.warn(fallback.warning);
  }
  return { billingId: data.id as string, error: null };
}

async function updatePendingBillingStatus(
  billingId: string,
  status: 'cancelled' | 'failed',
) {
  await supabase
    .from('billing_history')
    .update({ payment_status: status })
    .eq('id', billingId)
    .eq('payment_status', 'pending');
}

function buildServicePurchaseTotalAmount(items: ServicePurchaseItem[]): number {
  const subtotal = items.reduce((sum, item) => sum + item.price, 0);
  return Math.round(subtotal * 1.1);
}

function toServicePurchaseMetadataItems(items: ServicePurchaseItem[]): ServicePurchaseMetadataItem[] {
  return items.map(({ id, name, price }) => ({ id, name, price }));
}

export function preparePlanPaymentIntent(request: PlanPaymentIntentRequest): HostedPaymentIntent {
  const paymentQuote = buildPlanPaymentQuote({
    plan: request.plan,
    billingCycle: request.billingCycle,
    couponDiscountAmount: request.couponId ? request.discountAmount : 0,
    upgradeCreditAmount: request.upgradeCreditAmount,
    upgradeSourceBillingId: request.upgradeSourceBillingId,
    creditUsedAmount: request.creditUsedAmount,
  });

  return {
    amount: paymentQuote.payableTotal,
    orderName: paymentQuote.orderName,
    customerName: request.customerName,
    paymentMethod: request.paymentMethod,
    pendingPaymentType: 'plan',
    billingInsertPayload: {
      hospital_id: request.hospitalId,
      plan: request.plan,
      billing_cycle: request.billingCycle,
      amount: paymentQuote.payableTotal,
      payment_method: request.paymentMethod,
      description: serializePaymentMetadata(createPlanPaymentMetadata({
        orderName: paymentQuote.orderName,
        payableAmount: paymentQuote.payableTotal,
        plan: request.plan,
        billingCycle: request.billingCycle,
        baseAmount: paymentQuote.baseAmount,
        couponDiscountAmount: paymentQuote.couponDiscountAmount,
        upgradeCreditAmount: paymentQuote.appliedUpgradeCreditAmount,
        creditUsedAmount: paymentQuote.appliedCreditBalance,
        couponId: request.couponId,
      })),
      ...(request.couponId ? {
        coupon_id: request.couponId,
        original_amount: paymentQuote.baseAmount,
        discount_amount: paymentQuote.couponDiscountAmount,
      } : {}),
      ...(paymentQuote.appliedUpgradeCreditAmount > 0 ? {
        upgrade_credit_amount: paymentQuote.appliedUpgradeCreditAmount,
        upgrade_source_billing_id: request.upgradeSourceBillingId ?? null,
      } : {}),
      ...(paymentQuote.appliedCreditBalance > 0 ? {
        credit_used_amount: paymentQuote.appliedCreditBalance,
      } : {}),
    },
    missingIsTestPaymentFallback: request.couponId
      ? {
        kind: 'reject',
        message: '쿠폰 적용에 필요한 DB 업데이트가 아직 완료되지 않았습니다. 관리자에게 문의하세요.',
      }
      : {
        kind: 'fallback',
        payload: {
          hospital_id: request.hospitalId,
          plan: request.plan,
          billing_cycle: request.billingCycle,
          amount: paymentQuote.payableTotal,
          payment_method: request.paymentMethod,
        },
        warning: '[paymentIntentService] billing_history is_test_payment column missing; plan payment fallback insert executed.',
      },
    handleZeroAmount: async (billingId) => {
      const { error } = await supabase.rpc('process_credit_payment', { p_billing_id: billingId });
      if (error) {
        await updatePendingBillingStatus(billingId, 'cancelled');
        return { error: error.message ?? '크레딧 결제 처리 중 오류가 발생했습니다.' };
      }
      return {};
    },
  };
}

export function prepareServicePurchasePaymentIntent(
  request: ServicePurchasePaymentIntentRequest,
): HostedPaymentIntent {
  const totalAmount = buildServicePurchaseTotalAmount(request.items);
  const metadataItems = toServicePurchaseMetadataItems(request.items);
  const orderName = buildServicePurchaseOrderName(metadataItems);
  const serializedMetadata = serializePaymentMetadata(createServicePurchasePaymentMetadata({
    orderName,
    payableAmount: totalAmount,
    items: metadataItems,
  }));

  return {
    amount: totalAmount,
    orderName,
    customerName: request.customerName,
    paymentMethod: 'card',
    pendingPaymentType: 'service',
    pendingServiceCartKey: request.cartStorageKey,
    billingInsertPayload: {
      hospital_id: request.hospitalId,
      plan: 'service_purchase',
      billing_cycle: null,
      amount: totalAmount,
      payment_method: totalAmount === 0 ? 'free' : 'card',
      description: serializedMetadata,
    },
    missingIsTestPaymentFallback: {
      kind: 'fallback',
      payload: {
        hospital_id: request.hospitalId,
        plan: 'service_purchase',
        billing_cycle: null,
        amount: totalAmount,
        payment_method: totalAmount === 0 ? 'free' : 'card',
        description: serializedMetadata,
      },
      warning: '[paymentIntentService] billing_history is_test_payment column missing; service purchase fallback insert executed.',
    },
    handleZeroAmount: async (billingId) => {
      const { data, error } = await supabase.functions.invoke('toss-payment-confirm', {
        body: { paymentKey: 'FREE_SERVICE_PURCHASE', orderId: billingId, amount: 0 },
      });

      if (error || !(data as { ok?: boolean } | null)?.ok) {
        console.error('[paymentIntentService] zero-cost service purchase confirm failed:', error, data);
        await updatePendingBillingStatus(billingId, 'failed');
        return { error: '무료 주문 처리에 실패했습니다. 잠시 후 다시 시도해주세요.' };
      }

      removeLocalStorageItem(request.cartStorageKey);
      clearPendingPaymentRedirectState();
      return { completed: true };
    },
  };
}

export async function executeHostedPaymentIntent(
  intent: HostedPaymentIntent,
  provider: HostedPaymentProvider,
): Promise<PaymentIntentResult> {
  const clientKey = intent.amount > 0 ? provider.resolveClientKey() : undefined;
  if (intent.amount > 0 && !clientKey) {
    return { error: provider.getMissingClientKeyMessage() };
  }

  const { billingId, error: billingError } = await createBillingRecord(intent);
  if (billingError || !billingId) {
    console.error('[paymentIntentService] billing_history insert failed:', billingError);
    return { error: '결제 이력 생성 실패. 다시 시도해주세요.' };
  }

  if (intent.amount === 0) {
    if (!intent.handleZeroAmount) {
      await updatePendingBillingStatus(billingId, 'failed');
      return { error: '0원 결제 처리기가 설정되지 않았습니다.' };
    }
    return intent.handleZeroAmount(billingId);
  }

  try {
    await provider.ensureReady();
  } catch {
    await updatePendingBillingStatus(billingId, 'cancelled');
    clearPendingPaymentRedirectState();
    return { error: 'TossPayments SDK 로드에 실패했습니다. 잠시 후 다시 시도해주세요.' };
  }

  const origin = window.location.origin;
  storePendingPaymentRedirectState({
    orderId: billingId,
    paymentType: intent.pendingPaymentType,
    serviceCartKey: intent.pendingServiceCartKey ?? null,
  });

  try {
    await provider.requestRedirect({
      clientKey: clientKey as string,
      amount: intent.amount,
      orderId: billingId,
      orderName: intent.orderName,
      customerName: intent.customerName || undefined,
      paymentMethod: intent.paymentMethod,
      successUrl: `${origin}/payment/success`,
      failUrl: `${origin}/payment/fail`,
    });
    return {};
  } catch (error) {
    await updatePendingBillingStatus(billingId, 'cancelled');
    clearPendingPaymentRedirectState();

    if (isUserCancelledHostedPayment(error)) {
      return { error: 'user_cancel' };
    }
    return { error: getHostedPaymentErrorMessage(error) };
  }
}
