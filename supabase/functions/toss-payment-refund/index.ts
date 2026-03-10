/**
 * toss-payment-refund
 *
 * 약관 제7조 기준 환불 처리:
 *   - 결제 후 7일 이내: 전액 환불
 *   - 월간 구독 중도 해지: 일할 계산 환불
 *   - 연간 구독 중도 해지: 이용 월수를 월간 정가로 재계산 후 차액 환불
 *
 * 보안 모델:
 *   - JWT 인증 필수 (config.toml: verify_jwt = true)
 *   - 요청자가 해당 billing_history를 소유한 병원의 구성원인지 검증
 *   - is_test_payment = true 결제는 TossPayments API를 건너뛰고 DB만 처리
 *   - payment_ref 없는 결제(수동/어드민)는 자동 환불 불가
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ── 서버사이드 정가 테이블 (types/plan.ts PLAN_PRICING와 동기화 필요) ──
const PLAN_BASE_PRICES: Record<string, { monthly: number; yearly: number }> = {
  basic:    { monthly: 27000,  yearly: 21000  },
  plus:     { monthly: 59000,  yearly: 47000  },
  business: { monthly: 129000, yearly: 103000 },
};

const FULL_REFUND_DAYS = 7; // 전액 환불 기준일

/** VAT 포함 금액 (천원 단위 절사) */
function withVat(base: number): number {
  return Math.floor((base + Math.round(base * 0.1)) / 1000) * 1000;
}

type RefundType = "full" | "prorata_monthly" | "prorata_yearly" | "none";

interface RefundCalcResult {
  refundAmount: number;
  refundType: RefundType;
  reason: string;
  usedDays: number;
}

/**
 * 약관 제7조 환불 금액 계산
 *
 * @param paidAmount  실제 결제금액 (VAT 포함)
 * @param plan        결제 플랜
 * @param billingCycle 결제 주기
 * @param paidAt      결제 시각 (ISO string)
 */
function calcRefund(params: {
  paidAmount: number;
  plan: string;
  billingCycle: string;
  paidAt: string;
}): RefundCalcResult {
  const { paidAmount, plan, billingCycle, paidAt } = params;
  const now = Date.now();
  const paidMs = new Date(paidAt).getTime();
  const usedDays = Math.ceil((now - paidMs) / (1000 * 60 * 60 * 24));

  // 케이스 1: 7일 이내 → 전액 환불
  if (usedDays <= FULL_REFUND_DAYS) {
    return {
      refundAmount: paidAmount,
      refundType: "full",
      reason: `결제 후 ${usedDays}일 이내 전액 환불`,
      usedDays,
    };
  }

  const prices = PLAN_BASE_PRICES[plan];
  if (!prices) {
    // 알 수 없는 플랜 → 환불 불가
    return {
      refundAmount: 0,
      refundType: "none",
      reason: "플랜 정보를 확인할 수 없어 자동 환불이 불가합니다. 고객지원으로 문의해 주세요.",
      usedDays,
    };
  }

  // 케이스 2: 연간 구독 → 이용 완료 월수 × 월간 정가 VAT 차감
  if (billingCycle === "yearly") {
    const usedMonths = Math.ceil(usedDays / 30);
    const monthlyVat = withVat(prices.monthly);
    const charged = usedMonths * monthlyVat;
    const refundAmount = Math.max(0, paidAmount - charged);

    if (refundAmount <= 0) {
      return {
        refundAmount: 0,
        refundType: "none",
        reason: `이용 기간(${usedMonths}개월)의 월간 정가 합산이 결제금액을 초과하여 환불금이 없습니다.`,
        usedDays,
      };
    }

    return {
      refundAmount,
      refundType: "prorata_yearly",
      reason: `연간 구독 중도 해지: 이용 ${usedMonths}개월 × 월간 정가 ${monthlyVat.toLocaleString()}원 차감 후 환불`,
      usedDays,
    };
  }

  // 케이스 3: 월간 구독 → 일할 계산
  const totalDays = 30;
  const dailyRate = paidAmount / totalDays;
  const charged = Math.ceil(dailyRate * Math.min(usedDays, totalDays));
  const refundAmount = Math.max(0, paidAmount - charged);

  if (refundAmount <= 0) {
    return {
      refundAmount: 0,
      refundType: "none",
      reason: "이용 기간이 결제 기간을 초과하여 환불금이 없습니다.",
      usedDays,
    };
  }

  return {
    refundAmount,
    refundType: "prorata_monthly",
    reason: `월간 구독 일할 환불: ${usedDays}일 이용, 일할 ${Math.ceil(dailyRate).toLocaleString()}원 × ${Math.min(usedDays, totalDays)}일 차감`,
    usedDays,
  };
}

