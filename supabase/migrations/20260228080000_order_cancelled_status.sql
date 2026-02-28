-- Phase 1: 발주 고도화
-- orders 테이블에 cancelled 상태, memo, cancelled_reason 컬럼 추가

-- 1. 신규 컬럼 추가
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS memo TEXT,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT;

-- 2. status CHECK 제약 조건 확장 (cancelled 추가)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('ordered', 'received', 'cancelled'));
