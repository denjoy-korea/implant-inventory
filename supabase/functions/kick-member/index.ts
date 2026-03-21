import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import { requireAuth, createAdminClient } from "../_shared/authUtils.ts";
import { jsonOk, jsonError } from "../_shared/responseUtils.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 호출자 확인 (anon key + auth header)
    const auth = await requireAuth(req, corsHeaders);
    if (!auth.ok) return auth.response;
    const caller = auth.user;

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return jsonError("targetUserId는 필수입니다.", 400, corsHeaders);
    }

    // service role 클라이언트 (RLS 우회)
    const supabase = createAdminClient();

    // 호출자가 master_admin인지 확인
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("hospital_id, role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.hospital_id) {
      return jsonError("병원 정보를 찾을 수 없습니다.", 403, corsHeaders);
    }

    const { data: hospital } = await supabase
      .from("hospitals")
      .select("master_admin_id")
      .eq("id", callerProfile.hospital_id)
      .single();

    if (hospital?.master_admin_id !== caller.id) {
      return jsonError("마스터 관리자만 구성원을 방출할 수 있습니다.", 403, corsHeaders);
    }

    // 대상 유저가 같은 병원 소속인지 확인 (타 병원 유저 삭제 방지)
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("hospital_id, role")
      .eq("id", targetUserId)
      .single();

    if (targetProfile?.hospital_id !== callerProfile.hospital_id) {
      return jsonError("같은 병원 소속이 아닙니다.", 403, corsHeaders);
    }

    if (targetProfile?.role === "master") {
      return jsonError("마스터 관리자는 방출할 수 없습니다.", 403, corsHeaders);
    }

    // auth.users 삭제 (profiles는 FK CASCADE 또는 트리거로 처리)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(targetUserId);
    if (deleteError) {
      console.error("deleteUser error:", deleteError);
      return jsonError("계정 삭제에 실패했습니다.", 500, corsHeaders);
    }

    // 감사 로그: 누가 언제 누구를 방출했는지 기록
    await supabase.from("audit_logs").insert({
      action: "kick_member",
      actor_id: caller.id,
      target_id: targetUserId,
      hospital_id: callerProfile.hospital_id,
      meta: { target_role: targetProfile.role },
    });

    return jsonOk({ success: true }, corsHeaders);
  } catch (err) {
    console.error("kick-member error:", err);
    return jsonError("서버 오류가 발생했습니다.", 500, corsHeaders);
  }
});
