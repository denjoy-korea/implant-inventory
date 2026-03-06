-- Add admin RPC to fetch stable last-access map regardless of profile list fallback path.

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
  IF auth.uid() IS NULL THEN RETURN; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.last_active_at, u.last_sign_in_at) AS last_access_at
  FROM profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_profiles_last_access_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_last_access_map() TO authenticated;
