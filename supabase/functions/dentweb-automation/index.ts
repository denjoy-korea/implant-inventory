/**
 * dentweb-automation
 *
 * 병원별 Dentweb 자동화 제어 API
 *
 * 사용자 액션 (Supabase JWT):
 *   - get_state: 현재 설정/상태 조회
 *   - save_settings: 자동 실행 ON/OFF, 간격 변경 (master 전용)
 *   - request_run: 수동 실행 요청
 *   - generate_token: 에이전트 토큰 발급/재발급 (master 전용)
 *
 * 에이전트 액션 (agent_token):
 *   - claim_run: 실행 여부 폴링 + running 전이
 *   - report_run: 실행 결과 보고
 *
 * Auth:
 *   - verify_jwt = false (config.toml)
 *   - JWT / agent_token 분기 인증을 Edge Function 내부에서 처리
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

type Json = Record<string, unknown>;
type RunStatus = "idle" | "running" | "success" | "no_data" | "failed";
type HospitalPlan = "free" | "basic" | "plus" | "business" | "ultimate";

const ALLOWED_PLANS = new Set<HospitalPlan>(["plus", "business", "ultimate"]);

// ─── Helpers ──────────────────────────────────────────────

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

function getBearerToken(req: Request): string {
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.toLowerCase().startsWith("bearer ")) return "";
  return auth.slice(7).trim();
}

function isAgentToken(token: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token);
}

function maskToken(token: string | null): string | null {
  if (!token) return null;
  if (token.length < 8) return "****";
  return `****-****-****-${token.slice(-4)}`;
}

// ─── JWT 사용자 컨텍스트 ─────────────────────────────────

type UserContext = {
  type: "user";
  userId: string;
  hospitalId: string;
  isMaster: boolean;
  plan: HospitalPlan;
};

type AgentContext = {
  type: "agent";
  hospitalId: string;
  plan: HospitalPlan;
};

type AuthContext = UserContext | AgentContext;

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

async function resolveUserContext(
  admin: ReturnType<typeof createClient>,
  token: string,
): Promise<UserContext | null> {
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

  return {
    type: "user",
    userId,
    hospitalId,
    isMaster: String(hospital.master_admin_id ?? "") === userId,
    plan: String(hospital.plan ?? "") as HospitalPlan,
  };
}

async function resolveAgentContext(
  admin: ReturnType<typeof createClient>,
  token: string,
): Promise<AgentContext | null> {
  const { data, error } = await admin
    .from("dentweb_automation_settings")
    .select("hospital_id")
    .eq("agent_token", token)
    .maybeSingle();
  if (error || !data) return null;

  const hospitalId = String(data.hospital_id);
  const { data: hospital, error: hospitalError } = await admin
    .from("hospitals")
    .select("plan")
    .eq("id", hospitalId)
    .maybeSingle();
  if (hospitalError || !hospital) return null;

  return {
    type: "agent",
    hospitalId,
    plan: String(hospital.plan ?? "") as HospitalPlan,
  };
}

// ─── Settings Row ─────────────────────────────────────────

type SettingsRow = {
  hospital_id: string;
  enabled: boolean;
  interval_minutes: number;
  manual_run_requested: boolean;
  manual_run_requested_at: string | null;
  last_run_at: string | null;
  last_status: RunStatus;
  last_message: string | null;
  claimed_at: string | null;
  agent_token: string | null;
  stale_timeout_minutes: number;
  updated_at: string;
};

async function ensureSettingsRow(
  admin: ReturnType<typeof createClient>,
  hospitalId: string,
): Promise<SettingsRow | null> {
  // agent_token을 자동 할당하며 행 생성 (이미 존재하면 무시)
  await admin
    .from("dentweb_automation_settings")
    .upsert(
      { hospital_id: hospitalId, agent_token: crypto.randomUUID() },
      { onConflict: "hospital_id", ignoreDuplicates: true },
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

function isStale(row: SettingsRow): boolean {
  if (row.last_status !== "running" || !row.claimed_at) return false;
  const claimed = new Date(row.claimed_at);
  if (Number.isNaN(claimed.getTime())) return false;
  const timeout = row.stale_timeout_minutes * 60_000;
  return Date.now() >= claimed.getTime() + timeout;
}

/** state 응답에서 agent_token은 마스킹 처리 */
function sanitizeState(row: SettingsRow): Record<string, unknown> {
  return {
    hospital_id: row.hospital_id,
    enabled: row.enabled,
    interval_minutes: row.interval_minutes,
    manual_run_requested: row.manual_run_requested,
    manual_run_requested_at: row.manual_run_requested_at,
    last_run_at: row.last_run_at,
    last_status: row.last_status,
    last_message: row.last_message,
    claimed_at: row.claimed_at,
    has_agent_token: !!row.agent_token,
    agent_token_masked: maskToken(row.agent_token),
    stale_timeout_minutes: row.stale_timeout_minutes,
    updated_at: row.updated_at,
  };
}

