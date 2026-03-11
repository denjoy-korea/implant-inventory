-- =============================================================================
-- change_hospital_plan에 billing_history INSERT 추가
--
-- 변경 전: hospitals UPDATE만 수행 (billing_history 기록 없음)
-- 변경 후: UPDATE 성공 시 billing_history INSERT 추가
--   - admin 호출 → payment_method='admin_manual', description='플랜 변경 신청 처리'
--   - 일반 사용자 호출 → payment_method='plan_change', description='사용자 플랜 변경'
-- =============================================================================

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
  v_role TEXT;
  v_expires_at TIMESTAMPTZ;
  v_changed_at TIMESTAMPTZ := now();
  v_payment_method TEXT;
  v_description TEXT;
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

  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();

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

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 호출자 권한에 따라 결제 수단/설명 분기
  IF v_role = 'admin' THEN
    v_payment_method := 'admin_manual';
    v_description := '플랜 변경 신청 처리';
  ELSE
    v_payment_method := 'plan_change';
    v_description := '사용자 플랜 변경';
  END IF;

  INSERT INTO billing_history (
    hospital_id, plan, billing_cycle, amount,
    payment_status, payment_method, description, created_by
  ) VALUES (
    p_hospital_id, p_plan, p_billing_cycle, 0,
    'completed', v_payment_method, v_description, auth.uid()
  );

  RETURN TRUE;
END;
$$;
