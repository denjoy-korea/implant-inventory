-- =============================================================================
-- Migration: Add UPDATE policy to order_items
-- =============================================================================

DROP POLICY IF EXISTS "order_items_update" ON order_items;
CREATE POLICY "order_items_update" ON order_items
  FOR UPDATE USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid())
      )
    )
  );
