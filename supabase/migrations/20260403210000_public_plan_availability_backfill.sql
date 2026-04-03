-- =============================================================================
-- Public plan availability contract backfill
--
-- 목적:
-- - 공개 요금제 화면이 호출하는 get_plan_availability_public RPC를 복구
-- - 누락된 plan_capacities 기본 테이블을 active migrations에 추가
-- - 용량 정보가 없을 때도 안전하게 "전부 신청 가능"으로 동작
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.plan_capacities (
  plan text PRIMARY KEY,
  capacity integer NOT NULL DEFAULT 0 CHECK (capacity >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT plan_capacities_plan_check
    CHECK (plan IN ('free', 'basic', 'plus', 'business', 'ultimate'))
);

INSERT INTO public.plan_capacities (plan, capacity)
VALUES
  ('free', 0),
  ('basic', 0),
  ('plus', 0),
  ('business', 0),
  ('ultimate', 0)
ON CONFLICT (plan) DO NOTHING;

ALTER TABLE public.plan_capacities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS plan_capacities_admin_select ON public.plan_capacities;
CREATE POLICY plan_capacities_admin_select
ON public.plan_capacities
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

DROP POLICY IF EXISTS plan_capacities_admin_update ON public.plan_capacities;
CREATE POLICY plan_capacities_admin_update
ON public.plan_capacities
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);

CREATE OR REPLACE FUNCTION public.get_plan_availability_public()
RETURNS TABLE (
  plan text,
  available boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH plans AS (
    SELECT *
    FROM (
      VALUES
        ('free'::text, 1),
        ('basic'::text, 2),
        ('plus'::text, 3),
        ('business'::text, 4),
        ('ultimate'::text, 5)
    ) AS base(plan, sort_order)
  ),
  usages AS (
    SELECT
      COALESCE(h.plan, 'free') AS plan,
      COUNT(*)::bigint AS usage_count
    FROM public.hospitals h
    GROUP BY COALESCE(h.plan, 'free')
  )
  SELECT
    p.plan,
    CASE
      WHEN p.plan = 'free' THEN TRUE
      WHEN pc.capacity <= 0 THEN TRUE
      ELSE COALESCE(u.usage_count, 0) < pc.capacity
    END AS available
  FROM plans p
  LEFT JOIN public.plan_capacities pc
    ON pc.plan = p.plan
  LEFT JOIN usages u
    ON u.plan = p.plan
  ORDER BY p.sort_order;
END;
$$;

REVOKE ALL ON TABLE public.plan_capacities FROM PUBLIC;
GRANT SELECT, UPDATE ON TABLE public.plan_capacities TO authenticated;

REVOKE ALL ON FUNCTION public.get_plan_availability_public() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_plan_availability_public() TO anon;
GRANT EXECUTE ON FUNCTION public.get_plan_availability_public() TO authenticated;

NOTIFY pgrst, 'reload schema';
