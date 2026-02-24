export const BETA_INVITE_REQUIRED_UNTIL_KST_ISO = '2026-04-01T00:00:00+09:00';
export const BETA_INVITE_GUIDE_END_DATE_TEXT = '2026년 3월 31일';
export const BETA_INVITE_GUIDE_OPEN_DATE_TEXT = '2026년 4월 1일';

export interface BetaSignupPolicy {
  requiresInviteCode: boolean;
  cutoffIso: string;
  endDateText: string;
  openDateText: string;
}

export function getBetaSignupPolicy(now: Date = new Date()): BetaSignupPolicy {
  const cutoff = new Date(BETA_INVITE_REQUIRED_UNTIL_KST_ISO);
  return {
    requiresInviteCode: now.getTime() < cutoff.getTime(),
    cutoffIso: BETA_INVITE_REQUIRED_UNTIL_KST_ISO,
    endDateText: BETA_INVITE_GUIDE_END_DATE_TEXT,
    openDateText: BETA_INVITE_GUIDE_OPEN_DATE_TEXT,
  };
}

export function normalizeBetaInviteCode(raw: string): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}
