-- page_views 이벤트 유입 복구: anon/authenticated INSERT 정책 보장

DROP POLICY IF EXISTS "page_views_insert" ON page_views;

CREATE POLICY "page_views_insert" ON page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

GRANT INSERT ON page_views TO anon, authenticated;
