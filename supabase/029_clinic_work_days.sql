-- ============================================
-- 029: 병원별 진료 요일 설정
-- work_days: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토
-- 기본값: [1,2,3,4,5] (월~금)
-- ============================================

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS work_days INTEGER[] NOT NULL DEFAULT ARRAY[1,2,3,4,5];

-- 체크 제약은 애플리케이션 레이어(hospitalService.updateWorkDays)에서 검증
-- (PostgreSQL CHECK에서 서브쿼리 사용 불가)

COMMENT ON COLUMN hospitals.work_days IS
  '진료 요일 배열: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토 (기본: 월~금)';
