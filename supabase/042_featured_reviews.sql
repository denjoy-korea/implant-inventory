-- 042: user_reviews에 기능소개 노출 컬럼 추가
ALTER TABLE user_reviews
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN user_reviews.is_featured IS '랜딩페이지 기능소개 섹션 노출 여부 (관리자 지정)';
