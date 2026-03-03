export const BETA_TRIAL_CUTOFF_KST_ISO = '2026-04-01T00:00:00+09:00';
const BETA_TRIAL_CUTOFF_KST = new Date(BETA_TRIAL_CUTOFF_KST_ISO);
const BETA_TRIAL_DEADLINE_KST = new Date(BETA_TRIAL_CUTOFF_KST.getTime() - 1000);

export const DEFAULT_TRIAL_DAYS = 14;
export const BETA_TRIAL_DAYS = 28;
export const TRIAL_DATA_RETENTION_GRACE_DAYS = 15;

export const TRIAL_OFFER_LABEL = `${DEFAULT_TRIAL_DAYS}일 무료 체험`;
export const TRIAL_START_TITLE_TEXT = `${DEFAULT_TRIAL_DAYS}일 무료 체험 시작`;
export const TRIAL_START_BUTTON_TEXT = `${DEFAULT_TRIAL_DAYS}일 무료 체험 시작하기`;
export const TRIAL_NO_CARD_REQUIRED_TEXT = '카드 정보 없이 바로 체험할 수 있습니다.';
export const TRIAL_CONSENT_LABEL_TEXT = '미구독 시 데이터 삭제 조건을 확인했습니다.';
export const TRIAL_CONSENT_HELP_TEXT = '체험 시작 전 데이터 삭제 조건을 확인해 주세요.';

export const DEFAULT_TRIAL_OFFER_TEXT = `기본 ${DEFAULT_TRIAL_DAYS}일 무료 체험`;
export const DEFAULT_TRIAL_HIGHLIGHT_TEXT = `기본 ${DEFAULT_TRIAL_DAYS}일 무료`;
export const BETA_TRIAL_DEADLINE_TEXT = '2026년 3월 31일까지';
export const BETA_TRIAL_DEADLINE_BADGE_DATE_TEXT = '2026년 3월 31일';
export const TRIAL_DATA_POLICY_SHORT_TEXT = `체험 종료 후 ${TRIAL_DATA_RETENTION_GRACE_DAYS}일 미구독 시 체험 데이터 자동 삭제`;
export const TRIAL_DATA_DELETION_POLICY_TEXT = `체험 종료 후 ${TRIAL_DATA_RETENTION_GRACE_DAYS}일 동안 구독을 시작하지 않으면 체험 중 업로드한 데이터가 자동 삭제됩니다.`;
export const SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT = '구독 중이거나 유료 플랜 해지 후 Free 플랜으로 전환한 경우 기존 데이터는 유지되며, Free 한도 초과 데이터는 읽기 전용으로 제공됩니다.';

export function isBetaTrialApplicationOpen(now: Date = new Date()): boolean {
  return now.getTime() <= BETA_TRIAL_DEADLINE_KST.getTime();
}

function toDate(value: Date | string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isBetaTrialEligibleByStart(trialStartedAt: Date | string | null | undefined): boolean {
  const trialStart = toDate(trialStartedAt);
  if (!trialStart) return false;
  return trialStart.getTime() < BETA_TRIAL_CUTOFF_KST.getTime();
}

export function getTrialDurationDays(trialStartedAt: Date | string | null | undefined): number {
  return isBetaTrialEligibleByStart(trialStartedAt) ? BETA_TRIAL_DAYS : DEFAULT_TRIAL_DAYS;
}

export function getTrialEndAt(trialStartedAt: Date | string | null | undefined): Date | null {
  const trialStart = toDate(trialStartedAt);
  if (!trialStart) return null;
  return new Date(trialStart.getTime() + getTrialDurationDays(trialStart) * 24 * 60 * 60 * 1000);
}

export function getBetaTrialOfferText(now: Date = new Date()): string | null {
  if (!isBetaTrialApplicationOpen(now)) return null;
  return `베타 신청 우선 접수 (${BETA_TRIAL_DEADLINE_TEXT})`;
}

export function getBetaTrialBadgeText(now: Date = new Date()): string | null {
  if (!isBetaTrialApplicationOpen(now)) return null;
  return `베타 신청 마감 ${BETA_TRIAL_DEADLINE_BADGE_DATE_TEXT} · 우선 접수 진행`;
}

export function getTrialCopy(now: Date = new Date()): {
  heroText: string;
  badgeText: string;
  footnoteWithDot: string;
  footnoteWithPipe: string;
  trialPolicyShort: string;
  trialPolicyFull: string;
  subscriptionPolicy: string;
} {
  const betaTrialOfferText = getBetaTrialOfferText(now);
  const betaTrialBadgeText = getBetaTrialBadgeText(now);

  return {
    heroText: betaTrialOfferText
      ? `${DEFAULT_TRIAL_OFFER_TEXT} · ${betaTrialOfferText}`
      : DEFAULT_TRIAL_OFFER_TEXT,
    badgeText: betaTrialBadgeText ?? TRIAL_OFFER_LABEL,
    footnoteWithDot: betaTrialOfferText
      ? `${DEFAULT_TRIAL_OFFER_TEXT} · ${betaTrialOfferText} · 카드 불필요`
      : `${DEFAULT_TRIAL_OFFER_TEXT} · 카드 불필요`,
    footnoteWithPipe: betaTrialOfferText
      ? `${DEFAULT_TRIAL_OFFER_TEXT} · ${betaTrialOfferText} | 카드 불필요`
      : `${DEFAULT_TRIAL_OFFER_TEXT} | 카드 불필요`,
    trialPolicyShort: TRIAL_DATA_POLICY_SHORT_TEXT,
    trialPolicyFull: TRIAL_DATA_DELETION_POLICY_TEXT,
    subscriptionPolicy: SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT,
  };
}
