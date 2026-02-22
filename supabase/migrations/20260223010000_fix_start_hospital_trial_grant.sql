-- =============================================================================
-- start_hospital_trial GRANT 누락 수정
--
-- 문제: 20260222210000에서 start_hospital_trial(UUID, TEXT) 함수를 새로 생성했으나
--       GRANT EXECUTE TO authenticated 구문이 누락됨
--       → authenticated 사용자가 호출 시 permission denied (42501)
--       → PGRST202가 아닌 에러 → fallback도 미실행 → 플랜 항상 'free'
--
-- 수정: 기존 1-파라미터 오버로드 DROP + 새 함수에 GRANT 추가
-- =============================================================================

-- 기존 1-파라미터 버전 제거 (오버로드 충돌 방지)
DROP FUNCTION IF EXISTS start_hospital_trial(UUID);

-- 새 2-파라미터 버전에 GRANT 추가
REVOKE ALL ON FUNCTION start_hospital_trial(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_hospital_trial(UUID, TEXT) TO authenticated;
