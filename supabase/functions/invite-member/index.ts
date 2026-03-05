import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, createAdminClient } from "../_shared/authUtils.ts";
import { jsonOk, jsonError } from "../_shared/responseUtils.ts";

const VALID_CLINIC_ROLES = ["director", "manager", "team_lead", "staff"];

const PLAN_MAX_USERS: Record<string, number> = {
  free: 1, basic: 1, plus: 5, business: Infinity, ultimate: Infinity,
};

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 요청자 JWT 검증
    const auth = await requireAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;
    const user = auth.user;

    const supabase = createAdminClient();

    // SEC-07: siteUrl은 클라이언트 입력을 받지 않음 — 서버 환경변수만 사용 (피싱 방지)
    const { email, name, hospitalId, clinicRole } = await req.json();
    if (!email || !name || !hospitalId || !clinicRole) {
      return jsonError("email, name, hospitalId, clinicRole는 필수입니다.", 400, corsHeaders);
    }
    if (!VALID_CLINIC_ROLES.includes(clinicRole)) {
      return jsonError("유효하지 않은 역할입니다.", 400, corsHeaders);
    }

    // 요청자가 해당 병원의 master_admin인지 확인
    const { data: hospital, error: hospError } = await supabase
      .from("hospitals")
      .select("id, name, master_admin_id, plan")
      .eq("id", hospitalId)
      .single();

    if (hospError || !hospital) {
      return jsonError("병원을 찾을 수 없습니다.", 404, corsHeaders);
    }

    if (hospital.master_admin_id !== user.id) {
      return jsonError("권한이 없습니다. 병원 관리자만 초대할 수 있습니다.", 403, corsHeaders);
    }

    const maxUsers = PLAN_MAX_USERS[hospital.plan ?? "free"] ?? 1;

    // 현재 활성 멤버 수 확인
    const { count: memberCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", hospitalId)
      .eq("status", "active");

    if (maxUsers !== Infinity && (memberCount ?? 0) >= maxUsers) {
      return jsonError(
        `현재 플랜(${hospital.plan})에서는 최대 ${maxUsers}명까지 구성원을 등록할 수 있습니다.`,
        400,
        corsHeaders
      );
    }

    // 이미 대기 중인 초대가 있는지 확인
    const { data: existing } = await supabase
      .from("member_invitations")
      .select("id")
      .eq("hospital_id", hospitalId)
      .eq("email", email)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (existing) {
      return jsonError("해당 이메일로 이미 유효한 초대가 존재합니다.", 400, corsHeaders);
    }

    // 이미 해당 병원 소속인지 확인
    const { data: alreadyMember } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .eq("hospital_id", hospitalId)
      .maybeSingle();

    if (alreadyMember) {
      return jsonError("해당 이메일은 이미 구성원입니다.", 400, corsHeaders);
    }

    // 토큰 생성 (crypto API)
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = Array.from(tokenBytes).map(b => b.toString(16).padStart(2, "0")).join("");

    // member_invitations에 저장
    const { error: insertError } = await supabase
      .from("member_invitations")
      .insert({
        hospital_id: hospitalId,
        email,
        name,
        clinic_role: clinicRole,
        token,
        invited_by: user.id,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

    if (insertError) {
      console.error("invite insert error:", insertError);
      return jsonError("초대 생성에 실패했습니다.", 500, corsHeaders);
    }

    // SEC-07: 서버 환경변수만 사용 (클라이언트 입력 불허 — 피싱 방지)
    const baseUrl = Deno.env.get("SITE_URL") || "https://inventory.denjoy.info";
    const inviteUrl = `${baseUrl}?invite=${token}`;

    // Resend로 초대 이메일 발송
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      const emailHtml = `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f4f6fb;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;">
      <!-- Header -->
      <tr><td style="background:#4f46e5;padding:36px 40px;text-align:center;">
        <div style="color:#ffffff;font-size:24px;font-weight:700;font-family:Arial,sans-serif;">DenJOY</div>
        <div style="color:rgba(255,255,255,0.8);font-size:14px;margin-top:6px;font-family:Arial,sans-serif;">치과 재고관리 시스템</div>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 40px;">
        <div style="font-size:20px;font-weight:700;color:#1e293b;margin-bottom:4px;font-family:Arial,sans-serif;">구성원으로 초대되었습니다</div>
        <div style="font-size:14px;color:#64748b;margin-bottom:28px;font-family:Arial,sans-serif;">${hospital.name}</div>
        <!-- Info rows -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#94a3b8;font-family:Arial,sans-serif;">치과명</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#1e293b;text-align:right;font-family:Arial,sans-serif;">${hospital.name}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;color:#94a3b8;font-family:Arial,sans-serif;">수신자</td>
            <td style="padding:10px 0;border-bottom:1px solid #f1f5f9;font-size:14px;font-weight:600;color:#1e293b;text-align:right;font-family:Arial,sans-serif;">${name}</td>
          </tr>
        </table>
        <!-- CTA Button -->
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 24px;">
          <tr><td align="center">
            <a href="${inviteUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:10px;font-size:15px;font-weight:700;font-family:Arial,sans-serif;">초대 수락 및 비밀번호 설정 →</a>
          </td></tr>
        </table>
        <div style="text-align:center;font-size:13px;color:#94a3b8;margin-bottom:24px;font-family:Arial,sans-serif;">⏰ 이 초대 링크는 발송일로부터 <strong>7일</strong> 후 만료됩니다.</div>
      </td></tr>
      <!-- Divider + URL fallback -->
      <tr><td style="border-top:1px solid #f1f5f9;padding:20px 40px;font-size:12px;color:#94a3b8;word-break:break-all;font-family:Arial,sans-serif;">
        버튼이 작동하지 않을 경우 아래 URL을 브라우저에 직접 붙여넣으세요.<br />
        <a href="${inviteUrl}" style="color:#6366f1;">${inviteUrl}</a>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#f8fafc;padding:20px 40px;font-size:12px;color:#94a3b8;line-height:1.8;font-family:Arial,sans-serif;">
        이 이메일은 <strong>${hospital.name}</strong>의 관리자가 발송한 자동화 메일입니다.<br />
        본 초대를 요청하지 않으셨다면 이 이메일을 무시하셔도 됩니다.<br />
        <strong>DenJOY</strong> — 치과 임플란트 재고관리 시스템
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

      const emailRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "DenJOY <noreply@denjoy.info>",
          to: [email],
          subject: `[DenJOY] ${hospital.name}에서 구성원으로 초대했습니다`,
          html: emailHtml,
        }),
      });

      const emailData = await emailRes.json();
      if (emailRes.ok) {
        console.log(`[invite-member] Email sent: ${emailData.id}`);
      } else {
        console.error("[invite-member] Resend error:", JSON.stringify(emailData));
      }
    }

    return jsonOk({
      success: true,
      inviteUrl,
      token,
      message: `${name}(${email})에게 초대 링크가 생성되었습니다.`,
    }, corsHeaders);
  } catch (err) {
    console.error("invite-member error:", err);
    return jsonError("서버 오류가 발생했습니다.", 500, corsHeaders);
  }
});
