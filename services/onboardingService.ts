const KEY_WELCOME = (id: string) => `denjoy_ob_v2_welcome_${id}`;
const KEY_FAIL_AUDIT = (id: string) => `denjoy_ob_v2_failaudit_${id}`;
const KEY_FIXTURE_DL = (id: string) => `denjoy_ob_v2_fixture_dl_${id}`;
const KEY_SURGERY_DL = (id: string) => `denjoy_ob_v2_surgery_dl_${id}`;
const KEY_DISMISSED = (id: string) => `denjoy_ob_v2_dismissed_${id}`;

export interface OnboardingStockItem {
  manufacturer: string;
  brand: string;
  size: string;
  quantity: number;
}

export const onboardingService = {
  isWelcomeSeen(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_WELCOME(hospitalId));
  },
  markWelcomeSeen(hospitalId: string): void {
    localStorage.setItem(KEY_WELCOME(hospitalId), '1');
  },

  isFailAuditDone(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_FAIL_AUDIT(hospitalId));
  },
  markFailAuditDone(hospitalId: string): void {
    localStorage.setItem(KEY_FAIL_AUDIT(hospitalId), '1');
  },

  isFixtureDownloaded(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_FIXTURE_DL(hospitalId));
  },
  markFixtureDownloaded(hospitalId: string): void {
    localStorage.setItem(KEY_FIXTURE_DL(hospitalId), '1');
  },

  isSurgeryDownloaded(hospitalId: string): boolean {
    return !!localStorage.getItem(KEY_SURGERY_DL(hospitalId));
  },
  markSurgeryDownloaded(hospitalId: string): void {
    localStorage.setItem(KEY_SURGERY_DL(hospitalId), '1');
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
