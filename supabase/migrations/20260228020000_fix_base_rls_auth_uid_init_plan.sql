-- =============================================================================
-- 기본 테이블 RLS Auth Init Plan 최적화 (003_rls.sql 등 초기 마이그레이션 대상)
-- auth.uid() → (SELECT auth.uid()) 일괄 적용
-- 대상: hospitals, profiles, inventory, surgery_records, orders, order_items,
--       data_reset_requests, member_invitations
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- hospitals
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_members_view_hospital" ON hospitals;
CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT USING (
    id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "master_update_own_hospital" ON hospitals;
CREATE POLICY "master_update_own_hospital" ON hospitals
  FOR UPDATE USING (master_admin_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "authenticated_insert_hospital" ON hospitals;
CREATE POLICY "authenticated_insert_hospital" ON hospitals
  FOR INSERT WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
CREATE POLICY "users_view_own_profile" ON profiles
  FOR SELECT USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "hospital_members_viewable" ON profiles;
CREATE POLICY "hospital_members_viewable" ON profiles
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- inventory
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_inventory_select" ON inventory;
CREATE POLICY "hospital_inventory_select" ON inventory
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_inventory_insert" ON inventory;
CREATE POLICY "hospital_inventory_insert" ON inventory
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_inventory_update" ON inventory;
CREATE POLICY "hospital_inventory_update" ON inventory
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_inventory_delete" ON inventory;
CREATE POLICY "hospital_inventory_delete" ON inventory
  FOR DELETE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- surgery_records
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_surgery_select" ON surgery_records;
CREATE POLICY "hospital_surgery_select" ON surgery_records
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_surgery_insert" ON surgery_records;
CREATE POLICY "hospital_surgery_insert" ON surgery_records
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_surgery_update" ON surgery_records;
CREATE POLICY "hospital_surgery_update" ON surgery_records
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_orders_select" ON orders;
CREATE POLICY "hospital_orders_select" ON orders
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_orders_insert" ON orders;
CREATE POLICY "hospital_orders_insert" ON orders
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_orders_update" ON orders;
CREATE POLICY "hospital_orders_update" ON orders
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_orders_delete" ON orders;
CREATE POLICY "hospital_orders_delete" ON orders
  FOR DELETE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- order_items
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- data_reset_requests
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "reset_requests_select" ON data_reset_requests;
CREATE POLICY "reset_requests_select" ON data_reset_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid())
        AND p.hospital_id = data_reset_requests.hospital_id
    )
  );

DROP POLICY IF EXISTS "reset_requests_insert" ON data_reset_requests;
CREATE POLICY "reset_requests_insert" ON data_reset_requests
  FOR INSERT WITH CHECK (
    requested_by = (SELECT auth.uid())
    AND (
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
      )
      OR EXISTS (
        SELECT 1 FROM hospitals h
        WHERE h.id = hospital_id
          AND h.master_admin_id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "reset_requests_update_admin" ON data_reset_requests;
CREATE POLICY "reset_requests_update_admin" ON data_reset_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "reset_requests_update_hospital_member" ON data_reset_requests;
CREATE POLICY "reset_requests_update_hospital_member" ON data_reset_requests
  FOR UPDATE USING (
    requested_by = (SELECT auth.uid())
    AND status = 'scheduled'
  )
  WITH CHECK (
    requested_by = (SELECT auth.uid())
    AND status = 'cancelled'
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- member_invitations
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "master can delete own hospital invitations" ON member_invitations;
CREATE POLICY "master can delete own hospital invitations"
  ON member_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = hospital_id
        AND hospitals.master_admin_id = (SELECT auth.uid())
    )
  );
