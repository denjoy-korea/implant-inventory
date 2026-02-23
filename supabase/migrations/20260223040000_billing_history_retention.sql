-- =============================================================================
-- 전자상거래법 §6: 결제 기록 5년 보관 의무
--
-- 문제: billing_history.hospital_id ON DELETE CASCADE →
--       master 탈퇴 시 병원 삭제와 함께 결제 기록 즉시 삭제됨
--       전자상거래법 §6: 계약·청약철회 기록 5년, 대금결제 기록 5년 보관 의무 위반
--
-- 수정:
--   1. hospital_id FK: ON DELETE CASCADE → ON DELETE SET NULL
--   2. created_by FK: (기본 NO ACTION) → ON DELETE SET NULL
--   3. hospital_id NOT NULL → nullable (SET NULL 적용을 위해 필요)
--   4. pg_cron: 5년 경과 결제 기록 자동 파기 (매월 1일 00:00 UTC)
-- =============================================================================

-- 1. 기존 FK 제약 제거
ALTER TABLE billing_history DROP CONSTRAINT IF EXISTS billing_history_hospital_id_fkey;
ALTER TABLE billing_history DROP CONSTRAINT IF EXISTS billing_history_created_by_fkey;

-- 2. hospital_id NOT NULL 제약 해제 (SET NULL 적용에 필요)
ALTER TABLE billing_history ALTER COLUMN hospital_id DROP NOT NULL;

-- 3. hospital_id FK: ON DELETE SET NULL (병원 삭제 후에도 결제 기록 보존)
ALTER TABLE billing_history
  ADD CONSTRAINT billing_history_hospital_id_fkey
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL;

-- 4. created_by FK: ON DELETE SET NULL (사용자 삭제 후에도 결제 기록 보존)
ALTER TABLE billing_history
  ADD CONSTRAINT billing_history_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;

-- 5. 전자상거래법 §6 준수: 5년 경과 결제 기록 자동 파기 함수
CREATE OR REPLACE FUNCTION public.cleanup_old_billing_history()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- 5년 경과 결제 기록 삭제 (전자상거래법 §6 보존 기간 만료)
  DELETE FROM public.billing_history
  WHERE created_at < (NOW() - INTERVAL '5 years');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF deleted_count > 0 THEN
    RAISE LOG '[cleanup_old_billing_history] 전자상거래법 §6 파기: % 건 (5년 보존 기간 만료)', deleted_count;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_billing_history() IS
  '전자상거래법 §6: 결제 기록 5년 보관 후 자동 파기 — 매월 1일 00:00 UTC (pg_cron)';

-- 6. pg_cron 스케줄 등록 (매월 1일 00:00 UTC)
SELECT cron.unschedule('cleanup-billing-history-5y')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-billing-history-5y'
);

SELECT cron.schedule(
  'cleanup-billing-history-5y',
  '0 0 1 * *',  -- 매월 1일 00:00 UTC
  $$SELECT public.cleanup_old_billing_history();$$
);
