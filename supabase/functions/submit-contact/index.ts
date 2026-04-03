import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { checkRateLimit } from "../_shared/rateLimit.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { getSlackWebhookUrl } from "../_shared/slackUtils.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.1.0/mod.ts";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

type ContactPayload = {
  hospital_name?: unknown;
  contact_name?: unknown;
  email?: unknown;
  role?: unknown;
  phone?: unknown;
  weekly_surgeries?: unknown;
  inquiry_type?: unknown;
  content?: unknown;
};

type ErrorCode =
  | "invalid_json"
  | "invalid_input"
  | "invalid_email"
  | "server_misconfigured"
  | "permission_denied"
  | "duplicate_request"
  | "db_error"
  | "internal_error";

const asTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isWaitlistInquiry = (inquiryType: string): boolean =>
  inquiryType.startsWith("plan_waitlist_");

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendInquiryEmail(params: {
  contactName: string;
  hospitalName: string;
  email: string;
  role: string | null;
  phone: string;
  inquiryType: string;
  content: string;
  now: string;
}) {
  const gmailUser = Deno.env.get("GMAIL_USER");
  const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

  if (!gmailUser || !gmailPass) {
    console.warn("[submit-contact] Gmail env missing; skip email notification");
    return;
  }

  const html = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="620" cellpadding="0" cellspacing="0" border="0" style="max-width:620px;width:100%;background:#ffffff;border-radius:18px;overflow:hidden;">
      <tr><td style="background:#06111f;padding:28px 32px;">
        <div style="font-size:12px;font-weight:700;letter-spacing:0.18em;color:#5eead4;text-transform:uppercase;font-family:Arial,sans-serif;">Support Intake</div>
        <div style="margin-top:8px;font-size:24px;font-weight:700;color:#ffffff;font-family:Arial,sans-serif;">새 문의가 접수되었습니다</div>
      </td></tr>
      <tr><td style="padding:32px;">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
          ${[
            ["회원명", params.contactName],
            ["병원명", params.hospitalName],
            ["이메일", params.email],
            ["직위", params.role || "—"],
            ["연락처", params.phone],
            ["문의 유형", params.inquiryType],
            ["접수 시각", `${params.now} (KST)`],
          ].map(([label, value]) => `
            <tr>
              <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:13px;font-weight:700;color:#64748b;font-family:Arial,sans-serif;">${escapeHtml(label)}</td>
              <td style="padding:12px 0;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;text-align:right;font-family:Arial,sans-serif;">${escapeHtml(value)}</td>
            </tr>
          `).join("")}
        </table>
        <div style="margin-top:24px;border:1px solid #dbeafe;border-radius:14px;background:#f8fbff;padding:20px 22px;">
          <div style="font-size:11px;font-weight:700;letter-spacing:0.08em;color:#2563eb;text-transform:uppercase;font-family:Arial,sans-serif;">문의 내용</div>
          <div style="margin-top:10px;font-size:14px;line-height:1.8;color:#0f172a;white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(params.content)}</div>
        </div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: {
        username: gmailUser,
        password: gmailPass,
      },
    },
  });

  try {
    await client.send({
      from: `DenJOY <${gmailUser}>`,
      to: "admin@denjoy.info",
      subject: `[문의]임플란트재고주문시스템:${params.contactName}`,
      html,
    });
  } finally {
    await client.close().catch(() => {});
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  const jsonResponse = (
    status: number,
    body: { success: boolean; error_code?: ErrorCode; error?: string; request_id: string },
  ) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Rate limit: 5 requests per minute per IP
  const rateLimited = checkRateLimit(req, corsHeaders, 5, 60_000);
  if (rateLimited) return rateLimited;

  const requestId = crypto.randomUUID();

  let payload: ContactPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(400, {
      success: false,
      error_code: "invalid_json",
      error: "요청 형식이 올바르지 않습니다.",
      request_id: requestId,
    });
  }

  try {
    const hospitalNameRaw = asTrimmedString(payload.hospital_name);
    const contactName = asTrimmedString(payload.contact_name);
    const email = asTrimmedString(payload.email);
    const role = asTrimmedString(payload.role) || null;
    const phone = asTrimmedString(payload.phone);
    const weeklySurgeries = asTrimmedString(payload.weekly_surgeries) || "-";
    const inquiryType = asTrimmedString(payload.inquiry_type);
    const content = asTrimmedString(payload.content);

    const waitlist = isWaitlistInquiry(inquiryType);
    const hospitalName = hospitalNameRaw || (waitlist ? "-" : "");

    if (!contactName || !email || !phone || !inquiryType || !content || !hospitalName) {
      return jsonResponse(422, {
        success: false,
        error_code: "invalid_input",
        error: "입력한 필수 항목을 다시 확인해 주세요.",
        request_id: requestId,
      });
    }

    if (!EMAIL_REGEX.test(email)) {
      return jsonResponse(422, {
        success: false,
        error_code: "invalid_email",
        error: "이메일 형식을 다시 확인해 주세요.",
        request_id: requestId,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[submit-contact] Missing Supabase env:", { requestId, hasUrl: !!supabaseUrl, hasKey: !!serviceRoleKey });
      return jsonResponse(500, {
        success: false,
        error_code: "server_misconfigured",
        error: "서버 설정 오류로 문의 접수를 진행할 수 없습니다. 잠시 후 다시 시도해 주세요.",
        request_id: requestId,
      });
    }

    // service_role로 RLS 우회하여 insert
    const supabaseAdmin = createClient(
      supabaseUrl,
      serviceRoleKey,
    );

    const { error: dbError } = await supabaseAdmin
      .from("contact_inquiries")
      .insert({
        hospital_name: hospitalName,
        contact_name: contactName,
        email,
        role,
        phone,
        weekly_surgeries: weeklySurgeries,
        inquiry_type: inquiryType,
        content,
      });

    if (dbError) {
      console.error("[submit-contact] DB error:", { requestId, code: dbError.code, message: dbError.message });

      if (dbError.code === "42501") {
        return jsonResponse(403, {
          success: false,
          error_code: "permission_denied",
          error: "권한 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
          request_id: requestId,
        });
      }

      if (dbError.code === "23505") {
        return jsonResponse(409, {
          success: false,
          error_code: "duplicate_request",
          error: "동일한 문의가 이미 접수되었습니다. 잠시 후 확인해 주세요.",
          request_id: requestId,
        });
      }

      if (dbError.code === "23502" || dbError.code === "23514" || dbError.code === "22P02") {
        return jsonResponse(422, {
          success: false,
          error_code: "invalid_input",
          error: "입력한 항목을 다시 확인해 주세요.",
          request_id: requestId,
        });
      }

      return jsonResponse(500, {
        success: false,
        error_code: "db_error",
        error: "문의 저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        request_id: requestId,
      });
    }

    const now = new Date().toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });

    // 대기자 신청 → 전용 Slack 채널
    if (waitlist) {
      const waitlistWebhook = await getSlackWebhookUrl("대기자알림");
      if (waitlistWebhook) {
        const planLabel: Record<string, string> = {
          plan_waitlist_basic: "Basic",
          plan_waitlist_plus: "Plus",
          plan_waitlist_business: "Business",
          plan_waitlist_ultimate: "Ultimate",
        };
        const planName = planLabel[inquiryType] ?? inquiryType.replace("plan_waitlist_", "").toUpperCase();

        const waitlistBody = {
          blocks: [
            {
              type: "header",
              text: { type: "plain_text", text: "🔔 새 대기자 신청이 접수되었습니다!" },
            },
            {
              type: "section",
              fields: [
                { type: "mrkdwn", text: `*플랜*\n${planName}` },
                { type: "mrkdwn", text: `*이름*\n${contactName || "—"}` },
                { type: "mrkdwn", text: `*이메일*\n${email || "—"}` },
                { type: "mrkdwn", text: `*접수 시각*\n${now} (KST)` },
              ],
            },
          ],
        };

        fetch(waitlistWebhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(waitlistBody),
        }).catch((slackError) => {
          console.warn("[submit-contact] waitlist slack failed:", { requestId, slackError });
        });
      }
    }

    // 일반 문의 → 기존 Slack 채널 (실패해도 200 반환)
    if (!waitlist) {
      sendInquiryEmail({
        contactName,
        hospitalName,
        email,
        role,
        phone,
        inquiryType,
        content,
        now,
      }).catch((emailError) => {
        console.warn("[submit-contact] inquiry email failed:", { requestId, emailError });
      });

      const webhookUrl = await getSlackWebhookUrl("문의알림");
      if (webhookUrl) {
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
        }).catch((slackError) => {
          console.warn("[submit-contact] inquiry slack failed:", { requestId, slackError });
        });
      }
    }

    return jsonResponse(200, {
      success: true,
      request_id: requestId,
    });
  } catch (err) {
    console.error("[submit-contact] error:", { requestId, err });
    return jsonResponse(500, {
      success: false,
      error_code: "internal_error",
      error: "문의 접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
      request_id: requestId,
    });
  }
});
