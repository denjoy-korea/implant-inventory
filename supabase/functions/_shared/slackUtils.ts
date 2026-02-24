import { createClient } from "jsr:@supabase/supabase-js@2";

// ── AES-GCM 복호화 ─────────────────────────────────────────────────────────
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

interface SlackWebhook { id: string; name: string; url: string; }

/**
 * system_integrations.slack_webhooks에서 채널명으로 Webhook URL 조회
 * @param channelName 관리자 UI에 등록된 채널 이름 (예: "멤버알림", "문의알림")
 * @returns Webhook URL 또는 null (미등록 / 설정 없음)
 */
export async function getSlackWebhookUrl(channelName: string): Promise<string | null> {
  try {
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const patientDataKey = Deno.env.get("PATIENT_DATA_KEY");
    if (!patientDataKey) return null;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await adminClient
      .from("system_integrations")
      .select("value")
      .eq("key", "slack_webhooks")
      .maybeSingle();

    if (!data?.value) return null;

    const decrypted = await decryptENCv2(data.value, patientDataKey).catch(() => null);
    if (!decrypted) return null;

    const webhooks: SlackWebhook[] = JSON.parse(decrypted);
    return webhooks.find(w => w.name === channelName)?.url ?? null;
  } catch {
    return null;
  }
}
