-- =============================================================================
-- 잔여 Multiple Permissive Policies 병합
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- billing_history SELECT: billing_history_hospital_select + billing_history_admin_select → 1개
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "billing_history_hospital_select" ON billing_history;
DROP POLICY IF EXISTS "billing_history_admin_select" ON billing_history;

CREATE POLICY "billing_history_select" ON billing_history
  FOR SELECT TO authenticated
  USING (
    hospital_id = get_my_hospital_id()
    OR EXISTS (
      SELECT 1 FROM profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- data_reset_requests UPDATE: reset_requests_update_admin + reset_requests_update_hospital_member → 1개
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reset_requests_update_admin" ON data_reset_requests;
DROP POLICY IF EXISTS "reset_requests_update_hospital_member" ON data_reset_requests;

CREATE POLICY "reset_requests_update" ON data_reset_requests
  FOR UPDATE TO authenticated
  USING (
    -- admin: 모든 요청 수정 가능
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
    -- 병원 멤버: 본인이 요청한 scheduled 상태만 취소 가능
    OR (
      requested_by = (SELECT auth.uid())
      AND status = 'scheduled'
    )
  )
  WITH CHECK (
    -- admin: 모든 상태로 변경 가능
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
    -- 병원 멤버: cancelled 상태로만 변경 가능
    OR (
      requested_by = (SELECT auth.uid())
      AND status = 'cancelled'
    )
  );
