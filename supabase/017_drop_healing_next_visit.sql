-- =============================================
-- surgery_records에서 healing, next_visit 컬럼 제거
-- Supabase SQL Editor에서 실행하세요
-- =============================================

ALTER TABLE surgery_records DROP COLUMN IF EXISTS healing;
ALTER TABLE surgery_records DROP COLUMN IF EXISTS next_visit;
