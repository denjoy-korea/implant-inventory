import { supabase } from './supabaseClient';

const KEY_WELCOME = (id: string) => `denjoy_ob_v2_welcome_${id}`;
const KEY_FAIL_AUDIT = (id: string) => `denjoy_ob_v2_failaudit_${id}`;
const KEY_FIXTURE_DL = (id: string) => `denjoy_ob_v2_fixture_dl_${id}`;
const KEY_SURGERY_DL = (id: string) => `denjoy_ob_v2_surgery_dl_${id}`;
const KEY_INVENTORY_AUDIT = (id: string) => `denjoy_ob_v2_inventory_audit_${id}`;
const KEY_DISMISSED = (id: string) => `denjoy_ob_v2_dismissed_${id}`;

/** 온보딩 비트마스크 플래그 */
export const OB_FLAG = {
  WELCOME: 1,          // bit 0
  FIXTURE_DL: 2,       // bit 1
  SURGERY_DL: 4,       // bit 2
  INVENTORY_AUDIT: 8,  // bit 3
  FAIL_AUDIT: 16,      // bit 4
} as const;

// G2/D1: 현재 온보딩은 fixture-upload 방식으로 대체됨.
// Step2BrandSelect / Step3StockInput / Step5Complete은 V2 브랜드선택 온보딩 전환 시 사용.
export interface OnboardingStockItem {
  manufacturer: string;
  brand: string;
  size: string;
  quantity: number;
}

/** hospitals.onboarding_flags를 OR 비트 업데이트 (fire-and-forget) */
async function persistFlag(hospitalId: string, flag: number): Promise<void> {
  try {
    // 현재 값을 먼저 읽어 OR 연산 후 저장
    const { data } = await supabase
      .from('hospitals')
      .select('onboarding_flags')
      .eq('id', hospitalId)
      .single();
    const current: number = (data as { onboarding_flags?: number } | null)?.onboarding_flags ?? 0;
    await supabase
      .from('hospitals')
      .update({ onboarding_flags: current | flag })
      .eq('id', hospitalId);
  } catch (e) {
    // DB 저장 실패는 무시 — localStorage가 fallback
    console.warn('[onboardingService] persistFlag failed:', e);
  }
}

export const onboardingService = {
  /**
   * DB에서 읽어온 onboarding_flags를 localStorage에 동기화.
   * 앱 초기 로드 시 1회 호출 → DB 값이 localStorage보다 앞선 경우 복원.
   */
  syncFromDbFlags(hospitalId: string, flags: number): void {
    if (flags & OB_FLAG.WELCOME) localStorage.setItem(KEY_WELCOME(hospitalId), '1');
    if (flags & OB_FLAG.FIXTURE_DL) localStorage.setItem(KEY_FIXTURE_DL(hospitalId), '1');
    if (flags & OB_FLAG.SURGERY_DL) localStorage.setItem(KEY_SURGERY_DL(hospitalId), '1');
    if (flags & OB_FLAG.INVENTORY_AUDIT) localStorage.setItem(KEY_INVENTORY_AUDIT(hospitalId), '1');
    if (flags & OB_FLAG.FAIL_AUDIT) localStorage.setItem(KEY_FAIL_AUDIT(hospitalId), '1');
  },

  isWelcomeSeen(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_WELCOME(hospitalId));
  },
  markWelcomeSeen(hospitalId: string): void {
    localStorage.setItem(KEY_WELCOME(hospitalId), '1');
    void persistFlag(hospitalId, OB_FLAG.WELCOME);
  },

  isFailAuditDone(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_FAIL_AUDIT(hospitalId));
  },
  markFailAuditDone(hospitalId: string): void {
    localStorage.setItem(KEY_FAIL_AUDIT(hospitalId), '1');
    void persistFlag(hospitalId, OB_FLAG.FAIL_AUDIT);
  },

  isFixtureDownloaded(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_FIXTURE_DL(hospitalId));
  },
  markFixtureDownloaded(hospitalId: string): void {
    localStorage.setItem(KEY_FIXTURE_DL(hospitalId), '1');
    void persistFlag(hospitalId, OB_FLAG.FIXTURE_DL);
  },

  isSurgeryDownloaded(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_SURGERY_DL(hospitalId));
  },
  markSurgeryDownloaded(hospitalId: string): void {
    localStorage.setItem(KEY_SURGERY_DL(hospitalId), '1');
    void persistFlag(hospitalId, OB_FLAG.SURGERY_DL);
  },

  isInventoryAuditSeen(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_INVENTORY_AUDIT(hospitalId));
  },
  markInventoryAuditSeen(hospitalId: string): void {
    localStorage.setItem(KEY_INVENTORY_AUDIT(hospitalId), '1');
    void persistFlag(hospitalId, OB_FLAG.INVENTORY_AUDIT);
  },

  isDismissed(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_DISMISSED(hospitalId));
  },
  markDismissed(hospitalId: string): void {
    localStorage.setItem(KEY_DISMISSED(hospitalId), '1');
  },
  clearDismissed(hospitalId: string): void {
    localStorage.removeItem(KEY_DISMISSED(hospitalId));
  },
};
