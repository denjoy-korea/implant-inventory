-- =============================================================================
-- start_hospital_trial: business 플랜 허용 누락 버그 수정
--
-- 문제: 5-param 버전의 start_hospital_trial에서
--       p_plan NOT IN ('basic', 'plus') 조건이 'business'를 차단
--       → Business 플랜 선택 후 가입 시 trial이 시작되지 않고 무료 플랜으로 유지됨
-- =============================================================================

CREATE OR REPLACE FUNCTION start_hospital_trial(
  p_hospital_id UUID,
  p_plan TEXT DEFAULT 'plus',
  p_email_hash TEXT DEFAULT NULL,
  p_phone_hash TEXT DEFAULT NULL,
  p_name_hash TEXT DEFAULT NULL
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  -- 유효한 유료 플랜만 허용 (business 포함)
  IF p_plan NOT IN ('basic', 'plus', 'business') THEN
    RETURN FALSE;
  END IF;

  UPDATE hospitals SET
    plan = p_plan,
    trial_started_at = now(),
    trial_used = FALSE,
    plan_expires_at = NULL,
    billing_cycle = NULL
  WHERE id = p_hospital_id
    AND COALESCE(trial_used, FALSE) = FALSE
    AND trial_started_at IS NULL;

  RETURN FOUND;
END;
$$;
