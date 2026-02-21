import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

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
    const {
      hospital_name,
      contact_name,
      email,
      role,
      phone,
      weekly_surgeries,
      inquiry_type,
      content,
    } = await req.json();

    // service_role로 RLS 우회하여 insert
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error: dbError } = await supabaseAdmin
      .from("contact_inquiries")
      .insert({
        hospital_name: hospital_name?.trim(),
        contact_name: contact_name?.trim(),
        email: email?.trim(),
        role: role?.trim() || null,
        phone: phone?.trim(),
        weekly_surgeries,
        inquiry_type,
        content: content?.trim(),
      });

    if (dbError) {
      console.error("[submit-contact] DB error:", dbError);
      return new Response(JSON.stringify({ success: false, error: dbError.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Slack 알림 (실패해도 200 반환)
    const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
    if (webhookUrl) {
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
              { type: "mrkdwn", text: `*병원명*\n${hospital_name || "—"}` },
              { type: "mrkdwn", text: `*담당자*\n${contact_name || "—"}${role ? ` (${role})` : ""}` },
              { type: "mrkdwn", text: `*연락처*\n${phone || "—"}` },
              { type: "mrkdwn", text: `*이메일*\n${email || "—"}` },
              { type: "mrkdwn", text: `*문의 유형*\n${inquiry_type || "—"}` },
              { type: "mrkdwn", text: `*수술 건수*\n${weekly_surgeries || "—"}` },
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
            elements: [{ type: "mrkdwn", text: `⏰ ${now} (KST)` }],
          },
        ],
      };

      fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackBody),
      }).catch(() => {});
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[submit-contact] error:", err);
    return new Response(JSON.stringify({ success: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
