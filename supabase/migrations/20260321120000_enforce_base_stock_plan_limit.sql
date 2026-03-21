-- batch_update_initial_stock: Free 플랜 서버 강제 차단
--
-- 기존: 클라이언트 UI에서만 maxBaseStockEdits=0 검사 → 우회 가능
-- 수정: RPC 내에서 hospitals.plan 확인 후 free 플랜이면 즉시 거부

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
  v_plan         text;
BEGIN
  my_hospital_id := get_my_hospital_id();
  IF my_hospital_id IS NULL THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Free 플랜은 기초재고 수정 불가 (maxBaseStockEdits = 0)
  -- trial 기간 중에는 hospitals.plan이 'plus' 등으로 변경되므로 별도 체크 불필요
  SELECT plan INTO v_plan FROM hospitals WHERE id = my_hospital_id;
  IF v_plan = 'free' THEN
    RAISE EXCEPTION 'plan_limit_exceeded: base stock editing requires Basic plan or higher';
  END IF;

  UPDATE inventory i
  SET initial_stock = (u.value->>'initial_stock')::integer
  FROM jsonb_array_elements(updates) AS u
  WHERE i.id = (u.value->>'id')::uuid
    AND i.hospital_id = my_hospital_id;
END;
$$;

GRANT EXECUTE ON FUNCTION batch_update_initial_stock(jsonb) TO authenticated;
