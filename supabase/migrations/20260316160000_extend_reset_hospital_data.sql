-- admin_reset_hospital_data 확장: 교환/반품, FAIL, 업체 연락처, DentWeb 설정 포함
-- 개인정보(계정, 구독)를 제외한 모든 병원 운영 데이터를 초기화한다.

DROP FUNCTION IF EXISTS admin_reset_hospital_data(UUID);

CREATE OR REPLACE FUNCTION admin_reset_hospital_data(p_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_is_member BOOLEAN := FALSE;
  v_due_scheduled_request BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = v_user_id AND p.role = 'admin'
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = v_user_id AND p.hospital_id = p_hospital_id
    ) INTO v_is_member;

    SELECT EXISTS (
      SELECT 1 FROM data_reset_requests r
      WHERE r.hospital_id = p_hospital_id
        AND r.status = 'scheduled'
        AND r.scheduled_at IS NOT NULL
        AND r.scheduled_at <= now()
    ) INTO v_due_scheduled_request;

    IF NOT (v_is_member AND v_due_scheduled_request) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- 1. 주문 품목 (order_items → orders)
  IF to_regclass('public.order_items') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.order_items
       WHERE order_id IN (SELECT id FROM public.orders WHERE hospital_id = $1)'
    USING p_hospital_id;
  END IF;
  DELETE FROM orders WHERE hospital_id = p_hospital_id;

  -- 2. 수술기록
  DELETE FROM surgery_records WHERE hospital_id = p_hospital_id;

  -- 3. 재고 마스터
  DELETE FROM inventory WHERE hospital_id = p_hospital_id;

  -- 4. 재고실사
  IF to_regclass('public.inventory_audits') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.inventory_audits WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  -- 5. 반품/교환 요청 품목 → 요청 순으로 삭제
  IF to_regclass('public.return_request_items') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.return_request_items
       WHERE return_request_id IN (SELECT id FROM public.return_requests WHERE hospital_id = $1)'
    USING p_hospital_id;
  END IF;
  IF to_regclass('public.return_requests') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.return_requests WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  -- 6. FAIL 감지 내역
  IF to_regclass('public.detected_fails') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.detected_fails WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  -- 7. DentWeb 자동화 설정
  IF to_regclass('public.dentweb_automation_settings') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.dentweb_automation_settings WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  -- 9. 활동 로그
  IF to_regclass('public.operation_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.operation_logs WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION admin_reset_hospital_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_reset_hospital_data(UUID) TO authenticated;
