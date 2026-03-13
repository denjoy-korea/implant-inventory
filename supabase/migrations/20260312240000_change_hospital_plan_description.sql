-- =============================================================================
-- change_hospital_plan: description 업그레이드/다운그레이드 방향 기록
--
-- 변경 전: description = '플랜 변경 신청 처리' | '사용자 플랜 변경' (방향 구분 없음)
-- 변경 후: UPDATE 전에 현재 플랜을 조회하여 방향 판별
--   - 업그레이드: '업그레이드: free → basic'
--   - 다운그레이드: '다운그레이드: plus → basic'
--   - 동일 플랜:  '플랜 변경: basic → basic' (사이클 전환 등)
--   - admin:    '어드민 처리: plus → business'
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
  v_role         TEXT;
  v_current_plan TEXT;
  v_expires_at   TIMESTAMPTZ;
  v_changed_at   TIMESTAMPTZ := now();
  v_payment_method TEXT;
  v_description  TEXT;
  v_old_rank     INTEGER;
  v_new_rank     INTEGER;
  v_direction    TEXT;
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

  -- 현재 플랜 조회 (description 방향 판별용, UPDATE 전)
  SELECT plan INTO v_current_plan FROM hospitals WHERE id = p_hospital_id;

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

  -- 플랜 순서: free=0, basic=1, plus=2, business=3, ultimate=4
  v_old_rank := CASE COALESCE(v_current_plan, 'free')
    WHEN 'free'     THEN 0
    WHEN 'basic'    THEN 1
    WHEN 'plus'     THEN 2
    WHEN 'business' THEN 3
    WHEN 'ultimate' THEN 4
    ELSE 0
  END;

  v_new_rank := CASE p_plan
    WHEN 'free'     THEN 0
    WHEN 'basic'    THEN 1
    WHEN 'plus'     THEN 2
    WHEN 'business' THEN 3
    WHEN 'ultimate' THEN 4
    ELSE 0
  END;

  IF v_new_rank > v_old_rank THEN
    v_direction := '업그레이드';
  ELSIF v_new_rank < v_old_rank THEN
    v_direction := '다운그레이드';
  ELSE
    v_direction := '플랜 변경';
  END IF;

  -- 호출자 권한에 따라 결제 수단/설명 분기
  IF v_role = 'admin' THEN
    v_payment_method := 'admin_manual';
    v_description    := '어드민 처리: ' || COALESCE(v_current_plan, '?') || ' → ' || p_plan;
  ELSE
    v_payment_method := 'plan_change';
    v_description    := v_direction || ': ' || COALESCE(v_current_plan, '?') || ' → ' || p_plan;
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
