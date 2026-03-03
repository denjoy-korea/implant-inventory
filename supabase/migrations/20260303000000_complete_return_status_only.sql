-- ======================================================
-- 반품 재고 차감 시점 변경: 완료 시 → 신청 시
-- complete_return_and_adjust_stock에서 재고 차감 로직 제거
-- 재고는 프론트엔드에서 반품 신청(requested) 시 즉시 차감
-- 완료(completed) 전환은 상태 변경만 수행
-- ======================================================
CREATE OR REPLACE FUNCTION complete_return_and_adjust_stock(
  p_return_id   UUID,
  p_hospital_id UUID
) RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_caller_hid UUID;
BEGIN
  -- 호출자의 병원 ID를 profiles에서 조회하여 검증
  SELECT hospital_id INTO v_caller_hid
  FROM profiles
  WHERE id = auth.uid();

  IF v_caller_hid IS NULL OR v_caller_hid <> p_hospital_id THEN
    RAISE EXCEPTION 'unauthorized: caller hospital mismatch';
  END IF;

  -- 상태 업데이트만 수행 (picked_up → completed)
  -- 재고 차감은 반품 신청(create_return_with_items) 시 프론트엔드에서 처리
  UPDATE return_requests
  SET status = 'completed', completed_date = CURRENT_DATE
  WHERE id = p_return_id
    AND hospital_id = v_caller_hid
    AND status = 'picked_up';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_status_transition';
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_return_and_adjust_stock(UUID, UUID) TO authenticated;
