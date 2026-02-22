const BETA_TRIAL_DEADLINE_KST = new Date('2026-03-31T23:59:59+09:00');

export const DEFAULT_TRIAL_OFFER_TEXT = '기본 14일 무료 체험';
export const DEFAULT_TRIAL_HIGHLIGHT_TEXT = '기본 14일 무료';
export const BETA_TRIAL_DEADLINE_TEXT = '2026년 3월 31일까지';
export const BETA_TRIAL_DEADLINE_BADGE_DATE_TEXT = '2026년 3월 31일';

export function isBetaTrialApplicationOpen(now: Date = new Date()): boolean {
  return now.getTime() <= BETA_TRIAL_DEADLINE_KST.getTime();
}

export function getBetaTrialOfferText(now: Date = new Date()): string | null {
  if (!isBetaTrialApplicationOpen(now)) return null;
  return `베타 신청 시 1개월 무료 (${BETA_TRIAL_DEADLINE_TEXT})`;
}

export function getBetaTrialBadgeText(now: Date = new Date()): string | null {
  if (!isBetaTrialApplicationOpen(now)) return null;
  return `베타 신청 마감 ${BETA_TRIAL_DEADLINE_BADGE_DATE_TEXT} · 신청 시 1개월 무료`;
}

export function getTrialCopy(now: Date = new Date()): {
  heroText: string;
  badgeText: string;
  footnoteWithDot: string;
  footnoteWithPipe: string;
} {
  const betaTrialOfferText = getBetaTrialOfferText(now);
  const betaTrialBadgeText = getBetaTrialBadgeText(now);

  return {
    heroText: betaTrialOfferText
      ? `${DEFAULT_TRIAL_OFFER_TEXT} · ${betaTrialOfferText}`
      : DEFAULT_TRIAL_OFFER_TEXT,
    badgeText: betaTrialBadgeText ?? DEFAULT_TRIAL_OFFER_TEXT,
    footnoteWithDot: betaTrialOfferText
      ? `${DEFAULT_TRIAL_OFFER_TEXT} · ${betaTrialOfferText} · 카드 불필요`
      : `${DEFAULT_TRIAL_OFFER_TEXT} · 카드 불필요`,
    footnoteWithPipe: betaTrialOfferText
      ? `${DEFAULT_TRIAL_OFFER_TEXT} · ${betaTrialOfferText} | 카드 불필요`
      : `${DEFAULT_TRIAL_OFFER_TEXT} | 카드 불필요`,
  };
}
