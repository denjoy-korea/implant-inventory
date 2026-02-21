-- 043_auth_rls_initplan.sql
-- Supabase advisor: avoid per-row re-evaluation of auth.* in RLS expressions.
-- Rewrites auth.uid()/auth.role()/auth.jwt() inside policy expressions to
-- initplan-friendly "(select auth.<fn>())" form.

DO $$
DECLARE
  pol RECORD;
  new_qual TEXT;
  new_with_check TEXT;
  stmt TEXT;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname IN ('public', 'storage')
      AND (
        COALESCE(qual, '') ~* 'auth\.(uid|role|jwt)\s*\('
        OR COALESCE(with_check, '') ~* 'auth\.(uid|role|jwt)\s*\('
      )
  LOOP
    new_qual := pol.qual;
    new_with_check := pol.with_check;

    IF new_qual IS NOT NULL THEN
      new_qual := regexp_replace(new_qual, '\(\s*select\s+auth\.uid\s*\(\s*\)\s*\)', '__AUTH_UID_INITPLAN__', 'gi');
      new_qual := regexp_replace(new_qual, '\(\s*select\s+auth\.role\s*\(\s*\)\s*\)', '__AUTH_ROLE_INITPLAN__', 'gi');
      new_qual := regexp_replace(new_qual, '\(\s*select\s+auth\.jwt\s*\(\s*\)\s*\)', '__AUTH_JWT_INITPLAN__', 'gi');

      new_qual := regexp_replace(new_qual, 'auth\.uid\s*\(\s*\)', '(select auth.uid())', 'gi');
      new_qual := regexp_replace(new_qual, 'auth\.role\s*\(\s*\)', '(select auth.role())', 'gi');
      new_qual := regexp_replace(new_qual, 'auth\.jwt\s*\(\s*\)', '(select auth.jwt())', 'gi');

      new_qual := replace(new_qual, '__AUTH_UID_INITPLAN__', '(select auth.uid())');
      new_qual := replace(new_qual, '__AUTH_ROLE_INITPLAN__', '(select auth.role())');
      new_qual := replace(new_qual, '__AUTH_JWT_INITPLAN__', '(select auth.jwt())');
    END IF;

    IF new_with_check IS NOT NULL THEN
      new_with_check := regexp_replace(new_with_check, '\(\s*select\s+auth\.uid\s*\(\s*\)\s*\)', '__AUTH_UID_INITPLAN__', 'gi');
      new_with_check := regexp_replace(new_with_check, '\(\s*select\s+auth\.role\s*\(\s*\)\s*\)', '__AUTH_ROLE_INITPLAN__', 'gi');
      new_with_check := regexp_replace(new_with_check, '\(\s*select\s+auth\.jwt\s*\(\s*\)\s*\)', '__AUTH_JWT_INITPLAN__', 'gi');

      new_with_check := regexp_replace(new_with_check, 'auth\.uid\s*\(\s*\)', '(select auth.uid())', 'gi');
      new_with_check := regexp_replace(new_with_check, 'auth\.role\s*\(\s*\)', '(select auth.role())', 'gi');
      new_with_check := regexp_replace(new_with_check, 'auth\.jwt\s*\(\s*\)', '(select auth.jwt())', 'gi');

      new_with_check := replace(new_with_check, '__AUTH_UID_INITPLAN__', '(select auth.uid())');
      new_with_check := replace(new_with_check, '__AUTH_ROLE_INITPLAN__', '(select auth.role())');
      new_with_check := replace(new_with_check, '__AUTH_JWT_INITPLAN__', '(select auth.jwt())');
    END IF;

    IF COALESCE(new_qual, '') IS DISTINCT FROM COALESCE(pol.qual, '')
      OR COALESCE(new_with_check, '') IS DISTINCT FROM COALESCE(pol.with_check, '') THEN
      stmt := format('ALTER POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);

      IF new_qual IS NOT NULL THEN
        stmt := stmt || format(' USING (%s)', new_qual);
      END IF;

      IF new_with_check IS NOT NULL THEN
        stmt := stmt || format(' WITH CHECK (%s)', new_with_check);
      END IF;

      EXECUTE stmt;
    END IF;
  END LOOP;
END $$;
