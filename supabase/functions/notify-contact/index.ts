import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (!webhookUrl) {
      console.error("[notify-contact] SLACK_WEBHOOK_URL not configured");
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
