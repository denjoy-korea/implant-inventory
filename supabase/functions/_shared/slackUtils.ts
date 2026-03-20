import { createClient } from "jsr:@supabase/supabase-js@2";
import { decryptENCv2 } from "./cryptoUtils.ts";

interface SlackWebhook { id: string; name: string; url: string; }

/**
 * system_integrations.slack_webhooks에서 채널명으로 Webhook URL 조회
 * @param channelName 관리자 UI에 등록된 채널 이름 (예: "멤버알림", "문의알림")
 * @returns Webhook URL 또는 null (미등록 / 설정 없음)
 */
export async function getSlackWebhookUrl(channelName: string): Promise<string | null> {
  try {
    const supabaseUrl    = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const patientDataKey = Deno.env.get("PATIENT_DATA_KEY");
    if (!patientDataKey) return null;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data } = await adminClient
      .from("system_integrations")
      .select("value")
      .eq("key", "slack_webhooks")
      .maybeSingle();

    if (!data?.value) return null;

    const decrypted = await decryptENCv2(data.value, patientDataKey).catch(() => null);
    if (!decrypted) return null;

    const webhooks: SlackWebhook[] = JSON.parse(decrypted);
    return webhooks.find(w => w.name === channelName)?.url ?? null;
  } catch {
    return null;
  }
}
