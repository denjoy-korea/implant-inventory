/**
 * Payment backward-compatibility utilities
 * Shared between tossPaymentService and planService
 */

export function resolveIsTestPayment(): boolean {
  const liveMode = String(import.meta.env.VITE_PAYMENT_LIVE_MODE ?? '').trim().toLowerCase();
  return liveMode !== 'true';
}

export function isMissingIsTestPaymentColumnError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const message = 'message' in error && typeof error.message === 'string'
    ? error.message
    : '';
  // [LOW] 패턴을 더 구체적으로 — "column does not exist" 맥락에서만 매칭
  // 단순 includes('is_test_payment')는 다른 에러(검증 오류, 제약 위반 등)와 혼동 가능
  return (
    message.includes('is_test_payment') &&
    (message.includes('does not exist') || message.includes('column'))
  );
}
