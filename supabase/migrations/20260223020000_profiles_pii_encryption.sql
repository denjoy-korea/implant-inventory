-- 회원 PII(이름·이메일·전화번호) 암호화 지원
-- ───────────────────────────────────────────────────────────────────────────
-- profiles.name / email / phone 컬럼은 앱 레이어에서 AES-GCM(ENCv2:...) 형식으로 저장됩니다.
-- 평문 검색이 필요한 email, phone 에 대해 단방향 SHA-256 해시 컬럼을 추가합니다.
-- (hashPatientInfo() 와 동일 알고리즘: ENCRYPTION_SECRET + ':' + value → SHA-256 → base64)
-- ───────────────────────────────────────────────────────────────────────────

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_hash TEXT,
  ADD COLUMN IF NOT EXISTS phone_hash TEXT;

-- 해시 기반 빠른 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_profiles_email_hash ON profiles (email_hash);
CREATE INDEX IF NOT EXISTS idx_profiles_phone_hash ON profiles (phone_hash);

-- ───────────────────────────────────────────────────────────────────────────
-- 참고: 기존 평문 데이터는 SQL 레이어에서 AES-GCM 암호화 불가 (Web Crypto API 필요).
-- 앱에서 getProfileById() 호출 시 lazy encryption 으로 자동 암호화합니다.
-- decryptPatientInfo() 는 ENCv2: 접두사가 없는 값을 평문으로 처리하므로
-- 기존 데이터도 복호화 단계에서 그대로 반환되어 하위 호환성이 유지됩니다.
-- ───────────────────────────────────────────────────────────────────────────
