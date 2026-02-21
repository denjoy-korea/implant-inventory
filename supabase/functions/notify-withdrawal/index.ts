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
    const webhookUrl = Deno.env.get("SLACK_MEMBER_WEBHOOK_URL");
    if (!webhookUrl) {
      return new Response(JSON.stringify({ success: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, reasons, reasonDetail } = await req.json();

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    const fields: { type: string; text: string }[] = [
      { type: "mrkdwn", text: `*이메일*\n${email || "—"}` },
      { type: "mrkdwn", text: `*탈퇴 사유*\n${reasons || "—"}` },
    ];

    if (reasonDetail) {
      fields.push({ type: "mrkdwn", text: `*기타 사유*\n${reasonDetail}` });
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
