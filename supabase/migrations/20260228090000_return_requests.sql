-- Phase 2: 반품 관리 신규
-- return_requests, return_request_items 테이블 생성 + RLS + RPC

-- 1. return_requests 테이블
CREATE TABLE IF NOT EXISTS return_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id      UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  manufacturer     TEXT NOT NULL,
  reason           TEXT NOT NULL
                     CHECK (reason IN ('excess_stock', 'defective', 'exchange')),
  status           TEXT NOT NULL DEFAULT 'requested'
                     CHECK (status IN ('requested', 'picked_up', 'completed', 'rejected')),
  requested_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  completed_date   DATE,
  manager          TEXT NOT NULL,
  memo             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- 2. return_request_items 테이블
CREATE TABLE IF NOT EXISTS return_request_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES return_requests(id) ON DELETE CASCADE,
  brand             TEXT NOT NULL,
  size              TEXT NOT NULL,
  quantity          INTEGER NOT NULL CHECK (quantity > 0)
);

-- 3. RLS 활성화
ALTER TABLE return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE return_request_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 (병원 단위 격리)
CREATE POLICY "return_requests_hospital_isolation" ON return_requests
  USING (hospital_id = (
    SELECT hospital_id FROM profiles WHERE id = auth.uid()
  ));

CREATE POLICY "return_request_items_hospital_isolation" ON return_request_items
  USING (
    return_request_id IN (
      SELECT id FROM return_requests
      WHERE hospital_id = (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- 5. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_return_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER return_requests_updated_at
  BEFORE UPDATE ON return_requests
  FOR EACH ROW EXECUTE FUNCTION update_return_requests_updated_at();

-- 6. 원자적 생성 RPC (return + items)
CREATE OR REPLACE FUNCTION create_return_with_items(
  p_return JSONB,
  p_items  JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_return_id UUID;
BEGIN
  INSERT INTO return_requests (
    hospital_id, manufacturer, reason, status,
    requested_date, manager, memo
  )
  VALUES (
    (p_return->>'hospital_id')::UUID,
    p_return->>'manufacturer',
    p_return->>'reason',
    COALESCE(p_return->>'status', 'requested'),
    COALESCE((p_return->>'requested_date')::DATE, CURRENT_DATE),
    p_return->>'manager',
    p_return->>'memo'
  )
  RETURNING id INTO v_return_id;

  INSERT INTO return_request_items (return_request_id, brand, size, quantity)
  SELECT
    v_return_id,
    item->>'brand',
    item->>'size',
    (item->>'quantity')::INTEGER
  FROM jsonb_array_elements(p_items) AS item;

  RETURN v_return_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_return_with_items(JSONB, JSONB) TO authenticated;

-- 7. 반품 완료 + 재고 차감 원자적 RPC
CREATE OR REPLACE FUNCTION complete_return_and_adjust_stock(
  p_return_id   UUID,
  p_hospital_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item   RECORD;
  v_inv_id UUID;
BEGIN
  -- 상태 업데이트 (picked_up → completed, 낙관적 잠금)
  UPDATE return_requests
  SET status = 'completed', completed_date = CURRENT_DATE
  WHERE id = p_return_id
    AND hospital_id = p_hospital_id
    AND status = 'picked_up';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_status_transition';
  END IF;

  -- 품목별 재고 차감 (stock_adjustment 감소)
  FOR v_item IN
    SELECT brand, size, quantity
    FROM return_request_items
    WHERE return_request_id = p_return_id
  LOOP
    SELECT id INTO v_inv_id
    FROM inventory
    WHERE hospital_id = p_hospital_id
      AND brand = v_item.brand
      AND size = v_item.size
    LIMIT 1;

    IF v_inv_id IS NOT NULL THEN
      UPDATE inventory
      SET stock_adjustment = COALESCE(stock_adjustment, 0) - v_item.quantity
      WHERE id = v_inv_id;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_return_and_adjust_stock(UUID, UUID) TO authenticated;
