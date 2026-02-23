-- ============================================================
-- admin_get_hospital_id_by_email: 이메일로 병원 ID 조회 (관리자 전용)
--
-- 목적: 플랜 변경 신청 처리 시 email → hospital_id 조회
--       admin(role='admin') 계정만 호출 가능, RLS 우회 필요
-- ============================================================

CREATE OR REPLACE FUNCTION admin_get_hospital_id_by_email(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- admin 권한 확인
  IF NOT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN NULL;
  END IF;

  RETURN (
    SELECT hospital_id
    FROM profiles
    WHERE email = p_email
      AND hospital_id IS NOT NULL
    LIMIT 1
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_get_hospital_id_by_email(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_get_hospital_id_by_email(TEXT) TO authenticated;
