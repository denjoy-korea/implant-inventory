-- admin_reset_hospital_data: GRANT를 service_role 전용으로 축소
--
-- 기존: authenticated 전체에 GRANT → 로그인한 모든 사용자가 직접 호출 가능
-- 수정: service_role 전용 → Edge Function reset-hospital-data만 호출 가능
--
-- Edge Function이 JWT 검증 + 역할/멤버십 확인 후 service_role로 RPC 호출

REVOKE EXECUTE ON FUNCTION admin_reset_hospital_data(UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION admin_reset_hospital_data(UUID) TO service_role;
