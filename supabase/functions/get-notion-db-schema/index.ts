import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

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
  const payload    = base64ToBytes(encrypted.slice(6));
  const iv         = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  const key        = await deriveKey(secret);
  const plain      = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  try {
    const corsHeaders   = getCorsHeaders(req);
    const supabaseUrl   = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const patientDataKey = Deno.env.get("PATIENT_DATA_KEY");

    if (!patientDataKey) {
      return new Response(JSON.stringify({ error: "crypto_key_missing" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 1. 호출자 admin 권한 확인 ──
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: { user }, error: userError } = await adminClient.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await adminClient
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. Notion 인증정보 로드 및 복호화 ──
    const { data: rows } = await adminClient
      .from("system_integrations")
      .select("key, value")
      .in("key", ["notion_api_token", "notion_consultation_db_id"]);

    const rowMap: Record<string, string> = {};
    for (const row of rows ?? []) rowMap[row.key] = row.value;

    if (!rowMap["notion_api_token"] || !rowMap["notion_consultation_db_id"]) {
      return new Response(JSON.stringify({ error: "not_configured" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const notionToken = await decryptENCv2(rowMap["notion_api_token"], patientDataKey);
    const dbId        = await decryptENCv2(rowMap["notion_consultation_db_id"], patientDataKey);

    // ── 3. Notion DB 스키마 조회 ──
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${dbId}`, {
      headers: {
        "Authorization":  `Bearer ${notionToken}`,
        "Notion-Version": "2022-06-28",
      },
    });

    if (!notionRes.ok) {
      const text = await notionRes.text();
      console.error("[get-notion-db-schema] Notion API failed:", notionRes.status, text);
      return new Response(JSON.stringify({ error: "notion_api_error" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dbSchema = await notionRes.json();
    const columns = Object.entries(dbSchema.properties as Record<string, { type: string }>)
      .map(([name, prop]) => ({ name, type: prop.type }))
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));

    return new Response(JSON.stringify({ columns }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[get-notion-db-schema] error:", err);
    return new Response(JSON.stringify({ error: "internal_error" }), {
      status: 200, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
