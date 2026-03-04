-- 발주 입고 확인자 / 반품 처리 확인자
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS confirmed_by TEXT;

ALTER TABLE return_requests
  ADD COLUMN IF NOT EXISTS confirmed_by TEXT;
