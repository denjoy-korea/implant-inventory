-- =============================================================================
-- setup_profile_hospital: 가입 시 profile.hospital_id 연결 전용 SECURITY DEFINER RPC
--
-- 문제: supabase.from('profiles').update({ hospital_id }) 호출이
--       users_update_own_profile WITH CHECK의 hospitals RLS subquery에 막힘.
--       (get_my_hospital_id() = NULL → hospitals SELECT 결과 없음 → subquery 빈 set)
--       → 20260222210000/220000/023010000 마이그레이션으로 부분 수정했으나
--         일부 환경에서 여전히 실패 사례 발생.
--
-- 해결: SECURITY DEFINER 함수로 RLS를 완전히 우회해 hospital_id/role 동시 설정.
--       보안: hospitals.master_admin_id = auth.uid() 검증 필수 포함.
-- =============================================================================

CREATE OR REPLACE FUNCTION setup_profile_hospital(
  p_hospital_id UUID,
  p_new_role    TEXT DEFAULT NULL  -- NULL이면 role 변경 없음, 'master' 등 지정 가능
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 보안 검증: 해당 병원/워크스페이스의 master_admin_id가 현재 사용자여야 함
  IF NOT EXISTS (
    SELECT 1 FROM hospitals
    WHERE id = p_hospital_id
      AND master_admin_id = auth.uid()
  ) THEN
    RAISE WARNING '[setup_profile_hospital] 권한 없음: hospital_id=%, uid=%',
      p_hospital_id, auth.uid();
    RETURN FALSE;
  END IF;

  -- profile.hospital_id가 아직 null인 경우에만 설정 (이미 연결된 경우 변경 방지)
  IF p_new_role IS NOT NULL THEN
    UPDATE profiles
    SET hospital_id = p_hospital_id,
        role        = p_new_role
    WHERE id          = auth.uid()
      AND hospital_id IS NULL;
  ELSE
    UPDATE profiles
    SET hospital_id = p_hospital_id
    WHERE id          = auth.uid()
      AND hospital_id IS NULL;
  END IF;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION setup_profile_hospital(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION setup_profile_hospital(UUID, TEXT) TO authenticated;
