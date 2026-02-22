/**
 * SEC-03: CORS 정책 — 허용된 오리진만 수락
 * 와일드카드("*") 대신 실제 도메인을 명시하여 CSRF 유사 공격 차단
 */

const ALLOWED_ORIGINS = new Set([
  "https://denjoy.info",
  "https://www.denjoy.info",
  "https://app.denjoy.info",
  // 개발/프리뷰 환경 (Vercel Preview 및 로컬)
  "http://localhost:5173",
  "http://localhost:3000",
]);

/** Vercel 프리뷰 URL 패턴 */
const VERCEL_PREVIEW_RE = /^https:\/\/[\w-]+-[\w-]+\.vercel\.app$/;

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.has(origin) ||
    VERCEL_PREVIEW_RE.test(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://denjoy.info",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
