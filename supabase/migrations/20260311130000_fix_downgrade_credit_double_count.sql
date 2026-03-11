-- 다운그레이드 크레딧 이중 적립 버그 수정
--
-- 버그 원인:
--   Plus→Basic 다운그레이드 후 Basic→Free 시,
--   SQL이 항상 최근 완료 결제(Plus)를 기준으로 잔여가치 재계산 → 이중 적립
--
-- 수정:
--   결제 기록.plan = 현재 플랜 → 결제 금액 기반 (1차 다운그레이드, 기존 동작)
--   결제 기록.plan ≠ 현재 플랜 → 이미 다운그레이드된 상태, plan_expires_at 기반
--     현재 플랜 표준가 × 잔여일수 (2차+ 다운그레이드)

CREATE OR REPLACE FUNCTION execute_downgrade_with_credit(
  p_hospital_id   UUID,
  p_to_plan       TEXT,
  p_billing_cycle TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing            RECORD;
  v_hospital_plan      TEXT;
  v_current_expiry     TIMESTAMPTZ;
  v_hospital_cycle     TEXT;
  v_used_days          INT;
  v_total_days         INT;
  v_remaining_days     INT;
  v_upper_daily        NUMERIC;
  v_upper_used         NUMERIC;
  v_upper_remaining    NUMERIC := 0;
  v_current_plan_vat   NUMERIC := 0;
  v_lower_vat          NUMERIC := 0;
  v_lower_daily        NUMERIC;
  v_lower_cost         NUMERIC;
  v_credit_amount      NUMERIC := 0;
  v_new_balance        NUMERIC;
BEGIN
  -- 현재 병원 플랜 정보 조회
  SELECT plan, plan_expires_at, billing_cycle
  INTO v_hospital_plan, v_current_expiry, v_hospital_cycle
  FROM hospitals
  WHERE id = p_hospital_id;

  -- 최근 완료 결제 조회
  SELECT id, amount, billing_cycle, created_at, plan
  INTO v_billing
  FROM billing_history
  WHERE hospital_id = p_hospital_id
    AND payment_status = 'completed'
    AND amount > 0
    AND plan != 'free'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND v_billing.amount > 0 THEN

    IF v_billing.plan = v_hospital_plan THEN
      -- ────────────────────────────────────────────────────────────────
      -- 케이스 A: 결제 플랜 = 현재 플랜 (1차 다운그레이드)
      -- 실제 결제 금액 기반으로 잔여가치 계산
      -- ────────────────────────────────────────────────────────────────
      v_used_days      := CEIL(EXTRACT(EPOCH FROM (now() - v_billing.created_at)) / 86400.0);
      v_total_days     := CASE WHEN v_billing.billing_cycle = 'yearly' THEN 360 ELSE 30 END;
      v_remaining_days := GREATEST(0, v_total_days - v_used_days);

      IF v_used_days <= 7 THEN
        v_upper_remaining := v_billing.amount;
      ELSIF v_used_days < v_total_days THEN
        v_upper_daily     := CEIL(v_billing.amount / v_total_days / 10.0) * 10;
        v_upper_used      := LEAST(v_upper_daily * v_used_days, v_billing.amount);
        v_upper_remaining := GREATEST(0, v_billing.amount - v_upper_used);
      END IF;

    ELSIF v_current_expiry IS NOT NULL THEN
      -- ────────────────────────────────────────────────────────────────
      -- 케이스 B: 결제 플랜 ≠ 현재 플랜 (2차+ 다운그레이드)
      -- 이미 이전 다운그레이드 크레딧이 지급됨.
      -- plan_expires_at 기반 잔여일수 × 현재 플랜 표준 일할요금으로 계산
      -- ────────────────────────────────────────────────────────────────
      v_remaining_days := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_current_expiry - now())) / 86400.0));
      v_total_days     := CASE WHEN COALESCE(v_hospital_cycle, 'monthly') = 'yearly' THEN 360 ELSE 30 END;

      -- 현재 플랜(다운그레이드 직전 플랜) 표준 VAT 포함 가격
      IF COALESCE(v_hospital_cycle, 'monthly') = 'yearly' THEN
        v_current_plan_vat := CASE v_hospital_plan
          WHEN 'basic'    THEN 277200
          WHEN 'plus'     THEN 620400
          WHEN 'business' THEN 1359600
          ELSE 0
        END;
      ELSE
        v_current_plan_vat := CASE v_hospital_plan
          WHEN 'basic'    THEN 29700
          WHEN 'plus'     THEN 64900
          WHEN 'business' THEN 141900
          ELSE 0
        END;
      END IF;

      IF v_current_plan_vat > 0 AND v_remaining_days > 0 THEN
        v_upper_daily     := CEIL(v_current_plan_vat / v_total_days / 10.0) * 10;
        v_upper_remaining := v_upper_daily * v_remaining_days;
      END IF;

    END IF;
  END IF;

  -- 하위 플랜 VAT 포함 가격 (billing_cycle 기준)
  -- v_total_days는 위에서 설정됨. 미설정 시 기본값 적용
  IF v_total_days IS NULL THEN
    v_total_days := CASE WHEN COALESCE(v_hospital_cycle, 'monthly') = 'yearly' THEN 360 ELSE 30 END;
  END IF;

  IF COALESCE(v_hospital_cycle, 'monthly') = 'yearly' THEN
    v_lower_vat := CASE p_to_plan
      WHEN 'free'     THEN 0
      WHEN 'basic'    THEN 277200
      WHEN 'plus'     THEN 620400
      WHEN 'business' THEN 1359600
      ELSE 0
    END;
  ELSE
    v_lower_vat := CASE p_to_plan
      WHEN 'free'     THEN 0
      WHEN 'basic'    THEN 29700
      WHEN 'plus'     THEN 64900
      WHEN 'business' THEN 141900
      ELSE 0
    END;
  END IF;

  -- 크레딧 = 상위 잔여 - 하위 플랜 잔여 기간 비용
  IF v_remaining_days > 0 AND v_lower_vat > 0 THEN
    v_lower_daily   := CEIL(v_lower_vat / v_total_days / 10.0) * 10;
    v_lower_cost    := v_lower_daily * v_remaining_days;
    v_credit_amount := GREATEST(0, v_upper_remaining - v_lower_cost);
  ELSE
    v_credit_amount := v_upper_remaining;
  END IF;

  -- 플랜 전환 + 크레딧 적립 (plan_expires_at 보존)
  UPDATE hospitals
  SET
    plan            = p_to_plan,
    billing_cycle   = p_billing_cycle,
    plan_changed_at = now(),
    credit_balance  = credit_balance + v_credit_amount
  WHERE id = p_hospital_id
  RETURNING credit_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hospital not found: %', p_hospital_id;
  END IF;

  RETURN jsonb_build_object(
    'credit_added',       v_credit_amount,
    'new_credit_balance', COALESCE(v_new_balance, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_downgrade_with_credit(UUID, TEXT, TEXT) TO authenticated;
