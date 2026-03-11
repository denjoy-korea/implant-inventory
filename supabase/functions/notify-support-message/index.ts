import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, createAdminClient } from "../_shared/authUtils.ts";
import { getSlackWebhookUrl } from "../_shared/slackUtils.ts";
import { jsonError, jsonOk } from "../_shared/responseUtils.ts";

function formatTimestampKst(value: string): string {
  return new Date(value).toLocaleString("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function truncateSlackText(value: string, maxLength = 280): string {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1)}…`;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonError("Method not allowed", 405, corsHeaders);
  }

  try {
    const auth = await requireAuth(req, corsHeaders);
    if (!auth.ok) {
      return jsonOk({ success: false, skipped: true, reason: "unauthorized" }, corsHeaders);
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON", 400, corsHeaders);
    }

    if (typeof body !== "object" || body === null) {
      return jsonError("Body must be an object", 400, corsHeaders);
    }

    const { thread_id: threadId, message_id: messageId } = body as Record<string, unknown>;
    if (typeof threadId !== "string" || typeof messageId !== "string" || !threadId.trim() || !messageId.trim()) {
      return jsonError("thread_id and message_id are required", 400, corsHeaders);
    }

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role, hospital_id, name")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile || profile.role === "admin") {
      return jsonOk({ success: true, skipped: true, reason: "admin_or_missing_profile" }, corsHeaders);
    }

    const { data: message } = await adminClient
      .from("support_messages")
      .select("id, thread_id, sender_id, sender_kind, sender_name, body, created_at")
      .eq("id", messageId)
      .eq("thread_id", threadId)
      .maybeSingle();

    if (!message) {
      return jsonOk({ success: true, skipped: true, reason: "message_not_found" }, corsHeaders);
    }

    if (message.sender_kind !== "member" || message.sender_id !== auth.user.id) {
      return jsonOk({ success: true, skipped: true, reason: "not_member_message" }, corsHeaders);
    }

    const { data: thread } = await adminClient
      .from("support_threads")
      .select("id, hospital_id, created_by_name, admin_unread_count, status")
      .eq("id", threadId)
      .maybeSingle();

    if (!thread) {
      return jsonOk({ success: true, skipped: true, reason: "thread_not_found" }, corsHeaders);
    }

    if (profile.hospital_id !== thread.hospital_id) {
      return jsonOk({ success: false, skipped: true, reason: "access_denied" }, corsHeaders);
    }

    const { data: hospital } = await adminClient
      .from("hospitals")
      .select("name")
      .eq("id", thread.hospital_id)
      .maybeSingle();

    const webhookUrl = await getSlackWebhookUrl("문의알림");
    if (!webhookUrl) {
      return jsonOk({ success: true, skipped: true, reason: "not_configured" }, corsHeaders);
    }

    const siteUrl = Deno.env.get("SITE_URL");
    const supportPathHint = siteUrl
      ? `<${siteUrl}|관리자 페이지>에서 시스템 관리자 > 실시간 상담을 확인해 주세요.`
      : "시스템 관리자 > 실시간 상담에서 확인해 주세요.";

    const slackBody = {
      blocks: [
        {
          type: "header",
          text: { type: "plain_text", text: "💬 실시간 상담 새 메시지" },
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*병원명*\n${hospital?.name || "—"}` },
            { type: "mrkdwn", text: `*회원명*\n${message.sender_name || thread.created_by_name || "—"}` },
            { type: "mrkdwn", text: `*상담 상태*\n${thread.status === "closed" ? "해결됨" : "응대중"}` },
            { type: "mrkdwn", text: `*미확인 메시지*\n${thread.admin_unread_count ?? 0}건` },
          ],
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*메시지 내용*\n${truncateSlackText(message.body || "") || "—"}`,
          },
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `⏰ ${formatTimestampKst(message.created_at)} (KST)` },
            { type: "mrkdwn", text: supportPathHint },
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
      console.error("[notify-support-message] Slack webhook failed:", slackRes.status, text);
      return jsonOk({ success: false, reason: "slack_failed" }, corsHeaders);
    }

    return jsonOk({ success: true }, corsHeaders);
  } catch (error) {
    console.error("[notify-support-message] error:", error);
    return jsonOk({ success: false }, corsHeaders);
  }
});
