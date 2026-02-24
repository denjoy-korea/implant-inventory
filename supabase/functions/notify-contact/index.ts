import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { getSlackWebhookUrl } from "../_shared/slackUtils.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const corsHeaders = getCorsHeaders(req);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCorsHeaders(req);
    const webhookUrl = await getSlackWebhookUrl("문의알림");
    if (!webhookUrl) {
      console.warn("[notify-contact] 문의알림 채널 미등록 — 슬랙 관리 UI에서 채널을 추가하세요");
      return new Response(JSON.stringify({ success: false, reason: "not configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { hospitalName, contactName, role, phone, email, weeklySurgeries, inquiryType, content } = await req.json();

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const slackBody = {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "📩 새 문의가 접수되었습니다!" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*병원명*\n${hospitalName || "—"}` },
            { type: "mrkdwn", text: `*담당자*\n${contactName || "—"}${role ? ` (${role})` : ""}` },
            { type: "mrkdwn", text: `*연락처*\n${phone || "—"}` },
            { type: "mrkdwn", text: `*이메일*\n${email || "—"}` },
            { type: "mrkdwn", text: `*문의 유형*\n${inquiryType || "—"}` },
            { type: "mrkdwn", text: `*수술 건수*\n${weeklySurgeries || "—"}` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*상세 내용*\n${content ? (content.length > 300 ? content.slice(0, 300) + "…" : content) : "—"}`,
          },
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
      console.error("[notify-contact] Slack webhook failed:", slackRes.status, text);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[notify-contact] error:", err);
    // 항상 200 반환 → 클라이언트 폼 제출 흐름에 영향 없음
    return new Response(JSON.stringify({ success: false }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
