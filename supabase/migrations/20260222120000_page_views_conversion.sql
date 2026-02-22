-- 049_page_views_conversion.sql
-- 방문 후 로그인 전환 추적: page_views에 user_id 컬럼 추가

ALTER TABLE page_views ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_page_views_user_id ON page_views (user_id);

-- authenticated 사용자가 자신의 세션 row에 user_id를 설정할 수 있도록 허용
-- USING: user_id가 아직 없는 행만 (중복 설정 방지)
-- WITH CHECK: auth.uid()로만 설정 가능 (다른 user_id 주입 불가)
CREATE POLICY "page_views_update_convert" ON page_views
  FOR UPDATE TO authenticated
  USING (user_id IS NULL)
  WITH CHECK (user_id = auth.uid());

GRANT UPDATE (user_id) ON page_views TO authenticated;
