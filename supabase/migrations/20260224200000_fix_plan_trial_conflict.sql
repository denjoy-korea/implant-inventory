-- =============================================================================
-- Fix: check_plan_expiry Case 1이 유효한 유료 플랜을 가진 병원을 잘못 다운그레이드하는 버그 수정
--
-- 문제: Case 1(체험 만료)이 plan_expires_at를 확인하지 않아
--       admin이 trial_used를 초기화한 유료 Plus 병원이 14일 후 Free로 다운그레이드됨
--
-- 수정: Case 1에 plan_expires_at 유효성 검사 추가
--       → plan_expires_at이 아직 미래인 경우 체험 만료로 다운그레이드하지 않음
-- =============================================================================

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

  -- Case 1: 체험 만료
  -- 단, 유료 플랜 만료일(plan_expires_at)이 아직 유효하면 건너뜀
  -- (admin이 trial_used를 리셋한 유료 플랜 사용자를 잘못 다운그레이드하지 않도록)
  IF v_hospital.trial_started_at IS NOT NULL
     AND COALESCE(v_hospital.trial_used, FALSE) = FALSE
     AND now() >= (v_hospital.trial_started_at + interval '14 days')
     AND (v_hospital.plan_expires_at IS NULL OR now() >= v_hospital.plan_expires_at)
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
