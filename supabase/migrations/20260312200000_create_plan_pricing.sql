-- plan_pricing: 서버사이드 가격 테이블
--
-- 목적: 가격 정보를 DB에 저장하여 Edge Function이 코드 배포 없이 가격 조회 가능
-- 보안: SELECT는 authenticated, 쓰기는 service_role만 허용
-- 헬퍼: get_plan_price(plan, billing_cycle, at_time) → INTEGER (VAT 제외 월 단가)

CREATE TABLE IF NOT EXISTS plan_pricing (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan           TEXT NOT NULL,
  billing_cycle  TEXT NOT NULL,
  price          INTEGER NOT NULL,       -- VAT 제외 월 단가 (원)
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to   TIMESTAMPTZ,            -- NULL = 현재 유효
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (plan IN ('free','basic','plus','business','ultimate')),
  CHECK (billing_cycle IN ('monthly','yearly')),
  CHECK (price >= 0)
);

-- RLS 활성화
ALTER TABLE plan_pricing ENABLE ROW LEVEL SECURITY;

-- authenticated: SELECT only
CREATE POLICY "plan_pricing_select_authenticated"
  ON plan_pricing
  FOR SELECT
  TO authenticated
  USING (true);

-- service_role: 모든 작업 허용 (RLS bypass)
-- service_role은 기본적으로 RLS를 우회하므로 별도 정책 불필요

-- 초기 데이터 (2026-03-12 기준 공시가)
INSERT INTO plan_pricing (plan, billing_cycle, price, effective_from) VALUES
  ('free',     'monthly',  0,      '2024-01-01 00:00:00+00'),
  ('free',     'yearly',   0,      '2024-01-01 00:00:00+00'),
  ('basic',    'monthly',  27000,  '2024-01-01 00:00:00+00'),
  ('basic',    'yearly',   21000,  '2024-01-01 00:00:00+00'),
  ('plus',     'monthly',  59000,  '2024-01-01 00:00:00+00'),
  ('plus',     'yearly',   47000,  '2024-01-01 00:00:00+00'),
  ('business', 'monthly',  129000, '2024-01-01 00:00:00+00'),
  ('business', 'yearly',   103000, '2024-01-01 00:00:00+00'),
  ('ultimate', 'monthly',  0,      '2024-01-01 00:00:00+00'),
  ('ultimate', 'yearly',   0,      '2024-01-01 00:00:00+00');

-- 헬퍼 함수: 특정 시점의 유효 단가 반환
CREATE OR REPLACE FUNCTION get_plan_price(
  p_plan          TEXT,
  p_billing_cycle TEXT,
  p_at_time       TIMESTAMPTZ DEFAULT now()
)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT price
  FROM plan_pricing
  WHERE plan          = p_plan
    AND billing_cycle = p_billing_cycle
    AND effective_from <= p_at_time
    AND (effective_to IS NULL OR effective_to > p_at_time)
  ORDER BY effective_from DESC
  LIMIT 1;
$$;

-- 헬퍼 함수 권한: authenticated (Edge Function에서 anon/service_role 모두 호출 가능)
GRANT EXECUTE ON FUNCTION get_plan_price(TEXT, TEXT, TIMESTAMPTZ) TO authenticated;
GRANT EXECUTE ON FUNCTION get_plan_price(TEXT, TEXT, TIMESTAMPTZ) TO service_role;

COMMENT ON TABLE plan_pricing IS
  'Server-side plan pricing table. Edge Functions read from here to validate client-submitted amounts.';
COMMENT ON FUNCTION get_plan_price IS
  'Returns the VAT-exclusive monthly unit price for a given plan+billing_cycle at a specific time.';
