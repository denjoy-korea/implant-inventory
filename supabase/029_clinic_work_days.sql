-- ============================================
-- 029: 병원별 진료 요일 설정
-- work_days: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
-- 기본값: [1,2,3,4,5] (월~금)
-- ============================================

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS work_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5];

-- 체크 제약: 배열 요소가 0~6 범위, 최소 1개 이상
ALTER TABLE hospitals
  ADD CONSTRAINT hospitals_work_days_valid
  CHECK (
    array_length(work_days, 1) >= 1
    AND array_length(work_days, 1) <= 7
    AND NOT EXISTS (
      SELECT 1 FROM unnest(work_days) AS d WHERE d < 0 OR d > 6
    )
  );

COMMENT ON COLUMN hospitals.work_days IS
  '진료 요일 배열: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토 (기본: 월~금)';
