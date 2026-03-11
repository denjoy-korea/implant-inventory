-- 다운그레이드 크레딧 시스템
--
-- 동작:
--   1. execute_downgrade_with_credit(hospital_id, to_plan, billing_cycle):
--      - 현재 구독 잔여가치 계산 (refundService.calcRemainingValue와 동일 공식)
--      - hospitals.credit_balance += 잔여가치
--      - hospitals.plan = 새 플랜, plan_expires_at = NULL (무기한)
--   2. 다음 결제 시: billing_history.credit_used_amount로 차감 기록
--   3. process_payment_callback: 결제 완료 후 credit_balance에서 차감

-- ── 1. 스키마 추가 ─────────────────────────────────────────────────────────────

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS credit_balance numeric NOT NULL DEFAULT 0;

ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS credit_used_amount numeric NOT NULL DEFAULT 0;

-- ── 2. execute_downgrade_with_credit RPC ──────────────────────────────────────

CREATE OR REPLACE FUNCTION execute_downgrade_with_credit(
  p_hospital_id UUID,
  p_to_plan     TEXT,
  p_billing_cycle TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing       RECORD;
  v_credit_amount NUMERIC := 0;
  v_used_days     INT;
  v_total_days    INT;
  v_daily_rate    NUMERIC;
  v_used_charge   NUMERIC;
  v_new_balance   NUMERIC;
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

  -- 잔여가치 계산 (refundService.calcRemainingValue와 동일 공식)
  IF FOUND AND v_billing.amount > 0 THEN
    v_used_days  := CEIL(EXTRACT(EPOCH FROM (now() - v_billing.created_at)) / 86400.0);
    v_total_days := CASE WHEN v_billing.billing_cycle = 'yearly' THEN 360 ELSE 30 END;

    IF v_used_days <= 7 THEN
      -- 7일 이내 전액
      v_credit_amount := v_billing.amount;
    ELSIF v_used_days < v_total_days THEN
      -- 일할 계산 (10원 올림)
      v_daily_rate  := CEIL(v_billing.amount / v_total_days / 10.0) * 10;
      v_used_charge := LEAST(v_daily_rate * v_used_days, v_billing.amount);
      v_credit_amount := GREATEST(0, v_billing.amount - v_used_charge);
    ELSE
      v_credit_amount := 0;
    END IF;
  END IF;

  -- 원자적 플랜 전환 + 크레딧 적립
  UPDATE hospitals
  SET
    plan            = p_to_plan,
    plan_expires_at = NULL,
    billing_cycle   = NULL,
    plan_changed_at = now(),
    credit_balance  = credit_balance + v_credit_amount
  WHERE id = p_hospital_id
  RETURNING credit_balance INTO v_new_balance;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Hospital not found: %', p_hospital_id;
  END IF;

  RETURN jsonb_build_object(
    'credit_added',        v_credit_amount,
    'new_credit_balance',  COALESCE(v_new_balance, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION execute_downgrade_with_credit(UUID, TEXT, TEXT) TO authenticated;

-- ── 3. process_payment_callback: 결제 완료 후 크레딧 차감 ────────────────────
-- (이전 버전: 20260311100000_renewal_extend_expiry.sql 대체)

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
  v_billing        RECORD;
  v_expires_at     TIMESTAMPTZ;
  v_changed_at     TIMESTAMPTZ := now();
  v_current_expiry TIMESTAMPTZ;
  v_base           TIMESTAMPTZ;
  v_referral_code  RECORD;
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

    -- 현재 만료일 조회 (갱신 시 잔여일 보존용)
    SELECT plan_expires_at INTO v_current_expiry
    FROM hospitals
    WHERE id = v_billing.hospital_id;

    -- 만료일이 미래이면 거기에 추가, 이미 지났으면 now()부터 산정
    v_base := GREATEST(v_changed_at, COALESCE(v_current_expiry, v_changed_at));

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

    -- 다운그레이드 크레딧 차감 (결제 시 사용한 잔액 크레딧)
    IF v_billing.credit_used_amount > 0 THEN
      UPDATE hospitals
      SET credit_balance = GREATEST(0, credit_balance - v_billing.credit_used_amount)
      WHERE id = v_billing.hospital_id;
    END IF;

    -- NOTE: coupon redemption은 toss-payment-confirm Edge Function에서 처리.

    -- Referral reward: 첫 유료 결제 시에만
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

-- ── 4. get_billing_history RPC: credit_used_amount 추가 ───────────────────────

DROP FUNCTION IF EXISTS get_billing_history(uuid);

CREATE OR REPLACE FUNCTION get_billing_history(p_hospital_id uuid)
RETURNS TABLE (
  id                        uuid,
  hospital_id               uuid,
  hospital_name_snapshot    text,
  hospital_id_snapshot      uuid,
  phone_last4_snapshot      text,
  plan                      text,
  billing_cycle             text,
  amount                    numeric,
  is_test_payment           boolean,
  payment_method            text,
  payment_status            text,
  payment_ref               text,
  description               text,
  created_by                uuid,
  created_at                timestamptz,
  updated_at                timestamptz,
  refund_amount             numeric,
  refunded_at               timestamptz,
  refund_reason             text,
  coupon_id                 uuid,
  original_amount           numeric,
  discount_amount           numeric,
  upgrade_credit_amount     numeric,
  upgrade_source_billing_id uuid,
  credit_used_amount        numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    id, hospital_id, hospital_name_snapshot, hospital_id_snapshot,
    phone_last4_snapshot, plan, billing_cycle, amount, is_test_payment,
    payment_method, payment_status, payment_ref, description, created_by,
    created_at, updated_at,
    refund_amount, refunded_at, refund_reason,
    coupon_id, original_amount, discount_amount,
    upgrade_credit_amount, upgrade_source_billing_id,
    credit_used_amount
  FROM billing_history
  WHERE hospital_id = p_hospital_id
  ORDER BY created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION get_billing_history(uuid) TO authenticated;
