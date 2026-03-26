-- P0-1: SQL-TS 플랜 제한값 정렬
--
-- 문제: _plan_max_items()와 _plan_max_users()가 types/plan.ts PLAN_LIMITS보다 큰 값 반환
--
-- | Plan     | _plan_max_items (수정 전) | TS (정답) |
-- |----------|--------------------------|-----------|
-- | basic    | 200                      | 150       |
-- | plus     | 500                      | 300       |
--
-- | Plan     | _plan_max_users (수정 전) | TS (정답) |
-- |----------|--------------------------|-----------|
-- | business | unlimited (2147483647)   | 10        |

-- ── 1. _plan_max_items: basic 150, plus 300 ───────────────────────────────
CREATE OR REPLACE FUNCTION _plan_max_items(p_plan TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'free'     THEN 50
    WHEN 'basic'    THEN 150
    WHEN 'plus'     THEN 300
    WHEN 'business' THEN 2147483647
    WHEN 'ultimate' THEN 2147483647
    ELSE 50
  END;
$$;

-- ── 2. _plan_max_users: business 10명 (초과 시 별도 과금 모델) ─────────────
CREATE OR REPLACE FUNCTION _plan_max_users(p_plan TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'free'     THEN 1
    WHEN 'basic'    THEN 1
    WHEN 'plus'     THEN 5
    WHEN 'business' THEN 10
    WHEN 'ultimate' THEN 2147483647
    ELSE 1
  END;
$$;
