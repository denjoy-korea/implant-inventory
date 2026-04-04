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
import { extractServicePurchaseItems } from "../../../utils/paymentMetadata.ts";

/** 서버사이드 정가 폴백 테이블 (DB 조회 실패 시 사용, types/plan.ts PLAN_PRICING와 동기화 필요) */
const FALLBACK_PRICES: Record<string, Record<string, number>> = {
  basic:    { monthly: 27000,  yearly: 21000  },
  plus:     { monthly: 59000,  yearly: 47000  },
  business: { monthly: 129000, yearly: 103000 },
};

/** VAT 제외 기본 금액 — 1차: DB 조회, 2차: 폴백 상수 */
async function calcBaseAmount(
  adminClient: AdminClient,
  plan: string,
  billingCycle: string,
): Promise<number | null> {
  // 1차: plan_pricing 테이블에서 조회
  const { data, error } = await adminClient.rpc("get_plan_price", {
    p_plan: plan,
    p_billing_cycle: billingCycle,
  });
  if (!error && data !== null) {
    const unitPrice = Number(data);
    return billingCycle === "yearly" ? unitPrice * 12 : unitPrice;
  }
  // 2차: 폴백 (plan_pricing 마이그레이션 미적용 환경 대비)
  console.error(
    "[toss-payment-confirm] DB price lookup failed, using fallback:",
    error?.message,
  );
  const prices = FALLBACK_PRICES[plan];
  if (!prices) return null;
  return billingCycle === "yearly" ? prices.yearly * 12 : prices.monthly;
}

/** VAT 포함 최종 금액 (할인 후 기본가에 VAT 10% 적용) */
function calcAmountWithVat(base: number, discount: number): number {
  const afterDiscount = base - discount;
  return Math.round(afterDiscount * 1.1);
}

const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";
const BILLING_STATUS_PENDING = "pending";
const BILLING_STATUS_CONFIRMING = "confirming";
const BILLING_STATUS_COMPLETED = "completed";
const BILLING_STATUS_FAILED = "failed";

type AdminClient = ReturnType<typeof createClient>;

type BillingRow = {
  hospital_id: string;
  payment_status: string;
  plan: string;
  billing_cycle: string;
  amount: number;
  is_test_payment: boolean;
  coupon_id: string | null;
  original_amount: number | null;
  discount_amount: number;
  upgrade_credit_amount: number;
  upgrade_source_billing_id: string | null;
  credit_used_amount: number;
  description?: string | null;
};

async function grantPurchasedSeasonAccess(
  adminClient: AdminClient,
  userId: string,
  grantedBy: string,
  billingDescription: string | null | undefined,
): Promise<number> {
  const seasonIds = [...new Set(extractServicePurchaseItems(billingDescription).map((item) => item.id))];
  if (seasonIds.length === 0) return 0;

  const { data: seasons, error: seasonError } = await adminClient
    .from("course_seasons")
    .select("id")
    .in("id", seasonIds);

  if (seasonError || !seasons?.length) {
    console.error("[toss-payment-confirm] could not resolve purchased seasons:", seasonError?.message);
    return 0;
  }

  const grantedAt = new Date().toISOString();
  const rows = seasons.map((season) => ({
    user_id: userId,
    season_id: season.id as string,
    completed_at: grantedAt,
    granted_by: grantedBy,
  }));

  const { error: enrollmentError } = await adminClient
    .from("course_enrollments")
    .upsert(rows, { onConflict: "user_id,season_id" });

  if (enrollmentError) {
    console.error("[toss-payment-confirm] enrollment upsert failed:", enrollmentError.message);
    return 0;
  }

  return rows.length;
}

async function fetchBillingRowWithCompatibility(
  adminClient: AdminClient,
  billingId: string,
): Promise<{ billing: BillingRow | null; billingError: { message: string } | null }> {
  const primary = await adminClient
    .from("billing_history")
    .select("hospital_id, payment_status, plan, billing_cycle, amount, is_test_payment, coupon_id, original_amount, discount_amount, upgrade_credit_amount, upgrade_source_billing_id, credit_used_amount, description")
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
      ...(fallback.data as Omit<BillingRow, "is_test_payment" | "coupon_id" | "original_amount" | "discount_amount" | "upgrade_credit_amount" | "upgrade_source_billing_id">),
      is_test_payment: true,
      coupon_id: null,
      original_amount: null,
      discount_amount: 0,
      upgrade_credit_amount: 0,
      upgrade_source_billing_id: null,
      credit_used_amount: 0,
      description: null,
    },
    billingError: null,
  };
}

