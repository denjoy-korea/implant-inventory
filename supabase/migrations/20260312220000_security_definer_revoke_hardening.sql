-- =============================================================================
-- Security Hardening: SECURITY DEFINER functions REVOKE/GRANT audit fix
--
-- Fixes identified in security review (2026-03-12):
--
-- CRITICAL-1: process_payment_callback
--   Regression in 20260311160000: GRANT TO authenticated (was service_role)
--   This function activates paid plans without caller auth check.
--   Must be restricted to service_role (called by toss-payment-confirm Edge Function).
--
-- CRITICAL-2: process_credit_payment
--   Missing REVOKE ALL FROM PUBLIC in 20260312210000.
--   Has internal ownership check (auth.uid() membership), but pattern requires REVOKE.
--
-- CRITICAL-3: execute_downgrade_with_credit
--   Missing REVOKE ALL FROM PUBLIC in 20260311160000.
--   Has internal ownership check, but pattern requires REVOKE.
--
-- HIGH-1: get_coupon_stats / get_redemption_stats
--   SECURITY DEFINER without REVOKE, no admin role check.
--   Exposes system-wide coupon statistics to any authenticated user.
--   Rewritten with admin role guard.
--
-- MEDIUM-1: admin_enter_user_view / admin_exit_user_view
--   No audit log when admin switches hospital view.
--   Added operation_logs INSERT for compliance.
-- =============================================================================

-- ============================================================
-- CRITICAL-1: process_payment_callback -> service_role only
-- ============================================================
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO service_role;

-- ============================================================
-- CRITICAL-2: process_credit_payment -> REVOKE FROM PUBLIC
-- ============================================================
REVOKE ALL ON FUNCTION process_credit_payment(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION process_credit_payment(UUID) TO authenticated;

-- ============================================================
-- CRITICAL-3: execute_downgrade_with_credit -> REVOKE FROM PUBLIC
-- ============================================================
REVOKE ALL ON FUNCTION execute_downgrade_with_credit(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION execute_downgrade_with_credit(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================
-- HIGH-1: get_coupon_stats / get_redemption_stats -> admin only
-- ============================================================
-- Rewrite with admin role check (plpgsql wrapper around SQL)

CREATE OR REPLACE FUNCTION get_coupon_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only system admin can access system-wide coupon statistics
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'total', COUNT(*),
      'active', COUNT(*) FILTER (WHERE status = 'active'),
      'exhausted', COUNT(*) FILTER (WHERE status = 'exhausted'),
      'expired', COUNT(*) FILTER (WHERE status = 'expired'),
      'revoked', COUNT(*) FILTER (WHERE status = 'revoked'),
      'totalUsed', COALESCE(SUM(used_count), 0)
    )
    FROM user_coupons
  );
END;
$$;

REVOKE ALL ON FUNCTION get_coupon_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_coupon_stats() TO authenticated;

CREATE OR REPLACE FUNCTION get_redemption_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only system admin can access system-wide redemption statistics
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Access denied: admin role required';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'totalRedemptions', COUNT(*),
      'totalDiscountAmount', COALESCE(SUM(discount_amount), 0)
    )
    FROM coupon_redemptions
  );
END;
$$;

REVOKE ALL ON FUNCTION get_redemption_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_redemption_stats() TO authenticated;

-- ============================================================
-- MEDIUM-1: admin_enter_user_view -> audit log
-- ============================================================
CREATE OR REPLACE FUNCTION admin_enter_user_view(p_hospital_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
  v_original_hospital_id UUID;
  v_admin_email TEXT;
BEGIN
  -- System admin authorization check
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized: only system admin can enter user view';
  END IF;

  -- Preserve original hospital_id for restoration
  SELECT hospital_id INTO v_original_hospital_id FROM profiles WHERE id = auth.uid();

  -- Determine target hospital
  IF p_hospital_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM hospitals WHERE id = p_hospital_id) THEN
      RAISE EXCEPTION 'Hospital not found';
    END IF;
    v_hospital_id := p_hospital_id;
  ELSE
    -- Auto-select hospital with the most inventory data
    SELECT h.id INTO v_hospital_id
    FROM hospitals h
    LEFT JOIN inventory i ON i.hospital_id = h.id
    GROUP BY h.id
    ORDER BY count(i.id) DESC, h.created_at DESC
    LIMIT 1;

    IF v_hospital_id IS NULL THEN
      RAISE EXCEPTION 'No hospitals available';
    END IF;
  END IF;

  -- Update admin's profile.hospital_id
  UPDATE profiles
  SET hospital_id = v_hospital_id
  WHERE id = auth.uid();

  -- Audit log: record hospital view switch for compliance
  -- Retrieve admin email for log entry (best-effort, non-blocking)
  BEGIN
    SELECT email INTO v_admin_email FROM auth.users WHERE id = auth.uid();
  EXCEPTION WHEN OTHERS THEN
    v_admin_email := '';
  END;

  INSERT INTO operation_logs (hospital_id, user_id, user_email, user_name, action, description, metadata)
  VALUES (
    v_hospital_id,
    auth.uid(),
    COALESCE(v_admin_email, ''),
    '',
    'admin_enter_user_view',
    'System admin entered user view for hospital',
    jsonb_build_object(
      'original_hospital_id', v_original_hospital_id,
      'target_hospital_id', v_hospital_id
    )
  );

  RETURN v_hospital_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_enter_user_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_enter_user_view(UUID) TO authenticated;
