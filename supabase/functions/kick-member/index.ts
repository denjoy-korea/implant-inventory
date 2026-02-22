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

    // 호출자 확인 (anon key + auth header)
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

    // service role 클라이언트 (RLS 우회)
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // 호출자가 master_admin인지 확인
    const { data: callerProfile } = await supabase
      .from("profiles")
      .select("hospital_id, role")
      .eq("id", caller.id)
      .single();

    if (!callerProfile?.hospital_id) {
      return new Response(
        JSON.stringify({ error: "병원 정보를 찾을 수 없습니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: hospital } = await supabase
      .from("hospitals")
      .select("master_admin_id")
      .eq("id", callerProfile.hospital_id)
      .single();

    if (hospital?.master_admin_id !== caller.id) {
      return new Response(
        JSON.stringify({ error: "마스터 관리자만 구성원을 방출할 수 있습니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 대상 유저가 같은 병원 소속인지 확인 (타 병원 유저 삭제 방지)
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("hospital_id, role")
      .eq("id", targetUserId)
      .single();

    if (targetProfile?.hospital_id !== callerProfile.hospital_id) {
      return new Response(
        JSON.stringify({ error: "같은 병원 소속이 아닙니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetProfile?.role === "master") {
      return new Response(
        JSON.stringify({ error: "마스터 관리자는 방출할 수 없습니다." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // auth.users 삭제 (profiles는 FK CASCADE 또는 트리거로 처리)
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
    console.error("kick-member error:", err);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
