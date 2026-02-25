-- =============================================================================
-- _can_manage_hospital 함수 복원
--
-- 문제: 000_all_migrations.sql (초기 스키마)에만 존재, migrations/ 폴더에 없음
--       → start_hospital_trial, change_hospital_plan 등 내부 호출 시 42883 에러
--       → PostgREST가 42883을 HTTP 404로 매핑 → "Not Found" 오류
-- =============================================================================

CREATE OR REPLACE FUNCTION _can_manage_hospital(p_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  -- admin은 모든 병원 관리 가능
  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  -- 해당 병원의 master_admin_id인 경우만 허용
  RETURN EXISTS (
    SELECT 1
    FROM hospitals h
    WHERE h.id = p_hospital_id
      AND h.master_admin_id = auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION _can_manage_hospital(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION _can_manage_hospital(UUID) TO authenticated;

-- PostgREST 스키마 캐시 갱신
NOTIFY pgrst, 'reload schema';
