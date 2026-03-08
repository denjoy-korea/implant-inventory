-- billing_history: hospital_id_snapshot 추가
-- hospital_id가 탈퇴로 SET NULL 되어도 원래 UUID를 보존
-- UUID는 개인정보 아님, 동명 병원 구분 가능

ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS hospital_id_snapshot UUID;

-- 기존 레코드 backfill: hospital_id가 남아있는 것 복사
UPDATE billing_history
SET hospital_id_snapshot = hospital_id
WHERE hospital_id IS NOT NULL
  AND hospital_id_snapshot IS NULL;

-- 트리거 함수 업데이트: hospital_id_snapshot도 함께 저장
CREATE OR REPLACE FUNCTION public.billing_history_set_hospital_name_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hospital_id IS NOT NULL THEN
    IF NEW.hospital_name_snapshot IS NULL THEN
      SELECT name INTO NEW.hospital_name_snapshot
      FROM hospitals
      WHERE id = NEW.hospital_id;
    END IF;
    IF NEW.hospital_id_snapshot IS NULL THEN
      NEW.hospital_id_snapshot := NEW.hospital_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON COLUMN billing_history.hospital_id_snapshot IS
  '결제 시점 병원 UUID 스냅샷 — 탈퇴 후 SET NULL 되어도 동명 병원 구분 가능';
