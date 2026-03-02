-- =============================================================================
-- hospitals SELECT 정책 보완
--
-- 문제 1: 회원가입 직후 병원 생성 실패
--   INSERT 직후 .select().single() 시점에 profiles.hospital_id가 아직 NULL →
--   get_my_hospital_id() = NULL → id = NULL 항상 FALSE → single() 0 rows 에러
--
-- 문제 2: 시스템 관리자(role='admin')가 병원 목록 1개만 조회
--   get_my_hospital_id()는 본인 소속 병원만 반환 → admin 예외 없음
--
-- 수정: 3가지 허용 조건으로 정책 재작성
--   1) id = get_my_hospital_id()         — 기존: 소속 병원 조회
--   2) master_admin_id = auth.uid()      — 신규: 본인이 개설한 병원 조회 (가입 직후)
--   3) get_my_role() = 'admin'           — 신규: 시스템 관리자 전체 조회
-- =============================================================================

DROP POLICY IF EXISTS "hospital_members_view_hospital" ON hospitals;
CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT TO authenticated
  USING (
    id = get_my_hospital_id()
    OR master_admin_id = (SELECT auth.uid())
    OR get_my_role() = 'admin'
  );
