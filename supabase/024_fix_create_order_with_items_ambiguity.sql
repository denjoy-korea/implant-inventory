-- ============================================
-- 024: create_order_with_items 모호성(ambiguous column) 핫픽스
-- 원인: RETURNS TABLE 출력 컬럼명(id, hospital_id)과
--       함수 내부 SELECT 컬럼명이 충돌
-- ============================================

CREATE OR REPLACE FUNCTION create_order_with_items(
  p_order JSONB,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  id UUID,
  hospital_id UUID,
  type TEXT,
  manufacturer TEXT,
  date DATE,
  manager TEXT,
  status TEXT,
  received_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
  v_my_hospital_id UUID;
  v_order_id UUID;
  v_item JSONB;
  v_qty INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_hospital_id := (p_order->>'hospital_id')::UUID;

  -- IMPORTANT: qualify both selected/filtered columns to avoid
  -- ambiguity with RETURNS TABLE output variables.
  SELECT p.hospital_id
    INTO v_my_hospital_id
  FROM profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF v_hospital_id IS NULL OR v_hospital_id IS DISTINCT FROM v_my_hospital_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO orders (
    hospital_id,
    type,
    manufacturer,
    date,
    manager,
    status,
    received_date
  )
  VALUES (
    v_hospital_id,
    p_order->>'type',
    COALESCE(p_order->>'manufacturer', ''),
    (p_order->>'date')::DATE,
    COALESCE(p_order->>'manager', ''),
    COALESCE(p_order->>'status', 'ordered'),
    CASE
      WHEN p_order ? 'received_date'
        AND p_order->>'received_date' IS NOT NULL
        AND p_order->>'received_date' <> ''
      THEN (p_order->>'received_date')::DATE
      ELSE NULL
    END
  )
  RETURNING orders.id INTO v_order_id;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ITEMS_FORMAT';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::INT, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM_QUANTITY';
    END IF;

    INSERT INTO order_items (order_id, brand, size, quantity)
    VALUES (
      v_order_id,
      COALESCE(v_item->>'brand', ''),
      COALESCE(v_item->>'size', ''),
      v_qty
    );
  END LOOP;

  RETURN QUERY
  SELECT
    o.id,
    o.hospital_id,
    o.type,
    o.manufacturer,
    o.date,
    o.manager,
    o.status,
    o.received_date,
    o.created_at
  FROM orders o
  WHERE o.id = v_order_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_items(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO authenticated;
