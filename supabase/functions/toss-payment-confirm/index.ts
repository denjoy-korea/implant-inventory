/**
 * toss-payment-confirm
 *
 * TossPayments 결제 승인 (서버사이드):
 * 클라이언트에서 paymentKey/orderId/amount를 받아 TossPayments confirm API를 호출하고,
 * 성공 시 process_payment_callback RPC로 플랜을 활성화한다.
 *
 * 보안 모델:
 * - billing_history.amount는 클라이언트가 작성한 값 → 신뢰 불가
 * - plan + billing_cycle로 서버에서 정가를 독립 계산하여 amount 검증
 * - TossPayments API 자체 검증 (paymentKey는 실제 결제 완료 후에만 발급)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/** 서버사이드 정가 테이블 (types.ts PLAN_PRICING와 동기화 필요) */
const PLAN_BASE_PRICES: Record<string, Record<string, number>> = {
  basic:    { monthly: 29000,  yearly: 23000  },
  plus:     { monthly: 69000,  yearly: 55000  },
  business: { monthly: 129000, yearly: 103000 },
};

/** VAT 포함 정가 계산 (tossPaymentService.calcTotalAmount와 동일 로직) */
function calcCanonicalAmount(plan: string, billingCycle: string): number | null {
  const prices = PLAN_BASE_PRICES[plan];
  if (!prices) return null;
  const basePrice = billingCycle === "yearly"
    ? prices.yearly * 12
    : prices.monthly;
  return basePrice + Math.round(basePrice * 0.1);
}

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

type BillingRow = {
  hospital_id: string;
  payment_status: string;
  plan: string;
  billing_cycle: string;
  is_test_payment: boolean;
  coupon_id: string | null;
  original_amount: number | null;
  discount_amount: number;
};

async function fetchBillingRowWithCompatibility(
  adminClient: ReturnType<typeof createClient>,
  billingId: string,
): Promise<{ billing: BillingRow | null; billingError: { message: string } | null }> {
  const primary = await adminClient
    .from("billing_history")
    .select("hospital_id, payment_status, plan, billing_cycle, is_test_payment, coupon_id, original_amount, discount_amount")
    .eq("id", billingId)
    .single();

  if (!primary.error && primary.data) {
    return { billing: primary.data as BillingRow, billingError: null };
  }

  const message = primary.error?.message || "";
  if (!message.includes("is_test_payment")) {
    return { billing: null, billingError: primary.error as { message: string } };
  }

  // Backward compatibility: migration 미적용 환경에서는 전건 test 결제로 간주
  const fallback = await adminClient
    .from("billing_history")
    .select("hospital_id, payment_status, plan, billing_cycle")
    .eq("id", billingId)
    .single();

  if (fallback.error || !fallback.data) {
    return { billing: null, billingError: fallback.error as { message: string } };
  }

  return {
    billing: {
      ...(fallback.data as Omit<BillingRow, "is_test_payment" | "coupon_id" | "original_amount" | "discount_amount">),
      is_test_payment: true,
      coupon_id: null,
      original_amount: null,
      discount_amount: 0,
    },
    billingError: null,
  };
}

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
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!tossSecretKey) {
    return jsonResponse({ error: "TOSS_SECRET_KEY is not configured" }, 500);
  }
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    return jsonResponse({ error: "Supabase env is not configured" }, 500);
  }

  // 발신자 인증: JWT → 사용자 식별
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
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
  const { billing, billingError } = await fetchBillingRowWithCompatibility(adminClient, orderId.trim());

  if (billingError || !billing) {
    return jsonResponse({ error: "Billing record not found" }, 404);
  }

  // 발신자 소유권 검증: 요청자가 이 billing record를 소유한 병원의 구성원인지 확인
  const { data: profile } = await adminClient
    .from("profiles")
    .select("hospital_id")
    .eq("id", user.id)
    .single();
  if (!profile || profile.hospital_id !== billing.hospital_id) {
    return jsonResponse({ error: "Access denied" }, 403);
  }

  if (billing.payment_status !== "pending") {
    const status = billing.payment_status;
    // 이미 완료된 경우: 멱등성 허용 (중복 redirect 처리)
    if (status === "completed") {
      return jsonResponse({
        ok: true,
        billing_id: orderId,
        alreadyCompleted: true,
        is_test_payment: billing.is_test_payment ?? true,
      });
    }
    return jsonResponse({ error: "Billing is not pending", status }, 409);
  }

  // 금액 검증: plan + billing_cycle로 서버에서 정가를 독립 계산
  // billing_history.amount는 클라이언트 작성값이므로 신뢰하지 않음
  const billingPlan = billing.plan;
  const billingCycleVal = billing.billing_cycle;
  const canonicalAmount = calcCanonicalAmount(billingPlan, billingCycleVal);

  if (canonicalAmount === null) {
    console.error("[toss-payment-confirm] Unknown plan or billing_cycle:", billingPlan, billingCycleVal);
    return jsonResponse({ error: "Invalid plan configuration" }, 400);
  }

  // 쿠폰 할인 서버사이드 재검증
  let serverDiscountAmount = 0;
  if (billing.coupon_id && billing.discount_amount > 0) {
    // 쿠폰 유효성 확인: active 상태 + 사용 횟수 남음 + 미만료
    const { data: coupon } = await adminClient
      .from("user_coupons")
      .select("id, discount_type, discount_value, max_uses, used_count, status, expires_at")
      .eq("id", billing.coupon_id)
      .single();

    if (coupon && coupon.status === "active" && coupon.used_count < coupon.max_uses) {
      const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
      if (notExpired) {
        if (coupon.discount_type === "percentage") {
          serverDiscountAmount = Math.floor(canonicalAmount * coupon.discount_value / 100);
        } else {
          serverDiscountAmount = Math.min(coupon.discount_value, canonicalAmount);
        }
      }
    }

    // 서버 계산값으로 billing_history를 덮어쓰기 (클라이언트 값 불신)
    if (serverDiscountAmount !== billing.discount_amount || billing.original_amount !== canonicalAmount) {
      console.warn("[toss-payment-confirm] Overwriting billing discount with server values:", {
        serverDiscount: serverDiscountAmount,
        billingDiscount: billing.discount_amount,
        canonicalAmount,
        billingOriginalAmount: billing.original_amount,
        couponId: billing.coupon_id,
      });
      const { error: updateErr } = await adminClient
        .from("billing_history")
        .update({
          discount_amount: serverDiscountAmount,
          original_amount: canonicalAmount,
          amount: canonicalAmount - serverDiscountAmount,
        })
        .eq("id", orderId.trim())
        .eq("payment_status", "pending");

      if (updateErr) {
        console.error("[toss-payment-confirm] Failed to overwrite billing discount:", updateErr.message);
        return jsonResponse({ error: "Failed to correct billing record" }, 500);
      }
    }
  }

  const expectedAmount = canonicalAmount - serverDiscountAmount;
  if (expectedAmount !== amountNum) {
    console.error("[toss-payment-confirm] Amount mismatch:", {
      canonicalAmount,
      discount: serverDiscountAmount,
      expected: expectedAmount,
      received: amountNum,
      plan: billingPlan,
      billingCycle: billingCycleVal,
    });
    return jsonResponse(
      { error: "Amount mismatch", expected: expectedAmount, received: amountNum },
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

  return jsonResponse({
    ok: true,
    billing_id: orderId.trim(),
    payment_ref: paymentRef,
    is_test_payment: billing.is_test_payment ?? true,
  });
});
