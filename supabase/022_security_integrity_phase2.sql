-- ============================================
-- 022: 보안/무결성 2차 하드닝
-- ============================================

-- 1) 결제 콜백 RPC: service_role 전용 실행 + JWT role 검증
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
      payment_ref = p_payment_ref,
      updated_at = now()
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
      plan = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used = TRUE
    WHERE id = v_billing.hospital_id;
  ELSE
    UPDATE billing_history
    SET
      payment_status = 'failed',
      payment_ref = p_payment_ref,
      updated_at = now()
    WHERE id = p_billing_id;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO service_role;

-- 2) data_reset_requests: 병원 구성원 업데이트 권한 축소 (본인 요청 취소만 허용)
DROP POLICY IF EXISTS "reset_requests_update_hospital_member" ON data_reset_requests;
CREATE POLICY "reset_requests_update_hospital_member" ON data_reset_requests
  FOR UPDATE USING (
    requested_by = auth.uid()
    AND status = 'scheduled'
  )
  WITH CHECK (
    requested_by = auth.uid()
    AND status = 'cancelled'
  );

CREATE OR REPLACE FUNCTION enforce_reset_request_member_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_is_admin BOOLEAN := FALSE;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  INTO v_is_admin;

  IF v_is_admin THEN
    RETURN NEW;
  END IF;

  IF OLD.requested_by IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  IF OLD.status <> 'scheduled' THEN
    RAISE EXCEPTION 'ONLY_SCHEDULED_REQUEST_CAN_BE_CANCELLED';
  END IF;

  IF NEW.status <> 'cancelled' THEN
    RAISE EXCEPTION 'ONLY_CANCEL_UPDATE_ALLOWED';
  END IF;

  IF NEW.hospital_id IS DISTINCT FROM OLD.hospital_id
     OR NEW.requested_by IS DISTINCT FROM OLD.requested_by
     OR NEW.reason IS DISTINCT FROM OLD.reason
     OR NEW.approved_by IS DISTINCT FROM OLD.approved_by
     OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
     OR NEW.scheduled_at IS DISTINCT FROM OLD.scheduled_at
     OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'IMMUTABLE_FIELDS_MODIFIED';
  END IF;

  IF NEW.cancelled_at IS NULL THEN
    NEW.cancelled_at := now();
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS reset_request_member_update_guard ON data_reset_requests;
CREATE TRIGGER reset_request_member_update_guard
  BEFORE UPDATE ON data_reset_requests
  FOR EACH ROW
  EXECUTE FUNCTION enforce_reset_request_member_update();

-- 3) SECURITY DEFINER 함수 접근 통제 강화
CREATE OR REPLACE FUNCTION handle_downgrade_members(
  p_hospital_id UUID,
  p_max_users INT
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_excess_count INT := 0;
  v_can_manage BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM hospitals h
    WHERE h.id = p_hospital_id
      AND h.master_admin_id = auth.uid()
  )
  INTO v_can_manage;

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  WITH active_non_master AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) AS rn
    FROM profiles
    WHERE hospital_id = p_hospital_id
      AND status = 'active'
      AND role <> 'master'
  ),
  total_active AS (
    SELECT COUNT(*) AS cnt
    FROM profiles
    WHERE hospital_id = p_hospital_id
      AND status = 'active'
  )
  UPDATE profiles
  SET status = 'readonly', updated_at = now()
  WHERE id IN (
    SELECT anm.id
    FROM active_non_master anm, total_active ta
    WHERE anm.rn > (p_max_users - 1)
      AND ta.cnt > p_max_users
  );

  GET DIAGNOSTICS v_excess_count = ROW_COUNT;
  RETURN v_excess_count;
END;
$$;

CREATE OR REPLACE FUNCTION reactivate_readonly_members(
  p_hospital_id UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_reactivated INT := 0;
  v_can_manage BOOLEAN := FALSE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
  )
  OR EXISTS (
    SELECT 1
    FROM hospitals h
    WHERE h.id = p_hospital_id
      AND h.master_admin_id = auth.uid()
  )
  INTO v_can_manage;

  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  UPDATE profiles
  SET status = 'active', updated_at = now()
  WHERE hospital_id = p_hospital_id
    AND status = 'readonly';

  GET DIAGNOSTICS v_reactivated = ROW_COUNT;
  RETURN v_reactivated;
