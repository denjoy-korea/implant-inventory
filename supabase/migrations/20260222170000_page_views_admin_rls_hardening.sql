-- page_views RLS 보강: 인증 사용자 전체가 아닌 관리자만 조회/삭제 가능하도록 제한

-- 기존 광범위 정책 제거
DROP POLICY IF EXISTS "page_views_select" ON page_views;
DROP POLICY IF EXISTS "page_views_delete_admin" ON page_views;

-- 관리자만 page_views 조회 가능
CREATE POLICY "page_views_select_admin_only" ON page_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- 관리자만 page_views 삭제 가능(테스트 리셋)
CREATE POLICY "page_views_delete_admin_only" ON page_views
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- 권한은 authenticated 유지(정책에서 실제 허용 범위 제한)
GRANT SELECT, DELETE ON page_views TO authenticated;
