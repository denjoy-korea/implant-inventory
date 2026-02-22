-- 048_page_views.sql
-- 홈페이지 방문자 페이지뷰 트래킹 테이블

CREATE TABLE IF NOT EXISTS page_views (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  page       TEXT        NOT NULL,        -- view name: landing, pricing, analyze, contact, value, login, signup
  session_id TEXT,                        -- sessionStorage 기반 익명 세션 ID
  referrer   TEXT,                        -- document.referrer
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_page       ON page_views (page);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- anon/authenticated 모두 INSERT 가능 (트래킹 목적)
CREATE POLICY "page_views_insert" ON page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- authenticated(관리자)만 SELECT 가능
CREATE POLICY "page_views_select" ON page_views
  FOR SELECT TO authenticated
  USING (true);

-- GRANT
GRANT INSERT ON page_views TO anon;
GRANT INSERT, SELECT ON page_views TO authenticated;
