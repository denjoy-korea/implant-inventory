-- ────────────────────────────────────────────────────────────────────────────
-- [M-8] 무료 체험 동의 타임스탬프 서버 기록
--
-- 문제: PricingTrialConsentModal에서 사용자가 약관에 동의하지만
--       동의 시각이 서버(DB)에 저장되지 않아 법적 증빙 불가
-- 수정:
--   1. hospitals.trial_consent_at timestamptz 컬럼 추가
--   2. start_hospital_trial RPC에 p_consent_at 파라미터 추가 및 저장
-- ────────────────────────────────────────────────────────────────────────────

-- 1. 컬럼 추가
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS trial_consent_at timestamptz;

-- 2. start_hospital_trial RPC 업데이트 (p_consent_at 파라미터 추가)
CREATE OR REPLACE FUNCTION start_hospital_trial(
  p_hospital_id UUID,
  p_plan        TEXT         DEFAULT 'plus',
  p_email_hash  TEXT         DEFAULT NULL,
  p_phone_hash  TEXT         DEFAULT NULL,
  p_name_hash   TEXT         DEFAULT NULL,
  p_consent_at  TIMESTAMPTZ  DEFAULT NULL
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
    plan             = p_plan,
    trial_started_at = now(),
    trial_used       = FALSE,
    plan_expires_at  = NULL,
    billing_cycle    = NULL,
    trial_consent_at = COALESCE(p_consent_at, now())
  WHERE id = p_hospital_id
    AND COALESCE(trial_used, FALSE) = FALSE
    AND trial_started_at IS NULL;

  RETURN FOUND;
END;
$$;
