-- 027: base_stock_edit_count 서버 측 이전
--
-- 기초재고 수정 횟수를 localStorage(클라이언트)에서
-- hospitals 테이블(서버)로 이전하여 사용자 조작 방지.

ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS base_stock_edit_count INTEGER NOT NULL DEFAULT 0;

-- 수정 횟수 조회 RPC (인증된 사용자 본인 병원만 조회)
CREATE OR REPLACE FUNCTION get_base_stock_edit_count(p_hospital_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT base_stock_edit_count
  FROM hospitals
  WHERE id = p_hospital_id
    AND (
      master_admin_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
          AND profiles.hospital_id = p_hospital_id
      )
    );
$$;

REVOKE ALL ON FUNCTION get_base_stock_edit_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_base_stock_edit_count(UUID) TO authenticated;

-- 수정 횟수 증가 RPC (SECURITY DEFINER로 RLS 우회 없이 직접 UPDATE)
CREATE OR REPLACE FUNCTION increment_base_stock_edit_count(p_hospital_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_count INTEGER;
BEGIN
  -- 요청자가 해당 병원의 구성원인지 확인
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
      AND profiles.hospital_id = p_hospital_id
  ) THEN
    RAISE EXCEPTION 'permission denied';
  END IF;

  UPDATE hospitals
  SET base_stock_edit_count = base_stock_edit_count + 1
  WHERE id = p_hospital_id
  RETURNING base_stock_edit_count INTO v_new_count;

  RETURN v_new_count;
END;
$$;

REVOKE ALL ON FUNCTION increment_base_stock_edit_count(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_base_stock_edit_count(UUID) TO authenticated;
