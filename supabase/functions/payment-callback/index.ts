/**
 * payment-callback
 *
 * 결제 승인/실패 통보를 받아 billing_history + hospital plan 상태를 반영한다.
 * process_payment_callback RPC는 service_role만 실행 가능하므로 Edge Function에서만 호출한다.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-callback-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CallbackStatus = "completed" | "failed";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function timingSafeEquals(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  if (aBytes.length !== bBytes.length) return false;

  let diff = 0;
  for (let i = 0; i < aBytes.length; i += 1) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}

function normalizeKey(key: string): string {
  return key.replace(/[-\s]/g, "_").toLowerCase();
}

function getStringValue(source: Record<string, unknown>, keys: string[]): string {
  const normalized = new Map<string, unknown>();
  for (const [key, value] of Object.entries(source)) {
    normalized.set(normalizeKey(key), value);
  }

  for (const key of keys) {
    const value = normalized.get(normalizeKey(key));
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
    if (typeof value === "boolean") return value ? "true" : "false";
  }

  return "";
}

async function parseBody(req: Request): Promise<Record<string, unknown>> {
  const contentType = (req.headers.get("content-type") || "").toLowerCase();

  if (contentType.includes("application/json")) {
    try {
      return asRecord(await req.json());
    } catch {
      return {};
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const text = await req.text();
    return Object.fromEntries(new URLSearchParams(text));
  }

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData();
    const result: Record<string, unknown> = {};
    for (const [key, value] of formData.entries()) {
      result[key] = typeof value === "string" ? value : value.name;
    }
    return result;
  }

  const raw = (await req.text()).trim();
  if (!raw) return {};

  try {
    return asRecord(JSON.parse(raw));
  } catch {
    return Object.fromEntries(new URLSearchParams(raw));
  }
}

function normalizeStatus(rawStatus: string): CallbackStatus | null {
  const normalized = rawStatus.trim().toLowerCase();
  if (!normalized) return null;

  const completedValues = new Set([
    "completed",
    "complete",
    "paid",
    "success",
    "succeeded",
    "approved",
    "approve",
    "ok",
    "done",
    "true",
    "1",
  ]);
  if (completedValues.has(normalized) || normalized.includes("success") || normalized.includes("approve")) {
    return "completed";
  }

  const failedValues = new Set([
    "failed",
    "fail",
    "failure",
    "cancel",
    "cancelled",
    "canceled",
    "denied",
    "declined",
    "error",
    "false",
    "0",
  ]);
  if (failedValues.has(normalized) || normalized.includes("fail") || normalized.includes("cancel")) {
    return "failed";
  }

  return null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const callbackSecret = (Deno.env.get("PAYMENT_CALLBACK_SECRET") || "").trim();
  if (callbackSecret) {
    const queryToken = req.url ? new URL(req.url).searchParams.get("token") || "" : "";
    const headerToken = (req.headers.get("x-callback-token") || "").trim();
    const requestToken = queryToken || headerToken;
    if (!requestToken || !timingSafeEquals(requestToken, callbackSecret)) {
      return jsonResponse({ error: "Invalid callback token" }, 401);
    }
  }

  const body = await parseBody(req);
  const query = Object.fromEntries(new URL(req.url).searchParams.entries());
  const payload: Record<string, unknown> = { ...body, ...query };

  const billingId = getStringValue(payload, [
    "billing_id",
    "billingId",
    "merchant_uid",
    "merchantUid",
    "order_id",
    "orderId",
    "order_no",
    "orderNo",
  ]);

  if (!billingId || !isUuid(billingId)) {
    return jsonResponse({ error: "Invalid billing_id" }, 400);
  }

  const statusRaw = getStringValue(payload, [
    "status",
    "payment_status",
    "paymentStatus",
    "result",
    "payment_result",
    "pay_status",
    "state",
    "success",
  ]);
  const status = normalizeStatus(statusRaw);
  if (!status) {
    return jsonResponse({ error: "Unable to determine payment status", status_raw: statusRaw || null }, 400);
  }

  const paymentRef =
    getStringValue(payload, [
      "payment_ref",
      "paymentRef",
      "transaction_id",
      "transactionId",
      "tid",
      "imp_uid",
      "pg_tid",
      "trade_no",
      "receipt_id",
      "id",
    ]) || `callback-${Date.now()}`;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase env is not configured" }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await adminClient.rpc("process_payment_callback", {
    p_billing_id: billingId,
    p_payment_ref: paymentRef,
    p_status: status,
  });

  if (error) {
    return jsonResponse(
      { error: "Failed to process payment callback", detail: error.message },
      500,
    );
  }

  if (!data) {
    return jsonResponse(
      { error: "Payment callback rejected", billing_id: billingId, status },
      409,
    );
  }

  return jsonResponse({ ok: true, billing_id: billingId, status, payment_ref: paymentRef });
});
