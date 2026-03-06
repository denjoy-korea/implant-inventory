-- 049: 마지막 접속(활동) 기준 전환
-- - profiles.last_active_at 컬럼 추가
-- - 로그인 시각(last_sign_in_at) 1회 백필
-- - 활동 heartbeat RPC(touch_last_active_at) 추가
-- - 관리자 프로필 조회 RPC에 last_active_at 포함

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_active_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_last_active_at
  ON public.profiles (last_active_at DESC);

UPDATE public.profiles p
SET last_active_at = u.last_sign_in_at
FROM auth.users u
WHERE p.id = u.id
  AND p.last_active_at IS NULL
  AND u.last_sign_in_at IS NOT NULL;

CREATE OR REPLACE FUNCTION public.touch_last_active_at()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = v_user_id
    AND (
      last_active_at IS NULL
      OR last_active_at < now() - interval '1 day'
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_last_active_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_active_at() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_all_profiles_with_last_login()
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
  last_active_at timestamptz,
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
    p.last_active_at,
    u.last_sign_in_at
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_profiles_with_last_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_with_last_login() TO authenticated;
