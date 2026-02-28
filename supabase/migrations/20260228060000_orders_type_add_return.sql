-- orders 테이블의 type 체크 제약에 'return' 추가
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_type_check;
ALTER TABLE orders ADD CONSTRAINT orders_type_check
  CHECK (type IN ('replenishment', 'fail_exchange', 'return'));
