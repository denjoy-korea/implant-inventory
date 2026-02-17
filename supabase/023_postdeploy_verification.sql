-- ============================================
-- 023: 021/022 적용 후 검증 쿼리
-- 목적: 권한/정책/트리거/테이블 하드닝 반영 여부를 PASS/FAIL로 확인
-- ============================================

WITH checks AS (
  -- process_payment_callback 권한: public/authenticated 불가, service_role만 가능
  SELECT
    'process_payment_callback_public_execute_revoked' AS check_name,
    NOT has_function_privilege(
      'public',
      'public.process_payment_callback(uuid,text,text)',
      'EXECUTE'
    ) AS passed
  UNION ALL
  SELECT
    'process_payment_callback_authenticated_execute_revoked',
    NOT has_function_privilege(
      'authenticated',
      'public.process_payment_callback(uuid,text,text)',
      'EXECUTE'
    )
  UNION ALL
  SELECT
    'process_payment_callback_service_role_execute_granted',
    has_function_privilege(
      'service_role',
      'public.process_payment_callback(uuid,text,text)',
      'EXECUTE'
    )

  -- create_order_with_items 권한: public 불가, authenticated 가능
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

  -- SECURITY DEFINER 함수 execute 권한
  UNION ALL
  SELECT
    'handle_downgrade_members_public_execute_revoked',
    NOT has_function_privilege(
      'public',
      'public.handle_downgrade_members(uuid,integer)',
      'EXECUTE'
    )
  UNION ALL
  SELECT
    'handle_downgrade_members_authenticated_execute_granted',
    has_function_privilege(
      'authenticated',
      'public.handle_downgrade_members(uuid,integer)',
      'EXECUTE'
    )
  UNION ALL
  SELECT
    'reactivate_readonly_members_public_execute_revoked',
    NOT has_function_privilege(
      'public',
      'public.reactivate_readonly_members(uuid)',
      'EXECUTE'
    )
  UNION ALL
  SELECT
    'reactivate_readonly_members_authenticated_execute_granted',
    has_function_privilege(
      'authenticated',
      'public.reactivate_readonly_members(uuid)',
      'EXECUTE'
    )

  -- reset request 업데이트 가드 트리거 존재
  UNION ALL
  SELECT
    'reset_request_member_update_guard_trigger_exists',
    EXISTS (
      SELECT 1
      FROM pg_trigger t
      JOIN pg_class c ON c.oid = t.tgrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'data_reset_requests'
        AND t.tgname = 'reset_request_member_update_guard'
        AND NOT t.tgisinternal
    )

  -- admin_manuals 테이블 + RLS + 정책
  UNION ALL
  SELECT
    'admin_manuals_table_exists',
    EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'admin_manuals'
        AND c.relkind = 'r'
    )
  UNION ALL
  SELECT
    'admin_manuals_rls_enabled',
    COALESCE((
      SELECT c.relrowsecurity
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public'
        AND c.relname = 'admin_manuals'
      LIMIT 1
    ), false)
  UNION ALL
  SELECT
    'admin_manuals_select_policy_exists',
    EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_manuals'
        AND policyname = 'admin_manuals_select_admin'
    )
  UNION ALL
  SELECT
    'admin_manuals_insert_policy_exists',
    EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_manuals'
        AND policyname = 'admin_manuals_insert_admin'
    )
  UNION ALL
  SELECT
    'admin_manuals_update_policy_exists',
    EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_manuals'
        AND policyname = 'admin_manuals_update_admin'
    )
  UNION ALL
  SELECT
    'admin_manuals_delete_policy_exists',
    EXISTS (
      SELECT 1
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename = 'admin_manuals'
        AND policyname = 'admin_manuals_delete_admin'
    )
)
SELECT
  check_name,
  CASE WHEN passed THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY check_name;
