-- 재식립 FAIL 감지 결과 저장 테이블
CREATE TABLE IF NOT EXISTS detected_fails (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id           UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  original_record_id    UUID NOT NULL REFERENCES surgery_records(id) ON DELETE CASCADE,
  reimplant_record_id   UUID NOT NULL REFERENCES surgery_records(id) ON DELETE CASCADE,
  patient_info_hash     TEXT NOT NULL,
  tooth_number          TEXT NOT NULL,           -- 감지된 개별 치아번호 (e.g. "36")
  original_date         DATE,                    -- 원래 식립일
  reimplant_date        DATE,                    -- 재식립일
  original_manufacturer TEXT,
  original_brand        TEXT,
  original_size         TEXT,
  reimplant_manufacturer TEXT,
  reimplant_brand       TEXT,
  reimplant_size        TEXT,
  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'dismissed')),
  confirmed_by          TEXT,
  confirmed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now(),

  -- 동일 (원본, 재식립, 치아) 쌍 중복 저장 방지
  UNIQUE (original_record_id, reimplant_record_id, tooth_number)
);

CREATE INDEX IF NOT EXISTS idx_detected_fails_hospital
  ON detected_fails (hospital_id, status);

CREATE INDEX IF NOT EXISTS idx_detected_fails_records
  ON detected_fails (reimplant_record_id);

-- RLS
ALTER TABLE detected_fails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "detected_fails_hospital_member_access"
  ON detected_fails
  FOR ALL
  TO authenticated
  USING (hospital_id = get_my_hospital_id())
  WITH CHECK (hospital_id = get_my_hospital_id());
