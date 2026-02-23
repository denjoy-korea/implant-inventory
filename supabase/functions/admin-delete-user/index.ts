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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "인증이 필요합니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 호출자 확인
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller }, error: callerError } = await authClient.auth.getUser();
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "유효하지 않은 인증입니다." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "targetUserId는 필수입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 자기 자신 삭제 방지
    if (targetUserId === caller.id) {
      return new Response(
        JSON.stringify({ error: "자신의 계정은 삭제할 수 없습니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // service role 클라이언트
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 호출자가 admin 역할인지 확인
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("role, name")
      .eq("id", caller.id)
      .single();

    if (callerProfile?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "시스템 운영자만 회원을 삭제할 수 있습니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 대상 유저도 admin이면 삭제 불가
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("role, name, hospital_id")
      .eq("id", targetUserId)
      .single();

    if (targetProfile?.role === "admin") {
      return new Response(
        JSON.stringify({ error: "운영자 계정은 삭제할 수 없습니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 감사 로그를 삭제 전에 기록 (hospital CASCADE 삭제 후엔 FK 위반으로 INSERT 불가)
    if (targetProfile?.hospital_id) {
      const { error: logErr } = await supabase.from("operation_logs").insert({
        hospital_id: targetProfile.hospital_id,
        user_id: caller.id,
        user_email: caller.email ?? "",
        user_name: callerProfile?.name ?? "",
        action: "account_force_deleted",
        description: `${targetProfile.name || targetUserId} 계정 강제 삭제`,
        metadata: {
          target_user_id: targetUserId,
          target_role: targetProfile.role,
          deleted_at: new Date().toISOString(),
        },
      });
      if (logErr) console.warn("[admin-delete-user] audit log failed:", logErr);
    }

    // PII 익명화: surgery_records (hospital이 있는 경우)
    if (targetProfile?.hospital_id) {
      const { error: srErr } = await supabase
        .from("surgery_records")
        .update({
          patient_info: null,
          patient_info_hash: null,
          anonymized_at: new Date().toISOString(),
        })
        .eq("hospital_id", targetProfile.hospital_id)
        .is("anonymized_at", null);
      if (srErr) console.warn("[admin-delete-user] surgery_records anonymization failed:", srErr);
    }

    // PII 익명화: profiles
    const { error: profErr } = await supabase
      .from("profiles")
      .update({
        name: "[강제탈퇴]",
        phone: null,
        email_hash: null,
        phone_hash: null,
      })
      .eq("id", targetUserId);
    if (profErr) console.warn("[admin-delete-user] profiles anonymization failed:", profErr);

    // master_admin인 경우 병원/워크스페이스 삭제 (CASCADE로 inventory 등 하위 데이터 자동 처리)
    if (targetProfile?.hospital_id) {
      await supabase
        .from("hospitals")
        .delete()
        .eq("id", targetProfile.hospital_id)
        .eq("master_admin_id", targetUserId);
    }

    // auth.users 삭제 (profiles는 FK CASCADE로 처리됨)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error("deleteUser error:", deleteError);
      return new Response(
        JSON.stringify({ error: "계정 삭제에 실패했습니다." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("admin-delete-user error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
