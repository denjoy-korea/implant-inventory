-- 다운그레이드 크레딧 공식 수정
--
-- 버그 수정:
--   1. plan_expires_at = NULL 설정 제거 → 기존 만료일 유지
--   2. 크레딧 공식 수정: 상위 플랜 잔여가치 - 하위 플랜 잔여 기간 비용
--      credit = upper_remaining - lower_daily_rate × remaining_days

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
  v_billing          RECORD;
  v_used_days        INT;
  v_total_days       INT;
  v_remaining_days   INT;
  v_upper_daily      NUMERIC;
  v_upper_used       NUMERIC;
  v_upper_remaining  NUMERIC := 0;
  v_lower_vat        NUMERIC := 0;
  v_lower_daily      NUMERIC;
  v_lower_cost       NUMERIC;
  v_credit_amount    NUMERIC := 0;
  v_new_balance      NUMERIC;
BEGIN
  -- 최근 완료 결제 조회 (잔여가치 계산용)
  SELECT id, amount, billing_cycle, created_at
  INTO v_billing
  FROM billing_history
  WHERE hospital_id = p_hospital_id
    AND payment_status = 'completed'
    AND amount > 0
    AND plan != 'free'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND v_billing.amount > 0 THEN
    v_used_days      := CEIL(EXTRACT(EPOCH FROM (now() - v_billing.created_at)) / 86400.0);
    v_total_days     := CASE WHEN v_billing.billing_cycle = 'yearly' THEN 360 ELSE 30 END;
    v_remaining_days := GREATEST(0, v_total_days - v_used_days);

    -- ① 상위 플랜 잔여 가치 (refundService.calcRemainingValue 동일 공식)
    IF v_used_days <= 7 THEN
      v_upper_remaining := v_billing.amount;
    ELSIF v_used_days < v_total_days THEN
      v_upper_daily     := CEIL(v_billing.amount / v_total_days / 10.0) * 10;
      v_upper_used      := LEAST(v_upper_daily * v_used_days, v_billing.amount);
      v_upper_remaining := GREATEST(0, v_billing.amount - v_upper_used);
    END IF;

    -- ② 하위 플랜 VAT 포함 가격 (상위 플랜의 billing_cycle 기준)
    --    = PLAN_PRICING[to_plan][cycle] × 1.1 (반올림)
    --    월간: basic=29,700 / plus=64,900 / business=141,900
    --    연간: basic=277,200 / plus=620,400 / business=1,359,600
    IF v_billing.billing_cycle = 'yearly' THEN
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

    -- ③ 크레딧 = 상위 잔여 - 하위 플랜 잔여 기간 비용
    IF v_remaining_days > 0 AND v_lower_vat > 0 THEN
      v_lower_daily   := CEIL(v_lower_vat / v_total_days / 10.0) * 10;
      v_lower_cost    := v_lower_daily * v_remaining_days;
      v_credit_amount := GREATEST(0, v_upper_remaining - v_lower_cost);
    ELSE
      -- 하위 플랜이 free이거나 기간 없으면 상위 잔여 전액 크레딧
      v_credit_amount := v_upper_remaining;
    END IF;
  END IF;

  -- 플랜 전환 + 크레딧 적립
  -- NOTE: plan_expires_at은 변경하지 않음 — 상위 플랜 결제 만료일을 그대로 유지
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
