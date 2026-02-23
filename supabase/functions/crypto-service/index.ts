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
// W-6 fix: rejected promise를 캐시하면 이후 모든 호출이 영구 실패하므로
// .catch()에서 캐시를 null로 초기화해 다음 호출 시 재시도할 수 있도록 한다
// H-2 fix: PATIENT_DATA_KEY 교체 시 stale key 문제를 막기 위해 TTL 5분 설정
const PBKDF2_KEY_TTL_MS = 5 * 60 * 1000;
let cachedPbkdf2KeyPromise: Promise<CryptoKey> | null = null;
let pbkdf2KeyCachedAt = 0;

async function getAesKey(): Promise<CryptoKey> {
  if (cachedPbkdf2KeyPromise && (Date.now() - pbkdf2KeyCachedAt) < PBKDF2_KEY_TTL_MS) {
    return cachedPbkdf2KeyPromise;
  }
  // TTL 만료 또는 첫 호출 — 캐시 갱신
  cachedPbkdf2KeyPromise = null;
  pbkdf2KeyCachedAt = Date.now();
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
  })().catch((e) => {
    cachedPbkdf2KeyPromise = null; // 실패 시 캐시 무효화 → 다음 호출에서 재시도
    pbkdf2KeyCachedAt = 0;
    throw e;
  });
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
  })().catch((e) => {
    cachedLegacyKeyPromise = null;
    throw e;
  });
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
  })().catch((e) => {
    cachedLegacySaltKeyPromise = null;
    throw e;
  });
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

// ── JWT 검증 + 인가 헬퍼 ──────────────────────────────────────────────────

/** C-1: 인증 컨텍스트 (인증 성공 시 반환) */
interface AuthContext {
  userId: string;
  /** custom_access_token hook 설정 후 발급된 JWT에만 존재. 구 JWT는 null. */
  hospitalId: string | null;
}

/**
 * JWT payload를 안전하게 파싱. base64url → base64 패딩 보정 포함.
 * Deno atob는 패딩이 없으면 throw하므로 명시적으로 보정한다.
 */
function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    // base64url → base64: - → +, _ → /, 패딩 보정 (4의 배수로)
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/**
 * C-1: JWT payload에서 app_metadata.hospital_id 추출.
 * Supabase custom_access_token hook이 삽입한 값을 읽음.
 * hook 미설정 또는 hook 적용 전 발급된 구 JWT인 경우 null 반환.
 */
function extractHospitalId(token: string): string | null {
  const payload = parseJwtPayload(token);
  if (!payload) return null;
  const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
  return (appMeta?.hospital_id as string) ?? null;
}

/**
 * C-3: 배포 환경의 secret 주입 편차를 고려해 ANON_KEY → SERVICE_ROLE_KEY 순으로 시도.
 *      (createClient() 방식은 SERVICE_ROLE_KEY 미주입 시 undefined 키로 항상 실패하는 버그 있음)
 * C-1 MVP: userId + hospitalId를 포함한 AuthContext 반환 (인가 구조 확립)
 *          hospital_id 불일치 즉시 거부는 Phase 2 이후 — 현재는 로그만.
 *
 * userId는 res.json() 대신 JWT sub claim에서 추출 (응답 body 소비 불필요).
 */
async function verifyAuth(req: Request): Promise<AuthContext | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    console.error("[verifyAuth] Authorization header 없음 또는 Bearer 형식 아님");
    return null;
  }
  const token = authHeader.slice(7); // "Bearer " 제거

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // 배포 환경에 따라 ANON_KEY 또는 SERVICE_ROLE_KEY 중 하나만 주입될 수 있으므로 두 키를 모두 시도
  const candidateKeys = [
    Deno.env.get("SUPABASE_ANON_KEY"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  ]
    .map((v) => (v ?? "").trim())
    .filter((v, i, arr) => !!v && arr.indexOf(v) === i);

  if (!candidateKeys.length) {
    console.error("[verifyAuth] API key 환경변수(SUPABASE_ANON_KEY/SUPABASE_SERVICE_ROLE_KEY) 누락");
    return null;
  }

  try {
    // 사용 가능한 키를 순차 시도 — 첫 번째로 성공한 키에서 즉시 반환
    for (const apiKey of candidateKeys) {
      const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          "Authorization": `Bearer ${token}`,
          "apikey": apiKey,
        },
      });
      // H-1: !res.ok 시 body 미소비 → TCP 커넥션 누수 방지
      if (!res.ok) { await res.body?.cancel(); continue; }

      // 응답 body 소비 없이 JWT payload에서 직접 userId(sub), hospitalId 추출
      // → res.json() 호출 제거로 런타임 파싱 예외 원천 차단
      const payload = parseJwtPayload(token);
      const userId = (payload?.sub as string) ?? "";

      // H-2: userId 없으면 인증 실패 (JWT 손상 시 빈 아이덴티티로 통과 방지)
      if (!userId) {
        console.error("[verifyAuth] JWT payload 파싱 실패: sub 클레임 없음");
        await res.body?.cancel();
        return null; // JWT 자체가 손상 — 다른 API key 재시도 불필요
      }

      // C-1: JWT payload에서 hospital_id 추출 (hook 설정 후 발급된 JWT에만 존재)
      const hospitalId = extractHospitalId(token);
      if (!hospitalId) {
        console.warn("[verifyAuth] hospital_id 없음 (hook 미설정 or 구 JWT). 소프트-패스.");
      }

      await res.body?.cancel();
      return { userId, hospitalId };
    }

    console.error("[verifyAuth] Auth API 실패: 모든 API key 시도에서 비정상 응답");
    return null;
  } catch (e) {
    console.error("[verifyAuth] fetch 예외:", e);
    return null;
  }
}

// ── 메인 핸들러 ───────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(req) });
  }

  const corsHeaders = getCorsHeaders(req);

  // M-5: JSON 파싱 실패는 클라이언트 오류(400) — 외부 catch의 500과 구분
  let body: { op: string; text?: string; texts?: string[] };
  try {
    body = await req.json() as { op: string; text?: string; texts?: string[] };
  } catch {
    return new Response(
      JSON.stringify({ error: "요청 본문이 올바른 JSON 형식이 아닙니다." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const { op, text, texts } = body;

    // hash op: anon key 허용 (비인증 ID 조회 지원)
    // 나머지 op: JWT 필수
    // C-1 MVP: authContext에 userId + hospitalId 포함 (향후 인가 검증 확장 가능)
    let authContext: AuthContext | null = null;
    if (op !== "hash") {
      authContext = await verifyAuth(req);
      if (!authContext) {
        return new Response(
          JSON.stringify({ error: "인증이 필요합니다." }),
          {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      // C-1 MVP: hospital_id 로깅 (불일치 강제 거부는 Phase 2 이후 추가)
      // authContext.hospitalId가 존재하면 향후 요청 데이터의 hospital_id와 비교 가능
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
