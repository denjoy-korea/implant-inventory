export const config = {
  matcher: '/((?!_vercel).*)',
};

/** 정적 자산(.js .css .png 등)은 제외하고 페이지 진입 요청만 기록 */
function isNavigationRequest(pathname: string): boolean {
  return !/\.\w{1,5}$/.test(pathname);
}

function logAccess(request: Request, country: string, blocked: boolean) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) return;

  const url = new URL(request.url);
  if (!isNavigationRequest(url.pathname)) return;

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';

  // fire-and-forget — 실패해도 본 요청에 영향 없음
  fetch(`${supabaseUrl}/rest/v1/access_logs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      ip,
      country,
      city: request.headers.get('x-vercel-ip-city') || null,
      region: request.headers.get('x-vercel-ip-country-region') || null,
      path: url.pathname,
      user_agent: request.headers.get('user-agent') || '',
      blocked,
    }),
  }).catch(() => {});
}

export default function middleware(request: Request) {
  const country = request.headers.get('x-vercel-ip-country');

  // 로컬 개발환경 (헤더 없음) → 통과
  if (!country) return;

  if (country !== 'KR') {
    logAccess(request, country, true);

    return new Response(
      `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>접근 제한</title>
  <style>
    body { margin: 0; font-family: -apple-system, sans-serif; background: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .box { text-align: center; padding: 48px 32px; background: white; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 360px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { margin: 0 0 8px; font-size: 20px; color: #0f172a; }
    p { margin: 0; font-size: 14px; color: #64748b; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">🔒</div>
    <h1>접근이 제한된 지역입니다</h1>
    <p>이 서비스는 대한민국 내에서만<br>이용할 수 있습니다.</p>
  </div>
</body>
</html>`,
      {
        status: 403,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }

  // 한국 IP — 정상 접속 기록
  logAccess(request, country, false);
}
