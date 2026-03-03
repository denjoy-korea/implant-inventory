/**
 * test-integration — 외부 서비스 연결 테스트 Edge Function
 *
 * Request  : POST /functions/v1/test-integration
 *            Body: { provider: 'notion' | 'slack' | 'solapi', config: object }
 * Response : { ok: boolean, message: string }
 *
 * 인증: Supabase Auth JWT (authenticated user)
 */

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// ── Notion 연결 테스트 ─────────────────────────────────────────────
async function testNotion(config: { api_token: string; database_id: string }): Promise<{ ok: boolean; message: string }> {
  if (!config.api_token || !config.database_id) {
    return { ok: false, message: 'API 토큰과 데이터베이스 ID가 필요합니다.' };
  }

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${config.database_id}`, {
      headers: {
        'Authorization': `Bearer ${config.api_token}`,
        'Notion-Version': '2022-06-28',
      },
    });

    if (res.ok) {
      const data = await res.json() as { title?: Array<{ plain_text?: string }> };
      const dbName = data.title?.[0]?.plain_text ?? '데이터베이스';
      return { ok: true, message: `"${dbName}" 데이터베이스 연결 성공` };
    }
    if (res.status === 401) return { ok: false, message: 'API 토큰이 유효하지 않습니다.' };
    if (res.status === 404) return { ok: false, message: '데이터베이스 ID를 찾을 수 없습니다. Integration 연결 여부를 확인해주세요.' };
    return { ok: false, message: `Notion API 오류 (HTTP ${res.status})` };
  } catch {
    return { ok: false, message: 'Notion API 요청 중 네트워크 오류가 발생했습니다.' };
  }
}

// ── Slack 연결 테스트 ──────────────────────────────────────────────
async function testSlack(config: { webhook_url: string }): Promise<{ ok: boolean; message: string }> {
  if (!config.webhook_url) {
    return { ok: false, message: 'Webhook URL이 필요합니다.' };
  }
  if (!config.webhook_url.startsWith('https://hooks.slack.com/')) {
    return { ok: false, message: 'Slack Webhook URL 형식이 올바르지 않습니다.' };
  }

  try {
    const res = await fetch(config.webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '✅ DenJOY 재고관리 — Slack 연동 테스트 메시지입니다.' }),
    });

    if (res.ok) return { ok: true, message: 'Slack 채널로 테스트 메시지를 전송했습니다.' };
    if (res.status === 404) return { ok: false, message: 'Webhook URL이 유효하지 않거나 삭제된 Webhook입니다.' };
    return { ok: false, message: `Slack Webhook 오류 (HTTP ${res.status})` };
  } catch {
    return { ok: false, message: 'Slack Webhook 요청 중 네트워크 오류가 발생했습니다.' };
  }
}

// ── Solapi 연결 테스트 ─────────────────────────────────────────────
async function testSolapi(config: { api_key: string; api_secret: string }): Promise<{ ok: boolean; message: string }> {
  if (!config.api_key || !config.api_secret) {
    return { ok: false, message: 'API Key와 API Secret이 필요합니다.' };
  }

  // HMAC-SHA256 서명 생성 (Solapi v4 인증)
  try {
    const date = new Date().toISOString();
    const salt = crypto.randomUUID().replace(/-/g, '');
    const message = date + salt;

    const keyData = new TextEncoder().encode(config.api_secret);
    const msgData = new TextEncoder().encode(message);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sigBuffer = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const signature = Array.from(new Uint8Array(sigBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

    const res = await fetch('https://api.solapi.com/users/v1/info', {
      headers: {
        'Authorization': `HMAC-SHA256 apiKey=${config.api_key}, date=${date}, salt=${salt}, signature=${signature}`,
      },
    });

    if (res.ok) {
      const data = await res.json() as { name?: string };
      return { ok: true, message: `Solapi 연결 성공${data.name ? ` (${data.name})` : ''}` };
    }
    if (res.status === 401 || res.status === 403) return { ok: false, message: 'API Key 또는 Secret이 올바르지 않습니다.' };
    return { ok: false, message: `Solapi API 오류 (HTTP ${res.status})` };
  } catch {
    return { ok: false, message: 'Solapi API 요청 중 오류가 발생했습니다.' };
  }
}

// ── 메인 핸들러 ────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, message: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { provider, config } = await req.json() as {
      provider: 'notion' | 'slack' | 'solapi';
      config: Record<string, string>;
    };

    let result: { ok: boolean; message: string };

    switch (provider) {
      case 'notion':
        result = await testNotion(config as { api_token: string; database_id: string });
        break;
      case 'slack':
        result = await testSlack(config as { webhook_url: string });
        break;
      case 'solapi':
        result = await testSolapi(config as { api_key: string; api_secret: string });
        break;
      default:
        result = { ok: false, message: `지원하지 않는 provider: ${provider}` };
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[test-integration] error:', err);
    return new Response(JSON.stringify({ ok: false, message: '요청 처리 중 오류가 발생했습니다.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
