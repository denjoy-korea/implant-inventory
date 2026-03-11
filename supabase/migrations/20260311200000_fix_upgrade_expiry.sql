-- Fix: process_payment_callback - 플랜 변경 시 만료일 연장 버그 수정
--
-- 기존 동작 (버그):
--   플랜 변경(업그레이드/다운그레이드) 시에도 v_expires_at = now() + interval로 설정
--   → 사용 기간이 연장되는 문제
--
-- 수정 동작:
--   동일 플랜 갱신: GREATEST(now, current_expiry) + interval (잔여일 보존)
--   플랜 변경:      기존 plan_expires_at 유지 (업그레이드 크레딧이 잔여 기간 보상)
--                  만료일 없거나 이미 지난 경우에만 now() + interval로 새로 설정

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
  v_current_plan   TEXT;
  v_current_expiry TIMESTAMPTZ;
  v_base           TIMESTAMPTZ;
  v_expires_at     TIMESTAMPTZ;
  v_changed_at     TIMESTAMPTZ := now();
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

    -- 현재 플랜/만료일 조회
    SELECT plan, plan_expires_at INTO v_current_plan, v_current_expiry
    FROM hospitals
    WHERE id = v_billing.hospital_id;

    -- 만료일 계산: 갱신(동일 플랜) vs 플랜 변경
    IF v_current_plan = v_billing.plan THEN
      -- 갱신: 잔여일 보존 — 기존 만료일이 미래이면 거기에 추가
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

    UPDATE hospitals
    SET
      plan            = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle   = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used      = TRUE
    WHERE id = v_billing.hospital_id;

    -- NOTE: coupon redemption은 toss-payment-confirm Edge Function에서 처리.

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
