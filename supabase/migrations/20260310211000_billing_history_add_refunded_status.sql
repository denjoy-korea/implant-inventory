-- billing_history.payment_status CHECK 제약에 'refunded' 추가
-- 기존: ('pending','completed','failed','cancelled')
-- 이유: process_refund_and_cancel RPC가 'refunded'로 설정하므로 명시적 허용 필요

ALTER TABLE billing_history
  DROP CONSTRAINT IF EXISTS billing_history_payment_status_check;

ALTER TABLE billing_history
  ADD CONSTRAINT billing_history_payment_status_check
  CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled', 'refunded'));
