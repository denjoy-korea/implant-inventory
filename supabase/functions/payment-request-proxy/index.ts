/**
 * payment-request-proxy
 *
 * 클라이언트가 직접 Make 웹훅 URL을 알 필요 없이,
 * 인증된 사용자 요청만 서버에서 검증 후 전달하는 프록시.
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PaymentProxyPayload {
  billing_id?: string;
  hospital_id?: string;
  [key: string]: unknown;
}

interface ProfileRow {
  hospital_id: string | null;
}

interface BillingRow {
  hospital_id: string;
  payment_status: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function asObject(value: unknown): Record<string, unknown> | null {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

function buildCallbackUrl(supabaseUrl: string, billingId: string): string {
  const defaultBase = `${supabaseUrl}/functions/v1/payment-callback`;
  const configuredBase = (Deno.env.get("PAYMENT_CALLBACK_URL") || defaultBase).trim();
  const callbackSecret = (Deno.env.get("PAYMENT_CALLBACK_SECRET") || "").trim();

  let callbackUrl: URL;
  try {
    callbackUrl = new URL(configuredBase);
  } catch {
    callbackUrl = new URL(defaultBase);
  }

  callbackUrl.searchParams.set("billing_id", billingId);
  if (callbackSecret) {
    callbackUrl.searchParams.set("token", callbackSecret);
  }

  return callbackUrl.toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing bearer token" }, 401);
  }
  const accessToken = authHeader.slice("Bearer ".length).trim();
  if (!accessToken) {
    return jsonResponse({ error: "Invalid bearer token" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase env is not configured" }, 500);
  }

  let parsedBody: unknown;
  try {
    parsedBody = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  // supabase.functions.invoke(..., { body: JSON.stringify(...) })도 허용
  let bodyObj: Record<string, unknown> | null = null;
  if (typeof parsedBody === "string") {
    try {
      bodyObj = asObject(JSON.parse(parsedBody));
    } catch {
      return jsonResponse({ error: "Body string is not valid JSON" }, 400);
    }
  } else {
    bodyObj = asObject(parsedBody);
  }
  if (!bodyObj) {
    return jsonResponse({ error: "Body must be an object" }, 400);
  }
  const payload = bodyObj as PaymentProxyPayload;

  const billingId = typeof payload.billing_id === "string" ? payload.billing_id.trim() : "";
  const hospitalIdFromClient = typeof payload.hospital_id === "string" ? payload.hospital_id.trim() : "";
  if (!billingId || !hospitalIdFromClient) {
    return jsonResponse({ error: "billing_id and hospital_id are required" }, 400);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
    error: userError,
  } = await authClient.auth.getUser();
  if (userError || !user) {
    return jsonResponse({ error: "Unauthorized request" }, 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("hospital_id")
    .eq("id", user.id)
    .single();
  if (profileError || !profile) {
    return jsonResponse({ error: "Failed to resolve user profile" }, 403);
  }

  const profileRow = profile as ProfileRow;
  if (!profileRow.hospital_id) {
    return jsonResponse({ error: "User has no hospital scope" }, 403);
  }

  const { data: billing, error: billingError } = await adminClient
    .from("billing_history")
    .select("hospital_id, payment_status")
    .eq("id", billingId)
    .single();
  if (billingError || !billing) {
    return jsonResponse({ error: "Billing record not found" }, 404);
  }

  const billingRow = billing as BillingRow;
  if (billingRow.hospital_id !== profileRow.hospital_id) {
    return jsonResponse({ error: "Forbidden hospital scope" }, 403);
  }
  if (billingRow.hospital_id !== hospitalIdFromClient) {
    return jsonResponse({ error: "Hospital ID mismatch" }, 400);
  }
  if (billingRow.payment_status !== "pending") {
    return jsonResponse({ error: "Billing is not pending" }, 409);
  }

  const makeWebhookUrl = Deno.env.get("MAKE_WEBHOOK_URL");
  if (!makeWebhookUrl) {
    return jsonResponse(
      { forwarded: false, manual: true, message: "MAKE_WEBHOOK_URL not configured" },
      202,
    );
  }

  try {
    const callbackUrl = buildCallbackUrl(supabaseUrl, billingId);

    const response = await fetch(makeWebhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...payload,
        hospital_id: billingRow.hospital_id, // 서버 검증값으로 강제
        callback_url: callbackUrl, // 클라이언트 입력 무시, 서버 구성값으로 강제
      }),
    });

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 500);
      return jsonResponse(
        { forwarded: false, manual: false, error: `Webhook HTTP ${response.status}`, detail },
        502,
      );
    }

    return jsonResponse({ forwarded: true, manual: false });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return jsonResponse({ forwarded: false, manual: false, error: message }, 502);
  }
});
