import { supabase } from './supabaseClient';

const SETTINGS_KEY = 'hospital_ui_settings';

export interface StockCalcSettings {
  safetyMultiplier: number; // 급증일 안전재고 배수 (기본 2)
  trendCeiling: number;     // 추세 반영 상한 (기본 1.25)
  trendFloor: number;       // 추세 반영 하한 (기본 0.8)
}

export const DEFAULT_STOCK_CALC_SETTINGS: StockCalcSettings = {
  safetyMultiplier: 2,
  trendCeiling: 1.25,
  trendFloor: 0.8,
};

export interface HospitalUiSettings {
  monthFactor?: number;
  stockCalcSettings?: StockCalcSettings;
}

/**
 * 병원 단위 UI 설정 서비스.
 * ui_snooze_settings 테이블의 'hospital_ui_settings' 키에 저장.
 * Supabase 우선 → 실패 시 localStorage fallback.
 */
export const hospitalSettingsService = {
  async get(hospitalId: string): Promise<HospitalUiSettings> {
    try {
      const { data, error } = await supabase
        .from('ui_snooze_settings')
        .select('data')
        .eq('hospital_id', hospitalId)
        .eq('key', SETTINGS_KEY)
        .maybeSingle();

      if (error) throw error;
      if (data?.data) return data.data as HospitalUiSettings;
    } catch {
      // Supabase 실패 → localStorage fallback
    }
    try {
      const raw = localStorage.getItem(`${SETTINGS_KEY}_${hospitalId}`);
      if (raw) return JSON.parse(raw) as HospitalUiSettings;
    } catch {}
    return {};
  },

  async set(hospitalId: string, settings: HospitalUiSettings): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ui_snooze_settings')
        .upsert(
          {
            hospital_id: hospitalId,
            key: SETTINGS_KEY,
            data: settings as Record<string, unknown>,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'hospital_id,key' }
        );
      if (error) throw error;
      localStorage.setItem(`${SETTINGS_KEY}_${hospitalId}`, JSON.stringify(settings));
      return true;
    } catch {
      try {
        localStorage.setItem(`${SETTINGS_KEY}_${hospitalId}`, JSON.stringify(settings));
      } catch {}
      return false;
    }
  },
};
