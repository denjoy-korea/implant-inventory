-- ============================================
-- 013: 결제 콜백 처리 RPC (Make → Supabase)
-- ============================================

-- 결제선생 결제 완료/실패 콜백 처리
-- Make 시나리오에서 호출하거나 운영자가 수동으로 호출
CREATE OR REPLACE FUNCTION process_payment_callback(
  p_billing_id UUID,
  p_payment_ref TEXT,
  p_status TEXT  -- 'completed' or 'failed'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing RECORD;
  v_expires_at TIMESTAMPTZ;
BEGIN
  -- 상태 값 검증
  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN FALSE;
  END IF;

  -- billing_history 조회
  SELECT * INTO v_billing FROM billing_history WHERE id = p_billing_id;
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 이미 처리 완료된 건은 무시
  IF v_billing.payment_status IN ('completed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  IF p_status = 'completed' THEN
    -- 결제 성공: billing_history 갱신
    UPDATE billing_history SET
      payment_status = 'completed',
      payment_ref = p_payment_ref,
      updated_at = now()
    WHERE id = p_billing_id;

    -- hospitals 플랜 업데이트
    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := now() + interval '365 days';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := now() + interval '30 days';
    ELSE
      v_expires_at := NULL;
    END IF;

    UPDATE hospitals SET
      plan = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle = v_billing.billing_cycle,
      trial_used = TRUE
    WHERE id = v_billing.hospital_id;

  ELSIF p_status = 'failed' THEN
    -- 결제 실패: billing_history만 갱신
    UPDATE billing_history SET
      payment_status = 'failed',
      payment_ref = p_payment_ref,
      updated_at = now()
    WHERE id = p_billing_id;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO authenticated;

-- 운영자 수동 플랜 배정 RPC
-- 결제 없이 직접 플랜 변경 + billing_history 기록
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
BEGIN
  -- 운영자 권한 확인
  SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
  IF v_role <> 'admin' THEN
    RETURN FALSE;
  END IF;

  -- 플랜 유효성 검증
  IF p_plan NOT IN ('free', 'basic', 'plus', 'business', 'ultimate') THEN
    RETURN FALSE;
  END IF;

  -- 만료일 계산
  IF p_expires_at IS NOT NULL THEN
    v_expires := p_expires_at;
  ELSIF p_plan IN ('free', 'ultimate') THEN
    v_expires := NULL;
    p_billing_cycle := NULL;
  ELSIF p_billing_cycle = 'yearly' THEN
    v_expires := now() + interval '365 days';
  ELSIF p_billing_cycle = 'monthly' THEN
    v_expires := now() + interval '30 days';
  ELSE
    v_expires := NULL;
  END IF;

  -- hospitals 업데이트
  UPDATE hospitals SET
    plan = p_plan,
    plan_expires_at = v_expires,
    billing_cycle = p_billing_cycle,
    trial_used = TRUE
  WHERE id = p_hospital_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- billing_history 기록
  INSERT INTO billing_history (hospital_id, plan, billing_cycle, amount, payment_status, payment_method, description, created_by)
  VALUES (p_hospital_id, p_plan, p_billing_cycle, 0, 'completed', 'admin_manual', '운영자 수동 플랜 배정', auth.uid());

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION admin_assign_plan(UUID, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_assign_plan(UUID, TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
