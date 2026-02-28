-- =============================================================================
-- RLS Multiple Permissive Policies 성능 경고 해소
--
-- 문제: TO authenticated 절이 없는 정책은 anon 포함 모든 역할에 평가됨.
--       같은 테이블에 정책이 여러 개이면 PostgreSQL이 OR 방식으로 모두 평가 → 비효율.
--
-- 수정: auth.uid()를 사용하는 모든 정책에 TO authenticated 추가.
--       → anon에게는 평가 자체 스킵
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- hospitals
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_members_view_hospital" ON hospitals;
CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "master_update_own_hospital" ON hospitals;
CREATE POLICY "master_update_own_hospital" ON hospitals
  FOR UPDATE TO authenticated
  USING (master_admin_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "authenticated_insert_hospital" ON hospitals;
CREATE POLICY "authenticated_insert_hospital" ON hospitals
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

-- anyone_search_hospitals가 DB에 남아있으면 제거 (search_hospitals_public RPC로 대체됨)
DROP POLICY IF EXISTS "anyone_search_hospitals" ON hospitals;

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
CREATE POLICY "users_view_own_profile" ON profiles
  FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "hospital_members_viewable" ON profiles;
CREATE POLICY "hospital_members_viewable" ON profiles
  FOR SELECT TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (
    id = (SELECT auth.uid())
    AND role = get_my_role()
    AND status = get_my_status()
    AND (
      hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
      OR (
        get_my_hospital_id() IS NULL
        AND is_my_own_hospital(hospital_id)
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- inventory
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_inventory_select" ON inventory;
CREATE POLICY "hospital_inventory_select" ON inventory
  FOR SELECT TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_inventory_insert" ON inventory;
CREATE POLICY "hospital_inventory_insert" ON inventory
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_inventory_update" ON inventory;
CREATE POLICY "hospital_inventory_update" ON inventory
  FOR UPDATE TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_inventory_delete" ON inventory;
CREATE POLICY "hospital_inventory_delete" ON inventory
  FOR DELETE TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- surgery_records
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_surgery_select" ON surgery_records;
CREATE POLICY "hospital_surgery_select" ON surgery_records
  FOR SELECT TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_surgery_insert" ON surgery_records;
CREATE POLICY "hospital_surgery_insert" ON surgery_records
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_surgery_update" ON surgery_records;
CREATE POLICY "hospital_surgery_update" ON surgery_records
  FOR UPDATE TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_orders_select" ON orders;
CREATE POLICY "hospital_orders_select" ON orders
  FOR SELECT TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_orders_insert" ON orders;
CREATE POLICY "hospital_orders_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_orders_update" ON orders;
CREATE POLICY "hospital_orders_update" ON orders
  FOR UPDATE TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

DROP POLICY IF EXISTS "hospital_orders_delete" ON orders;
CREATE POLICY "hospital_orders_delete" ON orders
  FOR DELETE TO authenticated
  USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid()))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- order_items
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );

DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE TO authenticated
  USING (
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
  FOR SELECT TO authenticated
  USING (
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
  FOR INSERT TO authenticated
  WITH CHECK (
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
  FOR UPDATE TO authenticated
  USING (
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
  FOR UPDATE TO authenticated
  USING (
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
DROP POLICY IF EXISTS "hospital master can select invitations" ON member_invitations;
CREATE POLICY "hospital master can select invitations"
  ON member_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.hospital_id = member_invitations.hospital_id
        AND profiles.role = 'master'
    )
  );

DROP POLICY IF EXISTS "master can select own hospital invitations" ON member_invitations;
CREATE POLICY "master can select own hospital invitations"
  ON member_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = hospital_id
        AND hospitals.master_admin_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "master can insert invitations" ON member_invitations;
CREATE POLICY "master can insert invitations"
  ON member_invitations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = hospital_id
        AND hospitals.master_admin_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "master can delete own hospital invitations" ON member_invitations;
CREATE POLICY "master can delete own hospital invitations"
  ON member_invitations FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = hospital_id
        AND hospitals.master_admin_id = (SELECT auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- billing_history
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "billing_history_hospital_select" ON billing_history;
CREATE POLICY "billing_history_hospital_select" ON billing_history
  FOR SELECT TO authenticated
  USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "billing_history_admin_select" ON billing_history;
CREATE POLICY "billing_history_admin_select" ON billing_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "billing_history_insert" ON billing_history;
CREATE POLICY "billing_history_insert" ON billing_history
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = get_my_hospital_id()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

DROP POLICY IF EXISTS "billing_history_admin_update" ON billing_history;
CREATE POLICY "billing_history_admin_update" ON billing_history
  FOR UPDATE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- system_integrations
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "system_admin_only_select" ON public.system_integrations;
CREATE POLICY "system_admin_only_select" ON public.system_integrations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "system_admin_only_insert" ON public.system_integrations;
CREATE POLICY "system_admin_only_insert" ON public.system_integrations
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "system_admin_only_update" ON public.system_integrations;
CREATE POLICY "system_admin_only_update" ON public.system_integrations
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "system_admin_only_delete" ON public.system_integrations;
CREATE POLICY "system_admin_only_delete" ON public.system_integrations
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = (SELECT auth.uid()) AND role = 'admin'
    )
  );
