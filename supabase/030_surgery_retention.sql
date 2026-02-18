-- ============================================================
-- Migration 030: 수술기록 24개월 보관 자동삭제 스케줄
-- ============================================================
--
-- 목적: DB에는 최대 24개월치 수술기록만 보관
--       매일 새벽 3시(KST) 오래된 레코드를 자동 삭제
--
-- 설계 결정:
--   - 삭제 기준: surgery_records.date < 오늘 - 24개월
--   - 플랜별 보관 기간(3/6/12개월)은 프론트엔드 조회 제한으로만 적용
--     (DB에는 항상 24개월치 보관, 플랜 업그레이드 시 즉시 이전 데이터 조회 가능)
--   - 스케줄: 매일 18:00 UTC (= 03:00 KST)
-- ============================================================

-- 1. pg_cron 확장 활성화
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. 자동삭제 함수 생성
CREATE OR REPLACE FUNCTION public.cleanup_old_surgery_records()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
  cutoff_date date;
BEGIN
  -- 24개월 이전 날짜 계산
  cutoff_date := (CURRENT_DATE - INTERVAL '24 months')::date;

  -- 24개월 초과 수술기록 삭제
  DELETE FROM public.surgery_records
  WHERE date < cutoff_date;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  -- 삭제 내역 로깅 (operation_logs가 아닌 postgres 로그에만 기록)
  IF deleted_count > 0 THEN
    RAISE LOG '[cleanup_old_surgery_records] 삭제 완료: % 건 (기준일: %)', deleted_count, cutoff_date;
  END IF;
END;
$$;

-- 3. pg_cron 스케줄 등록
--    '0 18 * * *' = 매일 18:00 UTC (= 03:00 KST)
--    기존 동일 이름 스케줄이 있으면 먼저 제거 후 재등록 (멱등성 보장)
SELECT cron.unschedule('cleanup-surgery-records-24m')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-surgery-records-24m'
);

SELECT cron.schedule(
  'cleanup-surgery-records-24m',          -- 스케줄 이름
  '0 18 * * *',                           -- cron 표현식: 매일 18:00 UTC
  $$SELECT public.cleanup_old_surgery_records();$$
);

-- 4. 함수 주석
COMMENT ON FUNCTION public.cleanup_old_surgery_records() IS
  '수술기록 24개월 보관 정책 적용 — 매일 18:00 UTC (03:00 KST) 자동 실행 (pg_cron)';
