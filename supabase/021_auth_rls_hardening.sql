-- ============================================
-- 021: Auth/RLS 하드닝 (권한 상승 차단)
-- ============================================

-- 1) 현재 사용자 정보 헬퍼 (RLS 안전 참조)
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

-- 2) 회원가입 트리거 하드닝: raw metadata의 admin 주입 차단
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  IF v_role NOT IN ('master', 'dental_staff', 'staff') THEN
    v_role := 'staff';
  END IF;

  INSERT INTO profiles (id, email, name, role, phone, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE
      WHEN v_role IN ('master', 'staff') THEN 'active'
      ELSE 'pending'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3) 자기 프로필 업데이트 정책 하드닝:
--    role/status/hospital_id 변경은 본인 업데이트에서 금지
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = get_my_role()
    AND status = get_my_status()
    AND hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
  );

-- 4) get_all_profiles 하드닝:
--    SECURITY DEFINER + 관리자 검증 + 실행 권한 제한
CREATE OR REPLACE FUNCTION get_all_profiles()
RETURNS SETOF profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM profiles
  ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_all_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_profiles() TO authenticated;
