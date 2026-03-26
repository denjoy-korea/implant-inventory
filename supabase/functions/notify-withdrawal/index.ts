import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { getSlackWebhookUrl } from "../_shared/slackUtils.ts";

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
      return new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, reasons, reasonDetail } = await req.json();

    // mrkdwn injection 방지: Slack mrkdwn 특수문자 이스케이프
    const escapeMrkdwn = (s: unknown): string => {
      if (typeof s !== "string") return "—";
      return s.replace(/[&<>*_~`]/g, (c) => `\\${c}`);
    };

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const fields: { type: string; text: string }[] = [
      { type: "mrkdwn", text: `*이메일*\n${escapeMrkdwn(email)}` },
      { type: "mrkdwn", text: `*탈퇴 사유*\n${escapeMrkdwn(reasons)}` },
    ];

    if (reasonDetail) {
      fields.push({ type: "mrkdwn", text: `*기타 사유*\n${escapeMrkdwn(reasonDetail)}` });
    }

    const slackBody = {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "😢 회원이 탈퇴했습니다" },
        },
        { type: "section", fields },
        {
          type: "context",
          elements: [{ type: "mrkdwn", text: `⏰ ${now} (KST)` }],
        },
      ],
    };

    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(slackBody),
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-withdrawal] error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