// ─── Main Handler ─────────────────────────────────────────

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

  // ── 인증 분기 ──
  const token = getBearerToken(req);
  if (!token) {
    return jsonResponse({ ok: false, error: "Unauthorized" }, 401, corsHeaders);
  }

  let ctx: AuthContext | null = null;
  if (isAgentToken(token)) {
    ctx = await resolveAgentContext(admin, token);
  } else {
    ctx = await resolveUserContext(admin, token);
  }

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

  // ── Body 파싱 ──
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

  // ── stale claim 자동 복구 (매 요청 시 체크) ──
  if (isStale(current)) {
    await admin
      .from("dentweb_automation_settings")
      .update({
        last_status: "failed",
        last_message: "stale claim timeout",
        claimed_at: null,
      })
      .eq("hospital_id", ctx.hospitalId);
    current.last_status = "failed";
    current.last_message = "stale claim timeout";
    current.claimed_at = null;
  }

  // ══════════════════════════════════════════════════════════
  // 사용자 액션 (JWT 전용)
  // ══════════════════════════════════════════════════════════

  if (action === "get_state") {
    return jsonResponse({ ok: true, state: sanitizeState(current) }, 200, corsHeaders);
  }

  if (action === "save_settings") {
    if (ctx.type !== "user" || !ctx.isMaster) {
      return jsonResponse({ ok: false, error: "forbidden" }, 403, corsHeaders);
    }

    const enabled = toBool(body.enabled, current.enabled);
    const interval = toInt(body.interval_minutes, current.interval_minutes);
    if (interval < 5 || interval > 1440) {
      return jsonResponse({ ok: false, error: "interval_minutes must be between 5 and 1440" }, 422, corsHeaders);
    }

    const { data, error } = await admin
      .from("dentweb_automation_settings")
      .update({ enabled, interval_minutes: interval })
      .eq("hospital_id", ctx.hospitalId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ ok: false, error: "save_failed" }, 500, corsHeaders);
    }
    return jsonResponse({ ok: true, state: sanitizeState(data as SettingsRow) }, 200, corsHeaders);
  }

  if (action === "request_run") {
    if (ctx.type !== "user") {
      return jsonResponse({ ok: false, error: "forbidden" }, 403, corsHeaders);
    }

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
    return jsonResponse({ ok: true, state: sanitizeState(data as SettingsRow) }, 200, corsHeaders);
  }

  if (action === "generate_token") {
    if (ctx.type !== "user") {
      return jsonResponse({ ok: false, error: "forbidden" }, 403, corsHeaders);
    }

    const newToken = crypto.randomUUID();
    const { data, error } = await admin
      .from("dentweb_automation_settings")
      .update({ agent_token: newToken })
      .eq("hospital_id", ctx.hospitalId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ ok: false, error: "generate_failed" }, 500, corsHeaders);
    }
    return jsonResponse(
      { ok: true, agent_token: newToken, state: sanitizeState(data as SettingsRow) },
      200,
      corsHeaders,
    );
  }

  // ══════════════════════════════════════════════════════════
  // 에이전트 액션 (agent_token 전용)
  // ══════════════════════════════════════════════════════════

  if (action === "claim_run") {
    if (ctx.type !== "agent") {
      return jsonResponse({ ok: false, error: "agent_only" }, 403, corsHeaders);
    }

    // 이미 running 상태면 중복 claim 방지
    if (current.last_status === "running") {
      return jsonResponse(
        { ok: true, should_run: false, reason: "already_running", state: sanitizeState(current) },
        200,
        corsHeaders,
      );
    }

    const due = isDueNow(current);
    const shouldRun = current.manual_run_requested || due;
    const reason = current.manual_run_requested ? "manual_request" : due ? "interval_due" : "not_due";

    if (shouldRun) {
      const { data, error } = await admin
        .from("dentweb_automation_settings")
        .update({
          last_status: "running",
          claimed_at: new Date().toISOString(),
          manual_run_requested: false,
        })
        .eq("hospital_id", ctx.hospitalId)
        .select("*")
        .maybeSingle();

      if (error || !data) {
        return jsonResponse({ ok: false, error: "claim_failed" }, 500, corsHeaders);
      }

      const uploadUrl = `${supabaseUrl}/functions/v1/dentweb-upload`;
      return jsonResponse(
        { ok: true, should_run: true, reason, upload_url: uploadUrl, state: sanitizeState(data as SettingsRow) },
        200,
        corsHeaders,
      );
    }

    return jsonResponse(
      { ok: true, should_run: false, reason, state: sanitizeState(current) },
      200,
      corsHeaders,
    );
  }

  if (action === "report_run") {
    if (ctx.type !== "agent") {
      return jsonResponse({ ok: false, error: "agent_only" }, 403, corsHeaders);
    }

    if (current.last_status !== "running") {
      return jsonResponse({ ok: false, error: "not_running" }, 409, corsHeaders);
    }

    const statusRaw = String(body.status ?? "").trim().toLowerCase();
    const status = (["success", "no_data", "failed"].includes(statusRaw) ? statusRaw : "failed") as RunStatus;
    const message = String(body.message ?? "").slice(0, 1000);

    const { data, error } = await admin
      .from("dentweb_automation_settings")
      .update({
        last_run_at: new Date().toISOString(),
        last_status: status,
        last_message: message || null,
        claimed_at: null,
      })
      .eq("hospital_id", ctx.hospitalId)
      .select("*")
      .maybeSingle();

    if (error || !data) {
      return jsonResponse({ ok: false, error: "report_failed" }, 500, corsHeaders);
    }
    return jsonResponse({ ok: true, state: sanitizeState(data as SettingsRow) }, 200, corsHeaders);
  }

  return jsonResponse({ ok: false, error: `Unknown action: ${action}` }, 400, corsHeaders);
});
