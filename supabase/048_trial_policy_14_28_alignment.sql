-- ============================================
-- 048: 트라이얼 기간 정책 정렬 (기본 14일, 베타 신청분 28일)
-- ============================================
-- 기준:
-- - 기본: 14일
-- - 베타 신청분: trial_started_at 이 2026-04-01 00:00:00+09:00 이전이면 28일

CREATE OR REPLACE FUNCTION _trial_duration_days(p_trial_started_at TIMESTAMPTZ)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_trial_started_at IS NOT NULL
      AND p_trial_started_at < TIMESTAMPTZ '2026-04-01T00:00:00+09:00' THEN 28
    ELSE 14
  END;
$$;

COMMENT ON FUNCTION _trial_duration_days(TIMESTAMPTZ)
IS 'Trial duration policy: default 14 days, beta-started-before-2026-04-01 KST -> 28 days';

-- 1) legacy expire RPC 동기화
CREATE OR REPLACE FUNCTION expire_trial_if_needed(p_hospital_id UUID)
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
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM hospitals h
    WHERE h.id = p_hospital_id
      AND (
        h.id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
        OR _can_manage_hospital(p_hospital_id)
      )
  ) THEN
    RETURN;
  END IF;

  UPDATE hospitals
  SET
    plan = 'free',
    plan_expires_at = NULL,
    billing_cycle = NULL,
    trial_used = TRUE
  WHERE id = p_hospital_id
    AND trial_started_at IS NOT NULL
    AND COALESCE(trial_used, FALSE) = FALSE
    AND now() >= (trial_started_at + (_trial_duration_days(trial_started_at) * interval '1 day'));

  RETURN QUERY
  SELECT h.plan, h.plan_expires_at, h.billing_cycle, h.trial_started_at, h.trial_used
  FROM hospitals h
  WHERE h.id = p_hospital_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION expire_trial_if_needed(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION expire_trial_if_needed(UUID) TO authenticated;

-- 2) 메인 만료 RPC 동기화
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
     AND now() >= (
       v_hospital.trial_started_at
       + (_trial_duration_days(v_hospital.trial_started_at) * interval '1 day')
     )
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

  -- Case 2: 유료 플랜 만료
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

  RETURN QUERY
  SELECT h.plan, h.plan_expires_at, h.billing_cycle, h.trial_started_at, h.trial_used
  FROM hospitals h
  WHERE h.id = p_hospital_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION check_plan_expiry(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION check_plan_expiry(UUID) TO authenticated;
