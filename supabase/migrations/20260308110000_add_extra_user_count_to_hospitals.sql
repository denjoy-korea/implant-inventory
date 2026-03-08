-- Business 플랜 추가 사용자 과금을 위한 컬럼
-- extra_user_count: 기본 10명을 초과하는 추가 사용자 수 (관리자가 수동 입력 or 자동 집계)
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS extra_user_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN hospitals.extra_user_count IS
  'Business 플랜에서 기본 10명 초과 추가 사용자 수. 1인당 5,000원/월 (부가세 별도) 별도 과금.';
