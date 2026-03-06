-- Code review fixes (2026-03-06)
-- C-03: FOR UPDATE lock in process_payment_callback (applied via separate migration update)
-- M-01: discount_value percentage cap (applied via execute_sql)
-- M-04: Trial plan validation

-- M-04: Restrict trial to basic/plus only
CREATE OR REPLACE FUNCTION start_hospital_trial(
  p_hospital_id uuid,
  p_plan text DEFAULT 'plus',
  p_email_hash text DEFAULT NULL,
  p_phone_hash text DEFAULT NULL,
  p_name_hash text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  IF p_plan NOT IN ('basic', 'plus') THEN
    RETURN FALSE;
  END IF;

  UPDATE hospitals SET
    plan = p_plan,
    trial_started_at = now(),
    trial_used = FALSE,
    plan_expires_at = NULL,
    billing_cycle = NULL
  WHERE id = p_hospital_id
    AND COALESCE(trial_used, FALSE) = FALSE
    AND trial_started_at IS NULL;

  RETURN FOUND;
END;
$$;

-- m-01/m-02: Stats RPC functions (server-side aggregation)
CREATE OR REPLACE FUNCTION get_coupon_stats()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'active', COUNT(*) FILTER (WHERE status = 'active'),
    'exhausted', COUNT(*) FILTER (WHERE status = 'exhausted'),
    'expired', COUNT(*) FILTER (WHERE status = 'expired'),
    'revoked', COUNT(*) FILTER (WHERE status = 'revoked'),
    'totalUsed', COALESCE(SUM(used_count), 0)
  )
  FROM user_coupons;
$$;

CREATE OR REPLACE FUNCTION get_redemption_stats()
RETURNS jsonb
LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'totalRedemptions', COUNT(*),
    'totalDiscountAmount', COALESCE(SUM(discount_amount), 0)
  )
  FROM coupon_redemptions;
$$;

GRANT EXECUTE ON FUNCTION get_coupon_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_redemption_stats() TO authenticated;
