-- ═══════════════════════════════════════════════════════════════════════
-- 수정 1: get_all_profiles_with_last_login — PL/pgSQL → SQL 언어 전환
-- 원인: RETURNS TABLE 출력 컬럼명이 PL/pgSQL 스코프 변수로 등록되어
--       함수 내부 컬럼 참조와 충돌 → 42702 (ambiguous_column)
-- ═══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_all_profiles_with_last_login() CASCADE;

CREATE FUNCTION public.get_all_profiles_with_last_login()
RETURNS TABLE (
  id             uuid,
  email          text,
  name           text,
  phone          text,
  role           text,
  hospital_id    uuid,
  status         text,
  permissions    jsonb,
  created_at     timestamptz,
  updated_at     timestamptz,
  last_sign_in_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id, p.email, p.name, p.phone, p.role,
    p.hospital_id, p.status, p.permissions,
    p.created_at, p.updated_at,
    COALESCE(p.last_active_at, au.last_sign_in_at) AS last_sign_in_at
  FROM public.profiles AS p
  LEFT JOIN auth.users AS au ON au.id = p.id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles AS chk
      WHERE chk.id = auth.uid() AND chk.role = 'admin'
    )
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_all_profiles_with_last_login() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_all_profiles_with_last_login() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 수정 2: get_profiles_last_access_map — 동일 패턴 수정
-- ═══════════════════════════════════════════════════════════════════════

DROP FUNCTION IF EXISTS public.get_profiles_last_access_map() CASCADE;

CREATE FUNCTION public.get_profiles_last_access_map()
RETURNS TABLE (
  id             uuid,
  last_access_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    COALESCE(p.last_active_at, au.last_sign_in_at) AS last_access_at
  FROM public.profiles AS p
  LEFT JOIN auth.users AS au ON au.id = p.id
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles AS chk
      WHERE chk.id = auth.uid() AND chk.role = 'admin'
    )
  ORDER BY p.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_profiles_last_access_map() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profiles_last_access_map() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- 수정 3: update_updated_at — 트리거 중첩 재귀 방어
-- 원인: profiles BEFORE UPDATE 트리거가 중첩 호출될 때 42P17 (invalid_recursion)
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ═══════════════════════════════════════════════════════════════════════
-- 수정 4: profiles_update WITH CHECK — permissions 서브쿼리 RLS 재귀 방지
-- 원인: WITH CHECK 내 직접 subquery가 RLS 재귀 평가 유발 → 42P17
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT permissions FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_permissions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated;

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;

CREATE POLICY "profiles_update" ON public.profiles
  FOR UPDATE TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR (
      id != (SELECT auth.uid())
      AND hospital_id IN (
        SELECT h.id FROM public.hospitals h
        WHERE h.master_admin_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    (
      id = (SELECT auth.uid())
      AND role = get_my_role()
      AND status = get_my_status()
      AND permissions IS NOT DISTINCT FROM get_my_permissions()
      AND (
        hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
        OR (get_my_hospital_id() IS NULL AND is_my_own_hospital(hospital_id))
      )
    )
    OR (
      id != (SELECT auth.uid())
      AND hospital_id IN (
        SELECT h.id FROM public.hospitals h
        WHERE h.master_admin_id = (SELECT auth.uid())
      )
      AND role = 'dental_staff'
      AND status IN ('active', 'inactive')
    )
  );
