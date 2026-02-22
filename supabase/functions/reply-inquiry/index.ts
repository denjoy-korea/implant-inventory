import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/denomailer@1.1.0/mod.ts";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // JWT 검증 - service role client로 직접 verify
    const authHeader = req.headers.get("Authorization");
    console.log("[reply-inquiry] authHeader:", authHeader ? "present" : "missing");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    console.log("[reply-inquiry] auth user:", user?.id ?? "null", "err:", authError?.message ?? "none");
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "인증에 실패했습니다.", detail: authError?.message }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // admin 역할 확인
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile || profile.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "관리자 권한이 필요합니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { inquiryId, to, contactName, hospitalName, inquiryType, originalContent, replyMessage } = await req.json();

    if (!inquiryId || !to || !contactName || !hospitalName || !inquiryType || !originalContent || !replyMessage) {
      return new Response(
        JSON.stringify({ error: "필수 파라미터가 누락되었습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gmail 설정 확인
    const gmailUser = Deno.env.get("GMAIL_USER");
    const gmailPass = Deno.env.get("GMAIL_APP_PASSWORD");

    if (!gmailUser || !gmailPass) {
      return new Response(
        JSON.stringify({ error: "Gmail 설정이 필요합니다. GMAIL_USER, GMAIL_APP_PASSWORD를 설정해주세요." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
      <tr><td style="background:#4f46e5;padding:36px 40px;text-align:center;">
        <div style="color:#ffffff;font-size:24px;font-weight:700;font-family:Arial,sans-serif;">DenJOY</div>
        <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:6px;font-family:Arial,sans-serif;">치과 재고관리 시스템</div>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:4px;font-family:Arial,sans-serif;">문의에 대한 답변입니다</div>
        <div style="font-size:14px;color:#64748b;margin-bottom:28px;font-family:Arial,sans-serif;">${hospitalName} · ${contactName}님</div>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#94a3b8;font-family:Arial,sans-serif;">병원명</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#1e293b;text-align:right;font-family:Arial,sans-serif;">${hospitalName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#94a3b8;font-family:Arial,sans-serif;">담당자</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#1e293b;text-align:right;font-family:Arial,sans-serif;">${contactName}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;font-size:14px;color:#94a3b8;font-family:Arial,sans-serif;">문의 유형</td>
            <td style="padding:10px 0;font-size:14px;font-weight:600;color:#1e293b;text-align:right;font-family:Arial,sans-serif;">${inquiryType}</td>
          </tr>
        </table>
        <div style="background:#f0f0ff;border-left:4px solid #4f46e5;border-radius:8px;padding:20px;margin-bottom:24px;">
          <div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:10px;font-family:Arial,sans-serif;">답변 내용</div>
          <div style="font-size:14px;color:#1e293b;line-height:1.7;white-space:pre-wrap;font-family:Arial,sans-serif;">${replyMessage}</div>
        </div>
        <div style="border-top:1px solid #f1f5f9;margin-bottom:20px;"></div>
        <div style="background:#f8fafc;border-radius:8px;padding:16px 20px;">
          <div style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;font-family:Arial,sans-serif;">원본 문의 내용</div>
          <div style="font-size:13px;color:#64748b;line-height:1.7;white-space:pre-wrap;font-family:Arial,sans-serif;">${originalContent}</div>
        </div>
      </td></tr>
      <tr><td style="background:#f8fafc;padding:20px 40px;font-size:12px;color:#94a3b8;line-height:1.8;font-family:Arial,sans-serif;">
        이 이메일은 DenJOY 운영팀이 발송한 메일입니다.<br />
        추가 문의사항이 있으시면 denjoy.info 웹사이트를 통해 문의해 주세요.<br />
        <strong>DenJOY</strong> — 치과 임플란트 재고관리 시스템
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

    // Gmail SMTP 발송
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
        to: to,
        subject: "[DenJOY] 문의에 대한 답변입니다",
        html: emailHtml,
      });
      await client.close();
    } catch (smtpErr) {
      await client.close().catch(() => {});
      console.error("[reply-inquiry] Gmail SMTP error:", smtpErr);
      return new Response(
        JSON.stringify({ error: "이메일 발송에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[reply-inquiry] Email sent via Gmail to ${to}`);

    // contact_inquiries 상태 업데이트
    const { error: updateError } = await supabase
      .from("contact_inquiries")
      .update({ status: "in_progress", admin_note: replyMessage })
      .eq("id", inquiryId);

    if (updateError) {
      console.error("[reply-inquiry] Status update error:", updateError);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("reply-inquiry error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
