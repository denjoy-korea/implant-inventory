-- billing_history 테스트/실결제 구분 플래그
-- 목적:
-- 1) 테스트 단계 결제를 실결제로 오인하지 않도록 명시적 분리
-- 2) MRR raw 검증 시 is_test_payment=false만 실결제로 집계

ALTER TABLE public.billing_history
  ADD COLUMN IF NOT EXISTS is_test_payment BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.billing_history.is_test_payment IS
'true=test/sandbox payment, false=live/real settlement payment';

-- 출시 초기(실결제 전) 생성된 레코드는 테스트 결제로 백필
UPDATE public.billing_history
SET is_test_payment = TRUE
WHERE created_at < TIMESTAMPTZ '2026-03-06T00:00:00+09:00'
  AND is_test_payment IS DISTINCT FROM TRUE;

CREATE INDEX IF NOT EXISTS idx_billing_history_test_flag
  ON public.billing_history(is_test_payment, created_at DESC);
