import { supabase } from './supabaseClient';

export type HospitalSlackEvent =
  | 'order_created'
  | 'order_received'
  | 'fail_registered'
  | 'return_requested'
  | 'return_completed'
  | 'surgery_uploaded'
  | 'stock_alert';

/**
 * 병원 Slack 채널로 알림 전송 (fire-and-forget).
 * Slack 미연동 병원은 Edge Function 내에서 skip 처리.
 */
export function notifyHospitalSlack(
  hospitalId: string,
  event: HospitalSlackEvent,
  payload: Record<string, unknown> = {},
): void {
  void supabase.functions.invoke('notify-hospital-slack', {
    body: { hospital_id: hospitalId, event, payload },
  });
}
