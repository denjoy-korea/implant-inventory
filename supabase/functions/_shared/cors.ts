/**
 * SEC-03: CORS 정책 — 허용된 오리진만 수락
 * 와일드카드("*") 대신 실제 도메인을 명시하여 CSRF 유사 공격 차단
 */

const ALLOWED_ORIGINS = new Set([
  "https://denjoy.info",
  "https://www.denjoy.info",
  "https://app.denjoy.info",
  "https://inventory.denjoy.info",
  // 개발/프리뷰 환경 (Vercel Preview 및 로컬)
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:3001",
]);

/** Vercel 프리뷰 URL 패턴 (implant-stock-pro 프로젝트만 허용) */
const VERCEL_PREVIEW_RE = /^https:\/\/implant-stock-[\w]+-headals-projects-042f32e0\.vercel\.app$/;

/** 로컬 네트워크 IP 패턴 (개발 환경: 192.168.x.x, 10.x.x.x, 172.16-31.x.x) */
const LOCAL_NETWORK_RE = /^http:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})(:\d+)?$/;

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowed =
    ALLOWED_ORIGINS.has(origin) ||
    VERCEL_PREVIEW_RE.test(origin) ||
    LOCAL_NETWORK_RE.test(origin);

  return {
    "Access-Control-Allow-Origin": allowed ? origin : "https://denjoy.info",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
