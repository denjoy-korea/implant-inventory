-- 014: hospitals 테이블에 plan_changed_at 컬럼 추가
-- 플랜이 변경된 시점을 기록하여 만료일 계산의 기준점으로 활용

-- 1) 컬럼 추가
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS plan_changed_at TIMESTAMPTZ DEFAULT NULL;

-- 기존 유료 플랜 병원: plan_expires_at에서 역산하여 plan_changed_at 설정
UPDATE hospitals
SET plan_changed_at = CASE
  WHEN plan IN ('free', 'ultimate') THEN NULL
  WHEN billing_cycle = 'yearly' AND plan_expires_at IS NOT NULL THEN plan_expires_at - interval '1 year'
  WHEN billing_cycle = 'monthly' AND plan_expires_at IS NOT NULL THEN plan_expires_at - interval '1 month'
  ELSE now()
END
WHERE plan NOT IN ('free', 'ultimate') AND plan_changed_at IS NULL;

-- 2) admin_assign_plan: plan_changed_at 설정 + 만료일을 변경 시점 기준으로 계산
CREATE OR REPLACE FUNCTION admin_assign_plan(
  p_hospital_id UUID,
  p_plan TEXT,
  p_billing_cycle TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
  v_expires TIMESTAMPTZ;
  v_changed_at TIMESTAMPTZ := now();
BEGIN
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role <> 'admin' THEN
    RETURN FALSE;
  END IF;

  IF p_plan NOT IN ('free', 'basic', 'plus', 'business', 'ultimate') THEN
    RETURN FALSE;
  END IF;

  IF p_expires_at IS NOT NULL THEN
    v_expires := p_expires_at;
  ELSIF p_plan IN ('free', 'ultimate') THEN
    v_expires := NULL;
    v_changed_at := NULL;
    p_billing_cycle := NULL;
  ELSIF p_billing_cycle = 'yearly' THEN
    v_expires := v_changed_at + interval '1 year';
  ELSIF p_billing_cycle = 'monthly' THEN
    v_expires := v_changed_at + interval '1 month';
  ELSE
    v_expires := NULL;
  END IF;

  UPDATE hospitals SET
    plan = p_plan,
    plan_expires_at = v_expires,
    billing_cycle = p_billing_cycle,
    plan_changed_at = v_changed_at,
    trial_used = TRUE
  WHERE id = p_hospital_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  INSERT INTO billing_history (hospital_id, plan, billing_cycle, amount, payment_status, payment_method, description, created_by)
  VALUES (p_hospital_id, p_plan, p_billing_cycle, 0, 'completed', 'admin_manual', '운영자 수동 플랜 배정', auth.uid());

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION admin_assign_plan(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_assign_plan(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;

-- 3) change_hospital_plan: plan_changed_at 설정
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
  v_changed_at TIMESTAMPTZ := now();
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  IF p_plan NOT IN ('free', 'basic', 'plus', 'business', 'ultimate') THEN
    RETURN FALSE;
  END IF;

  IF p_plan = 'ultimate'
     AND NOT EXISTS (
       SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
     ) THEN
    RETURN FALSE;
  END IF;

  IF p_plan IN ('free', 'ultimate') THEN
    v_expires_at := NULL;
    v_changed_at := CASE WHEN p_plan = 'free' THEN NULL ELSE v_changed_at END;
    p_billing_cycle := NULL;
  ELSE
    IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
      RETURN FALSE;
    END IF;
    IF p_billing_cycle = 'yearly' THEN
      v_expires_at := v_changed_at + interval '1 year';
    ELSE
      v_expires_at := v_changed_at + interval '1 month';
    END IF;
  END IF;

  UPDATE hospitals SET
    plan = p_plan,
    plan_expires_at = v_expires_at,
    billing_cycle = p_billing_cycle,
    plan_changed_at = v_changed_at,
    trial_used = TRUE
  WHERE id = p_hospital_id;

  RETURN FOUND;
END;
$$;

-- 4) process_payment_callback: plan_changed_at 설정
CREATE OR REPLACE FUNCTION process_payment_callback(
  p_billing_id UUID,
  p_payment_ref TEXT,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing RECORD;
  v_expires_at TIMESTAMPTZ;
  v_changed_at TIMESTAMPTZ := now();
BEGIN
  SELECT * INTO v_billing FROM billing_history WHERE id = p_billing_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF p_status = 'completed' THEN
    UPDATE billing_history SET
      payment_status = 'completed',
      payment_ref = p_payment_ref,
      updated_at = now()
    WHERE id = p_billing_id;

    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := v_changed_at + interval '1 year';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := v_changed_at + interval '1 month';
    ELSE
      v_expires_at := NULL;
    END IF;

    UPDATE hospitals SET
      plan = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used = TRUE
    WHERE id = v_billing.hospital_id;

  ELSIF p_status = 'failed' THEN
    UPDATE billing_history SET
      payment_status = 'failed',
      payment_ref = p_payment_ref,
      updated_at = now()
    WHERE id = p_billing_id;
  END IF;

  RETURN TRUE;
END;
$$;
