-- =============================================================================
-- adjust_inventory_stock: inventory.stock_adjustment 원자적 증감 RPC
--
-- 기존: auditService.ts에서 read-then-write optimistic locking으로 처리
--       → 동시 실사 적용 시 레이스 컨디션 발생 가능
-- 해결: 단일 UPDATE 문으로 원자적 처리 (DB 레벨 race condition 없음)
-- =============================================================================

CREATE OR REPLACE FUNCTION adjust_inventory_stock(
  p_inventory_id UUID,
  p_adjustment   NUMERIC
)
RETURNS void
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  UPDATE inventory
  SET stock_adjustment = COALESCE(stock_adjustment, 0) + p_adjustment
  WHERE id = p_inventory_id;
$$;

GRANT EXECUTE ON FUNCTION adjust_inventory_stock(UUID, NUMERIC) TO authenticated;
