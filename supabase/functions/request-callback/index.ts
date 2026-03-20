import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, createAdminClient } from "../_shared/authUtils.ts";
import { getSlackWebhookUrl } from "../_shared/slackUtils.ts";
import { safeDecrypt } from "../_shared/cryptoUtils.ts";
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
    if (!auth.ok) return auth.response;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonError("Invalid JSON", 400, corsHeaders);
    }

    if (typeof body !== "object" || body === null) {
      return jsonError("Body must be an object", 400, corsHeaders);
    }

    const { phone, preferred_time: preferredTime, note } = body as Record<string, unknown>;

    if (typeof phone !== "string" || !phone.trim()) {
      return jsonError("phone is required", 400, corsHeaders);
    }

    const adminClient = createAdminClient();

    const { data: profile } = await adminClient
      .from("profiles")
      .select("id, role, name, hospital_id")
      .eq("id", auth.user.id)
      .maybeSingle();

    if (!profile || profile.role === "admin") {
      return jsonError("Forbidden", 403, corsHeaders);
    }

    const { data: hospital } = await adminClient
      .from("hospitals")
      .select("name, plan")
      .eq("id", profile.hospital_id)
      .maybeSingle();

    const patientDataKey = Deno.env.get("PATIENT_DATA_KEY") ?? "";
    const decryptedName = await safeDecrypt(profile.name, patientDataKey, profile.name ?? "—");

    const webhookUrl = await getSlackWebhookUrl("문의알림");
    if (!webhookUrl) {
      return jsonOk({ success: true, skipped: true, reason: "not_configured" }, corsHeaders);
    }

    const requestedAt = new Date().toISOString();
    const fields = [
      { type: "mrkdwn", text: `*병원명*\n${hospital?.name || "—"}` },
      { type: "mrkdwn", text: `*담당자*\n${decryptedName}` },
      { type: "mrkdwn", text: `*플랜*\n${hospital?.plan?.toUpperCase() || "—"}` },
      { type: "mrkdwn", text: `*연락처*\n${phone.trim()}` },
    ];

    if (typeof preferredTime === "string" && preferredTime.trim()) {
      fields.push({ type: "mrkdwn", text: `*희망 통화 시간*\n${preferredTime.trim()}` });
    }

    const blocks: unknown[] = [
      {
        type: "header",
        text: { type: "plain_text", text: "📞 전화 상담 신청" },
      },
      { type: "section", fields },
    ];

    if (typeof note === "string" && note.trim()) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `*문의 내용*\n${note.trim()}` },
      });
    }

    blocks.push({
      type: "context",
      elements: [
        { type: "mrkdwn", text: `⏰ 신청 시각: ${formatTimestampKst(requestedAt)} (KST)` },
      ],
    });

    const slackRes = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });

    if (!slackRes.ok) {
      const text = await slackRes.text();
      console.error("[request-callback] Slack webhook failed:", slackRes.status, text);
      return jsonOk({ success: false, reason: "slack_failed" }, corsHeaders);
    }

    return jsonOk({ success: true }, corsHeaders);
  } catch (error) {
    console.error("[request-callback] error:", error);
    return jsonOk({ success: false }, corsHeaders);
  }
});
