-- ============================================
-- 020: 데이터 초기화 요청 + paused 상태 지원
-- ============================================

-- 1) profiles.status 제약에 paused 추가
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'readonly', 'paused'));

-- 2) 데이터 초기화 요청 테이블
CREATE TABLE IF NOT EXISTS data_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'rejected')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_reset_requests_hospital ON data_reset_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_data_reset_requests_status ON data_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_reset_requests_created_at ON data_reset_requests(created_at DESC);

-- 3) RLS 정책
ALTER TABLE data_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reset_requests_select" ON data_reset_requests;
CREATE POLICY "reset_requests_select" ON data_reset_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.hospital_id = data_reset_requests.hospital_id
    )
  );

DROP POLICY IF EXISTS "reset_requests_insert" ON data_reset_requests;
CREATE POLICY "reset_requests_insert" ON data_reset_requests
  FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
      )
      OR EXISTS (
        SELECT 1
        FROM hospitals h
        WHERE h.id = hospital_id
          AND h.master_admin_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "reset_requests_update_admin" ON data_reset_requests;
CREATE POLICY "reset_requests_update_admin" ON data_reset_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "reset_requests_update_hospital_member" ON data_reset_requests;
CREATE POLICY "reset_requests_update_hospital_member" ON data_reset_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.hospital_id = data_reset_requests.hospital_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.hospital_id = data_reset_requests.hospital_id
    )
  );

-- 4) 병원 데이터 초기화 RPC
--    - admin은 즉시 실행 가능
--    - 병원 멤버는 scheduled 요청이 기한 도래한 경우 실행 가능
DROP FUNCTION IF EXISTS admin_reset_hospital_data(UUID);

CREATE OR REPLACE FUNCTION admin_reset_hospital_data(p_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_is_member BOOLEAN := FALSE;
  v_due_scheduled_request BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = v_user_id
      AND p.role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = v_user_id
        AND p.hospital_id = p_hospital_id
    )
    INTO v_is_member;

    SELECT EXISTS (
      SELECT 1
      FROM data_reset_requests r
      WHERE r.hospital_id = p_hospital_id
        AND r.status = 'scheduled'
        AND r.scheduled_at IS NOT NULL
        AND r.scheduled_at <= now()
    )
    INTO v_due_scheduled_request;

    IF NOT (v_is_member AND v_due_scheduled_request) THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF to_regclass('public.order_items') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.order_items
       WHERE order_id IN (SELECT id FROM public.orders WHERE hospital_id = $1)'
    USING p_hospital_id;
  END IF;

  DELETE FROM orders WHERE hospital_id = p_hospital_id;
  DELETE FROM surgery_records WHERE hospital_id = p_hospital_id;
  DELETE FROM inventory WHERE hospital_id = p_hospital_id;

  IF to_regclass('public.inventory_audits') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.inventory_audits WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  IF to_regclass('public.operation_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.operation_logs WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION admin_reset_hospital_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_reset_hospital_data(UUID) TO authenticated;
