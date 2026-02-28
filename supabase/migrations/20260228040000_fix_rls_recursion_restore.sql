-- =============================================================================
-- 긴급 복구: RLS 무한 재귀 해소
--
-- 원인: 이전 마이그레이션들이 010_fix_rls_recursion.sql의 수정을 덮어씀.
--       profiles 정책에서 profiles를 직접 참조 → 무한 재귀 발생.
--
-- 수정: get_my_hospital_id() SECURITY DEFINER 함수로 대체 (RLS 우회)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles: hospital_members_viewable — 재귀 제거
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_members_viewable" ON profiles;
CREATE POLICY "hospital_members_viewable" ON profiles
  FOR SELECT TO authenticated
  USING (hospital_id = get_my_hospital_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- hospitals: hospital_members_view_hospital
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_members_view_hospital" ON hospitals;
CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT TO authenticated
  USING (id = get_my_hospital_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- inventory
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_inventory_select" ON inventory;
CREATE POLICY "hospital_inventory_select" ON inventory
  FOR SELECT TO authenticated
  USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_inventory_insert" ON inventory;
CREATE POLICY "hospital_inventory_insert" ON inventory
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_inventory_update" ON inventory;
CREATE POLICY "hospital_inventory_update" ON inventory
  FOR UPDATE TO authenticated
  USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_inventory_delete" ON inventory;
CREATE POLICY "hospital_inventory_delete" ON inventory
  FOR DELETE TO authenticated
  USING (hospital_id = get_my_hospital_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- surgery_records
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_surgery_select" ON surgery_records;
CREATE POLICY "hospital_surgery_select" ON surgery_records
  FOR SELECT TO authenticated
  USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_surgery_insert" ON surgery_records;
CREATE POLICY "hospital_surgery_insert" ON surgery_records
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_surgery_update" ON surgery_records;
CREATE POLICY "hospital_surgery_update" ON surgery_records
  FOR UPDATE TO authenticated
  USING (hospital_id = get_my_hospital_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- orders
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital_orders_select" ON orders;
CREATE POLICY "hospital_orders_select" ON orders
  FOR SELECT TO authenticated
  USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_orders_insert" ON orders;
CREATE POLICY "hospital_orders_insert" ON orders
  FOR INSERT TO authenticated
  WITH CHECK (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_orders_update" ON orders;
CREATE POLICY "hospital_orders_update" ON orders
  FOR UPDATE TO authenticated
  USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_orders_delete" ON orders;
CREATE POLICY "hospital_orders_delete" ON orders
  FOR DELETE TO authenticated
  USING (hospital_id = get_my_hospital_id());

-- ─────────────────────────────────────────────────────────────────────────────
-- order_items
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE hospital_id = get_my_hospital_id())
  );

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT TO authenticated
  WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE hospital_id = get_my_hospital_id())
  );

DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE TO authenticated
  USING (
    order_id IN (SELECT id FROM orders WHERE hospital_id = get_my_hospital_id())
  );
