/**
 * TossPayments 결제 서비스
 *
 * 흐름:
 * 1. requestPayment() → billing_history 생성(pending) → TossPayments SDK 호출 → 페이지 redirect
 * 2. 성공 redirect → /payment/success?paymentKey=...&orderId=...&amount=...
 * 3. confirmPayment() → toss-payment-confirm Edge Function → TossPayments confirm API → process_payment_callback RPC
 */

import { supabase } from './supabaseClient';
import { PlanType, BillingCycle, PLAN_PRICING, PLAN_NAMES } from '../types';
import { resolveIsTestPayment, isMissingIsTestPaymentColumnError } from '../utils/paymentCompat';

declare global {
  interface Window {
    // TossPayments v1 JS SDK (https://js.tosspayments.com/v1/payment)
    TossPayments?: (clientKey: string) => TossPaymentsV1Instance;
  }
}

interface TossPaymentsV1Instance {
  requestPayment(
    method: string,
    params: {
      amount: number;
      orderId: string;
      orderName: string;
      customerName?: string;
      successUrl: string;
      failUrl: string;
    }
  ): Promise<void>;
}

const TOSS_SDK_URL = 'https://js.tosspayments.com/v1/payment';

let sdkLoadPromise: Promise<void> | null = null;


async function createBillingRecordWithCoupon(params: {
  hospitalId: string;
  plan: PlanType;
  billingCycle: BillingCycle;
  totalAmount: number;
  paymentMethod: 'card' | 'transfer';
  isTestPayment: boolean;
  couponId: string | null;
  originalAmount: number | null;
  discountAmount: number;
}): Promise<{ billingId: string | null; error: unknown }> {
  const insertPayload: Record<string, unknown> = {
    hospital_id: params.hospitalId,
    plan: params.plan,
    billing_cycle: params.billingCycle,
    amount: params.totalAmount,
    is_test_payment: params.isTestPayment,
    payment_status: 'pending',
    payment_method: params.paymentMethod,
  };
  if (params.couponId) {
    insertPayload.coupon_id = params.couponId;
    insertPayload.original_amount = params.originalAmount;
    insertPayload.discount_amount = params.discountAmount;
  }

  const primary = await supabase
    .from('billing_history')
    .insert(insertPayload)
    .select('id')
    .single();

  if (!primary.error && primary.data?.id) {
    return { billingId: primary.data.id as string, error: null };
  }

  if (!isMissingIsTestPaymentColumnError(primary.error)) {
    return { billingId: null, error: primary.error };
  }

  // Backward compatibility: migration 미적용 환경
  if (params.couponId) {
    console.error('[tossPaymentService] coupon requested but billing_history lacks coupon columns; rejecting to prevent full-price charge.');
    return { billingId: null, error: new Error('쿠폰 적용에 필요한 DB 업데이트가 아직 완료되지 않았습니다. 관리자에게 문의하세요.') };
  }
  const fallbackAmount = params.originalAmount ?? params.totalAmount;
  const fallback = await supabase
    .from('billing_history')
    .insert({
      hospital_id: params.hospitalId,
      plan: params.plan,
      billing_cycle: params.billingCycle,
      amount: fallbackAmount,
      payment_status: 'pending',
      payment_method: params.paymentMethod,
    })
    .select('id')
    .single();

  if (fallback.error || !fallback.data?.id) {
    return { billingId: null, error: fallback.error };
  }

  console.warn('[tossPaymentService] billing_history column missing; fallback insert executed.');
  return { billingId: fallback.data.id as string, error: null };
}

async function loadTossSdk(): Promise<void> {
  if (window.TossPayments) return;
  if (sdkLoadPromise) return sdkLoadPromise;

  const promise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${TOSS_SDK_URL}"]`) as HTMLScriptElement | null;
    if (existing) {
      // Script tag already in DOM: load event may have already fired.
      // Check once on next tick to handle the case where TossPayments global
      // is set asynchronously after the script tag was inserted.
      if (window.TossPayments) { resolve(); return; }
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('TossPayments SDK 로드 실패')), { once: true });
      // Fallback: if load already fired before our listener, resolve via setTimeout
      setTimeout(() => { if (window.TossPayments) resolve(); }, 0);
      return;
    }
    const script = document.createElement('script');
    script.src = TOSS_SDK_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('TossPayments SDK 로드 실패'));
    document.head.appendChild(script);
  });

  sdkLoadPromise = promise;
  // Reset cache on failure so retries can re-attempt SDK load
  promise.catch(() => { sdkLoadPromise = null; });
  return promise;
}

export interface TossPaymentRequest {
  hospitalId: string;
  plan: PlanType;
  billingCycle: BillingCycle;
  customerName: string;
  paymentMethod: 'card' | 'transfer';
  /** 적용할 쿠폰 ID (선택) */
  couponId?: string;
  /** 쿠폰 할인 금액 (클라이언트 미리보기 값, 서버에서 재검증) */
  discountAmount?: number;
}

export interface TossPaymentResult {
  error?: string;
}

export interface TossConfirmResult {
  ok: boolean;
  error?: string;
  alreadyCompleted?: boolean;
}

