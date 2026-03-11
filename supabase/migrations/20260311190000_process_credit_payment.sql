-- process_credit_payment: 크레딧 전액 결제 처리 (TossPayments 불필요)
--
-- 사용처: tossPaymentService.requestPayment() — totalAmount === 0 일 때
-- 보안: 호출자가 해당 billing_history의 병원 멤버인지 검증
-- 처리:
--   1. billing_history → completed
--   2. hospitals.plan 업데이트 (만료일 설정)
--   3. hospitals.credit_balance -= credit_used_amount

CREATE OR REPLACE FUNCTION process_credit_payment(
  p_billing_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing       RECORD;
  v_current_plan  TEXT;
  v_current_expiry TIMESTAMPTZ;
  v_base          TIMESTAMPTZ;
  v_expires_at    TIMESTAMPTZ;
  v_changed_at    TIMESTAMPTZ := now();
BEGIN
  -- billing 조회 (락)
  SELECT * INTO v_billing
  FROM billing_history
  WHERE id = p_billing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- 소유권 검증: 호출자가 해당 병원 멤버여야 함
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND hospital_id = v_billing.hospital_id
  ) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- 상태 검증: pending 상태여야 함
  IF v_billing.payment_status != 'pending' THEN
    RETURN FALSE;
  END IF;

  -- 크레딧 전액 결제 검증: amount가 0이어야 함 (credit_used_amount가 충분히 차감됨)
  IF COALESCE(v_billing.amount, -1) != 0 THEN
    RAISE EXCEPTION 'process_credit_payment: billing amount must be 0, got %', v_billing.amount;
  END IF;

  -- billing → completed (payment_ref 없음)
  UPDATE billing_history
  SET
    payment_status = 'completed',
    updated_at     = now()
  WHERE id = p_billing_id;

  -- 현재 플랜/만료일 조회
  SELECT plan, plan_expires_at INTO v_current_plan, v_current_expiry
  FROM hospitals
  WHERE id = v_billing.hospital_id;

  -- 갱신(동일 플랜)이면 잔여일 보존, 변경이면 now()부터
  IF v_current_plan = v_billing.plan THEN
    v_base := GREATEST(v_changed_at, COALESCE(v_current_expiry, v_changed_at));
  ELSE
    v_base := v_changed_at;
  END IF;

  IF v_billing.billing_cycle = 'yearly' THEN
    v_expires_at := v_base + interval '1 year';
  ELSIF v_billing.billing_cycle = 'monthly' THEN
    v_expires_at := v_base + interval '1 month';
  ELSE
    v_expires_at := NULL;
  END IF;

  -- 플랜 업데이트
  UPDATE hospitals
  SET
    plan            = v_billing.plan,
    plan_expires_at = v_expires_at,
    billing_cycle   = v_billing.billing_cycle,
    plan_changed_at = v_changed_at,
    trial_used      = TRUE
  WHERE id = v_billing.hospital_id;

  -- 크레딧 차감
  IF COALESCE(v_billing.credit_used_amount, 0) > 0 THEN
    UPDATE hospitals
    SET credit_balance = GREATEST(0, credit_balance - v_billing.credit_used_amount)
    WHERE id = v_billing.hospital_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION process_credit_payment(UUID) TO authenticated;
