-- ============================================
-- 041: 사용자 후기(user_reviews) 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS user_reviews (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  review_type       TEXT NOT NULL CHECK (review_type IN ('initial', '6month')),
  rating            SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  content           TEXT NOT NULL CHECK (char_length(content) BETWEEN 10 AND 500),
  display_last_name TEXT,          -- 성만 입력 (예: "김") → 화면: "김ㅇㅇ"
  display_role      TEXT CHECK (display_role IN ('원장', '실장', '팀장', '스탭')),
  display_hospital  TEXT,          -- 선택: 소속 병원명
  is_public         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- 계정당 리뷰 타입별 1건
  UNIQUE (user_id, review_type)
);

CREATE INDEX IF NOT EXISTS idx_user_reviews_user_id   ON user_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_user_reviews_type      ON user_reviews(review_type);
CREATE INDEX IF NOT EXISTS idx_user_reviews_public    ON user_reviews(is_public, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_reviews_rating    ON user_reviews(rating);

DROP TRIGGER IF EXISTS user_reviews_updated_at ON user_reviews;
CREATE TRIGGER user_reviews_updated_at
  BEFORE UPDATE ON user_reviews
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE user_reviews ENABLE ROW LEVEL SECURITY;

-- 공개 후기: 비로그인도 조회 가능
DROP POLICY IF EXISTS "reviews_select_public" ON user_reviews;
CREATE POLICY "reviews_select_public" ON user_reviews
  FOR SELECT TO anon
  USING (is_public = TRUE);

-- 본인 후기: 비공개 포함 조회 가능
DROP POLICY IF EXISTS "reviews_select_own" ON user_reviews;
CREATE POLICY "reviews_select_own" ON user_reviews
  FOR SELECT TO authenticated
  USING (
    is_public = TRUE
    OR user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 본인만 INSERT (타입별 1건은 UNIQUE 제약으로 DB 레벨 보장)
DROP POLICY IF EXISTS "reviews_insert_own" ON user_reviews;
CREATE POLICY "reviews_insert_own" ON user_reviews
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 본인만 UPDATE (rating, content, display_* 수정)
DROP POLICY IF EXISTS "reviews_update_own" ON user_reviews;
CREATE POLICY "reviews_update_own" ON user_reviews
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- admin만 DELETE
DROP POLICY IF EXISTS "reviews_delete_admin" ON user_reviews;
CREATE POLICY "reviews_delete_admin" ON user_reviews
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

GRANT SELECT ON user_reviews TO anon, authenticated;
GRANT INSERT, UPDATE ON user_reviews TO authenticated;
GRANT DELETE ON user_reviews TO authenticated;
