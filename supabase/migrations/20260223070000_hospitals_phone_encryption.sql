-- hospitals.phone 암호화 마이그레이션 (컬럼 구조 변경 없음)
-- ───────────────────────────────────────────────────────────────────────────
-- hospitals.phone 컬럼은 앱 레이어에서 AES-GCM(ENCv2:...) 형식으로 저장합니다.
-- 기존 평문 데이터는 getMyHospital() 호출 시 lazy encryption으로 자동 암호화합니다.
-- (profiles.phone 와 동일한 lazy encrypt 패턴 적용)
--
-- 컬럼 변경: 없음 (기존 phone TEXT 컬럼을 그대로 사용)
-- 쓰기 경로: authService.signUp() 에서 encryptPatientInfo() 적용 (앱 레이어)
-- 읽기 경로: hospitalService.getMyHospital() 에서 lazy encrypt 트리거 (앱 레이어)
-- ───────────────────────────────────────────────────────────────────────────

SELECT 'hospitals.phone encryption migration: app-layer AES-GCM (ENCv2:) applied' AS status;
