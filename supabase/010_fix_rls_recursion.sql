-- =============================================
-- Fix: RLS 무한재귀 해결
-- profiles 서브쿼리를 SECURITY DEFINER 함수로 대체
-- =============================================

-- 1. 헬퍼 함수: 현재 사용자의 hospital_id 조회 (RLS 우회)
CREATE OR REPLACE FUNCTION get_my_hospital_id()
RETURNS UUID AS $$
  SELECT hospital_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

-- 2. profiles 정책 수정
DROP POLICY IF EXISTS "hospital_members_viewable" ON profiles;
CREATE POLICY "hospital_members_viewable" ON profiles
  FOR SELECT USING (hospital_id = get_my_hospital_id());

-- 3. hospitals 정책 수정
DROP POLICY IF EXISTS "hospital_members_view_hospital" ON hospitals;
CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT USING (id = get_my_hospital_id());

-- 4. inventory 정책 수정
DROP POLICY IF EXISTS "hospital_inventory_select" ON inventory;
CREATE POLICY "hospital_inventory_select" ON inventory
  FOR SELECT USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_inventory_insert" ON inventory;
CREATE POLICY "hospital_inventory_insert" ON inventory
  FOR INSERT WITH CHECK (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_inventory_update" ON inventory;
CREATE POLICY "hospital_inventory_update" ON inventory
  FOR UPDATE USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_inventory_delete" ON inventory;
CREATE POLICY "hospital_inventory_delete" ON inventory
  FOR DELETE USING (hospital_id = get_my_hospital_id());

-- 5. surgery_records 정책 수정
DROP POLICY IF EXISTS "hospital_surgery_select" ON surgery_records;
CREATE POLICY "hospital_surgery_select" ON surgery_records
  FOR SELECT USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_surgery_insert" ON surgery_records;
CREATE POLICY "hospital_surgery_insert" ON surgery_records
  FOR INSERT WITH CHECK (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_surgery_update" ON surgery_records;
CREATE POLICY "hospital_surgery_update" ON surgery_records
  FOR UPDATE USING (hospital_id = get_my_hospital_id());

-- 6. orders 정책 수정
DROP POLICY IF EXISTS "hospital_orders_select" ON orders;
CREATE POLICY "hospital_orders_select" ON orders
  FOR SELECT USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_orders_insert" ON orders;
CREATE POLICY "hospital_orders_insert" ON orders
  FOR INSERT WITH CHECK (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_orders_update" ON orders;
CREATE POLICY "hospital_orders_update" ON orders
  FOR UPDATE USING (hospital_id = get_my_hospital_id());

DROP POLICY IF EXISTS "hospital_orders_delete" ON orders;
CREATE POLICY "hospital_orders_delete" ON orders
  FOR DELETE USING (hospital_id = get_my_hospital_id());

-- 7. order_items 정책 수정
DROP POLICY IF EXISTS "order_items_select" ON order_items;
CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (
    order_id IN (SELECT id FROM orders WHERE hospital_id = get_my_hospital_id())
  );

DROP POLICY IF EXISTS "order_items_insert" ON order_items;
CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM orders WHERE hospital_id = get_my_hospital_id())
  );

DROP POLICY IF EXISTS "order_items_delete" ON order_items;
CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE USING (
    order_id IN (SELECT id FROM orders WHERE hospital_id = get_my_hospital_id())
  );
