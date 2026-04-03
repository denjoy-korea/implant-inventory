-- =============================================================================
-- Admin dashboard contract backfill
--
-- 목적:
-- - 운영자 대시보드가 기대하는 RPC를 active migration source-of-truth에 복구
-- - 과거 SQL/수동 적용 의존을 제거
-- - PostgREST schema cache를 즉시 갱신
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_all_profiles()
RETURNS SETOF public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT *
  FROM public.profiles
  ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_profiles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_profiles() TO authenticated;

DROP FUNCTION IF EXISTS public.get_all_profiles_with_last_login();

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
  last_sign_in_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

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
    COALESCE(p.last_active_at, u.last_sign_in_at) AS last_sign_in_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_all_profiles_with_last_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_with_last_login() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_profiles_last_access_map()
RETURNS TABLE (
  id uuid,
  last_access_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.last_active_at, u.last_sign_in_at) AS last_access_at
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_profiles_last_access_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_last_access_map() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_plan_usage_counts()
RETURNS TABLE (
  plan text,
  usage_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    COALESCE(h.plan, 'free') AS plan,
    COUNT(*)::bigint AS usage_count
  FROM public.hospitals h
  GROUP BY COALESCE(h.plan, 'free')
  ORDER BY COALESCE(h.plan, 'free');
END;
$$;

REVOKE ALL ON FUNCTION public.get_plan_usage_counts() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_plan_usage_counts() TO authenticated;

DROP FUNCTION IF EXISTS public.admin_assign_plan(uuid, text, text, timestamptz);
DROP FUNCTION IF EXISTS public.admin_assign_plan(uuid, text, text);

CREATE OR REPLACE FUNCTION public.admin_assign_plan(
  p_hospital_id uuid,
  p_plan text,
  p_billing_cycle text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN
    RETURN FALSE;
  END IF;

  RETURN public.change_hospital_plan(p_hospital_id, p_plan, p_billing_cycle);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_assign_plan(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_plan(uuid, text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
