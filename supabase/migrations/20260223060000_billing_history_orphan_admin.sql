-- ============================================
-- billing_history orphan 레코드 admin 조회 함수
-- G-1 (병원 삭제 시 SET NULL) 이후 hospital_id = NULL인 레코드를
-- admin이 조회할 수 있도록 전용 함수 추가 (전자상거래법 §6 5년 보관 의무 이행)
-- ============================================

CREATE OR REPLACE FUNCTION get_orphan_billing_history()
RETURNS SETOF billing_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- admin 전용
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM billing_history
  WHERE hospital_id IS NULL
  ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_orphan_billing_history() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_orphan_billing_history() TO authenticated;
