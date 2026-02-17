-- ============================================
-- 008: hidden 플랜 ultimate 추가
-- ============================================

-- 1) hospitals.plan 제약에 ultimate 추가
ALTER TABLE hospitals
  DROP CONSTRAINT IF EXISTS hospitals_plan_check;

ALTER TABLE hospitals
  ADD CONSTRAINT hospitals_plan_check
  CHECK (plan IN ('free', 'basic', 'plus', 'business', 'ultimate'));

-- 2) 플랜 제한 계산 함수에 ultimate 추가
CREATE OR REPLACE FUNCTION _plan_max_items(p_plan TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 80
    WHEN 'basic' THEN 200
    WHEN 'plus' THEN 500
    WHEN 'business' THEN 2147483647
    WHEN 'ultimate' THEN 2147483647
    ELSE 80
  END;
$$;

CREATE OR REPLACE FUNCTION _plan_max_users(p_plan TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 1
    WHEN 'plus' THEN 5
    WHEN 'business' THEN 2147483647
    WHEN 'ultimate' THEN 2147483647
    ELSE 1
  END;
$$;

-- 3) hidden 플랜 변경 규칙
-- - ultimate는 admin만 설정 가능
-- - ultimate는 만료/결제주기 없음(평생)
CREATE OR REPLACE FUNCTION change_hospital_plan(
  p_hospital_id UUID,
  p_plan TEXT,
  p_billing_cycle TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  IF p_plan NOT IN ('free', 'basic', 'plus', 'business', 'ultimate') THEN
    RETURN FALSE;
  END IF;

  IF p_plan = 'ultimate'
     AND NOT EXISTS (
       SELECT 1
       FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role = 'admin'
     ) THEN
    RETURN FALSE;
  END IF;

  IF p_plan IN ('free', 'ultimate') THEN
    v_expires_at := NULL;
    p_billing_cycle := NULL;
  ELSE
    IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
      RETURN FALSE;
    END IF;

    IF p_billing_cycle = 'yearly' THEN
      v_expires_at := now() + interval '365 days';
    ELSE
      v_expires_at := now() + interval '30 days';
    END IF;
  END IF;

  UPDATE hospitals
  SET
    plan = p_plan,
    plan_expires_at = v_expires_at,
    billing_cycle = p_billing_cycle,
    trial_used = TRUE
  WHERE id = p_hospital_id;

  RETURN FOUND;
END;
$$;
