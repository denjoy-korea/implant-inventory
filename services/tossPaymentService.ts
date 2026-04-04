/**
 * TossPayments 결제 서비스
 *
 * 흐름:
 * 1. requestPayment()/requestCartPayment() → payment intent 준비
 * 2. paymentIntentService가 billing_history 생성(pending) + TossPayments SDK 호출 → redirect
 * 2. 성공 redirect → /payment/success?paymentKey=...&orderId=...&amount=...
 * 3. confirmPayment() → toss-payment-confirm Edge Function → TossPayments confirm API → process_payment_callback RPC
 */

import { supabase } from './supabaseClient';
import { PlanType, BillingCycle } from '../types';
import { calcPlanBaseAmount, calcPlanTotalAmount } from './planPaymentQuote';
import {
  executeHostedPaymentIntent,
  preparePlanPaymentIntent,
  prepareServicePurchasePaymentIntent,
  type PaymentIntentResult,
} from './paymentIntentService';

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
const LOCALHOST_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

let sdkLoadPromise: Promise<void> | null = null;

function resolveTossClientKey(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  const raw = env.VITE_TOSS_CLIENT_KEY || env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const value = raw?.trim();
  return value ? value : undefined;
}

function getMissingTossClientKeyMessage(): string {
  const base = 'TossPayments 클라이언트 키가 설정되지 않았습니다.';
  const isLocalRuntime =
    typeof window !== 'undefined' && LOCALHOST_HOSTNAMES.has(window.location.hostname);

  if (import.meta.env.DEV || isLocalRuntime) {
    return `${base} .env.local의 VITE_TOSS_CLIENT_KEY 또는 NEXT_PUBLIC_TOSS_CLIENT_KEY를 확인하고 dev/preview 서버를 재시작해 주세요.`;
  }

  return `${base} 관리자에게 문의해주세요.`;
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
  /** 업그레이드 크레딧: 기존 플랜 잔여 금액 (VAT 포함, 서버에서 재검증) */
  upgradeCreditAmount?: number;
  /** 크레딧 원천 billing_history.id */
  upgradeSourceBillingId?: string;
  /** 다운그레이드 크레딧 잔액에서 차감할 금액 (서버에서 잔액 재검증) */
  creditUsedAmount?: number;
}

export type TossPaymentResult = PaymentIntentResult;

export interface TossConfirmResult {
  ok: boolean;
  error?: string;
  alreadyCompleted?: boolean;
}

const tossHostedPaymentProvider = {
  resolveClientKey: resolveTossClientKey,
  getMissingClientKeyMessage: getMissingTossClientKeyMessage,
  ensureReady: loadTossSdk,
  async requestRedirect(params: {
    clientKey: string;
    amount: number;
    orderId: string;
    orderName: string;
    customerName?: string;
    paymentMethod: 'card' | 'transfer';
    successUrl: string;
    failUrl: string;
  }) {
    if (!window.TossPayments) {
      throw new Error('TossPayments SDK를 사용할 수 없습니다.');
    }

    const toss = window.TossPayments(params.clientKey);
    const tossMethod = params.paymentMethod === 'card' ? '카드' : '계좌이체';

    await toss.requestPayment(tossMethod, {
      amount: params.amount,
      orderId: params.orderId,
      orderName: params.orderName,
      customerName: params.customerName,
      successUrl: params.successUrl,
      failUrl: params.failUrl,
    });
  },
};

export const tossPaymentService = {
  /**
   * VAT 제외 기본 금액
   */
  calcBaseAmount(plan: PlanType, billingCycle: BillingCycle): number {
    return calcPlanBaseAmount(plan, billingCycle);
  },

  /**
   * VAT 포함 결제 금액 계산 (쿠폰 미적용)
   */
  calcTotalAmount(plan: PlanType, billingCycle: BillingCycle): number {
    return calcPlanTotalAmount(plan, billingCycle);
  },

  /**
   * 결제 시작:
   * 1. billing_history 생성 (VAT 포함 금액, pending)
   * 2. TossPayments SDK 호출 → 전체 페이지 redirect
   * (성공 시 이 함수는 절대 반환되지 않음 — 페이지가 이동함)
   * (취소/오류 시 error를 반환)
   */
  async requestPayment(request: TossPaymentRequest): Promise<TossPaymentResult> {
    const intent = preparePlanPaymentIntent(request);
    return executeHostedPaymentIntent(intent, tossHostedPaymentProvider);
  },

  /**
   * 장바구니 결제 시작 (서비스 구매용):
   * billing_history 생성(plan='service_purchase') → TossPayments SDK 호출 → 페이지 redirect
   */
  async requestCartPayment(params: {
    hospitalId: string;
    customerName: string;
    cartStorageKey: string;
    items: Array<{ id: string; name: string; price: number }>;
  }): Promise<TossPaymentResult> {
    const intent = prepareServicePurchasePaymentIntent(params);
    return executeHostedPaymentIntent(intent, tossHostedPaymentProvider);
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
        // Edge Function 에러 응답 본문 파싱 (TossPayments 에러 코드/메시지 추출)
        let parsed: Record<string, unknown> | null = null;
        try {
          parsed = typeof error.context?.json === 'function'
            ? await error.context.json()
            : null;
        } catch { /* ignore */ }
        const errMsg = (parsed?.error as string) ?? error.message ?? '결제 승인 중 오류가 발생했습니다.';
        const errCode = parsed?.code as string | undefined;
        console.error('[tossPaymentService] confirmPayment failed:', errCode, errMsg, parsed);
        return { ok: false, error: errMsg };
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
