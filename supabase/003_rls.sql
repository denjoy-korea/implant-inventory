-- ============================================
-- Row Level Security (RLS) 정책
-- ============================================

-- hospitals
ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT USING (
    id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "master_update_own_hospital" ON hospitals
  FOR UPDATE USING (master_admin_id = auth.uid());

CREATE POLICY "authenticated_insert_hospital" ON hospitals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 공개 병원 검색 함수 (최소 필드만 반환)
CREATE OR REPLACE FUNCTION search_hospitals_public(search_query TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT h.id, h.name, h.created_at
  FROM hospitals h
  WHERE COALESCE(search_query, '') = ''
     OR h.name ILIKE '%' || search_query || '%'
  ORDER BY h.name
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION search_hospitals_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_hospitals_public(TEXT) TO authenticated;

-- profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_hospital_id()
RETURNS UUID AS $$
  SELECT hospital_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_status()
RETURNS TEXT AS $$
  SELECT status FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_my_hospital_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_hospital_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_status() TO authenticated;

CREATE POLICY "users_view_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "hospital_members_viewable" ON profiles
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = get_my_role()
    AND status = get_my_status()
    AND hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
  );

CREATE POLICY "master_manage_members" ON profiles
  FOR UPDATE USING (
    hospital_id IN (
      SELECT h.id FROM hospitals h WHERE h.master_admin_id = auth.uid()
    )
  );

-- inventory
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_inventory_select" ON inventory
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_inventory_insert" ON inventory
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_inventory_update" ON inventory
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_inventory_delete" ON inventory
  FOR DELETE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

-- surgery_records
ALTER TABLE surgery_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_surgery_select" ON surgery_records
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_surgery_insert" ON surgery_records
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_surgery_update" ON surgery_records
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

-- orders
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_orders_select" ON orders
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_orders_insert" ON orders
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_orders_update" ON orders
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_orders_delete" ON orders
  FOR DELETE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

-- order_items
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );
