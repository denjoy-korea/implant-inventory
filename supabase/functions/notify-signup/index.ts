import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getSlackWebhookUrl } from "../_shared/slackUtils.ts";

const ROLE_LABELS: Record<string, string> = {
  master: "🏥 치과 원장",
  dental_staff: "👩‍⚕️ 치과 직원",
  staff: "👤 개인 회원",
};

/** Slack mrkdwn 인젝션 방지 — 특수 문자 이스케이프 */
function escapeMrkdwn(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const corsHeaders = getCorsHeaders(req);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCorsHeaders(req);

    // Rate limit: 10 requests per minute per IP
    const rateLimited = checkRateLimit(req, corsHeaders, 10, 60_000);
    if (rateLimited) return rateLimited;

    const webhookUrl = await getSlackWebhookUrl("멤버알림");
    if (!webhookUrl) {
      console.warn("[notify-signup] 멤버알림 채널 미등록 — 슬랙 관리 UI에서 채널을 추가하세요");
      return new Response(JSON.stringify({ success: false, reason: "not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, email, role, hospitalName, signupSource } = await req.json();

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const fields: { type: string; text: string }[] = [
      { type: "mrkdwn", text: `*이름*\n${escapeMrkdwn(name || "—")}` },
      { type: "mrkdwn", text: `*이메일*\n${escapeMrkdwn(email || "—")}` },
      { type: "mrkdwn", text: `*역할*\n${ROLE_LABELS[role] || escapeMrkdwn(String(role || "—"))}` },
    ];

    if (hospitalName) {
      fields.push({ type: "mrkdwn", text: `*병원명*\n${escapeMrkdwn(hospitalName)}` });
    }
    if (signupSource) {
      fields.push({ type: "mrkdwn", text: `*가입경로*\n${escapeMrkdwn(signupSource)}` });
    }

    const slackBody = {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "🎉 새 회원이 가입했습니다!" },
        },
        {
          type: "section",
          fields,
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `⏰ ${now} (KST)` },
          ],
        },
      ],
    };

    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackBody),
    });

    if (!slackRes.ok) {
      const text = await slackRes.text();
      console.error("[notify-signup] Slack webhook failed:", slackRes.status, text);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-signup] error:", err);
    // 항상 200 반환 → 클라이언트 회원가입 흐름에 영향 없음
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
