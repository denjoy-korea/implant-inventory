/**
 * notify-hospital-slack — 병원 Slack 알림 전송 Edge Function
 *
 * Request : POST /functions/v1/notify-hospital-slack
 *           Body: { hospital_id, event, payload }
 * Response: { ok: boolean }
 *
 * 인증: Supabase Auth JWT (authenticated user)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, createAdminClient } from "../_shared/authUtils.ts";

// ── AES-GCM 복호화 ──────────────────────────────────────────────
const PBKDF2_SALT = new TextEncoder().encode("implant-inventory-pbkdf2-salt-v1");

async function deriveKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw", new TextEncoder().encode(secret), "PBKDF2", false, ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: PBKDF2_SALT, iterations: 100_000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function decryptENCv2(encrypted: string, secret: string): Promise<string> {
  if (!encrypted.startsWith("ENCv2:")) throw new Error("not ENCv2 format");
  const payload    = base64ToBytes(encrypted.slice(6));
  const iv         = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  const key        = await deriveKey(secret);
  const plain      = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

// ── Slack Webhook URL 조회 ───────────────────────────────────────
async function getHospitalSlackWebhookUrl(
  hospitalId: string,
  patientDataKey: string,
): Promise<string | null> {
  const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const adminClient    = createClient(supabaseUrl, serviceRoleKey);

  const { data } = await adminClient
    .from("hospital_integrations")
    .select("config")
    .eq("hospital_id", hospitalId)
    .eq("provider", "slack")
    .eq("is_active", true)
    .maybeSingle();

  if (!data?.config) return null;

  try {
    const decrypted = await decryptENCv2(data.config, patientDataKey);
    const config = JSON.parse(decrypted) as { webhook_url?: string };
    return config.webhook_url ?? null;
  } catch {
    return null;
  }
}

// ── 이벤트별 메시지 포맷 ─────────────────────────────────────────
type SlackEventType =
  | "order_created"
  | "order_received"
  | "fail_registered"
  | "return_requested"
  | "return_completed"
  | "surgery_uploaded"
  | "stock_alert";

function formatMessage(event: SlackEventType, payload: Record<string, unknown>): string {
  switch (event) {
    case "order_created":
      return [
        `📦 *발주 생성*`,
        `제조사: *${payload.manufacturer ?? "-"}*`,
        `품목 수: ${payload.item_count ?? "-"}개${payload.created_by ? `  |  담당자: ${payload.created_by}` : ""}`,
      ].join("\n");

    case "order_received":
      return [
        `✅ *발주 수령 완료*`,
        `제조사: *${payload.manufacturer ?? "-"}*`,
        `입고일: ${payload.received_date ?? "-"}${payload.confirmed_by ? `  |  처리자: ${payload.confirmed_by}` : ""}`,
      ].join("\n");

    case "fail_registered":
      return [
        `🔄 *교환(FAIL) 등록*`,
        `제조사: *${payload.manufacturer ?? "-"}*`,
        `품목 수: ${payload.item_count ?? "-"}개${payload.created_by ? `  |  담당자: ${payload.created_by}` : ""}`,
      ].join("\n");

    case "return_requested":
      return [
        `📮 *반품 요청 접수*`,
        `제조사: *${payload.manufacturer ?? "-"}*`,
        `품목 수: ${payload.item_count ?? "-"}개${payload.created_by ? `  |  담당자: ${payload.created_by}` : ""}`,
      ].join("\n");

    case "return_completed":
      return [
        `🎉 *반품 완료*`,
        `반품 픽업이 완료되어 재고에서 차감되었습니다.`,
      ].join("\n");

    case "surgery_uploaded": {
      const inserted = payload.inserted as number ?? 0;
      const skipped  = payload.skipped  as number ?? 0;
      return [
        `📋 *수술기록 업로드 완료*`,
        `저장: *${inserted}건*${skipped > 0 ? `  |  중복 skip: ${skipped}건` : ""}`,
        payload.file_name ? `파일: ${payload.file_name}` : "",
      ].filter(Boolean).join("\n");
    }

    case "stock_alert": {
      const items = payload.items as Array<{ name: string; current: number; recommended: number }> ?? [];
      const summary = items.slice(0, 5).map(i =>
        `• ${i.name}  현재 ${i.current}개 / 권장 ${i.recommended}개`
      ).join("\n");
      const extra = items.length > 5 ? `\n외 ${items.length - 5}개 품목 더` : "";
      return [
        `⚠️ *재고 부족 알림*`,
        `${items.length}개 품목이 권장재고 이하입니다.`,
        summary + extra,
      ].join("\n");
    }

    default:
      return `DenJOY 알림: ${event}`;
  }
}

// ── Slack 전송 ───────────────────────────────────────────────────
async function sendSlack(webhookUrl: string, text: string): Promise<boolean> {
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── 메인 핸들러 ─────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ ok: false }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 인증: JWT 필수 (verify_jwt = true로 게이트웨이에서 검증됨)
    const auth = await requireAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;

    const patientDataKey = Deno.env.get("PATIENT_DATA_KEY");
    if (!patientDataKey) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { hospital_id, event, payload } = await req.json() as {
      hospital_id: string;
      event: SlackEventType;
      payload: Record<string, unknown>;
    };

    if (!hospital_id || !event) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 소유권 검증: 요청한 사용자가 해당 병원 소속인지 확인
    const adminClient = createAdminClient();
    const { data: membership } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", auth.user.id)
      .eq("hospital_id", hospital_id)
      .maybeSingle();

    if (!membership) {
      return new Response(JSON.stringify({ ok: false }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const webhookUrl = await getHospitalSlackWebhookUrl(hospital_id, patientDataKey);
    if (!webhookUrl) {
      // Slack 미연동 — 정상 케이스, ok: true 반환
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const text = formatMessage(event, payload ?? {});
    const sent = await sendSlack(webhookUrl, text);

    return new Response(JSON.stringify({ ok: sent }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-hospital-slack] error:", err);
    return new Response(JSON.stringify({ ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
