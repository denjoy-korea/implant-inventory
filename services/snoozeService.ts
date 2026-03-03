import { supabase } from './supabaseClient';

/**
 * Supabase 기반 UI 스누즈 설정 서비스.
 * DB 저장에 실패하면 localStorage에 fallback하여 오프라인/미인증 환경에서도 동작합니다.
 */
export const snoozeService = {
  /**
   * 스누즈 데이터 로드.
   * Supabase 우선 → 실패 시 localStorage fallback.
   */
  async get(hospitalId: string, key: string): Promise<Record<string, string>> {
    try {
      const { data, error } = await supabase
        .from('ui_snooze_settings')
        .select('data')
        .eq('hospital_id', hospitalId)
        .eq('key', key)
        .maybeSingle();

      if (error) throw error;
      if (data?.data) {
        const raw = data.data as Record<string, string>;
        // 만료된 항목 제거
        const now = new Date().toISOString();
        const cleaned: Record<string, string> = {};
        for (const [k, v] of Object.entries(raw)) {
          if (v > now) cleaned[k] = v;
        }
        return cleaned;
      }
    } catch {
      // Supabase 실패 시 localStorage fallback
    }
    return _getFromLocalStorage(key, hospitalId);
  },

  /**
   * 스누즈 데이터 저장.
   * Supabase upsert 우선 → 실패 시 localStorage fallback.
   */
  async set(hospitalId: string, key: string, data: Record<string, string>): Promise<void> {
    try {
      const { error } = await supabase
        .from('ui_snooze_settings')
        .upsert(
          { hospital_id: hospitalId, key, data, updated_at: new Date().toISOString() },
          { onConflict: 'hospital_id,key' }
        );
      if (error) throw error;
      // 성공 시 localStorage도 동기화
      _setToLocalStorage(key, hospitalId, data);
      return;
    } catch {
      // Supabase 실패 시 localStorage fallback
    }
    _setToLocalStorage(key, hospitalId, data);
  },
};

function _localStorageKey(key: string, hospitalId: string) {
  return `${key}_${hospitalId}`;
}

function _getFromLocalStorage(key: string, hospitalId: string): Record<string, string> {
  try {
    const raw = localStorage.getItem(_localStorageKey(key, hospitalId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const now = new Date().toISOString();
    const cleaned: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v > now) cleaned[k] = v;
    }
    return cleaned;
  } catch {
    return {};
  }
}

function _setToLocalStorage(key: string, hospitalId: string, data: Record<string, string>): void {
  try {
    localStorage.setItem(_localStorageKey(key, hospitalId), JSON.stringify(data));
  } catch {}
}
