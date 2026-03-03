import { BETA_TRIAL_CUTOFF_KST_ISO, BETA_TRIAL_DEADLINE_BADGE_DATE_TEXT } from './trialPolicy';

export const BETA_INVITE_REQUIRED_UNTIL_KST_ISO = BETA_TRIAL_CUTOFF_KST_ISO;
export const BETA_INVITE_GUIDE_END_DATE_TEXT = BETA_TRIAL_DEADLINE_BADGE_DATE_TEXT;
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
