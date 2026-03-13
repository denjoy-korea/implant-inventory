-- ────────────────────────────────────────────────────────────────────────────
-- [C-7] process_credit_payment 잔액 검증 강화
--   버그: credit_used_amount를 클라이언트가 임의 설정 가능하며
--         RPC 내부에서 hospitals.credit_balance >= credit_used_amount 검증 없음
--         → credit_balance를 초과하는 크레딧 결제 가능 (금전적 손실)
--   수정: hospitals row를 FOR UPDATE로 잠근 뒤 잔액 충분 여부 검증 후 차감
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION process_credit_payment(
  p_billing_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing          RECORD;
  v_hospital         RECORD;
  v_current_plan     TEXT;
  v_current_expiry   TIMESTAMPTZ;
  v_base             TIMESTAMPTZ;
  v_expires_at       TIMESTAMPTZ;
  v_changed_at       TIMESTAMPTZ := now();
  v_unit_price       INTEGER;
  v_expected_base    INTEGER;
  v_expected_vat     INTEGER;
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

  -- DB 가격 기준 크레딧 커버리지 검증
  SELECT price INTO v_unit_price
  FROM plan_pricing
  WHERE plan          = v_billing.plan
    AND billing_cycle = v_billing.billing_cycle
    AND effective_from <= v_billing.created_at
    AND (effective_to IS NULL OR effective_to > v_billing.created_at)
  ORDER BY effective_from DESC
  LIMIT 1;

  IF v_unit_price IS NOT NULL AND v_unit_price > 0 THEN
    v_expected_base := CASE
      WHEN v_billing.billing_cycle = 'yearly' THEN v_unit_price * 12
      ELSE v_unit_price
    END;

    v_expected_vat := ROUND(
      (v_expected_base - COALESCE(v_billing.discount_amount, 0)) * 1.1
    );

    IF COALESCE(v_billing.credit_used_amount, 0)
       + COALESCE(v_billing.upgrade_credit_amount, 0) < v_expected_vat THEN
      RAISE EXCEPTION
        'process_credit_payment: insufficient credit coverage. expected=%, credit_used=%, upgrade_credit=%',
        v_expected_vat,
        COALESCE(v_billing.credit_used_amount, 0),
        COALESCE(v_billing.upgrade_credit_amount, 0);
    END IF;
  END IF;

  -- [C-7] hospitals row를 FOR UPDATE로 잠그고 credit_balance 잔액 검증
  SELECT plan, plan_expires_at, credit_balance
  INTO v_hospital
  FROM hospitals
  WHERE id = v_billing.hospital_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hospital not found: %', v_billing.hospital_id;
  END IF;

  -- 실제 차감할 크레딧이 잔액을 초과하면 거부
  IF COALESCE(v_billing.credit_used_amount, 0) > COALESCE(v_hospital.credit_balance, 0) THEN
    RAISE EXCEPTION
      'process_credit_payment: credit_used_amount(%) exceeds credit_balance(%)',
      COALESCE(v_billing.credit_used_amount, 0),
      COALESCE(v_hospital.credit_balance, 0);
  END IF;

  -- billing → completed
  UPDATE billing_history
  SET
    payment_status = 'completed',
    updated_at     = now()
  WHERE id = p_billing_id;

  -- 만료일 계산: 갱신(동일 플랜) vs 플랜 변경
  v_current_plan   := v_hospital.plan;
  v_current_expiry := v_hospital.plan_expires_at;

  IF v_current_plan = v_billing.plan THEN
    v_base := GREATEST(v_changed_at, COALESCE(v_current_expiry, v_changed_at));
    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := v_base + interval '1 year';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := v_base + interval '1 month';
    ELSE
      v_expires_at := NULL;
    END IF;
  ELSE
    IF v_current_expiry IS NOT NULL AND v_current_expiry > v_changed_at THEN
      v_expires_at := v_current_expiry;
    ELSE
      IF v_billing.billing_cycle = 'yearly' THEN
        v_expires_at := v_changed_at + interval '1 year';
      ELSIF v_billing.billing_cycle = 'monthly' THEN
        v_expires_at := v_changed_at + interval '1 month';
      ELSE
        v_expires_at := NULL;
      END IF;
    END IF;
  END IF;

  -- 플랜 업데이트 (hospitals row는 이미 FOR UPDATE로 잠겨있음)
  UPDATE hospitals
  SET
    plan            = v_billing.plan,
    plan_expires_at = v_expires_at,
    billing_cycle   = v_billing.billing_cycle,
    plan_changed_at = v_changed_at,
    trial_used      = TRUE
  WHERE id = v_billing.hospital_id;

  -- 크레딧 차감 (잔액 검증 후 안전하게 차감)
  IF COALESCE(v_billing.credit_used_amount, 0) > 0 THEN
    UPDATE hospitals
    SET credit_balance = GREATEST(0, credit_balance - v_billing.credit_used_amount)
    WHERE id = v_billing.hospital_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION process_credit_payment(UUID) TO authenticated;
