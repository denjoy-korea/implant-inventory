import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const TIME_SLOT_KO: Record<string, string> = {
  morning:   "오전 (9시–12시)",
  afternoon: "오후 (13시–17시)",
  evening:   "저녁 (17시–19시)",
};

// ── AES-GCM 복호화 (crypto-service와 동일한 로직) ──────────────────────────
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
  const payload  = base64ToBytes(encrypted.slice(6));
  const iv       = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  const key      = await deriveKey(secret);
  const plain    = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const corsHeaders = getCorsHeaders(req);

    // ── 1. system_integrations에서 Notion 설정 로드 ──
    const supabaseUrl     = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const patientDataKey  = Deno.env.get("PATIENT_DATA_KEY");

    if (!patientDataKey) {
      console.error("[notify-consultation] PATIENT_DATA_KEY not configured");
      return new Response(JSON.stringify({ success: false, reason: "crypto_key_missing" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: rows } = await adminClient
      .from("system_integrations")
      .select("key, value")
      .in("key", ["notion_api_token", "notion_consultation_db_id"]);

    const rowMap: Record<string, string> = {};
    for (const row of rows ?? []) {
      rowMap[row.key] = row.value;
    }

    if (!rowMap["notion_api_token"] || !rowMap["notion_consultation_db_id"]) {
      console.warn("[notify-consultation] Notion not configured in system_integrations — skipping");
      return new Response(JSON.stringify({ success: false, reason: "not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. 복호화 ──
    const notionToken = await decryptENCv2(rowMap["notion_api_token"], patientDataKey);
    const dbId        = await decryptENCv2(rowMap["notion_consultation_db_id"], patientDataKey);

    // ── 3. 요청 데이터 파싱 ──
    const { name, email, hospital_name, region, contact, preferred_date, preferred_time_slot } =
      await req.json();

    // ── 4. Notion 페이지 properties 구성 ──
    const properties: Record<string, unknown> = {
      "이름":     { title:     [{ text: { content: name         || "" } }] },
      "병원명":   { rich_text: [{ text: { content: hospital_name || "" } }] },
      "이메일":   { email:     email   || null },
      "연락처":   { phone_number: contact || null },
      "지역":     { rich_text: [{ text: { content: region       || "" } }] },
      "상태":     { status:    { name: "접수됨" } },
      "신청 일시":{ date:      { start: new Date().toISOString() } },
    };

    if (preferred_date)      properties["선호 날짜"]  = { date:   { start: preferred_date } };
    if (preferred_time_slot) properties["선호 시간대"] = { select: { name: TIME_SLOT_KO[preferred_time_slot] ?? preferred_time_slot } };

    // ── 5. Notion API 호출 ──
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method:  "POST",
      headers: {
        "Authorization":  `Bearer ${notionToken}`,
        "Content-Type":   "application/json",
        "Notion-Version": "2022-06-28",
      },
      body: JSON.stringify({ parent: { database_id: dbId }, properties }),
    });

    if (!notionRes.ok) {
      const text = await notionRes.text();
      console.error("[notify-consultation] Notion API failed:", notionRes.status, text);
      return new Response(JSON.stringify({ success: false, reason: "notion_api_error" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
    console.log(`[notify-consultation] Notion row created — ${hospital_name} / ${name} / ${now} KST`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-consultation] error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
