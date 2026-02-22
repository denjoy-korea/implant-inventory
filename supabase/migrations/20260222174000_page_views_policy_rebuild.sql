-- page_views 정책 전체 재구성
-- 목적: 누락/중복/제한 정책 충돌로 인한 이벤트 유입 차단을 제거

DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'page_views'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.page_views', policy_record.policyname);
  END LOOP;
END $$;

-- INSERT: anon/authenticated 모두 허용 (퍼널 계측)
CREATE POLICY "page_views_insert" ON public.page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- SELECT: admin role만 허용
CREATE POLICY "page_views_select_admin_only" ON public.page_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- DELETE: admin role만 허용
CREATE POLICY "page_views_delete_admin_only" ON public.page_views
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- UPDATE(user_id/account_id 스티칭): 로그인 사용자 본인 id만 허용
CREATE POLICY "page_views_update_convert" ON public.page_views
  FOR UPDATE TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

GRANT INSERT ON public.page_views TO anon, authenticated;
GRANT SELECT, DELETE ON public.page_views TO authenticated;
GRANT UPDATE (user_id, account_id) ON public.page_views TO authenticated;
