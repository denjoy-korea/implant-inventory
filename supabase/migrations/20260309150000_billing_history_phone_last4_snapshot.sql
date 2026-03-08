-- hospitals: phone_last4 (평문 뒷4자리) 컬럼 추가
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS phone_last4 TEXT;

-- billing_history: phone_last4_snapshot 컬럼 추가
ALTER TABLE billing_history
  ADD COLUMN IF NOT EXISTS phone_last4_snapshot TEXT;

-- 트리거 함수 업데이트: phone_last4도 스냅샷
CREATE OR REPLACE FUNCTION public.billing_history_set_hospital_name_snapshot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.hospital_id IS NOT NULL THEN
    IF NEW.hospital_name_snapshot IS NULL THEN
      SELECT name, phone_last4
        INTO NEW.hospital_name_snapshot, NEW.phone_last4_snapshot
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

COMMENT ON COLUMN hospitals.phone_last4 IS '전화번호 뒷4자리 평문 — 결제 내역 식별용, 암호화 불필요';
COMMENT ON COLUMN billing_history.phone_last4_snapshot IS '결제 시점 전화번호 뒷4자리 스냅샷';
