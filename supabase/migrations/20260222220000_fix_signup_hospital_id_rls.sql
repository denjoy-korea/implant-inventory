-- =============================================================================
-- 이전 마이그레이션(20260222210000) RLS 수정
--
-- 문제: WITH CHECK 내 subquery가 hospitals RLS에 막힘
--
--   이전 코드:
--     AND hospital_id IN (
--       SELECT id FROM hospitals WHERE master_admin_id = auth.uid()
--     )
--
--   병원 SELECT 정책: id = get_my_hospital_id()
--   가입 직후 get_my_hospital_id() = NULL → hospitals 조회 결과 없음
--   → subquery가 항상 빈 set → WITH CHECK 여전히 실패
--
-- 수정: SECURITY DEFINER 헬퍼 함수로 RLS 우회하여 master_admin_id 확인
-- =============================================================================

-- 가입 시 본인이 생성한 병원인지 확인하는 SECURITY DEFINER 헬퍼
-- (RLS를 우회하여 hospitals를 직접 조회할 수 있음)
CREATE OR REPLACE FUNCTION is_my_own_hospital(p_hospital_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM hospitals
    WHERE id = p_hospital_id
      AND master_admin_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION is_my_own_hospital(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION is_my_own_hospital(UUID) TO authenticated;

-- users_update_own_profile 재수정
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = get_my_role()
    AND status = get_my_status()
    AND (
      -- 기존 hospital_id 유지 (일반 프로필 업데이트)
      hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
      -- 최초 가입 시 hospital_id 설정 허용:
      -- 현재 null이고, 설정하려는 hospital의 master_admin_id가 본인일 때
      -- (SECURITY DEFINER 함수로 hospitals RLS 우회)
      OR (
        get_my_hospital_id() IS NULL
        AND is_my_own_hospital(hospital_id)
      )
    )
  );
