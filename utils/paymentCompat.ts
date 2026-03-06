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
  return message.includes('is_test_payment');
}