END;
$$;

REVOKE ALL ON FUNCTION handle_downgrade_members(UUID, INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION reactivate_readonly_members(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION handle_downgrade_members(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION reactivate_readonly_members(UUID) TO authenticated;

-- 4) 주문 + 주문항목 트랜잭션 RPC
CREATE OR REPLACE FUNCTION create_order_with_items(
  p_order JSONB,
  p_items JSONB DEFAULT '[]'::jsonb
)
RETURNS TABLE (
  id UUID,
  hospital_id UUID,
  type TEXT,
  manufacturer TEXT,
  date DATE,
  manager TEXT,
  status TEXT,
  received_date DATE,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
  v_my_hospital_id UUID;
  v_order_id UUID;
  v_item JSONB;
  v_qty INT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED';
  END IF;

  v_hospital_id := (p_order->>'hospital_id')::UUID;
  SELECT hospital_id INTO v_my_hospital_id
  FROM profiles
  WHERE id = auth.uid()
  LIMIT 1;

  IF v_hospital_id IS NULL OR v_hospital_id IS DISTINCT FROM v_my_hospital_id THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  INSERT INTO orders (
    hospital_id,
    type,
    manufacturer,
    date,
    manager,
    status,
    received_date
  )
  VALUES (
    v_hospital_id,
    p_order->>'type',
    COALESCE(p_order->>'manufacturer', ''),
    (p_order->>'date')::DATE,
    COALESCE(p_order->>'manager', ''),
    COALESCE(p_order->>'status', 'ordered'),
    CASE
      WHEN p_order ? 'received_date' AND p_order->>'received_date' IS NOT NULL AND p_order->>'received_date' <> ''
        THEN (p_order->>'received_date')::DATE
      ELSE NULL
    END
  )
  RETURNING orders.id INTO v_order_id;

  IF jsonb_typeof(p_items) <> 'array' THEN
    RAISE EXCEPTION 'INVALID_ITEMS_FORMAT';
  END IF;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_qty := COALESCE((v_item->>'quantity')::INT, 0);
    IF v_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_ITEM_QUANTITY';
    END IF;

    INSERT INTO order_items (order_id, brand, size, quantity)
    VALUES (
      v_order_id,
      COALESCE(v_item->>'brand', ''),
      COALESCE(v_item->>'size', ''),
      v_qty
    );
  END LOOP;

  RETURN QUERY
  SELECT o.id, o.hospital_id, o.type, o.manufacturer, o.date, o.manager, o.status, o.received_date, o.created_at
  FROM orders o
  WHERE o.id = v_order_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION create_order_with_items(JSONB, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_order_with_items(JSONB, JSONB) TO authenticated;

-- 5) admin_manuals 스키마 + RLS
CREATE TABLE IF NOT EXISTS admin_manuals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '일반',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_manuals_category ON admin_manuals(category);
CREATE INDEX IF NOT EXISTS idx_admin_manuals_updated_at ON admin_manuals(updated_at DESC);

DROP TRIGGER IF EXISTS admin_manuals_updated_at ON admin_manuals;
CREATE TRIGGER admin_manuals_updated_at
  BEFORE UPDATE ON admin_manuals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE admin_manuals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manuals_select_admin" ON admin_manuals;
CREATE POLICY "admin_manuals_select_admin" ON admin_manuals
  FOR SELECT USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "admin_manuals_insert_admin" ON admin_manuals;
CREATE POLICY "admin_manuals_insert_admin" ON admin_manuals
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "admin_manuals_update_admin" ON admin_manuals;
CREATE POLICY "admin_manuals_update_admin" ON admin_manuals
  FOR UPDATE USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS "admin_manuals_delete_admin" ON admin_manuals;
CREATE POLICY "admin_manuals_delete_admin" ON admin_manuals
  FOR DELETE USING (get_my_role() = 'admin');
