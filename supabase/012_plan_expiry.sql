-- ============================================
-- 012: 플랜 만료 자동 다운그레이드 + 읽기전용 강제
-- ============================================

-- 1) 플랜 만료 확인 및 자동 Free 다운그레이드 RPC
--    앱 로드 시 호출: 트라이얼 만료 + 유료 플랜 만료 모두 처리
CREATE OR REPLACE FUNCTION check_plan_expiry(p_hospital_id UUID)
RETURNS TABLE (
  plan TEXT,
  plan_expires_at TIMESTAMPTZ,
  billing_cycle TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_used BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital RECORD;
  v_downgraded BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- 권한 확인: 운영자이거나 해당 병원 멤버
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR hospital_id = p_hospital_id)
  ) THEN
    RETURN;
  END IF;

  SELECT * INTO v_hospital FROM hospitals WHERE id = p_hospital_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Case 1: 트라이얼 만료
  IF v_hospital.trial_started_at IS NOT NULL
     AND COALESCE(v_hospital.trial_used, FALSE) = FALSE
     AND now() >= (v_hospital.trial_started_at + interval '14 days')
  THEN
    UPDATE hospitals SET
      plan = 'free',
      plan_expires_at = NULL,
      billing_cycle = NULL,
      trial_used = TRUE
    WHERE id = p_hospital_id;

    INSERT INTO billing_history (hospital_id, plan, amount, payment_status, description)
    VALUES (p_hospital_id, 'free', 0, 'completed', '트라이얼 만료 - 자동 Free 다운그레이드');

    v_downgraded := TRUE;
  END IF;

  -- Case 2: 유료 플랜 만료 (plan_expires_at 경과)
  IF NOT v_downgraded
     AND v_hospital.plan_expires_at IS NOT NULL
     AND now() >= v_hospital.plan_expires_at
     AND v_hospital.plan NOT IN ('free', 'ultimate')
  THEN
    UPDATE hospitals SET
      plan = 'free',
      plan_expires_at = NULL,
      billing_cycle = NULL
    WHERE id = p_hospital_id;

    INSERT INTO billing_history (hospital_id, plan, amount, payment_status, description)
    VALUES (p_hospital_id, 'free', 0, 'completed',
      format('플랜 만료 (%s → Free) - 자동 다운그레이드', v_hospital.plan));
  END IF;

  -- 최종 상태 반환
  RETURN QUERY
  SELECT h.plan, h.plan_expires_at, h.billing_cycle, h.trial_started_at, h.trial_used
  FROM hospitals h
  WHERE h.id = p_hospital_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION check_plan_expiry(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_plan_expiry(UUID) TO authenticated;

-- 2) 기존 enforce_inventory_plan_limit 수정:
--    Free 플랜에서 한도 초과 시 UPDATE도 차단 (읽기 전용)
--    단, DELETE는 기존대로 허용 (트리거는 INSERT/UPDATE에만 동작)
CREATE OR REPLACE FUNCTION enforce_inventory_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
  v_max_items INTEGER;
  v_count INTEGER;
BEGIN
  -- 같은 병원 내 UPDATE (hospital_id 변경 없음)이면서
  -- 한도 초과 상태: Free 플랜 읽기전용 강제
  IF TG_OP = 'UPDATE' AND OLD.hospital_id = NEW.hospital_id THEN
    SELECT plan INTO v_plan FROM hospitals WHERE id = NEW.hospital_id;
    v_max_items := _plan_max_items(COALESCE(v_plan, 'free'));

    IF v_max_items < 2147483647 THEN
      SELECT COUNT(*) INTO v_count FROM inventory WHERE hospital_id = NEW.hospital_id;
      IF v_count > v_max_items THEN
        RAISE EXCEPTION 'PLAN_READONLY_EXCEEDED'
          USING ERRCODE = 'P0001',
                DETAIL = format('read_only=true, max_items=%s, current=%s', v_max_items, v_count);
      END IF;
    END IF;

    RETURN NEW;
  END IF;

  -- INSERT: 기존 한도 초과 차단
  SELECT plan INTO v_plan FROM hospitals WHERE id = NEW.hospital_id;
  v_max_items := _plan_max_items(COALESCE(v_plan, 'free'));

  IF v_max_items < 2147483647 THEN
    SELECT COUNT(*) INTO v_count FROM inventory WHERE hospital_id = NEW.hospital_id;
    IF v_count >= v_max_items THEN
      RAISE EXCEPTION 'PLAN_LIMIT_ITEMS_EXCEEDED'
        USING ERRCODE = 'P0001',
              DETAIL = format('max_items=%s', v_max_items);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
