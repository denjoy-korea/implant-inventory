-- page_views ID stitching 확장: 로그인 시 account_id(병원/계정 식별자)까지 연결

ALTER TABLE page_views
  ADD COLUMN IF NOT EXISTS account_id TEXT;

CREATE INDEX IF NOT EXISTS idx_page_views_account_id ON page_views (account_id);

GRANT UPDATE (user_id, account_id) ON page_views TO authenticated;
