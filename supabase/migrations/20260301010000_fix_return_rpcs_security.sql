-- Fix 1 (Issue #6): complete_return_and_adjust_stock에 manufacturer 조건 추가
-- Fix 2 (Issue #7): SECURITY DEFINER RPCs에서 client-supplied hospital_id 신뢰 제거 → profiles 기반 검증
-- hospital_id는 profiles.hospital_id로 조회 (기존 RLS 패턴과 동일)

-- ======================================================
-- create_return_with_items: auth.uid() 소속 병원으로 고정
-- ======================================================
CREATE OR REPLACE FUNCTION create_return_with_items(
  p_return JSONB,
  p_items  JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_return_id   UUID;
  v_hospital_id UUID;
BEGIN
  -- 호출자의 병원 ID를 profiles에서 조회 (클라이언트 제공값 무시)
  SELECT hospital_id INTO v_hospital_id
  FROM profiles
  WHERE id = auth.uid();

  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized: caller has no hospital assignment';
  END IF;

  INSERT INTO return_requests (
    hospital_id, manufacturer, reason, status,
    requested_date, manager, memo
  )
  VALUES (
    v_hospital_id,
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

-- ======================================================
-- complete_return_and_adjust_stock:
--   (1) hospital_id를 profiles 기반으로 검증
--   (2) 재고 매칭에 manufacturer 조건 추가
-- ======================================================
CREATE OR REPLACE FUNCTION complete_return_and_adjust_stock(
  p_return_id   UUID,
  p_hospital_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_item         RECORD;
  v_inv_id       UUID;
  v_manufacturer TEXT;
  v_caller_hid   UUID;
BEGIN
  -- 호출자의 병원 ID를 profiles에서 조회하여 검증
  SELECT hospital_id INTO v_caller_hid
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_hid IS NULL OR v_caller_hid <> p_hospital_id THEN
    RAISE EXCEPTION 'unauthorized: caller hospital mismatch';
  END IF;

  -- 상태 업데이트 (picked_up → completed, 낙관적 잠금)
  UPDATE return_requests
  SET status = 'completed', completed_date = CURRENT_DATE
  WHERE id = p_return_id
    AND hospital_id = v_caller_hid
    AND status = 'picked_up';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_status_transition';
  END IF;

  -- 반품 요청의 manufacturer 조회
  SELECT manufacturer INTO v_manufacturer
  FROM return_requests
  WHERE id = p_return_id;

  -- 품목별 재고 차감 — manufacturer 포함 정확 매칭
  FOR v_item IN
    SELECT brand, size, quantity
    FROM return_request_items
    WHERE return_request_id = p_return_id
  LOOP
    SELECT id INTO v_inv_id
    FROM inventory
    WHERE hospital_id = v_caller_hid
      AND manufacturer = v_manufacturer
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
