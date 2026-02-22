import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

const jsonResponse = (
  status: number,
  body: { success: boolean; error_code?: ErrorCode; error?: string; request_id: string },
) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const asTrimmedString = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const isWaitlistInquiry = (inquiryType: string): boolean =>
  inquiryType.startsWith("plan_waitlist_");

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

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
    const weeklySurgeries = asTrimmedString(payload.weekly_surgeries);
    const inquiryType = asTrimmedString(payload.inquiry_type);
    const content = asTrimmedString(payload.content);

    const waitlist = isWaitlistInquiry(inquiryType);
    const hospitalName = hospitalNameRaw || (waitlist ? "-" : "");

    if (!contactName || !email || !phone || !weeklySurgeries || !inquiryType || !content || !hospitalName) {
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
      const waitlistWebhook = Deno.env.get("SLACK_WAITLIST_WEBHOOK_URL");
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
      const webhookUrl = Deno.env.get("SLACK_WEBHOOK_URL");
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
