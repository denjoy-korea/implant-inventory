-- 038: 운영자 전용 프로필 + 마지막 로그인 시간 조회 함수
-- auth.users.last_sign_in_at JOIN을 포함한 새 RPC

CREATE OR REPLACE FUNCTION get_all_profiles_with_last_login()
RETURNS TABLE (
  id uuid,
  email text,
  name text,
  phone text,
  role text,
  hospital_id uuid,
  status text,
  permissions jsonb,
  created_at timestamptz,
  updated_at timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.name,
    p.phone,
    p.role,
    p.hospital_id,
    p.status,
    p.permissions,
    p.created_at,
    p.updated_at,
    u.last_sign_in_at
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_all_profiles_with_last_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_all_profiles_with_last_login() TO authenticated;
