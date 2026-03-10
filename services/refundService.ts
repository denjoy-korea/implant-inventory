/**
 * refundService
 *
 * 클라이언트 사이드 환불 처리:
 *   - 환불 금액 미리보기 계산 (약관 제7조 기준)
 *   - toss-payment-refund Edge Function 호출
 */

import { BillingCycle, DbBillingHistory, PLAN_PRICING, PlanType, RefundType } from '../types/plan';
import { supabase } from './supabaseClient';

const FULL_REFUND_DAYS = 7;

/** VAT 포함 금액 (천원 단위 절사) */
function withVat(base: number): number {
  return Math.floor((base + Math.round(base * 0.1)) / 1000) * 1000;
}

export interface RefundPreview {
  refundAmount: number;
  refundType: RefundType;
  reason: string;
  usedDays: number;
  /** UI 표시용 요약 (한국어) */
  summary: string;
}

/**
 * 약관 제7조 기준 환불 금액 미리 계산 (클라이언트 표시용)
 *
 * @param billing  최근 완료된 billing_history row
 */
export function calcRefundPreview(billing: DbBillingHistory): RefundPreview {
  const paidAmount = billing.amount;
  const plan = billing.plan as PlanType;
  const billingCycle = (billing.billing_cycle ?? 'monthly') as BillingCycle;
  const paidAt = billing.created_at;

  const now = Date.now();
  const paidMs = new Date(paidAt).getTime();
  const usedDays = Math.ceil((now - paidMs) / (1000 * 60 * 60 * 24));

  // 케이스 1: 7일 이내 전액 환불
  if (usedDays <= FULL_REFUND_DAYS) {
    return {
      refundAmount: paidAmount,
      refundType: 'full',
      reason: `결제 후 ${usedDays}일 이내 전액 환불`,
      usedDays,
      summary: `전액 환불 (결제 ${usedDays}일 이내)`,
    };
  }

  const prices = PLAN_PRICING[plan];
  if (!prices || plan === 'free' || plan === 'ultimate') {
    return {
      refundAmount: 0,
      refundType: 'none',
      reason: '플랜 정보를 확인할 수 없습니다. 고객지원으로 문의해 주세요.',
      usedDays,
      summary: '환불 불가 — 고객지원 문의',
    };
  }

  // 케이스 2: 연간 구독 → 이용 월수 × 월간 정가 차감
  if (billingCycle === 'yearly') {
    const usedMonths = Math.ceil(usedDays / 30);
    const monthlyVat = withVat(prices.monthlyPrice);
    const charged = usedMonths * monthlyVat;
    const refundAmount = Math.max(0, paidAmount - charged);

    if (refundAmount <= 0) {
      return {
        refundAmount: 0,
        refundType: 'none',
        reason: `이용 ${usedMonths}개월의 월간 정가 합산이 결제금액을 초과합니다.`,
        usedDays,
        summary: '환불금 없음 (이용 기간 초과)',
      };
    }

    return {
      refundAmount,
      refundType: 'prorata_yearly',
      reason: `연간 구독 중도 해지: 이용 ${usedMonths}개월 × 월간 정가 ${monthlyVat.toLocaleString('ko-KR')}원 차감`,
      usedDays,
      summary: `부분 환불 (이용 ${usedMonths}개월 차감)`,
    };
  }

  // 케이스 3: 월간 구독 → 일할 계산
  const totalDays = 30;
  const dailyRate = paidAmount / totalDays;
  const usedCapped = Math.min(usedDays, totalDays);
  const charged = Math.ceil(dailyRate * usedCapped);
  const refundAmount = Math.max(0, paidAmount - charged);

  if (refundAmount <= 0) {
    return {
      refundAmount: 0,
      refundType: 'none',
      reason: '이미 전체 구독 기간 이용이 완료되었습니다.',
      usedDays,
      summary: '환불금 없음 (기간 만료)',
    };
  }

  return {
    refundAmount,
    refundType: 'prorata_monthly',
    reason: `월간 구독 일할 환불: ${usedCapped}일 이용 차감`,
    usedDays,
    summary: `부분 환불 (${usedCapped}일 이용 차감)`,
  };
}

export interface RefundResult {
  ok: boolean;
  refundAmount: number;
  refundType: string;
  reason: string;
  /** 수동 결제 건이어서 자동 환불 불가 */
  isManualPayment?: boolean;
  error?: string;
}

/**
 * toss-payment-refund Edge Function 호출
 */
export async function requestRefund(billingId: string): Promise<RefundResult> {
  const { data, error } = await supabase.functions.invoke('toss-payment-refund', {
    body: { billingId },
  });

  if (error) {
    // Edge Function 에러 응답 파싱
    let parsed: Record<string, unknown> | null = null;
    try {
      parsed = typeof error.context?.json === 'function'
        ? await error.context.json()
        : null;
    } catch { /* ignore */ }

    const errMsg = (parsed?.error as string) ?? error.message ?? '환불 처리 중 오류가 발생했습니다.';
    const isManual = (parsed?.error as string) === 'manual_payment';

    return {
      ok: false,
      refundAmount: 0,
      refundType: 'none',
      reason: errMsg,
      isManualPayment: isManual,
      error: errMsg,
    };
  }

  return {
    ok: data?.ok === true,
    refundAmount: data?.refundAmount ?? 0,
    refundType: data?.refundType ?? 'none',
    reason: data?.reason ?? '',
    error: data?.ok ? undefined : '처리 중 오류가 발생했습니다.',
  };
}
