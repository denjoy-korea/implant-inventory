import { createClient } from "jsr:@supabase/supabase-js@2";
import type { User } from "jsr:@supabase/supabase-js@2";
import { jsonError } from "./responseUtils.ts";
export type AuthResult =
  | { ok: true; user: User; authHeader: string }
  | { ok: false; response: Response };

export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>
): Promise<AuthResult> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return { ok: false, response: jsonError("인증이 필요합니다.", 401, corsHeaders) };
  }

  const client = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authHeader } },
    }
  );

  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) {
    return { ok: false, response: jsonError("인증에 실패했습니다.", 401, corsHeaders) };
  }

  return { ok: true, user, authHeader };
}

export function createAdminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
