-- Fix free plan max items: align SQL with types/plan.ts PLAN_LIMITS.free.maxItems = 50
-- Previously returned 80 which was inconsistent with the TypeScript definition.

CREATE OR REPLACE FUNCTION _plan_max_items(p_plan TEXT)
RETURNS INTEGER LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE p_plan
    WHEN 'free'     THEN 50
    WHEN 'basic'    THEN 200
    WHEN 'plus'     THEN 500
    WHEN 'business' THEN 2147483647
    WHEN 'ultimate' THEN 2147483647
    ELSE 50
  END;
$$;