async function updateBillingStatus(
  adminClient: AdminClient,
  billingId: string,
  nextStatus: string,
  options: {
    fromStatus?: string;
    paymentRef?: string;
  } = {},
): Promise<void> {
  let query = adminClient
    .from("billing_history")
    .update({
      payment_status: nextStatus,
      updated_at: new Date().toISOString(),
      ...(options.paymentRef ? { payment_ref: options.paymentRef } : {}),
    })
    .eq("id", billingId);

  if (options.fromStatus) {
    query = query.eq("payment_status", options.fromStatus);
  }

  const { error } = await query;
  if (error) {
    console.error("[toss-payment-confirm] billing status update failed:", {
      billingId,
      nextStatus,
      fromStatus: options.fromStatus ?? null,
      error: error.message,
    });
  }
}

async function failConfirmingBilling(adminClient: AdminClient, billingId: string): Promise<void> {
  await updateBillingStatus(adminClient, billingId, BILLING_STATUS_FAILED, {
    fromStatus: BILLING_STATUS_CONFIRMING,
  });
}

async function releaseConfirmingBilling(adminClient: AdminClient, billingId: string): Promise<void> {
  await updateBillingStatus(adminClient, billingId, BILLING_STATUS_PENDING, {
    fromStatus: BILLING_STATUS_CONFIRMING,
  });
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
  if (!Number.isFinite(amountNum) || amountNum < 0) {
    return jsonResponse({ error: "amount must be a non-negative number" }, 400);
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
    .select("hospital_id, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.hospital_id !== billing.hospital_id) {
    return jsonResponse({ error: "Access denied" }, 403);
  }
  // [SEC] 결제 권한: master 또는 admin 역할만 허용
  if (profile.role !== "master" && profile.role !== "admin") {
    return jsonResponse({ error: "Billing requires master or admin role" }, 403);
  }

  if (billing.payment_status !== "pending") {
    const status = billing.payment_status;
    // 이미 완료된 경우: 멱등성 허용 (중복 redirect 처리)
    if (status === BILLING_STATUS_COMPLETED) {
      return jsonResponse({
        ok: true,
        billing_id: orderId,
        alreadyCompleted: true,
        is_test_payment: billing.is_test_payment ?? true,
      });
    }
    return jsonResponse({ error: "Billing is not pending", status }, 409);
  }

  // [SEC] 동시 중복 요청 방지: pending → confirming 원자적 전환 (CAS)
  const { data: claimed } = await adminClient
    .from("billing_history")
    .update({ payment_status: BILLING_STATUS_CONFIRMING })
    .eq("id", orderId.trim())
    .eq("payment_status", BILLING_STATUS_PENDING)
    .select("id")
    .single();
  if (!claimed) {
    return jsonResponse({ error: "Payment is being processed concurrently", status: BILLING_STATUS_CONFIRMING }, 409);
  }

  // ── 서비스 구매 분기 (plan='service_purchase') ────────────────────────────
  // 플랜 승격 없이 결제만 확인하고 completed로 마킹
  if (billing.plan === "service_purchase") {
    const billingAmount = Number(billing.amount);
    if (billingAmount !== amountNum) {
      console.error("[toss-payment-confirm] service_purchase amount mismatch:", { billingAmount, amountNum });
      await adminClient
        .from("billing_history")
        .update({ payment_status: "failed", updated_at: new Date().toISOString() })
        .eq("id", orderId.trim());
      return jsonResponse({ error: "Amount mismatch", expected: billingAmount, received: amountNum }, 400);
    }

    let servicePayRef = paymentKey.trim();

    if (billingAmount > 0) {
      const encodedKeyService = btoa(`${tossSecretKey}:`);
      let serviceTossResponse: Response;
      try {
        serviceTossResponse = await fetch(TOSS_CONFIRM_URL, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${encodedKeyService}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ paymentKey: paymentKey.trim(), orderId: orderId.trim(), amount: amountNum }),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await adminClient
          .from("billing_history")
          .update({ payment_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId.trim());
        return jsonResponse({ error: "TossPayments API call failed", detail: msg }, 502);
      }

      const serviceTossData = await serviceTossResponse.json().catch(() => ({})) as Record<string, unknown>;
      if (!serviceTossResponse.ok) {
        await adminClient
          .from("billing_history")
          .update({ payment_status: "failed", updated_at: new Date().toISOString() })
          .eq("id", orderId.trim());
        const code = typeof serviceTossData.code === "string" ? serviceTossData.code : "UNKNOWN";
        const message = typeof serviceTossData.message === "string" ? serviceTossData.message : "결제 승인 실패";
        console.error("[toss-payment-confirm] service_purchase TossPayments failed:", code, message);
        return jsonResponse({ error: message, code }, 400);
      }

      servicePayRef = typeof serviceTossData.paymentKey === "string"
        ? serviceTossData.paymentKey
        : paymentKey.trim();
    } else {
      servicePayRef = "FREE_SERVICE_PURCHASE";
    }

    const grantedCount = await grantPurchasedSeasonAccess(
      adminClient,
      user.id,
      user.id,
      billing.description,
    );

    await adminClient
      .from("billing_history")
      .update({ payment_status: "completed", payment_ref: servicePayRef, updated_at: new Date().toISOString() })
      .eq("id", orderId.trim());

    return jsonResponse({
      ok: true,
      billing_id: orderId.trim(),
      payment_ref: servicePayRef,
      granted_season_count: grantedCount,
      is_test_payment: billing.is_test_payment ?? true,
    });
  }

  // 금액 검증: plan + billing_cycle로 서버에서 기본가를 독립 계산
  // 순서: 기본가 → 쿠폰 할인 → VAT
  const billingPlan = billing.plan;
  const billingCycleVal = billing.billing_cycle;
  const baseAmount = await calcBaseAmount(adminClient, billingPlan, billingCycleVal);

  if (baseAmount === null) {
    console.error("[toss-payment-confirm] Unknown plan or billing_cycle:", billingPlan, billingCycleVal);
    await failConfirmingBilling(adminClient, orderId.trim());
    return jsonResponse({ error: "Invalid plan configuration" }, 400);
  }

  // 쿠폰 할인 서버사이드 재검증 (VAT 전 기본가 기준)
  // 검증 항목: 소유권(user_id, hospital_id), 플랜 적용 범위, 유효성, redeem_coupon RPC
  let serverDiscountAmount = 0;
  if (billing.coupon_id && billing.discount_amount > 0) {
    // 1. 쿠폰 조회 + 소유권 검증 (user_id, hospital_id 일치 필수)
    const { data: coupon } = await adminClient
      .from("user_coupons")
      .select("id, user_id, hospital_id, template_id, discount_type, discount_value, max_uses, used_count, status, expires_at")
      .eq("id", billing.coupon_id)
      .single();

    if (!coupon) {
      console.warn("[toss-payment-confirm] Coupon not found, ignoring discount:", billing.coupon_id);
    } else if (coupon.user_id !== user.id || coupon.hospital_id !== billing.hospital_id) {
      // 소유권 불일치: 타인의 쿠폰 도용 시도 차단
      console.error("[toss-payment-confirm] Coupon ownership mismatch:", {
        couponUserId: coupon.user_id, requestUserId: user.id,
        couponHospitalId: coupon.hospital_id, billingHospitalId: billing.hospital_id,
      });
      await failConfirmingBilling(adminClient, orderId.trim());
      return jsonResponse({ error: "Coupon does not belong to this user/hospital" }, 403);
    } else {
      // 2. applicable_plans 검증 (템플릿에 제한이 있으면 플랜 일치 필수)
      let planEligible = true;
      if (coupon.template_id) {
        const { data: template } = await adminClient
          .from("coupon_templates")
          .select("applicable_plans")
          .eq("id", coupon.template_id)
          .single();
        if (template?.applicable_plans?.length > 0 && !template.applicable_plans.includes(billingPlan)) {
          console.error("[toss-payment-confirm] Coupon not applicable to plan:", {
            couponId: billing.coupon_id, plan: billingPlan, applicablePlans: template.applicable_plans,
          });
          planEligible = false;
        }
      }

      if (!planEligible) {
        await failConfirmingBilling(adminClient, orderId.trim());
        return jsonResponse({ error: "Coupon is not applicable to this plan" }, 400);
      }

      // 3. 유효성 검증 (status, usage, expiry)
      if (coupon.status === "active" && coupon.used_count < coupon.max_uses) {
        const notExpired = !coupon.expires_at || new Date(coupon.expires_at) > new Date();
        if (notExpired) {
          if (coupon.discount_type === "percentage") {
            serverDiscountAmount = Math.round(baseAmount * coupon.discount_value / 100);
          } else {
            serverDiscountAmount = Math.min(coupon.discount_value, baseAmount);
          }
        }
      }
    }

    // 서버 계산값으로 billing_history를 덮어쓰기 (클라이언트 값 불신)
    const serverTotalAmount = calcAmountWithVat(baseAmount, serverDiscountAmount);
    if (serverDiscountAmount !== billing.discount_amount || billing.original_amount !== baseAmount) {
      console.warn("[toss-payment-confirm] Overwriting billing with server values:", {
        baseAmount,
        serverDiscount: serverDiscountAmount,
        serverTotal: serverTotalAmount,
        billingDiscount: billing.discount_amount,
        billingOriginalAmount: billing.original_amount,
        couponId: billing.coupon_id,
      });
      const { error: updateErr } = await adminClient
        .from("billing_history")
        .update({
          discount_amount: serverDiscountAmount,
          original_amount: baseAmount,
          amount: serverTotalAmount,
        })
        .eq("id", orderId.trim())
        .eq("payment_status", BILLING_STATUS_CONFIRMING);

      if (updateErr) {
        console.error("[toss-payment-confirm] Failed to overwrite billing:", updateErr.message);
        await failConfirmingBilling(adminClient, orderId.trim());
        return jsonResponse({ error: "Failed to correct billing record" }, 500);
      }
    }
  }

  // ── 업그레이드 크레딧 서버사이드 재검증 ──────────────────────────────────
  // 계산식 (클라이언트 refundService.calcUpgradeCredit / calcRemainingValue와 동일):
  //   totalDays = yearly ? 360 : 30
  //   dailyRate = ceil(amount / totalDays / 10) * 10  (10원 올림)
  //   serverCredit = amount - min(dailyRate × usedDays, amount)  (일할 계산)
  let serverUpgradeCredit = 0;
  // billing.upgrade_credit_amount = 0 이면 클라이언트가 크레딧을 적용하지 않은 것 (전액 결제 또는 0원 크레딧)
  // 이 경우 서버가 강제로 크레딧을 적용하면 TossPayments 결제금액과 불일치(400) 발생
  // → upgrade_credit_amount > 0인 경우에만 서버 재검증 실행
  if (billing.upgrade_source_billing_id && Number(billing.upgrade_credit_amount) > 0) {
    const { data: sourceBilling } = await adminClient
      .from("billing_history")
      .select("id, hospital_id, plan, amount, credit_used_amount, billing_cycle, payment_status, created_at")
      .eq("id", billing.upgrade_source_billing_id)
      .single();

    // 현재 병원 플랜 조회 (다운그레이드 후 재업그레이드 방어용)
    const { data: hospitalPlanData } = await adminClient
      .from("hospitals")
      .select("plan")
      .eq("id", billing.hospital_id)
      .single();
    const currentHospitalPlan = (hospitalPlanData as { plan: string } | null)?.plan ?? null;

    if (!sourceBilling) {
      console.warn("[toss-payment-confirm] upgrade_source_billing not found, ignoring credit:", billing.upgrade_source_billing_id);
    } else if (sourceBilling.hospital_id !== billing.hospital_id) {
      console.error("[toss-payment-confirm] upgrade_source_billing hospital mismatch — possible tampering");
      await failConfirmingBilling(adminClient, orderId.trim());
      return jsonResponse({ error: "Upgrade credit source does not belong to this hospital" }, 403);
    } else if (sourceBilling.payment_status !== "completed") {
      console.warn("[toss-payment-confirm] upgrade_source_billing not completed, ignoring credit");
    } else if (currentHospitalPlan && sourceBilling.plan !== currentHospitalPlan) {
      // 다운그레이드 후 재업그레이드: source billing 플랜이 현재 플랜과 다름
      // (예: Business 결제 건을 Plus 사용자가 업그레이드 크레딧으로 사용 시도)
      // 잔여 금액은 이미 credit_balance에 적립됨 → 업그레이드 크레딧 무효화
      console.warn("[toss-payment-confirm] upgrade_source_billing plan mismatch — ignoring (post-downgrade upgrade):", {
        sourcePlan: sourceBilling.plan, currentPlan: currentHospitalPlan,
      });
    } else {
      const usedDays = Math.ceil((Date.now() - new Date(sourceBilling.created_at).getTime()) / (1000 * 60 * 60 * 24));
      const totalDays = sourceBilling.billing_cycle === "yearly" ? 360 : 30;
      if (usedDays < totalDays) {
        // 실질 납입액 = 현금 + 크레딧 납입액 (클라이언트 calcUpgradeCredit과 동일)
        // NUMERIC 컬럼(credit_used_amount)은 Supabase JS가 문자열로 반환 → Number() 명시적 변환 필수
        const sourceCreditUsed = Number((sourceBilling as Record<string, unknown>).credit_used_amount ?? 0);
        const effectiveAmount = (sourceBilling.amount ?? 0) + sourceCreditUsed;
        const dailyRate = Math.ceil(effectiveAmount / totalDays / 10) * 10;
        const usedCharge = Math.min(dailyRate * usedDays, effectiveAmount);
        serverUpgradeCredit = Math.max(0, effectiveAmount - usedCharge);
      }
    }

    // 서버 크레딧으로 billing_history 보정 (클라이언트 값 불신)
    // NUMERIC 컬럼은 Supabase JS가 문자열로 반환 → Number() 변환 후 비교
    if (serverUpgradeCredit !== Number(billing.upgrade_credit_amount)) {
      const vatBase = calcAmountWithVat(baseAmount, serverDiscountAmount);
      const correctedCredit = Math.min(serverUpgradeCredit, vatBase - 100);
      const correctedAmount = vatBase - correctedCredit;

      // [H-1] Fix: DB 업데이트 전에 amountNum과 일치 여부를 먼저 확인
      // 보정된 금액이 클라이언트 결제 금액과 다르면 DB 수정 없이 400 반환
      // (TossPayments는 이미 클라이언트 금액으로 결제 대기 상태 — 수정 불가)
      if (correctedAmount !== amountNum) {
        console.error("[toss-payment-confirm] Upgrade credit correction would cause amount mismatch:", {
          correctedAmount,
          amountNum,
          serverCredit: serverUpgradeCredit,
          billingCredit: billing.upgrade_credit_amount,
        });
        await failConfirmingBilling(adminClient, orderId.trim());
        return jsonResponse(
          { error: "Amount mismatch after credit correction", expected: correctedAmount, received: amountNum },
          400,
        );
      }

      console.warn("[toss-payment-confirm] Overwriting upgrade_credit with server values:", {
        serverCredit: serverUpgradeCredit,
        billingCredit: billing.upgrade_credit_amount,
        correctedCredit,
      });
      const { error: updateErr } = await adminClient
        .from("billing_history")
        .update({
          upgrade_credit_amount: correctedCredit,
          amount: correctedAmount,
        })
        .eq("id", orderId.trim())
        .eq("payment_status", BILLING_STATUS_CONFIRMING);

      if (updateErr) {
        console.error("[toss-payment-confirm] Failed to overwrite upgrade_credit:", updateErr.message);
        await failConfirmingBilling(adminClient, orderId.trim());
        return jsonResponse({ error: "Failed to correct upgrade credit record" }, 500);
      }
      serverUpgradeCredit = correctedCredit;
    }
  }

  // ── 잔액 크레딧 서버사이드 재검증 ───────────────────────────────────────────
  // NUMERIC 컬럼 → Number() 명시적 변환
  const billingCreditUsed = Number(billing.credit_used_amount ?? 0);
  let serverCreditUsed = 0;
  if (billingCreditUsed > 0) {
    const { data: hospitalData } = await adminClient
      .from("hospitals")
      .select("credit_balance")
      .eq("id", billing.hospital_id)
      .single();

    const availableBalance = (hospitalData as { credit_balance: number } | null)?.credit_balance ?? 0;

    if (billingCreditUsed > availableBalance) {
      console.error("[toss-payment-confirm] credit_used_amount exceeds balance:", {
        creditUsed: billingCreditUsed,
        availableBalance,
        hospitalId: billing.hospital_id,
      });
      await failConfirmingBilling(adminClient, orderId.trim());
      return jsonResponse({ error: "Insufficient credit balance" }, 400);
    }

    const vatBase = calcAmountWithVat(baseAmount, serverDiscountAmount);
    const afterUpgradeCredit = vatBase - serverUpgradeCredit;
    serverCreditUsed = Math.min(billingCreditUsed, afterUpgradeCredit - 100);

    if (serverCreditUsed !== billingCreditUsed) {
      const correctedAmount = afterUpgradeCredit - serverCreditUsed;
      await adminClient
        .from("billing_history")
        .update({ credit_used_amount: serverCreditUsed, amount: correctedAmount })
        .eq("id", orderId.trim())
        .eq("payment_status", BILLING_STATUS_CONFIRMING);
    }
  }

  // VAT 포함 금액 → 업그레이드 크레딧 → 잔액 크레딧 차감 = 최종 청구금액
  const vatTotal = calcAmountWithVat(baseAmount, serverDiscountAmount);
  const expectedAmount = vatTotal - serverUpgradeCredit - serverCreditUsed;
  console.log("[toss-payment-confirm] Amount check:", {
    billingUpgradeCredit: billing.upgrade_credit_amount,
    billingSourceId: billing.upgrade_source_billing_id,
    serverUpgradeCredit,
    serverCreditUsed,
    vatTotal,
    expectedAmount,
    amountNum,
    plan: billingPlan,
  });
  if (expectedAmount !== amountNum) {
    console.error("[toss-payment-confirm] Amount mismatch:", {
      baseAmount,
      discount: serverDiscountAmount,
      upgradeCredit: serverUpgradeCredit,
      creditUsed: serverCreditUsed,
      expected: expectedAmount,
      received: amountNum,
      plan: billingPlan,
      billingCycle: billingCycleVal,
    });
    await failConfirmingBilling(adminClient, orderId.trim());
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
    await releaseConfirmingBilling(adminClient, orderId.trim());
    return jsonResponse({ error: "TossPayments API call failed", detail: msg }, 502);
  }

  let tossData: Record<string, unknown>;
  try {
    tossData = await tossResponse.json() as Record<string, unknown>;
  } catch {
    await releaseConfirmingBilling(adminClient, orderId.trim());
    return jsonResponse({ error: "Invalid response from TossPayments" }, 502);
  }

  if (!tossResponse.ok) {
    const code = typeof tossData.code === "string" ? tossData.code : "UNKNOWN";
    const message = typeof tossData.message === "string" ? tossData.message : "결제 승인 실패";
    console.error("[toss-payment-confirm] TossPayments confirm failed:", code, message);
    await failConfirmingBilling(adminClient, orderId.trim());
    return jsonResponse({ error: message, code }, tossResponse.status >= 400 ? tossResponse.status : 400);
  }

  // [C-4] 쿠폰 사용 처리는 process_payment_callback 내부에서 동일 트랜잭션으로 실행
  // (기존 별도 redeem_coupon 호출 제거 — 원자성 보장)

  // process_payment_callback RPC 호출 (쿠폰 redeem 포함)
  const paymentRef = typeof tossData.paymentKey === "string"
    ? tossData.paymentKey
    : paymentKey.trim();

  const rpcParams: Record<string, unknown> = {
    p_billing_id: orderId.trim(),
    p_payment_ref: paymentRef,
    p_status: "completed",
  };

  // 쿠폰이 적용된 경우 동일 트랜잭션 내에서 redeem 처리
  if (billing.coupon_id && serverDiscountAmount > 0) {
    rpcParams.p_coupon_id = billing.coupon_id;
    rpcParams.p_user_id = user.id;
    rpcParams.p_original_amount = baseAmount;
  }

  const { data: rpcData, error: rpcError } = await adminClient.rpc("process_payment_callback", rpcParams);

  if (rpcError) {
    // [SEC] CRITICAL: Toss가 이미 승인했으나 내부 RPC 실패 — 결제 불일치 발생
    // billing을 'failed'로 마킹하여 조정(reconciliation) 대상임을 표시
    console.error("[toss-payment-confirm] CRITICAL: Toss payment captured but RPC failed. Manual reconciliation required.", {
      orderId: orderId.trim(),
      paymentKey: paymentKey.trim(),
      rpcError: rpcError.message,
    });
    await failConfirmingBilling(adminClient, orderId.trim());
    return jsonResponse(
      { error: "Payment captured but activation failed. Please contact support.", detail: rpcError.message },
      500,
    );
  }

  if (!rpcData) {
    await failConfirmingBilling(adminClient, orderId.trim());
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
