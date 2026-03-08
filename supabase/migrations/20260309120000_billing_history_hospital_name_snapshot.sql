-- =============================================================================
-- billing_history: hospital_name_snapshot 컬럼 추가
--
-- 목적: 병원 탈퇴(hospital_id SET NULL) 후에도 어느 병원의 결제인지 식별 가능하도록
--       결제 생성 시점의 병원명을 스냅샷으로 저장
--
-- 방법:
--   1. hospital_name_snapshot TEXT 컬럼 추가
--   2. 기존 레코드 중 hospital_id IS NOT NULL인 것 backfill
--   3. BEFORE INSERT 트리거: hospital_id로 hospitals.name 자동 조회하여 저장
-- =============================================================================

-- 1. 컬럼 추가
ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS hospital_name_snapshot TEXT;

-- 2. 기존 레코드 backfill (hospital_id가 남아있는 레코드)
UPDATE billing_history bh
SET    hospital_name_snapshot = h.name
FROM   hospitals h
WHERE  bh.hospital_id = h.id
  AND  bh.hospital_name_snapshot IS NULL;

-- 3. 트리거 함수: INSERT 시 hospital_id → hospitals.name 조회 후 스냅샷 저장
CREATE OR REPLACE FUNCTION public.billing_history_set_hospital_name_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hospital_id IS NOT NULL AND NEW.hospital_name_snapshot IS NULL THEN
    SELECT name INTO NEW.hospital_name_snapshot
    FROM hospitals
    WHERE id = NEW.hospital_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_billing_history_hospital_name_snapshot ON billing_history;
CREATE TRIGGER trg_billing_history_hospital_name_snapshot
  BEFORE INSERT ON billing_history
  FOR EACH ROW
  EXECUTE FUNCTION public.billing_history_set_hospital_name_snapshot();

COMMENT ON COLUMN billing_history.hospital_name_snapshot IS
  '결제 시점 병원명 스냅샷 — 병원 탈퇴(hospital_id SET NULL) 후에도 식별 가능';
