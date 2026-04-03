/**
 * get-lecture-video-url
 *
 * 강의 다시보기 영상 임시 URL 발급:
 * 1. JWT로 사용자 인증 확인
 * 2. course_enrollments에서 수료 여부 2중 확인 (RLS + 명시적 쿼리)
 * 3. Google Service Account → 1시간 유효 Access Token 발급
 * 4. Google Drive API 스트리밍 URL 반환
 *
 * 필수 Supabase Secrets:
 *   GOOGLE_SERVICE_ACCOUNT_EMAIL  — 서비스 계정 이메일
 *   GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY — PEM 형식 RSA 비밀키 (개행은 \n)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// ─── Google Service Account JWT / Token ───────────────────────────────────────

/**
 * Base64URL 인코딩 (패딩 없음)
 */
function base64url(data: string | Uint8Array): string {
  const bytes =
    typeof data === "string" ? new TextEncoder().encode(data) : data;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

/**
 * PEM 형식 RSA 비밀키 → CryptoKey (RSASSA-PKCS1-v1_5 / SHA-256)
 */
async function importPrivateKey(pem: string): Promise<CryptoKey> {
  const pemBody = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyBytes = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    keyBytes,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

/**
 * Google Service Account JWT 생성 → OAuth2 토큰 교환 → access_token 반환
 */
async function getGoogleAccessToken(): Promise<string> {
  const email = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKeyPem = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY");

  if (!email || !privateKeyPem) {
    throw new Error("Google Service Account credentials not configured");
  }

  const cryptoKey = await importPrivateKey(privateKeyPem);

  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/drive.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );

  const signingInput = `${header}.${payload}`;
  const signature = await crypto.subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    cryptoKey,
    new TextEncoder().encode(signingInput),
  );
  const jwt = `${signingInput}.${base64url(new Uint8Array(signature))}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    const msg = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${msg}`);
  }

  const { access_token } = await tokenRes.json();
  if (!access_token) throw new Error("No access_token in Google response");
  return access_token as string;
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // ── 1. 인증 ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 2. 요청 파싱 ───────────────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const videoId: string | undefined = body?.videoId;
    if (!videoId) {
      return new Response(JSON.stringify({ error: "videoId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── 3. 영상 조회 (RLS: 수료 사용자만 반환됨) ──────────────────────────────
    const { data: video, error: videoErr } = await supabase
      .from("course_replay_videos")
      .select("id, drive_file_id, title, season_id")
      .eq("id", videoId)
      .eq("is_active", true)
      .maybeSingle();

    if (videoErr || !video) {
      return new Response(
        JSON.stringify({ error: "Video not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 4. 수료 여부 2중 확인 (RLS 외 명시적 쿼리) ────────────────────────────
    const { data: enrollment } = await supabase
      .from("course_enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("season_id", video.season_id)
      .not("completed_at", "is", null)
      .maybeSingle();

    if (!enrollment) {
      return new Response(
        JSON.stringify({ error: "Course not completed" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ── 5. Google Drive 임시 URL 발급 ─────────────────────────────────────────
    const accessToken = await getGoogleAccessToken();
    // alt=media: 파일 바이트 직접 스트리밍 (range request 지원)
    const videoUrl = `https://www.googleapis.com/drive/v3/files/${video.drive_file_id}?alt=media&access_token=${accessToken}`;

    return new Response(
      JSON.stringify({
        url: videoUrl,
        title: video.title,
        expiresIn: 3600, // 초 단위 — 클라이언트 재발급 기준
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[get-lecture-video-url]", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
