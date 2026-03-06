-- Phase 3: billing_history coupon integration
-- Add coupon tracking columns + update process_payment_callback

-- 1) Add coupon columns to billing_history
ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS coupon_id UUID REFERENCES user_coupons(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS original_amount INTEGER,
  ADD COLUMN IF NOT EXISTS discount_amount INTEGER DEFAULT 0;

-- 2) Recreate process_payment_callback with coupon redemption support
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
  v_jwt_role TEXT := current_setting('request.jwt.claim.role', true);
BEGIN
  -- GRANT bypass defense: reject if JWT role is not service_role
  IF COALESCE(v_jwt_role, '') <> 'service_role' THEN
    RETURN FALSE;
  END IF;

  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_billing
  FROM billing_history
  WHERE id = p_billing_id
  LIMIT 1;

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

    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := v_changed_at + interval '1 year';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := v_changed_at + interval '1 month';
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

    -- Coupon redemption: if billing has a coupon, redeem it
    IF v_billing.coupon_id IS NOT NULL AND v_billing.discount_amount > 0 THEN
      PERFORM redeem_coupon(
        v_billing.coupon_id,
        (SELECT user_id FROM user_coupons WHERE id = v_billing.coupon_id),
        v_billing.hospital_id,
        p_billing_id,
        v_billing.billing_cycle,
        COALESCE(v_billing.original_amount, v_billing.amount + v_billing.discount_amount)
      );
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

-- 3) GRANT: service_role only
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO service_role;
