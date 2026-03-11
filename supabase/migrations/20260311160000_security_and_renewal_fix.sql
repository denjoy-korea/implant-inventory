-- C-1: execute_downgrade_with_credit 소유권 검증 추가
-- C-2: execute_downgrade_with_credit 상위 플랜 전환 방지
-- H-1: process_payment_callback 업그레이드 시 만료일 중복 방지
--
-- C-1/C-2 버그:
--   인증된 사용자라면 타인의 hospital_id로 execute_downgrade_with_credit 호출 가능 (보안)
--   p_to_plan이 현재 플랜보다 높아도 검증 없이 플랜 변경 가능 → 무료 업그레이드 가능 (보안)
--
-- H-1 버그:
--   Plus(잔여 20일) → Business 업그레이드 시 만료일이 "20일 후 + 1개월"이 되어
--   20일 무료 추가 발생. GREATEST 로직을 갱신(동일 플랜)에만 적용해야 함.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. execute_downgrade_with_credit: 소유권 + 플랜 순서 검증 추가
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
  -- C-1: 소유권 검증 — 호출자가 해당 병원의 멤버여야 함
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND hospital_id = p_hospital_id
  ) THEN
    RAISE EXCEPTION 'Access denied: not a member of this hospital';
  END IF;

  -- 현재 병원 플랜 정보 조회
  SELECT plan, plan_expires_at, billing_cycle
  INTO v_hospital_plan, v_current_expiry, v_hospital_cycle
  FROM hospitals
  WHERE id = p_hospital_id;

  -- C-2: 플랜 순서 검증 — p_to_plan이 현재 플랜보다 낮아야 함
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

      IF v_used_days <= 7 THEN
        v_upper_remaining := v_billing.amount;
      ELSIF v_used_days < v_total_days THEN
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

-- ────────────────────────────────────────────────────────────────────────────
-- 2. process_payment_callback: 업그레이드 시 만료일 중복 방지
--    동일 플랜 갱신 → GREATEST(now(), current_expiry) + interval (잔여일 보존)
--    플랜 변경(업그레이드) → now() + interval (새로 시작)
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION process_payment_callback(
  p_billing_id  UUID,
  p_payment_ref TEXT,
  p_status      TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing          RECORD;
  v_expires_at       TIMESTAMPTZ;
  v_changed_at       TIMESTAMPTZ := now();
  v_current_expiry   TIMESTAMPTZ;
  v_current_plan     TEXT;
  v_base             TIMESTAMPTZ;
  v_referral_code    RECORD;
  v_referrer_profile RECORD;
BEGIN
  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_billing
  FROM billing_history
  WHERE id = p_billing_id
  FOR UPDATE;

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

    -- H-1 수정: 현재 플랜 조회하여 동일 플랜 갱신인지 판단
    SELECT plan, plan_expires_at INTO v_current_plan, v_current_expiry
    FROM hospitals
    WHERE id = v_billing.hospital_id;

    IF v_current_plan = v_billing.plan THEN
      -- 동일 플랜 갱신: 잔여일 보존 (만료 전이면 거기서 추가, 만료 후면 now()부터)
      v_base := GREATEST(v_changed_at, COALESCE(v_current_expiry, v_changed_at));
    ELSE
      -- 플랜 변경(업그레이드): now()부터 시작 (잔여일 중복 방지)
      v_base := v_changed_at;
    END IF;

    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := v_base + interval '1 year';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := v_base + interval '1 month';
    ELSE
      v_expires_at := NULL;
    END IF;

    UPDATE hospitals
    SET
      plan            = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle   = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used      = TRUE
    WHERE id = v_billing.hospital_id;

    IF v_billing.credit_used_amount > 0 THEN
      UPDATE hospitals
      SET credit_balance = GREATEST(0, credit_balance - v_billing.credit_used_amount)
      WHERE id = v_billing.hospital_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM billing_history
      WHERE hospital_id = v_billing.hospital_id
        AND payment_status = 'completed'
        AND id != p_billing_id
    ) THEN
      SELECT * INTO v_referral_code
      FROM beta_invite_codes
      WHERE code_type = 'referral'
        AND referred_hospital_id = v_billing.hospital_id
      LIMIT 1;

      IF FOUND AND v_referral_code.created_by IS NOT NULL THEN
        SELECT id, hospital_id INTO v_referrer_profile
        FROM profiles
        WHERE id = v_referral_code.created_by;

        IF FOUND AND v_referrer_profile.hospital_id IS NOT NULL
           AND v_referrer_profile.hospital_id != v_billing.hospital_id THEN
          PERFORM issue_referral_reward(
            v_referrer_profile.id,
            v_referrer_profile.hospital_id,
            p_billing_id
          );
        END IF;
      END IF;
    END IF;

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

GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO authenticated;
