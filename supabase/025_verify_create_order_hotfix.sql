-- ============================================
-- 025: create_order_with_items(024 핫픽스) 검증
-- 목적: 모호성(ambiguous column) 재발 방지 상태 점검
-- ============================================

WITH fn AS (
  SELECT
    p.oid,
    pg_get_functiondef(p.oid) AS def,
    regexp_replace(lower(pg_get_functiondef(p.oid)), '\s+', ' ', 'g') AS def_norm
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'create_order_with_items'
    AND pg_get_function_identity_arguments(p.oid) = 'p_order jsonb, p_items jsonb'
  LIMIT 1
),
checks AS (
  SELECT
    'create_order_with_items_function_exists' AS check_name,
    EXISTS (SELECT 1 FROM fn) AS passed

  UNION ALL
  SELECT
    'create_order_with_items_uses_qualified_profile_alias',
    EXISTS (
      SELECT 1 FROM fn
      WHERE def_norm ~ 'select[^;]*\.[[:space:]]*hospital_id[[:space:]]+into[[:space:]]+v_my_hospital_id'
        AND def_norm ~ 'from[[:space:]]+(public\.)?profiles'
        AND def_norm ~ 'where[^;]*\.[[:space:]]*id[[:space:]]*=[[:space:]]*auth\.uid\(\)'
    )

  UNION ALL
  SELECT
    'create_order_with_items_legacy_ambiguous_pattern_absent',
    NOT EXISTS (
      SELECT 1 FROM fn
      WHERE def ~* 'SELECT\\s+hospital_id\\s+INTO\\s+v_my_hospital_id\\s+FROM\\s+(?:public\\.)?profiles(?:\\s+(?:AS\\s+)?[a-z_][a-z0-9_]*)?\\s+WHERE\\s+(?:(?:[a-z_][a-z0-9_]*\\.)?id)\\s*=\\s*auth\\.uid\\(\\)'
    )

  UNION ALL
  SELECT
    'create_order_with_items_public_execute_revoked',
    NOT has_function_privilege(
      'public',
      'public.create_order_with_items(jsonb,jsonb)',
      'EXECUTE'
    )

  UNION ALL
  SELECT
    'create_order_with_items_authenticated_execute_granted',
    has_function_privilege(
      'authenticated',
      'public.create_order_with_items(jsonb,jsonb)',
      'EXECUTE'
    )
)
SELECT
  check_name,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY check_name;
