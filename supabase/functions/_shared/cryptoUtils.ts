// ── AES-GCM 복호화 (ENCv2) ─────────────────────────────────────────────────
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

export async function decryptENCv2(encrypted: string, secret: string): Promise<string> {
  if (!encrypted.startsWith("ENCv2:")) throw new Error("not ENCv2 format");
  const payload    = base64ToBytes(encrypted.slice(6));
  const iv         = payload.slice(0, 12);
  const ciphertext = payload.slice(12);
  const key        = await deriveKey(secret);
  const plain      = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plain);
}

/**
 * ENCv2 암호화된 값을 복호화합니다. 실패 시 fallback을 반환합니다.
 */
export async function safeDecrypt(
  encrypted: string | null | undefined,
  secret: string,
  fallback = "—",
): Promise<string> {
  if (!encrypted) return fallback;
  if (!encrypted.startsWith("ENCv2:")) return encrypted; // 이미 평문
  return decryptENCv2(encrypted, secret).catch(() => fallback);
}
