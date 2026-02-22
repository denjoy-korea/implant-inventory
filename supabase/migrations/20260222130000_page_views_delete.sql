-- page_views DELETE 권한 (관리자 테스트용 리셋)
GRANT DELETE ON page_views TO authenticated;

CREATE POLICY "page_views_delete_admin" ON page_views
  FOR DELETE TO authenticated
  USING (true);
