import { supabase } from './supabaseClient';

/** 제조사별 FAIL 교환 기준량. { "OSSTEM": 15, "IBS Implant": 10 } */
export type FailThresholds = Record<string, number>;

export const failThresholdService = {
  async get(hospitalId: string): Promise<FailThresholds> {
    const { data, error } = await supabase
      .from('hospitals')
      .select('fail_thresholds')
      .eq('id', hospitalId)
      .single();
    if (error || !data) return {};
    return (data.fail_thresholds as FailThresholds) ?? {};
  },

  async save(hospitalId: string, thresholds: FailThresholds): Promise<void> {
    const { error } = await supabase
      .from('hospitals')
      .update({ fail_thresholds: thresholds })
      .eq('id', hospitalId);
    if (error) throw error;
  },
};

/**
 * 제조사별 잔여 교환량과 기준량으로 severity 계산.
 * - 기준량 미설정 시 fallback 기준(10개) 사용
 * - >= threshold        → 'critical'
 * - >= threshold * 0.8  → 'warning'
 * - < threshold * 0.8   → null (카드에서 제외하거나 숨김 처리)
 */
export function getFailSeverity(
  remainingByManufacturer: Record<string, number>,
  thresholds: FailThresholds,
  fallbackThreshold = 10,
): 'critical' | 'warning' | null {
  let result: 'critical' | 'warning' | null = null;

  for (const [manufacturer, qty] of Object.entries(remainingByManufacturer)) {
    const threshold = thresholds[manufacturer] ?? fallbackThreshold;
    if (qty >= threshold) return 'critical';
    if (qty >= threshold * 0.8) result = 'warning';
  }

  return result;
}
