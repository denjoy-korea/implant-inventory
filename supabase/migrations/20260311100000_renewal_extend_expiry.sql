-- 구독 갱신 시 잔여일 이어붙이기
--
-- 문제: 동일 플랜 갱신 시 v_expires_at := now() + interval '1 month'로 계산하여
--       만료 전 갱신 시 잔여일이 소멸됨.
--
-- 수정: 현재 plan_expires_at이 미래이면 거기에 추가, 이미 지났으면 now()부터 산정.
--   GREATEST(now(), plan_expires_at) + interval '1 month/year'

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
  v_current_expiry TIMESTAMPTZ;
  v_base TIMESTAMPTZ;
  v_referral_code RECORD;
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
      plan           = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle  = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used     = TRUE
    WHERE id = v_billing.hospital_id;

    -- NOTE: coupon redemption은 toss-payment-confirm Edge Function에서 처리.
    -- 여기서 중복 호출하면 used_count 이중 차감 및 coupon_redemptions 중복 발생.

    -- Referral reward: 이 병원이 referral 코드로 가입했다면, 초대자에게 보상 쿠폰 지급
    -- 첫 유료 결제 시에만 (이전 completed billing이 없는 경우)
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

-- GRANT는 기존 마이그레이션(20260305010000, 20260306300000)에서 이미 설정됨:
-- GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO service_role;
