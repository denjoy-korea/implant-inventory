const KEY_WELCOME = (id: string) => `denjoy_ob_v2_welcome_${id}`;
const KEY_FAIL_AUDIT = (id: string) => `denjoy_ob_v2_failaudit_${id}`;

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
};
