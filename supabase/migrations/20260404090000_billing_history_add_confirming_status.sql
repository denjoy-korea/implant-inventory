-- billing_history.payment_status CHECK 제약에 'confirming' 추가
-- 이유:
--   toss-payment-confirm Edge Function이 pending -> confirming CAS 전환을 사용한다.
--   스키마/타입과 실제 런타임 상태 머신을 일치시켜야 한다.

ALTER TABLE public.billing_history
  DROP CONSTRAINT IF EXISTS billing_history_payment_status_check;

ALTER TABLE public.billing_history
  ADD CONSTRAINT billing_history_payment_status_check
  CHECK (payment_status IN ('pending', 'confirming', 'completed', 'failed', 'cancelled', 'refunded'));
