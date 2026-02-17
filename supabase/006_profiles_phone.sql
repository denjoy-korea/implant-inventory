-- ============================================
-- 006: profiles.phone 컬럼 추가
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;
