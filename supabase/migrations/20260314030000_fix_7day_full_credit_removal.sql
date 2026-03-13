-- ────────────────────────────────────────────────────────────────────────────
-- [C-6] execute_downgrade_with_credit — 7일 전액 크레딧 정책 재부활 수정
--   버그: 20260311180000_remove_7day_full_refund.sql로 7일 전액 크레딧을 제거했지만
--         20260311220000_fix_downgrade_credit_case_b.sql이 함수를 전체 재작성하며
--         IF v_used_days <= 7 THEN v_upper_remaining := v_billing.amount 로직이 부활
--   수정: 케이스 A에서 7일 분기 제거, 항상 일할 계산 적용
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
  v_plan_changed_at    TIMESTAMPTZ;
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
BEGIN
  -- 현재 병원 플랜 정보 조회 (plan_changed_at 포함)
  SELECT plan, plan_expires_at, billing_cycle, plan_changed_at
  INTO v_hospital_plan, v_current_expiry, v_hospital_cycle, v_plan_changed_at
  FROM hospitals
  WHERE id = p_hospital_id;

  -- 최근 완료 결제 조회
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
    -- 실제 현금 납입액만 크레딧 상한으로 사용
    v_credit_ceiling := GREATEST(0,
      v_billing.amount
      - v_billing.credit_used_amount
      - v_billing.upgrade_credit_amount
    );

    IF v_billing.plan = v_hospital_plan THEN
      -- ────────────────────────────────────────────────────────────────────
      -- 케이스 A: 결제 플랜 = 현재 플랜 (1차 다운그레이드)
      -- 실제 결제 금액 기반 일할 계산 (7일 전액 크레딧 제거 — C-6)
      -- ────────────────────────────────────────────────────────────────────
      v_used_days      := CEIL(EXTRACT(EPOCH FROM (now() - v_billing.created_at)) / 86400.0);
      v_total_days     := CASE WHEN v_billing.billing_cycle = 'yearly' THEN 360 ELSE 30 END;
      v_remaining_days := GREATEST(0, v_total_days - v_used_days);

      IF v_used_days < v_total_days THEN
        v_upper_daily     := CEIL(v_billing.amount / v_total_days / 10.0) * 10;
        v_upper_used      := LEAST(v_upper_daily * v_used_days, v_billing.amount);
        v_upper_remaining := GREATEST(0, v_billing.amount - v_upper_used);
      END IF;
      -- v_used_days >= v_total_days: v_upper_remaining = 0 (기본값 유지)

    ELSIF v_current_expiry IS NOT NULL THEN
      -- ────────────────────────────────────────────────────────────────────
      -- 케이스 B: 결제 플랜 ≠ 현재 플랜 (2차+ 다운그레이드)
      -- plan_changed_at 기반 usedDays 계산 (달력일수 초과 방지)
      -- ────────────────────────────────────────────────────────────────────
      v_total_days := CASE WHEN COALESCE(v_hospital_cycle, 'monthly') = 'yearly' THEN 360 ELSE 30 END;

      IF v_plan_changed_at IS NOT NULL THEN
        v_used_days      := GREATEST(0, CEIL(EXTRACT(EPOCH FROM (now() - v_plan_changed_at)) / 86400.0));
        v_remaining_days := GREATEST(0, v_total_days - v_used_days);
      ELSE
        -- Fallback: plan_expires_at 기반, total_days 캡
        v_remaining_days := LEAST(
          v_total_days,
          GREATEST(0, CEIL(EXTRACT(EPOCH FROM (v_current_expiry - now())) / 86400.0))
        );
        v_used_days := v_total_days - v_remaining_days;
      END IF;

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
        v_upper_remaining := LEAST(v_upper_daily * v_remaining_days, v_current_plan_vat);
      END IF;

    END IF;
  END IF;

  -- 하위 플랜 VAT 포함 가격
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

  -- 크레딧 상한: 실현금납입액 - 기발행크레딧 초과 불가
  IF v_credit_ceiling >= 0 THEN
    v_credit_amount := LEAST(v_credit_amount, GREATEST(0, v_credit_ceiling - v_already_issued));
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

  -- billing_history.credits_issued 누적 업데이트
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
