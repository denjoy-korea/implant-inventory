/**
 * refundService
 *
 * 클라이언트 사이드 환불 처리:
 *   - 환불 금액 미리보기 계산 (약관 제7조 기준)
 *   - toss-payment-refund Edge Function 호출
 */

import { BillingCycle, DbBillingHistory, PLAN_PRICING, PlanType, RefundType } from '../types/plan';
import { supabase } from './supabaseClient';

/** 10원 단위 올림 일요금 (환불/크레딧 공용) */
export function calcDailyRate(paidAmount: number, billingCycle: BillingCycle): number {
  const totalDays = billingCycle === 'yearly' ? 360 : 30;
  return Math.ceil(paidAmount / totalDays / 10) * 10;
}

/**
 * 잔여 가치 계산 (환불/크레딧 공용)
 * - 일할 계산: paidAmount - ceil(dailyRate × usedDays) (월간 30일, 연간 360일)
 */
export function calcRemainingValue(
  paidAmount: number,
  billingCycle: BillingCycle,
  paidAt: string,
): number {
  const totalDays = billingCycle === 'yearly' ? 360 : 30;
  const usedDays = Math.ceil((Date.now() - new Date(paidAt).getTime()) / 86400000);
  if (usedDays >= totalDays) return 0;
  const dailyRate = calcDailyRate(paidAmount, billingCycle);
  const usedCharge = Math.min(dailyRate * usedDays, paidAmount);
  return Math.max(0, paidAmount - usedCharge);
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

  const usedDays = Math.ceil((Date.now() - new Date(paidAt).getTime()) / 86400000);

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

  // 일할 계산 (월간 30일, 연간 360일) — 환불/크레딧 통합 공식
  const refundAmount = calcRemainingValue(paidAmount, billingCycle, paidAt);
  const dailyRate = calcDailyRate(paidAmount, billingCycle);
  const refundType: RefundType = billingCycle === 'yearly' ? 'prorata_yearly' : 'prorata_monthly';

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
    refundType,
    reason: `일할 환불: ${usedDays}일 이용, 일할 ${dailyRate.toLocaleString('ko-KR')}원 × ${usedDays}일 차감`,
    usedDays,
    summary: `부분 환불 (${usedDays}일 이용 차감)`,
  };
}

// ── 업그레이드 크레딧 ──────────────────────────────────────────────────────────

export interface UpgradeCredit {
  /** VAT 포함 잔여 금액 (결제 최종 금액에서 직접 차감) */
  creditAmount: number;
  remainingDays: number;
  totalDays: number;
  sourceBillingId: string;
}

/**
 * 현재 구독의 잔여 금액 계산 (업그레이드 시 새 플랜에서 차감)
 *
 * 계산식: 환불 공식과 동일 (일할 계산, 10원 올림)
 *
 * @param currentBilling  현재 진행 중인 completed billing_history row
 */
export function calcUpgradeCredit(currentBilling: DbBillingHistory): UpgradeCredit | null {
  if (currentBilling.payment_status !== 'completed') return null;
  if (!currentBilling.amount || currentBilling.amount <= 0) return null;

  const billingCycle = (currentBilling.billing_cycle ?? 'monthly') as BillingCycle;
  const totalDays = billingCycle === 'yearly' ? 360 : 30;
  const usedDays = Math.ceil((Date.now() - new Date(currentBilling.created_at).getTime()) / 86400000);
  const remainingDays = Math.max(0, totalDays - usedDays);

  if (remainingDays <= 0) return null;

  // 환불 정책과 동일: 일할 계산
  const creditAmount = calcRemainingValue(currentBilling.amount, billingCycle, currentBilling.created_at);

  if (creditAmount <= 0) return null;

  return {
    creditAmount,
    remainingDays,
    totalDays,
    sourceBillingId: currentBilling.id,
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
