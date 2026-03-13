-- ────────────────────────────────────────────────────────────────────────────
-- [M-3] billing_history.payment_ref UNIQUE 인덱스 추가
--   버그: payment_ref (TossPayments paymentKey)에 UNIQUE 제약 없음
--         동일 paymentKey로 두 개의 billing 레코드가 기록될 수 있음
--   수정: NULL을 제외한 payment_ref에만 UNIQUE partial index 적용
--         (NULL은 pending/failed 레코드에서 비어있으므로 제외)
-- ────────────────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS billing_history_payment_ref_unique
  ON billing_history(payment_ref)
  WHERE payment_ref IS NOT NULL;
