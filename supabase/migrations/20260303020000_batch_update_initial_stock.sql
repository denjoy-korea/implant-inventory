-- =============================================================================
-- batch_update_initial_stock RPC
--
-- 기초재고 일괄 수정: 개별 PATCH × N 대신 단일 RPC 호출로 처리
-- 동시 PATCH 요청이 많으면 Supabase rate limit → CORS 오류 발생 문제 해소
-- =============================================================================

CREATE OR REPLACE FUNCTION batch_update_initial_stock(
  updates jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  my_hospital_id uuid;
BEGIN
  my_hospital_id := get_my_hospital_id();
  IF my_hospital_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  UPDATE inventory i
  SET initial_stock = (u.value->>'initial_stock')::integer
  FROM jsonb_array_elements(updates) AS u
  WHERE i.id = (u.value->>'id')::uuid
    AND i.hospital_id = my_hospital_id;
END;
$$;

GRANT EXECUTE ON FUNCTION batch_update_initial_stock(jsonb) TO authenticated;
