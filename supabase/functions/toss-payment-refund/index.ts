/**
 * toss-payment-refund
 *
 * 약관 제7조 기준 환불 처리:
 *   - 월간/연간 구독 중도 해지: 일할 계산 환불 (월간 30일, 연간 360일, 10원 올림)
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
import { calculateBillingRefundQuote } from "../../../utils/billingSettlement.ts";

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
    .select("id, hospital_id, plan, billing_cycle, amount, payment_status, payment_ref, is_test_payment, created_at, credit_used_amount")
    .eq("id", billingId.trim())
    .single();

  if (billingError || !billing) return json({ error: "Billing record not found" }, 404);

  // ── 소유권 검증 ───────────────────────────────────────────────
  const { data: profile } = await adminClient
    .from("profiles")
    .select("hospital_id, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.hospital_id !== billing.hospital_id) {
    return json({ error: "Access denied" }, 403);
  }
  if (profile.role !== "master" && profile.role !== "admin") {
    return json({ error: "Refund requires master or admin role" }, 403);
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
  const calc = calculateBillingRefundQuote({
    amount: billing.amount,
    plan: billing.plan,
    billing_cycle: billing.billing_cycle ?? "monthly",
    created_at: billing.created_at,
    credit_used_amount: (billing as Record<string, unknown>).credit_used_amount as number | string | null | undefined,
  });

  if (calc.refundAmount <= 0 && calc.totalRecoveryAmount <= 0) {
    // 환불/복구 금액이 모두 0원이면 DB 취소만 처리
    const { data: ok } = await adminClient.rpc("process_refund_and_cancel", {
      p_billing_id: billing.id,
      p_hospital_id: billing.hospital_id,
      p_refund_amount: 0,
      p_refund_reason: calc.reason,
    });
    await adminClient.from("audit_logs").insert({
      action: "refund",
      actor_id: user.id,
      target_id: billing.id,
      hospital_id: billing.hospital_id,
      meta: {
        refund_amount: 0,
        refund_type: "none",
        credit_restore_amount: calc.creditRestoreAmount,
        total_recovery_amount: calc.totalRecoveryAmount,
        reason: calc.reason,
      },
    });
    return json({
      ok: ok === true,
      refundAmount: 0,
      creditRestoreAmount: calc.creditRestoreAmount,
      totalRecoveryAmount: calc.totalRecoveryAmount,
      refundType: "none",
      reason: calc.reason,
      usedDays: calc.usedDays,
    });
  }

  if (calc.refundAmount <= 0) {
    // 카드 환불은 0원이지만 사용 크레딧 복구가 남은 경우 DB 처리만 진행
    const { data: ok } = await adminClient.rpc("process_refund_and_cancel", {
      p_billing_id: billing.id,
      p_hospital_id: billing.hospital_id,
      p_refund_amount: 0,
      p_refund_reason: calc.reason,
    });
    await adminClient.from("audit_logs").insert({
      action: "refund",
      actor_id: user.id,
      target_id: billing.id,
      hospital_id: billing.hospital_id,
      meta: {
        refund_amount: 0,
        refund_type: calc.refundType,
        credit_restore_amount: calc.creditRestoreAmount,
        total_recovery_amount: calc.totalRecoveryAmount,
        reason: calc.reason,
      },
    });
    return json({
      ok: ok === true,
      refundAmount: 0,
      creditRestoreAmount: calc.creditRestoreAmount,
      totalRecoveryAmount: calc.totalRecoveryAmount,
      refundType: calc.refundType,
      reason: calc.reason,
      usedDays: calc.usedDays,
    });
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
    await adminClient.from("audit_logs").insert({
      action: "refund",
      actor_id: user.id,
      target_id: billing.id,
      hospital_id: billing.hospital_id,
      meta: {
        refund_amount: calc.refundAmount,
        refund_type: calc.refundType,
        credit_restore_amount: calc.creditRestoreAmount,
        total_recovery_amount: calc.totalRecoveryAmount,
        reason: calc.reason,
        warning: "toss_ok_db_failed",
      },
    });
    return json({
      ok: true,
      warning: "refund_processed_db_error",
      refundAmount: calc.refundAmount,
      creditRestoreAmount: calc.creditRestoreAmount,
      totalRecoveryAmount: calc.totalRecoveryAmount,
      refundType: calc.refundType,
      reason: calc.reason,
      usedDays: calc.usedDays,
    });
  }

  // 정상 환불 완료 감사 로그
  await adminClient.from("audit_logs").insert({
    action: "refund",
    actor_id: user.id,
    target_id: billing.id,
    hospital_id: billing.hospital_id,
    meta: {
      refund_amount: calc.refundAmount,
      refund_type: calc.refundType,
      credit_restore_amount: calc.creditRestoreAmount,
      total_recovery_amount: calc.totalRecoveryAmount,
      reason: calc.reason,
      used_days: calc.usedDays,
    },
  });

  return json({
    ok: ok === true,
    refundAmount: calc.refundAmount,
    creditRestoreAmount: calc.creditRestoreAmount,
    totalRecoveryAmount: calc.totalRecoveryAmount,
    refundType: calc.refundType,
    reason: calc.reason,
    usedDays: calc.usedDays,
  });
});
