export interface BetaSignupPolicy {
  requiresInviteCode: boolean;
}

export function getBetaSignupPolicy(_now: Date = new Date()): BetaSignupPolicy {
  return { requiresInviteCode: false };
}

export function normalizeBetaInviteCode(raw: string): string {
  return String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
}
