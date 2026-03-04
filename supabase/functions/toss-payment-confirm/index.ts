/**
 * toss-payment-confirm
 *
 * TossPayments 결제 승인 (서버사이드):
 * 클라이언트에서 paymentKey/orderId/amount를 받아 TossPayments confirm API를 호출하고,
 * 성공 시 process_payment_callback RPC로 플랜을 활성화한다.
 *
 * 보안 모델: TossPayments API 자체 검증 (paymentKey는 실제 결제 완료 후에만 발급)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const tossSecretKey = Deno.env.get("TOSS_SECRET_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!tossSecretKey) {
    return jsonResponse({ error: "TOSS_SECRET_KEY is not configured" }, 500);
  }
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase env is not configured" }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (typeof body !== "object" || body === null) {
    return jsonResponse({ error: "Body must be an object" }, 400);
  }

  const { paymentKey, orderId, amount } = body as Record<string, unknown>;

  if (typeof paymentKey !== "string" || !paymentKey.trim()) {
    return jsonResponse({ error: "paymentKey is required" }, 400);
  }
  if (typeof orderId !== "string" || !orderId.trim()) {
    return jsonResponse({ error: "orderId is required" }, 400);
  }
  const amountNum = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(amountNum) || amountNum <= 0) {
    return jsonResponse({ error: "amount must be a positive number" }, 400);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // billing_history 레코드 검증 (orderId = billing_history.id)
  const { data: billing, error: billingError } = await adminClient
    .from("billing_history")
    .select("hospital_id, payment_status, amount")
    .eq("id", orderId.trim())
    .single();

  if (billingError || !billing) {
    return jsonResponse({ error: "Billing record not found" }, 404);
  }
  if ((billing as { payment_status: string }).payment_status !== "pending") {
    const status = (billing as { payment_status: string }).payment_status;
    // 이미 완료된 경우: 멱등성 허용 (중복 redirect 처리)
    if (status === "completed") {
      return jsonResponse({ ok: true, billing_id: orderId, alreadyCompleted: true });
    }
    return jsonResponse({ error: "Billing is not pending", status }, 409);
  }

  // 금액 검증: billing_history의 amount와 TossPayments amount 일치 여부
  const storedAmount = (billing as { amount: number }).amount;
  if (storedAmount !== amountNum) {
    return jsonResponse(
      { error: "Amount mismatch", expected: storedAmount, received: amountNum },
      400,
    );
  }

  // TossPayments 결제 승인 API 호출
  const encodedKey = btoa(`${tossSecretKey}:`);
  let tossResponse: Response;
  try {
    tossResponse = await fetch(TOSS_CONFIRM_URL, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${encodedKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentKey: paymentKey.trim(),
        orderId: orderId.trim(),
        amount: amountNum,
      }),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonResponse({ error: "TossPayments API call failed", detail: msg }, 502);
  }

  let tossData: Record<string, unknown>;
  try {
    tossData = await tossResponse.json() as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Invalid response from TossPayments" }, 502);
  }

  if (!tossResponse.ok) {
    const code = typeof tossData.code === "string" ? tossData.code : "UNKNOWN";
    const message = typeof tossData.message === "string" ? tossData.message : "결제 승인 실패";
    console.error("[toss-payment-confirm] TossPayments confirm failed:", code, message);
    return jsonResponse({ error: message, code }, tossResponse.status >= 400 ? tossResponse.status : 400);
  }

  // 결제 승인 성공 → process_payment_callback RPC 호출
  const paymentRef = typeof tossData.paymentKey === "string"
    ? tossData.paymentKey
    : paymentKey.trim();

  const { data: rpcData, error: rpcError } = await adminClient.rpc("process_payment_callback", {
    p_billing_id: orderId.trim(),
    p_payment_ref: paymentRef,
    p_status: "completed",
  });

  if (rpcError) {
    console.error("[toss-payment-confirm] process_payment_callback RPC failed:", rpcError.message);
    return jsonResponse(
      { error: "Failed to process payment callback", detail: rpcError.message },
      500,
    );
  }

  if (!rpcData) {
    return jsonResponse(
      { error: "Payment callback rejected (already processed or invalid)", billing_id: orderId },
      409,
    );
  }

  return jsonResponse({ ok: true, billing_id: orderId.trim(), payment_ref: paymentRef });
});
