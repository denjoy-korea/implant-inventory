-- =============================================================================
-- Admin User View: 시스템 관리자가 사용자 뷰 모드에서 병원 데이터를 조회하기 위한 RPC
--
-- 문제: system admin의 hospital_id가 데이터가 없는 관리자 워크스페이스를 가리킴
--       → 사용자 뷰로 전환해도 재고/수술/발주 데이터가 비어 있음
--
-- 해결: SECURITY DEFINER RPC로 admin의 profile.hospital_id를 실제 데이터가 있는
--       병원으로 임시 전환 → 기존 RLS 정책이 정상 작동하도록 함
-- =============================================================================

-- 1) admin_enter_user_view: 사용자 뷰 진입 시 hospital_id를 대상 병원으로 전환
--    p_hospital_id가 NULL이면 재고 데이터가 가장 많은 병원을 자동 선택
CREATE OR REPLACE FUNCTION admin_enter_user_view(p_hospital_id UUID DEFAULT NULL)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
  v_original_hospital_id UUID;
BEGIN
  -- 시스템 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized: only system admin can enter user view';
  END IF;

  -- 원래 hospital_id 보존 (복귀 시 사용)
  SELECT hospital_id INTO v_original_hospital_id FROM profiles WHERE id = auth.uid();

  -- 병원 ID 결정
  IF p_hospital_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM hospitals WHERE id = p_hospital_id) THEN
      RAISE EXCEPTION 'Hospital not found';
    END IF;
    v_hospital_id := p_hospital_id;
  ELSE
    -- 재고 데이터가 있는 병원 중 가장 많은 곳 자동 선택
    SELECT h.id INTO v_hospital_id
    FROM hospitals h
    LEFT JOIN inventory i ON i.hospital_id = h.id
    GROUP BY h.id
    ORDER BY count(i.id) DESC, h.created_at DESC
    LIMIT 1;

    IF v_hospital_id IS NULL THEN
      RAISE EXCEPTION 'No hospitals available';
    END IF;
  END IF;

  -- admin의 profile.hospital_id 업데이트
  UPDATE profiles
  SET hospital_id = v_hospital_id
  WHERE id = auth.uid();

  RETURN v_hospital_id;
END;
$$;

REVOKE ALL ON FUNCTION admin_enter_user_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_enter_user_view(UUID) TO authenticated;

-- 2) admin_exit_user_view: 관리자 뷰 복귀 시 hospital_id를 원래 관리자 워크스페이스로 복원
--    p_original_hospital_id가 NULL이면 기존 관리자 워크스페이스 hospital_id 유지
CREATE OR REPLACE FUNCTION admin_exit_user_view(p_original_hospital_id UUID DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 시스템 관리자 권한 확인
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized: only system admin can exit user view';
  END IF;

  -- admin의 profile.hospital_id를 원래 값으로 복원
  UPDATE profiles SET hospital_id = p_original_hospital_id WHERE id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION admin_exit_user_view(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_exit_user_view(UUID) TO authenticated;
