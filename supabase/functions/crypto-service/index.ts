/**
 * crypto-service Edge Function
 *
 * SEC-01 해결: 암호화/복호화/해시를 서버 사이드에서 처리
 * PATIENT_DATA_KEY는 Supabase Secret으로만 관리 (VITE_ 클라이언트 번들 노출 제거)
 *
 * 지원 operations:
 *   encrypt        — 평문 → ENCv2 암호문 (JWT 필수)
 *   decrypt        — ENCv2/ENCv1 암호문 → 평문 (JWT 필수)
 *   hash           — 평문 → SHA-256 해시 (anon key 허용: 비인증 ID 조회 지원)
 *   decrypt_batch  — 암호문 배열 → 평문 배열 (JWT 필수)
 *
 * 환경 변수 (Supabase Secret):
 *   PATIENT_DATA_KEY  — 암호화 키 (기존 VITE_PATIENT_DATA_KEY 와 동일한 값으로 설정)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── 상수 ──────────────────────────────────────────────────────────────────
const ENC_V2_PREFIX = "ENCv2:";
const ENC_V1_PREFIX = "ENC:";
const LEGACY_SALT = "dentweb-patient-info-2026";
const PBKDF2_SALT_BYTES = new TextEncoder().encode(
  "implant-inventory-pbkdf2-salt-v1",
);
const PBKDF2_ITERATIONS = 100_000;

// ── 유틸 ──────────────────────────────────────────────────────────────────
function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function getSecret(): string {
  const key = Deno.env.get("PATIENT_DATA_KEY");
  if (!key) throw new Error("PATIENT_DATA_KEY is not configured");
  return key.trim();
}

// ── AES-GCM 키 캐시 ───────────────────────────────────────────────────────
let cachedPbkdf2KeyPromise: Promise<CryptoKey> | null = null;

async function getAesKey(): Promise<CryptoKey> {
  if (cachedPbkdf2KeyPromise) return cachedPbkdf2KeyPromise;
  cachedPbkdf2KeyPromise = (async () => {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(getSecret()),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: PBKDF2_SALT_BYTES,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  })();
  return cachedPbkdf2KeyPromise;
}

// 레거시 SHA-256 직접 키 (ENCv2 초기 버전 하위 호환 복호화 전용)
let cachedLegacyKeyPromise: Promise<CryptoKey> | null = null;

async function getLegacyAesKey(): Promise<CryptoKey> {
  if (cachedLegacyKeyPromise) return cachedLegacyKeyPromise;
  cachedLegacyKeyPromise = (async () => {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(getSecret()),
    );
    return crypto.subtle.importKey(
      "raw",
      digest,
      { name: "AES-GCM" },
      false,
      ["decrypt"],
    );
  })();
  return cachedLegacyKeyPromise;
}

// LEGACY_SALT PBKDF2 키 (VITE_PATIENT_DATA_KEY 미설정 시 기본값으로 암호화된 데이터 복호화용)
let cachedLegacySaltKeyPromise: Promise<CryptoKey> | null = null;

async function getLegacySaltAesKey(): Promise<CryptoKey> {
  if (cachedLegacySaltKeyPromise) return cachedLegacySaltKeyPromise;
  cachedLegacySaltKeyPromise = (async () => {
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(LEGACY_SALT),
      "PBKDF2",
      false,
      ["deriveKey"],
    );
    return crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: PBKDF2_SALT_BYTES,
        iterations: PBKDF2_ITERATIONS,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"],
    );
  })();
  return cachedLegacySaltKeyPromise;
}

// ── 암호화 ────────────────────────────────────────────────────────────────
async function encryptText(text: string): Promise<string> {
  if (!text) return "";
  const key = await getAesKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(text),
  );
  const combined = new Uint8Array(12 + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), 12);
  return ENC_V2_PREFIX + bytesToBase64(combined);
}

// ── 복호화 ────────────────────────────────────────────────────────────────
function legacyDecryptXor(encrypted: string): string {
  const decoded = base64ToBytes(encrypted.slice(ENC_V1_PREFIX.length));
  const keyBytes = new TextEncoder().encode(LEGACY_SALT);
  const result = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    result[i] = decoded[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(result);
}

async function decryptText(encrypted: string): Promise<string> {
  if (!encrypted) return "";
  if (
    !encrypted.startsWith(ENC_V2_PREFIX) &&
    !encrypted.startsWith(ENC_V1_PREFIX)
  ) {
    return encrypted; // 레거시 평문
  }
  if (encrypted.startsWith(ENC_V1_PREFIX)) {
    try {
      return legacyDecryptXor(encrypted);
    } catch {
      return encrypted;
    }
  }

  const combined = base64ToBytes(encrypted.slice(ENC_V2_PREFIX.length));
  if (combined.length <= 12) return encrypted;
  const iv = combined.slice(0, 12);
  const cipherBytes = combined.slice(12);

  // 1차: PBKDF2 키 (현재 방식)
  try {
    const key = await getAesKey();
    const dec = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes,
    );
    return new TextDecoder().decode(dec);
  } catch {
    // 2차: 레거시 SHA-256 키 (초기 ENCv2 데이터 하위 호환)
    try {
      const legacyKey = await getLegacyAesKey();
      const dec = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        legacyKey,
        cipherBytes,
      );
      return new TextDecoder().decode(dec);
    } catch {
      // 3차: LEGACY_SALT PBKDF2 키 (VITE_PATIENT_DATA_KEY 미설정 시 기본값으로 암호화된 데이터)
      try {
        const legacySaltKey = await getLegacySaltAesKey();
        const dec = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv },
          legacySaltKey,
          cipherBytes,
        );
        return new TextDecoder().decode(dec);
      } catch {
        console.error("[crypto-service] decryptText: 복호화 실패 (모든 키 시도 완료)");
        return encrypted;
      }
    }
  }
}

// ── 해시 ──────────────────────────────────────────────────────────────────
async function hashText(text: string): Promise<string> {
  if (!text) return "";
  const salted = `${getSecret()}:${text.trim()}`;
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(salted),
  );
  return bytesToBase64(new Uint8Array(digest));
}

// ── JWT 검증 헬퍼 ─────────────────────────────────────────────────────────
// Supabase JS 클라이언트 의존 제거: Supabase Auth REST API 직접 호출로 JWT 검증
// createClient() 방식은 SUPABASE_SERVICE_ROLE_KEY 미주입 시 undefined 키로 생성되어
// getUser()가 항상 실패하는 버그가 있음.
async function verifyAuth(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[verifyAuth] Authorization header 없음 또는 Bearer 형식 아님");
    return false;
  }
  const token = authHeader.slice(7); // "Bearer " 제거

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  try {
    // Supabase Auth REST API 직접 호출: POST 방식 대신 GET /auth/v1/user 사용
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "Authorization": `Bearer ${token}`,
        "apikey": anonKey,
      },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[verifyAuth] Auth API 실패: status=${res.status}, token_prefix=${token.slice(0, 20)}, body=${body.slice(0, 100)}`);
    }
    return res.ok;
  } catch (e) {
    console.error("[verifyAuth] fetch 예외:", e);
    return false;
  }
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  try {
    const body = await req.json();
    const { op, text, texts } = body as {
      op: string;
      text?: string;
      texts?: string[];
    };

    // hash op: anon key 허용 (비인증 ID 조회 지원)
    // 나머지 op: JWT 필수
    if (op !== "hash") {
      const ok = await verifyAuth(req);
      if (!ok) {
        return new Response(
          JSON.stringify({ error: "인증이 필요합니다." }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
    }

    switch (op) {
      case "encrypt": {
        const result = await encryptText(text ?? "");
        return new Response(JSON.stringify({ result }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "decrypt": {
        const result = await decryptText(text ?? "");
        return new Response(JSON.stringify({ result }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "hash": {
        const result = await hashText(text ?? "");
        return new Response(JSON.stringify({ result }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      case "decrypt_batch": {
        if ((texts?.length ?? 0) > 500) {
          return new Response(
            JSON.stringify({ error: "배치 크기는 최대 500개입니다." }),
            {
              status: 400,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }
        const results = await Promise.all(
          (texts ?? []).map(decryptText),
        );
        return new Response(JSON.stringify({ results }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      default:
        return new Response(
          JSON.stringify({ error: `알 수 없는 op: ${op}` }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
    }
  } catch (err) {
    console.error("[crypto-service]", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
