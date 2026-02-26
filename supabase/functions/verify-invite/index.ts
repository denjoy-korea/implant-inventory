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
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { token } = await req.json();
    if (!token) {
      return new Response(
        JSON.stringify({ error: "token은 필수입니다." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data, error } = await supabase
      .from("member_invitations")
      .select("email, name, hospital_id, hospitals(name)")
      .eq("token", token)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (error || !data) {
      return new Response(
        JSON.stringify({ error: "유효하지 않거나 만료된 초대입니다." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hospitalName = (data.hospitals as { name: string } | null)?.name ?? "치과";

    return new Response(
      JSON.stringify({
        email: data.email,
        name: data.name,
        hospitalName,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("verify-invite error:", err);
    const corsHeaders = getCorsHeaders(req);
    return new Response(
      JSON.stringify({ error: "서버 오류가 발생했습니다." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
