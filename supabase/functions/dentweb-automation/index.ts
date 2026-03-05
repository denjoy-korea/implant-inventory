/**
 * dentweb-automation
 *
 * 병원별 Dentweb 자동화 제어 API
 * - 설정 저장 (enabled, interval)
 * - 수동 실행 요청 버튼
 * - 에이전트 폴링(claim)
 * - 에이전트 실행 결과(report)
 *
 * Auth:
 * - Supabase Auth JWT 필수
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type Json = Record<string, unknown>;
type RunStatus = "idle" | "success" | "no_data" | "failed";
type HospitalPlan = "free" | "basic" | "plus" | "business" | "ultimate";

const ALLOWED_PLANS = new Set<HospitalPlan>(["plus", "business", "ultimate"]);

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function toBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true") return true;
    if (v === "false") return false;
  }
  return fallback;
}

function toInt(value: unknown, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function parseJwtPayload(token: string): Json | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = "=".repeat((4 - (base64.length % 4)) % 4);
    const payload = atob(base64 + pad);
    const parsed = JSON.parse(payload) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    return parsed as Json;
  } catch {
    return null;
  }
}

function getBearerToken(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

type HospitalContext = {
  userId: string;
  hospitalId: string;
  isMaster: boolean;
  plan: HospitalPlan;
};

async function resolveHospitalContext(admin: ReturnType<typeof createClient>, req: Request): Promise<HospitalContext | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const payload = parseJwtPayload(token);
  const userId = String(payload?.sub ?? "").trim();
  if (!userId) return null;

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, hospital_id")
    .eq("id", userId)
    .maybeSingle();
  if (profileError || !profile?.hospital_id) return null;

  const hospitalId = String(profile.hospital_id);
  const { data: hospital, error: hospitalError } = await admin
    .from("hospitals")
    .select("id, master_admin_id, plan")
    .eq("id", hospitalId)
    .maybeSingle();
  if (hospitalError || !hospital) return null;

  const plan = String(hospital.plan ?? "") as HospitalPlan;
  if (!ALLOWED_PLANS.has(plan)) {
    return {
      userId,
      hospitalId,
      isMaster: String(hospital.master_admin_id ?? "") === userId,
      plan,
    };
  }

  return {
    userId,
    hospitalId,
    isMaster: String(hospital.master_admin_id ?? "") === userId,
    plan,
  };
}

type SettingsRow = {
  hospital_id: string;
  enabled: boolean;
  interval_minutes: number;
  manual_run_requested: boolean;
  manual_run_requested_at: string | null;
  last_run_at: string | null;
  last_status: RunStatus;
  last_message: string | null;
  updated_at: string;
};

async function ensureSettingsRow(admin: ReturnType<typeof createClient>, hospitalId: string): Promise<SettingsRow | null> {
  await admin
    .from("dentweb_automation_settings")
    .upsert(
      {
        hospital_id: hospitalId,
      },
      { onConflict: "hospital_id" },
    );

  const { data, error } = await admin
    .from("dentweb_automation_settings")
    .select("*")
    .eq("hospital_id", hospitalId)
    .maybeSingle();

  if (error || !data) return null;
  return data as SettingsRow;
}

function isDueNow(row: SettingsRow): boolean {
  if (!row.enabled) return false;
  if (!row.last_run_at) return true;
  const last = new Date(row.last_run_at);
  if (Number.isNaN(last.getTime())) return true;
  const dueAt = new Date(last.getTime() + row.interval_minutes * 60_000);
  return Date.now() >= dueAt.getTime();
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ ok: false, error: "Server misconfigured" }, 500, corsHeaders);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ctx = await resolveHospitalContext(admin, req);
  if (!ctx) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  if (!ALLOWED_PLANS.has(ctx.plan)) {
    return jsonResponse(
      { ok: false, error: "plan_not_allowed", message: "Plus 이상 플랜에서만 자동화를 사용할 수 있습니다." },
      403,
      corsHeaders,
    );
  }

  let body: Json;
  try {
    const parsed = await req.json() as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return jsonResponse({ ok: false, error: "invalid_body" }, 400, corsHeaders);
    }
    body = parsed as Json;
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400, corsHeaders);
  }

  const action = String(body.action ?? "get_state");
  const current = await ensureSettingsRow(admin, ctx.hospitalId);
  if (!current) {
    return jsonResponse({ ok: false, error: "settings_not_found" }, 500, corsHeaders);
  }

  if (action === "get_state") {
    return jsonResponse({ ok: true, state: current }, 200, corsHeaders);
  }

  if (action === "save_settings") {
    if (!ctx.isMaster) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403, corsHeaders);
    }

    const enabled = toBool(body.enabled, current.enabled);
    const interval = toInt(body.interval_minutes, current.interval_minutes);
    if (interval < 5 || interval > 1440) {
      return jsonResponse({ ok: false, error: "interval_minutes must be between 5 and 1440" }, 422, corsHeaders);
    }

    const { data, error } = await admin
      .from("dentweb_automation_settings")
      .update({
        enabled,
        interval_minutes: interval,
      })
      .eq("hospital_id", ctx.hospitalId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ ok: false, error: "save_failed" }, 500, corsHeaders);
    }
    return jsonResponse({ ok: true, state: data }, 200, corsHeaders);
  }

  if (action === "request_run") {
    const { data, error } = await admin
      .from("dentweb_automation_settings")
      .update({
        manual_run_requested: true,
        manual_run_requested_at: new Date().toISOString(),
      })
      .eq("hospital_id", ctx.hospitalId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ ok: false, error: "request_failed" }, 500, corsHeaders);
    }
    return jsonResponse({ ok: true, state: data }, 200, corsHeaders);
  }

  if (action === "claim_run") {
    const due = isDueNow(current);
    const shouldRun = current.manual_run_requested || due;
    const reason = current.manual_run_requested ? "manual_request" : due ? "interval_due" : "not_due";
    return jsonResponse(
      {
        ok: true,
        should_run: shouldRun,
        reason,
        state: current,
      },
      200,
      corsHeaders,
    );
  }

  if (action === "report_run") {
    const statusRaw = String(body.status ?? "").trim().toLowerCase();
    const status = (["success", "no_data", "failed"].includes(statusRaw) ? statusRaw : "failed") as RunStatus;
    const message = String(body.message ?? "").slice(0, 1000);

    const { data, error } = await admin
      .from("dentweb_automation_settings")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: status,
        last_message: message || null,
        manual_run_requested: false,
      })
      .eq("hospital_id", ctx.hospitalId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ ok: false, error: "report_failed" }, 500, corsHeaders);
    }
    return jsonResponse({ ok: true, state: data }, 200, corsHeaders);
  }

  return jsonResponse({ ok: false, error: `Unknown action: ${action}` }, 400, corsHeaders);
});
