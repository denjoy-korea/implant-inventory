-- 7일 전액 환불 제도 제거
-- 기존: 결제 후 7일 이내 전액 환불, 이후 일할
-- 변경: 첫날부터 일할 계산 (월간 30일, 연간 360일, 10원 올림)
--
-- 영향 함수:
--   execute_downgrade_with_credit — 다운그레이드 크레딧 산출
--   process_payment_callback — 갱신/업그레이드 만료일 처리 (불변)

-- ────────────────────────────────────────────────────────────────────────────
-- 1. execute_downgrade_with_credit: 7일 전액 환불 조건 제거
-- ────────────────────────────────────────────────────────────────────────────
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
  v_already_issued     NUMERIC := 0;
  v_credit_ceiling     NUMERIC := 0;
  v_new_balance        NUMERIC;
  v_to_plan_order      INT;
  v_current_plan_order INT;
BEGIN
  -- C-1: 소유권 검증
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND hospital_id = p_hospital_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a member of this hospital';
  END IF;

  SELECT plan, plan_expires_at, billing_cycle
  INTO v_hospital_plan, v_current_expiry, v_hospital_cycle
  FROM hospitals
  WHERE id = p_hospital_id;

  -- C-2: 플랜 순서 검증
  v_to_plan_order := CASE p_to_plan
    WHEN 'free'     THEN 0
    WHEN 'basic'    THEN 1
    WHEN 'plus'     THEN 2
    WHEN 'business' THEN 3
    WHEN 'ultimate' THEN 4
    ELSE -1
  END;
  v_current_plan_order := CASE v_hospital_plan
    WHEN 'free'     THEN 0
    WHEN 'basic'    THEN 1
    WHEN 'plus'     THEN 2
    WHEN 'business' THEN 3
    WHEN 'ultimate' THEN 4
    ELSE 0
  END;
  IF v_to_plan_order < 0 OR v_to_plan_order >= v_current_plan_order THEN
    RAISE EXCEPTION 'Invalid downgrade: cannot change from % to %', v_hospital_plan, p_to_plan;
  END IF;

  SELECT id, amount, billing_cycle, created_at, plan,
         COALESCE(credits_issued, 0)        AS credits_issued,
         COALESCE(credit_used_amount, 0)    AS credit_used_amount,
         COALESCE(upgrade_credit_amount, 0) AS upgrade_credit_amount
  INTO v_billing
  FROM billing_history
  WHERE hospital_id = p_hospital_id
    AND payment_status = 'completed'
    AND amount > 0
    AND plan != 'free'
  ORDER BY created_at DESC
  LIMIT 1;

  IF FOUND AND v_billing.amount > 0 THEN
    v_already_issued := v_billing.credits_issued;
    v_credit_ceiling := GREATEST(0,
      v_billing.amount
      - v_billing.credit_used_amount
      - v_billing.upgrade_credit_amount
    );

    IF v_billing.plan = v_hospital_plan THEN
      v_used_days      := CEIL(EXTRACT(EPOCH FROM (now() - v_billing.created_at)) / 86400.0);
      v_total_days     := CASE WHEN v_billing.billing_cycle = 'yearly' THEN 360 ELSE 30 END;
      v_remaining_days := GREATEST(0, v_total_days - v_used_days);

      -- 7일 전액 환불 제거: 항상 일할 계산
      IF v_used_days < v_total_days THEN
        v_upper_daily     := CEIL(v_billing.amount / v_total_days / 10.0) * 10;
        v_upper_used      := LEAST(v_upper_daily * v_used_days, v_billing.amount);
        v_upper_remaining := GREATEST(0, v_billing.amount - v_upper_used);
      END IF;

    ELSIF v_current_expiry IS NOT NULL THEN
      v_remaining_days := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_current_expiry - now())) / 86400.0));
      v_total_days     := CASE WHEN COALESCE(v_hospital_cycle, 'monthly') = 'yearly' THEN 360 ELSE 30 END;

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

  IF v_remaining_days > 0 AND v_lower_vat > 0 THEN
    v_lower_daily   := CEIL(v_lower_vat / v_total_days / 10.0) * 10;
    v_lower_cost    := v_lower_daily * v_remaining_days;
    v_credit_amount := GREATEST(0, v_upper_remaining - v_lower_cost);
  ELSE
    v_credit_amount := v_upper_remaining;
  END IF;

  IF v_credit_ceiling >= 0 THEN
    v_credit_amount := LEAST(v_credit_amount, GREATEST(0, v_credit_ceiling - v_already_issued));
  END IF;

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

  IF v_credit_amount > 0 AND v_billing.id IS NOT NULL THEN
    UPDATE billing_history
    SET credits_issued = COALESCE(credits_issued, 0) + v_credit_amount
    WHERE id = v_billing.id;
  END IF;

  RETURN jsonb_build_object(
    'credit_added',       v_credit_amount,
    'new_credit_balance', COALESCE(v_new_balance, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_downgrade_with_credit(UUID, TEXT, TEXT) TO authenticated;