const TOSS_CANCEL_URL = (paymentKey: string) =>
  `https://api.tosspayments.com/v1/payments/${encodeURIComponent(paymentKey)}/cancel`;

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return json({ error: "Supabase env not configured" }, 500);
  }

  // ── 인증 ──────────────────────────────────────────────────────
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return json({ error: "Unauthorized" }, 401);

  // ── 요청 파싱 ─────────────────────────────────────────────────
  let body: unknown;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }
  if (typeof body !== "object" || body === null) return json({ error: "Body must be object" }, 400);

  const { billingId } = body as Record<string, unknown>;
  if (typeof billingId !== "string" || !billingId.trim()) {
    return json({ error: "billingId is required" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── billing_history 조회 ──────────────────────────────────────
  const { data: billing, error: billingError } = await adminClient
    .from("billing_history")
    .select("id, hospital_id, plan, billing_cycle, amount, payment_status, payment_ref, is_test_payment, created_at")
    .eq("id", billingId.trim())
    .single();

  if (billingError || !billing) return json({ error: "Billing record not found" }, 404);

  // ── 소유권 검증 ───────────────────────────────────────────────
  const { data: profile } = await adminClient
    .from("profiles")
    .select("hospital_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.hospital_id !== billing.hospital_id) {
    return json({ error: "Access denied" }, 403);
  }

  // ── 환불 가능 여부 검증 ───────────────────────────────────────
  if (billing.payment_status === "refunded") {
    return json({ error: "Already refunded" }, 409);
  }
  if (billing.payment_status !== "completed") {
    return json({ error: "Billing is not in completed state", status: billing.payment_status }, 409);
  }

  // payment_ref 없으면 수동 결제 → 자동 환불 불가
  if (!billing.is_test_payment && !billing.payment_ref) {
    return json({
      error: "manual_payment",
      message: "수동 결제 건은 자동 환불이 지원되지 않습니다. 고객지원(admin@denjoy.info)으로 환불을 신청해 주세요.",
    }, 422);
  }

  // ── 환불 금액 계산 ────────────────────────────────────────────
  const calc = calcRefund({
    paidAmount: billing.amount,
    plan: billing.plan,
    billingCycle: billing.billing_cycle ?? "monthly",
    paidAt: billing.created_at,
  });

  if (calc.refundType === "none") {
    // 환불금 0이어도 구독은 취소해야 하므로 DB 처리만 진행
    // (TossPayments 취소 없이 DB만 처리)
    const { data: ok } = await adminClient.rpc("process_refund_and_cancel", {
      p_billing_id: billing.id,
      p_hospital_id: billing.hospital_id,
      p_refund_amount: 0,
      p_refund_reason: calc.reason,
    });
    return json({ ok: ok === true, refundAmount: 0, refundType: calc.reason, reason: calc.reason });
  }

  // ── TossPayments 취소 API 호출 (실결제만) ──────────────────────
  if (!billing.is_test_payment) {
    if (!tossSecretKey) return json({ error: "TOSS_SECRET_KEY not configured" }, 500);

    const encodedKey = btoa(`${tossSecretKey}:`);
    let tossResp: Response;
    try {
      tossResp = await fetch(TOSS_CANCEL_URL(billing.payment_ref!), {
        method: "POST",
        headers: {
          "Authorization": `Basic ${encodedKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cancelReason: calc.reason,
          cancelAmount: calc.refundAmount,
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return json({ error: "TossPayments API call failed", detail: msg }, 502);
    }

    let tossData: Record<string, unknown>;
    try { tossData = await tossResp.json() as Record<string, unknown>; }
    catch { return json({ error: "Invalid response from TossPayments" }, 502); }

    if (!tossResp.ok) {
      const code = typeof tossData.code === "string" ? tossData.code : "UNKNOWN";
      const message = typeof tossData.message === "string" ? tossData.message : "환불 요청 실패";
      console.error("[toss-payment-refund] TossPayments cancel failed:", code, message);
      return json({ error: message, code }, tossResp.status >= 400 ? tossResp.status : 400);
    }
  }

  // ── DB 업데이트: billing 'refunded' + 플랜 free 전환 (atomic) ──
  const { data: ok, error: rpcError } = await adminClient.rpc("process_refund_and_cancel", {
    p_billing_id: billing.id,
    p_hospital_id: billing.hospital_id,
    p_refund_amount: calc.refundAmount,
    p_refund_reason: calc.reason,
  });

  if (rpcError) {
    console.error("[toss-payment-refund] process_refund_and_cancel failed:", rpcError.message);
    // TossPayments 취소는 이미 성공 — 경고 로그만 남기고 성공 응답 반환
    // (운영팀이 DB 수동 정리 필요)
    console.warn("[toss-payment-refund] CRITICAL: TossPayments refund succeeded but DB update failed. Manual fix required for billing:", billing.id);
    return json({ ok: true, warning: "refund_processed_db_error", refundAmount: calc.refundAmount, refundType: calc.refundType, reason: calc.reason });
  }

  return json({
    ok: ok === true,
    refundAmount: calc.refundAmount,
    refundType: calc.refundType,
    reason: calc.reason,
    usedDays: calc.usedDays,
  });
});