export const tossPaymentService = {
  /**
   * VAT 포함 결제 금액 계산
   */
  calcTotalAmount(plan: PlanType, billingCycle: BillingCycle): number {
    const basePrice = billingCycle === 'yearly'
      ? PLAN_PRICING[plan].yearlyPrice * 12
      : PLAN_PRICING[plan].monthlyPrice;
    return basePrice + Math.round(basePrice * 0.1);
  },

  /**
   * 결제 시작:
   * 1. billing_history 생성 (VAT 포함 금액, pending)
   * 2. TossPayments SDK 호출 → 전체 페이지 redirect
   * (성공 시 이 함수는 절대 반환되지 않음 — 페이지가 이동함)
   * (취소/오류 시 error를 반환)
   */
  async requestPayment(request: TossPaymentRequest): Promise<TossPaymentResult> {
    const { hospitalId, plan, billingCycle, customerName, paymentMethod, couponId, discountAmount } = request;
    const clientKey = import.meta.env.VITE_TOSS_CLIENT_KEY as string | undefined;

    if (!clientKey) {
      return { error: 'TossPayments 클라이언트 키가 설정되지 않았습니다. 관리자에게 문의하세요.' };
    }

    // 1. 금액 계산 (VAT 포함) + 쿠폰 할인 적용
    const originalAmount = this.calcTotalAmount(plan, billingCycle);
    const appliedDiscount = couponId && discountAmount ? Math.min(discountAmount, originalAmount) : 0;
    const totalAmount = originalAmount - appliedDiscount;
    const isTestPayment = resolveIsTestPayment();

    if (totalAmount <= 0) {
      return { error: '결제 금액이 0원 이하입니다. 쿠폰 적용을 확인해주세요.' };
    }

    // 2. billing_history 레코드 생성
    const { billingId, error: dbError } = await createBillingRecordWithCoupon({
      hospitalId,
      plan,
      billingCycle,
      totalAmount,
      paymentMethod,
      isTestPayment,
      couponId: couponId || null,
      originalAmount: couponId ? originalAmount : null,
      discountAmount: appliedDiscount,
    });

    if (dbError || !billingId) {
      console.error('[tossPaymentService] billing_history insert failed:', dbError);
      return { error: '결제 이력 생성 실패. 다시 시도해주세요.' };
    }

    // 3. TossPayments SDK 로드
    try {
      await loadTossSdk();
    } catch {
      // billing record 취소 처리
      await supabase
        .from('billing_history')
        .update({ payment_status: 'cancelled' })
        .eq('id', billingId)
        .eq('payment_status', 'pending');
      return { error: 'TossPayments SDK 로드에 실패했습니다. 잠시 후 다시 시도해주세요.' };
    }

    if (!window.TossPayments) {
      return { error: 'TossPayments SDK를 사용할 수 없습니다.' };
    }

    // 4. 결제 요청 (성공 시 페이지 redirect → 이 함수는 반환되지 않음)
    const toss = window.TossPayments(clientKey);
    const origin = window.location.origin;
    const orderName = `${PLAN_NAMES[plan]} 플랜 ${billingCycle === 'yearly' ? '연간' : '월간'} 결제`;
    const tossMethod = paymentMethod === 'card' ? '카드' : '계좌이체';

    try {
      await toss.requestPayment(tossMethod, {
        amount: totalAmount,
        orderId: billingId,
        orderName,
        customerName: customerName || undefined,
        successUrl: `${origin}/payment/success`,
        failUrl: `${origin}/payment/fail`,
      });
      // 성공 시 여기까지 도달하지 않음 (페이지 redirect)
      return {};
    } catch (err: unknown) {
      const tossErr = err as { code?: string; message?: string };
      const isCancel = tossErr.code === 'USER_CANCEL' || tossErr.message?.includes('cancel');

      // billing record 취소 처리
      await supabase
        .from('billing_history')
        .update({ payment_status: 'cancelled' })
        .eq('id', billingId)
        .eq('payment_status', 'pending');

      if (isCancel) {
        return { error: 'user_cancel' };
      }
      return { error: tossErr.message || '결제 중 오류가 발생했습니다.' };
    }
  },

  /**
   * 결제 승인: /payment/success redirect 후 호출
   * toss-payment-confirm Edge Function → TossPayments confirm API → process_payment_callback RPC
   */
  async confirmPayment(
    paymentKey: string,
    orderId: string,
    amount: number
  ): Promise<TossConfirmResult> {
    try {
      const { data, error } = await supabase.functions.invoke('toss-payment-confirm', {
        body: { paymentKey, orderId, amount: Number(amount) },
      });

      if (error) {
        console.error('[tossPaymentService] confirmPayment Edge Function error:', error);
        return { ok: false, error: error.message || '결제 승인 중 오류가 발생했습니다.' };
      }

      const result = data as { ok?: boolean; error?: string; alreadyCompleted?: boolean };

      if (result.alreadyCompleted) {
        return { ok: true, alreadyCompleted: true };
      }
      if (!result.ok) {
        return { ok: false, error: result.error || '결제 승인에 실패했습니다.' };
      }

      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '결제 승인 중 알 수 없는 오류가 발생했습니다.';
      return { ok: false, error: msg };
    }
  },
};
