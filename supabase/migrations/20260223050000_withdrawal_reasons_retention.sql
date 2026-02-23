-- =============================================================================
-- 개인정보보호법 §21: 탈퇴 사유 개인정보 파기 의무
--
-- 문제: withdrawal_reasons.email 평문 무기한 보관
--       개인정보보호법 §21(1): 처리목적 달성 후 지체 없이 파기 의무 위반
--
-- 수정:
--   1. email NOT NULL → nullable (익명화 적용을 위해 필요)
--   2. pg_cron: 1년 경과 email NULL 처리 (PII 익명화)
--              3년 경과 레코드 전체 파기 (소비자 불만 처리 기록 3년, 전자상거래법)
-- =============================================================================

-- 1. email NOT NULL 제약 해제 (익명화 시 NULL로 설정하기 위해 필요)
ALTER TABLE withdrawal_reasons ALTER COLUMN email DROP NOT NULL;

-- 2. 익명화 + 파기 함수
CREATE OR REPLACE FUNCTION public.cleanup_old_withdrawal_reasons()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  anonymized_count integer;
  deleted_count integer;
BEGIN
  -- 1년 경과: email 익명화 (개인정보 최소 보유 원칙 — 분석 목적 달성 후 PII 제거)
  UPDATE public.withdrawal_reasons
  SET email = NULL
  WHERE created_at < (NOW() - INTERVAL '1 year')
    AND email IS NOT NULL;

  GET DIAGNOSTICS anonymized_count = ROW_COUNT;

  -- 3년 경과: 전체 기록 파기 (전자상거래법: 소비자 불만·분쟁 처리 기록 3년)
  DELETE FROM public.withdrawal_reasons
  WHERE created_at < (NOW() - INTERVAL '3 years');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  IF anonymized_count > 0 OR deleted_count > 0 THEN
    RAISE LOG '[cleanup_old_withdrawal_reasons] 이메일 익명화: % 건, 기록 파기: % 건', anonymized_count, deleted_count;
  END IF;
END;
$$;

COMMENT ON FUNCTION public.cleanup_old_withdrawal_reasons() IS
  '개인정보보호법 §21: 탈퇴 사유 PII 파기 — 1년 경과 email 익명화, 3년 경과 전체 파기 (매월 1일 01:00 UTC)';

-- 3. pg_cron 스케줄 등록 (매월 1일 01:00 UTC — billing_history 와 1시간 간격)
SELECT cron.unschedule('cleanup-withdrawal-reasons')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-withdrawal-reasons'
);

SELECT cron.schedule(
  'cleanup-withdrawal-reasons',
  '0 1 1 * *',  -- 매월 1일 01:00 UTC
  $$SELECT public.cleanup_old_withdrawal_reasons();$$
);
