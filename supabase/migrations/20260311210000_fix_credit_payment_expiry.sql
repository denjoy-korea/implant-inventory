-- Fix: process_credit_payment - 플랜 변경 시 만료일 연장 버그 수정
--
-- 20260311190000_process_credit_payment.sql 에서
-- ELSE 브랜치(플랜 변경)가 v_base = now()로 설정되어 만료일이 연장되는 버그가 있었음.
--
-- 수정 동작:
--   동일 플랜 갱신: GREATEST(now, current_expiry) + interval (잔여일 보존)
--   플랜 변경:      기존 plan_expires_at 유지
--                  만료일 없거나 이미 지난 경우에만 now() + interval 새로 설정

CREATE OR REPLACE FUNCTION process_credit_payment(
  p_billing_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing        RECORD;
  v_current_plan   TEXT;
  v_current_expiry TIMESTAMPTZ;
  v_base           TIMESTAMPTZ;
  v_expires_at     TIMESTAMPTZ;
  v_changed_at     TIMESTAMPTZ := now();
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

  -- 크레딧 전액 결제 검증: amount가 0이어야 함
  IF COALESCE(v_billing.amount, -1) != 0 THEN
    RAISE EXCEPTION 'process_credit_payment: billing amount must be 0, got %', v_billing.amount;
  END IF;

  -- billing → completed
  UPDATE billing_history
  SET
    payment_status = 'completed',
    updated_at     = now()
  WHERE id = p_billing_id;

  -- 현재 플랜/만료일 조회
  SELECT plan, plan_expires_at INTO v_current_plan, v_current_expiry
  FROM hospitals
  WHERE id = v_billing.hospital_id;

  -- 만료일 계산: 갱신(동일 플랜) vs 플랜 변경
  IF v_current_plan = v_billing.plan THEN
    -- 갱신: 잔여일 보존
    v_base := GREATEST(v_changed_at, COALESCE(v_current_expiry, v_changed_at));
    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := v_base + interval '1 year';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := v_base + interval '1 month';
    ELSE
      v_expires_at := NULL;
    END IF;
  ELSE
    -- 플랜 변경: 기존 만료일 유지 (업그레이드 크레딧이 잔여 기간 보상)
    IF v_current_expiry IS NOT NULL AND v_current_expiry > v_changed_at THEN
      v_expires_at := v_current_expiry;
    ELSE
      -- 만료일 없음(무료→유료) 또는 이미 만료된 경우: 새로 설정
      IF v_billing.billing_cycle = 'yearly' THEN
        v_expires_at := v_changed_at + interval '1 year';
      ELSIF v_billing.billing_cycle = 'monthly' THEN
        v_expires_at := v_changed_at + interval '1 month';
      ELSE
        v_expires_at := NULL;
      END IF;
    END IF;
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
