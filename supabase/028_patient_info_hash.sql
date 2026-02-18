-- 028: 수술기록 중복 판별용 환자정보 해시 컬럼 추가
-- patient_info는 AES-GCM(랜덤 IV)으로 암호화되어 같은 값이어도 매번 다른 결과 → 비교 불가
-- SHA-256 해시는 결정적(동일 입력 → 동일 출력)이므로 중복 판별에 사용 가능
-- 해시만으로 원본 환자정보 복원 불가 → 보안 유지

ALTER TABLE surgery_records
ADD COLUMN IF NOT EXISTS patient_info_hash TEXT;

-- 중복 판별 조회 성능을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_surgery_dedup
ON surgery_records (hospital_id, date, patient_info_hash, tooth_number, classification, brand, size);

COMMENT ON COLUMN surgery_records.patient_info_hash IS '환자정보 SHA-256 해시 (중복 판별 전용, 복호화 불가)';
