import "jsr:@supabase/functions-js/edge-runtime.d.ts";

interface EmailHookPayload {
  user: {
    id: string;
    email: string;
    user_metadata?: Record<string, unknown>;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "recovery"
      | "invite"
      | "magiclink"
      | "email_change_new_email"
      | "email_change_current_email"
      | "reauthentication";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;

const EMAIL_CONFIG: Record<string, { subject: string; title: string; body: string }> = {
  signup: {
    subject: "DenJOY 이메일 인증",
    title: "이메일 인증",
    body: "DenJOY에 가입하신 것을 환영합니다.<br>아래 버튼을 클릭하여 이메일 인증을 완료해주세요.",
  },
  recovery: {
    subject: "DenJOY 비밀번호 재설정",
    title: "비밀번호 재설정",
    body: "비밀번호 재설정 요청이 접수되었습니다.<br>아래 버튼을 클릭하여 새 비밀번호를 설정해주세요.",
  },
  email_change_new_email: {
    subject: "DenJOY 이메일 변경 확인",
    title: "이메일 변경 확인",
    body: "새 이메일 주소 변경 요청이 접수되었습니다.<br>아래 버튼을 클릭하여 확인해주세요.",
  },
};

function buildEmailHtml(title: string, body: string, ctaUrl: string, ctaLabel: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f8fafc;margin:0;padding:40px 20px;">
  <div style="max-width:480px;margin:0 auto;background:white;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
    <div style="background:linear-gradient(135deg,#4F46E5,#7C3AED);padding:28px 32px;text-align:center;">
      <h1 style="color:white;margin:0;font-size:22px;font-weight:800;letter-spacing:-0.5px;">DenJOY</h1>
      <p style="color:#c7d2fe;margin:6px 0 0;font-size:13px;">임플란트 재고관리 시스템</p>
    </div>
    <div style="padding:36px 32px;text-align:center;">
      <h2 style="color:#1e293b;font-size:20px;font-weight:700;margin:0 0 12px;">${title}</h2>
      <p style="color:#64748b;font-size:14px;line-height:1.7;margin:0 0 28px;">${body}</p>
      <a href="${ctaUrl}"
         style="display:inline-block;padding:14px 36px;background:#4F46E5;color:white;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;">
        ${ctaLabel}
      </a>
      <p style="color:#94a3b8;font-size:12px;margin:28px 0 0;line-height:1.6;">
        이 링크는 24시간 동안 유효합니다.<br>
        본인이 요청하지 않은 경우 이 메일을 무시해주세요.
      </p>
    </div>
    <div style="background:#f8fafc;padding:16px 32px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="color:#cbd5e1;font-size:11px;margin:0;">© 2026 DenJOY. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

Deno.serve(async (req: Request) => {
  try {
    const payload: EmailHookPayload = await req.json();
    const { user, email_data } = payload;
    const { email_action_type, token_hash, redirect_to } = email_data;

    const config = EMAIL_CONFIG[email_action_type];
    if (!config) {
      // 처리하지 않는 타입은 통과
      return new Response(JSON.stringify({}), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const APP_URL = "https://inventory.denjoy.info";
    const confirmationUrl = email_action_type === 'signup'
      ? `${APP_URL}?token_hash=${token_hash}&type=signup`
      : `${SUPABASE_URL}/auth/v1/verify?token=${token_hash}&type=${email_action_type}&redirect_to=${encodeURIComponent(redirect_to)}`;

    const html = buildEmailHtml(config.title, config.body, confirmationUrl, `${config.title}하기`);

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "DenJOY <noreply@denjoy.info>",
        to: [user.email],
        subject: config.subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[auth-send-email] Resend error:", err);
      return new Response(JSON.stringify({ error: err }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.log("[auth-send-email] Sent:", email_action_type, "→", user.email);
    return new Response(JSON.stringify({}), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[auth-send-email] Unexpected error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
