-- ============================================
-- C-03 보안 패치: process_payment_callback GRANT
-- 문제: 013_payment_callback.sql에서 authenticated에 GRANT된 채로 있을 수 있음
-- 수정: service_role 전용 실행 + 함수 내 JWT role 이중 검증
-- ============================================

-- 1) process_payment_callback: service_role 전용 + JWT role 검증
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
  v_jwt_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  -- GRANT 우회 방어: JWT role이 service_role이 아니면 즉시 거부
  IF COALESCE(v_jwt_role, '') <> 'service_role' THEN
    RETURN FALSE;
  END IF;

  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_billing
  FROM billing_history
  WHERE id = p_billing_id
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_billing.payment_status IN ('completed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  IF p_status = 'completed' THEN
    UPDATE billing_history
    SET
      payment_status = 'completed',
      payment_ref    = p_payment_ref,
      updated_at     = now()
    WHERE id = p_billing_id;

    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := v_changed_at + interval '1 year';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := v_changed_at + interval '1 month';
    ELSE
      v_expires_at := NULL;
    END IF;

    UPDATE hospitals
    SET
      plan           = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle  = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used     = TRUE
    WHERE id = v_billing.hospital_id;
  ELSE
    UPDATE billing_history
    SET
      payment_status = 'failed',
      payment_ref    = p_payment_ref,
      updated_at     = now()
    WHERE id = p_billing_id;
  END IF;

  RETURN TRUE;
END;
$$;

-- 2) GRANT 수정: public/authenticated 완전 차단, service_role 전용
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO service_role;
