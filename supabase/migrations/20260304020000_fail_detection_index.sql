-- FAIL 감지 성능 인덱스: patient_info_hash 기반 환자 조회
-- 기존 idx_surgery_dedup은 date가 선두라 patient_info_hash 단독 조회 시 인덱스 미사용
CREATE INDEX IF NOT EXISTS idx_surgery_patient_tooth
  ON surgery_records (hospital_id, patient_info_hash, tooth_number)
  WHERE patient_info_hash IS NOT NULL;
