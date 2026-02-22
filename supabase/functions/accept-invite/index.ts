import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const corsHeaders = getCorsHeaders(req);
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const corsHeaders = getCorsHeaders(req);
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    // service role 클라이언트: RLS 우회하여 invitation 처리
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // SEC-02: 요청자 JWT 검증 — 인증된 사용자만 초대 수락 가능
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: callerUser }, error: authError } = await anonClient.auth.getUser();
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "인증에 실패했습니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { token, userId } = await req.json();
    if (!token || !userId) {
      return new Response(
        JSON.stringify({ error: "token과 userId는 필수입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SEC-02: 요청 body의 userId가 JWT 토큰의 실제 사용자와 일치하는지 검증
    if (userId !== callerUser.id) {
      return new Response(
        JSON.stringify({ error: "권한이 없습니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 유효한 초대 조회
    const { data: invitation, error: inviteError } = await supabase
      .from("member_invitations")
      .select("id, hospital_id, email, name, clinic_role, status, expires_at")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (inviteError || !invitation) {
      return new Response(
        JSON.stringify({ error: "유효하지 않거나 만료된 초대입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 현재 활성 멤버 수 확인 (최대 5명)
    const { count: memberCount } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("hospital_id", invitation.hospital_id)
      .eq("status", "active");

    if ((memberCount ?? 0) >= 5) {
      return new Response(
        JSON.stringify({ error: "병원의 최대 구성원 수(5명)에 도달했습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // profiles 업데이트: hospital_id 연결 + role 설정 + status=active
    // (초대받은 사람은 바로 active — 관리자가 초대한 것이므로 승인 불필요)
    const { data: updatedRows, error: profileError } = await supabase
      .from("profiles")
      .update({
        hospital_id: invitation.hospital_id,
        role: "dental_staff",
        clinic_role: invitation.clinic_role ?? "staff",
        status: "active",
        name: invitation.name,
      })
      .eq("id", userId)
      .select("id");

    if (profileError) {
      console.error("profile update error:", profileError);
      return new Response(
        JSON.stringify({ error: "프로필 업데이트에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 프로필이 아직 생성되지 않은 경우 (signUp trigger 지연) — upsert로 재시도
    if (!updatedRows || updatedRows.length === 0) {
      console.warn("profile not found for userId:", userId, "— attempting upsert");
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          hospital_id: invitation.hospital_id,
          role: "dental_staff",
          clinic_role: invitation.clinic_role ?? "staff",
          status: "active",
          name: invitation.name,
          email: invitation.email,
        }, { onConflict: "id" });

      if (upsertError) {
        console.error("profile upsert error:", upsertError);
        return new Response(
          JSON.stringify({ error: "프로필 업데이트에 실패했습니다." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 초대 경로: 이메일 수신 자체가 소유 증명이므로 자동 확인
    try {
      await supabase.auth.admin.updateUserById(userId, { email_confirm: true });
    } catch (confirmErr) {
      console.warn("email_confirm update failed (non-critical):", confirmErr);
    }

    // invitation 상태 업데이트
    const { error: updateError } = await supabase
      .from("member_invitations")
      .update({
        status: "accepted",
        accepted_user_id: userId,
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      console.error("invitation update error:", updateError);
      // 프로필은 이미 업데이트됐으므로 경고만
    }

    return new Response(
      JSON.stringify({
        success: true,
        hospitalId: invitation.hospital_id,
        message: "초대 수락이 완료되었습니다.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("accept-invite error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
