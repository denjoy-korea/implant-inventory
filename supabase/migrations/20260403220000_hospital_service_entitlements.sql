-- =============================================================================
-- Hospital-scoped multi-service entitlement foundation
--
-- 목표
-- 1. 기존 implant-inventory의 hospitals.plan 구조는 유지
-- 2. 병원 단위(B2B) 서비스 entitlement 레이어 추가
-- 3. 향후 홈페이지/HR/상담/보험청구를 같은 auth 계정으로 묶을 수 있는 기반 마련
-- 4. 강의는 예외적 user/B2C 서비스로 catalog 에만 기록 (hospital subscription 대상 아님)
-- =============================================================================

-- ── 1. Service catalog ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.service_catalog (
  code          TEXT PRIMARY KEY
                CHECK (code ~ '^[a-z0-9_]+$'),
  display_name  TEXT NOT NULL,
  subject_type  TEXT NOT NULL
                CHECK (subject_type IN ('hospital', 'user')),
  business_model TEXT NOT NULL
                CHECK (business_model IN ('b2b', 'b2c')),
  sort_order    INTEGER NOT NULL DEFAULT 100,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.service_catalog IS
  'DenJOY 서비스 카탈로그. 공통 auth 계정 아래 어떤 솔루션이 존재하는지 정의한다.';

COMMENT ON COLUMN public.service_catalog.subject_type IS
  'hospital=병원/사업장 단위 entitlement, user=개인 단위 entitlement';

COMMENT ON COLUMN public.service_catalog.business_model IS
  'b2b=병원/사업장 구독, b2c=개인 구매';

DROP TRIGGER IF EXISTS service_catalog_updated_at ON public.service_catalog;
CREATE TRIGGER service_catalog_updated_at
  BEFORE UPDATE ON public.service_catalog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

INSERT INTO public.service_catalog (code, display_name, subject_type, business_model, sort_order, is_active)
VALUES
  ('homepage',         '홈페이지',              'hospital', 'b2b',  10, TRUE),
  ('implant_inventory','임플란트 재고관리',    'hospital', 'b2b',  20, TRUE),
  ('hr',               'HR',                    'hospital', 'b2b',  30, TRUE),
  ('consulting',       '상담',                  'hospital', 'b2b',  40, TRUE),
  ('insurance_claims', '보험청구',              'hospital', 'b2b',  50, TRUE),
  ('lectures',         '강의',                  'user',     'b2c', 900, TRUE)
ON CONFLICT (code) DO UPDATE
SET
  display_name  = EXCLUDED.display_name,
  subject_type  = EXCLUDED.subject_type,
  business_model = EXCLUDED.business_model,
  sort_order    = EXCLUDED.sort_order,
  is_active     = EXCLUDED.is_active,
  updated_at    = now();

ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_catalog_select" ON public.service_catalog;
CREATE POLICY "service_catalog_select" ON public.service_catalog
  FOR SELECT
  TO authenticated
  USING (TRUE);

REVOKE ALL ON public.service_catalog FROM PUBLIC;
GRANT SELECT ON public.service_catalog TO authenticated;

-- ── 2. Hospital service subscriptions ───────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.hospital_service_subscriptions (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id          UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  service_code         TEXT NOT NULL REFERENCES public.service_catalog(code),
  status               TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('trialing', 'active', 'past_due', 'cancelled', 'expired')),
  service_plan_code    TEXT DEFAULT NULL,
  billing_cycle        TEXT DEFAULT NULL
                       CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly')),
  seat_count           INTEGER NOT NULL DEFAULT 1 CHECK (seat_count > 0),
  started_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_start TIMESTAMPTZ DEFAULT NULL,
  current_period_end   TIMESTAMPTZ DEFAULT NULL,
  cancelled_at         TIMESTAMPTZ DEFAULT NULL,
  source_billing_id    UUID DEFAULT NULL REFERENCES public.billing_history(id) ON DELETE SET NULL,
  metadata             JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT hospital_service_subscriptions_unique UNIQUE (hospital_id, service_code)
);

COMMENT ON TABLE public.hospital_service_subscriptions IS
  '병원 단위 서비스 entitlement. 현재 서비스(재고관리)와 향후 홈페이지/HR/상담/보험청구를 같은 워크스페이스 아래서 관리한다.';

CREATE INDEX IF NOT EXISTS idx_hospital_service_subscriptions_hospital
  ON public.hospital_service_subscriptions(hospital_id);

CREATE INDEX IF NOT EXISTS idx_hospital_service_subscriptions_status
  ON public.hospital_service_subscriptions(status, service_code);

DROP TRIGGER IF EXISTS hospital_service_subscriptions_updated_at ON public.hospital_service_subscriptions;
CREATE TRIGGER hospital_service_subscriptions_updated_at
  BEFORE UPDATE ON public.hospital_service_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE OR REPLACE FUNCTION public.validate_hospital_service_subscription()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_subject_type TEXT;
BEGIN
  SELECT subject_type INTO v_subject_type
  FROM public.service_catalog
  WHERE code = NEW.service_code;

  IF v_subject_type IS DISTINCT FROM 'hospital' THEN
    RAISE EXCEPTION
      'service % is not hospital-scoped (subject_type=%)',
      NEW.service_code,
      COALESCE(v_subject_type, 'null');
  END IF;

  IF NEW.current_period_start IS NULL THEN
    NEW.current_period_start := NEW.started_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS hospital_service_subscriptions_validate ON public.hospital_service_subscriptions;
CREATE TRIGGER hospital_service_subscriptions_validate
  BEFORE INSERT OR UPDATE ON public.hospital_service_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_hospital_service_subscription();

ALTER TABLE public.hospital_service_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hospital_service_subscriptions_select" ON public.hospital_service_subscriptions;
CREATE POLICY "hospital_service_subscriptions_select" ON public.hospital_service_subscriptions
  FOR SELECT
  TO authenticated
  USING (
    hospital_id = public.get_my_hospital_id()
    OR public.get_my_role() = 'admin'
  );

REVOKE ALL ON public.hospital_service_subscriptions FROM PUBLIC;
GRANT SELECT ON public.hospital_service_subscriptions TO authenticated;

-- ── 3. Billing line items for multi-service purchases ───────────────────────

CREATE TABLE IF NOT EXISTS public.billing_service_lines (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_id         UUID NOT NULL REFERENCES public.billing_history(id) ON DELETE CASCADE,
  hospital_id        UUID DEFAULT NULL REFERENCES public.hospitals(id) ON DELETE SET NULL,
  service_code       TEXT NOT NULL REFERENCES public.service_catalog(code),
  service_plan_code  TEXT DEFAULT NULL,
  entitlement_action TEXT NOT NULL DEFAULT 'change'
                     CHECK (entitlement_action IN ('activate', 'renew', 'upgrade', 'downgrade', 'cancel', 'change')),
  seat_delta         INTEGER NOT NULL DEFAULT 0,
  line_amount        NUMERIC NOT NULL DEFAULT 0,
  metadata           JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_service_lines_unique UNIQUE (billing_id, service_code)
);

COMMENT ON TABLE public.billing_service_lines IS
  'billing_history header 아래 서비스별 line item. 향후 추가 결제(서비스 추가 구매) 확장을 위한 연결 레이어.';

CREATE INDEX IF NOT EXISTS idx_billing_service_lines_billing
  ON public.billing_service_lines(billing_id);

CREATE INDEX IF NOT EXISTS idx_billing_service_lines_hospital
  ON public.billing_service_lines(hospital_id, service_code);

DROP TRIGGER IF EXISTS billing_service_lines_updated_at ON public.billing_service_lines;
CREATE TRIGGER billing_service_lines_updated_at
  BEFORE UPDATE ON public.billing_service_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

ALTER TABLE public.billing_service_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "billing_service_lines_select" ON public.billing_service_lines;
CREATE POLICY "billing_service_lines_select" ON public.billing_service_lines
  FOR SELECT
  TO authenticated
  USING (
    hospital_id = public.get_my_hospital_id()
    OR public.get_my_role() = 'admin'
  );

REVOKE ALL ON public.billing_service_lines FROM PUBLIC;
GRANT SELECT ON public.billing_service_lines TO authenticated;

-- ── 4. Service access helper functions ──────────────────────────────────────

CREATE OR REPLACE FUNCTION public.hospital_has_active_service(
  p_hospital_id UUID,
  p_service_code TEXT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.hospital_service_subscriptions hss
    WHERE hss.hospital_id = p_hospital_id
      AND hss.service_code = p_service_code
      AND hss.status IN ('trialing', 'active')
      AND (hss.current_period_end IS NULL OR hss.current_period_end > now())
  );
$$;

REVOKE ALL ON FUNCTION public.hospital_has_active_service(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.hospital_has_active_service(UUID, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_hospital_service_codes()
RETURNS TEXT[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT hss.service_code
      FROM public.hospital_service_subscriptions hss
      JOIN public.service_catalog sc
        ON sc.code = hss.service_code
      WHERE hss.hospital_id = public.get_my_hospital_id()
        AND hss.status IN ('trialing', 'active')
        AND (hss.current_period_end IS NULL OR hss.current_period_end > now())
      ORDER BY sc.sort_order, hss.service_code
    ),
    ARRAY[]::TEXT[]
  );
$$;

REVOKE ALL ON FUNCTION public.get_my_hospital_service_codes() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_hospital_service_codes() TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_hospital_service_subscription(
  p_hospital_id UUID,
  p_service_code TEXT,
  p_status TEXT DEFAULT 'active',
  p_service_plan_code TEXT DEFAULT NULL,
  p_billing_cycle TEXT DEFAULT NULL,
  p_seat_count INTEGER DEFAULT 1,
  p_current_period_start TIMESTAMPTZ DEFAULT now(),
  p_current_period_end TIMESTAMPTZ DEFAULT NULL,
  p_source_billing_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
  v_subject_type TEXT;
BEGIN
  SELECT subject_type INTO v_subject_type
  FROM public.service_catalog
  WHERE code = p_service_code;

  IF v_subject_type IS DISTINCT FROM 'hospital' THEN
    RAISE EXCEPTION 'service % is not hospital-scoped', p_service_code;
  END IF;

  INSERT INTO public.hospital_service_subscriptions (
    hospital_id,
    service_code,
    status,
    service_plan_code,
    billing_cycle,
    seat_count,
    started_at,
    current_period_start,
    current_period_end,
    cancelled_at,
    source_billing_id,
    metadata
  ) VALUES (
    p_hospital_id,
    p_service_code,
    p_status,
    p_service_plan_code,
    p_billing_cycle,
    GREATEST(COALESCE(p_seat_count, 1), 1),
    COALESCE(p_current_period_start, now()),
    COALESCE(p_current_period_start, now()),
    p_current_period_end,
    CASE WHEN p_status IN ('cancelled', 'expired') THEN now() ELSE NULL END,
    p_source_billing_id,
    COALESCE(p_metadata, '{}'::jsonb)
  )
  ON CONFLICT (hospital_id, service_code)
  DO UPDATE SET
    status = EXCLUDED.status,
    service_plan_code = EXCLUDED.service_plan_code,
    billing_cycle = EXCLUDED.billing_cycle,
    seat_count = EXCLUDED.seat_count,
    current_period_start = EXCLUDED.current_period_start,
    current_period_end = EXCLUDED.current_period_end,
    cancelled_at = EXCLUDED.cancelled_at,
    source_billing_id = COALESCE(EXCLUDED.source_billing_id, public.hospital_service_subscriptions.source_billing_id),
    metadata = public.hospital_service_subscriptions.metadata || EXCLUDED.metadata,
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_hospital_service_subscription(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_hospital_service_subscription(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_hospital_service_subscription(UUID, TEXT, TEXT, TEXT, TEXT, INTEGER, TIMESTAMPTZ, TIMESTAMPTZ, UUID, JSONB) TO service_role;

-- ── 5. Backfill current implant-inventory into entitlement layer ────────────

INSERT INTO public.hospital_service_subscriptions (
  hospital_id,
  service_code,
  status,
  service_plan_code,
  billing_cycle,
  seat_count,
  started_at,
  current_period_start,
  current_period_end,
  metadata
)
SELECT
  h.id,
  'implant_inventory',
  'active',
  h.plan,
  h.billing_cycle,
  1,
  COALESCE(h.trial_started_at, h.created_at, now()),
  COALESCE(h.trial_started_at, h.created_at, now()),
  NULL,
  jsonb_build_object(
    'backfilled_from', 'hospitals.plan',
    'trial_used', h.trial_used
  )
FROM public.hospitals h
ON CONFLICT (hospital_id, service_code)
DO UPDATE SET
  service_plan_code = EXCLUDED.service_plan_code,
  billing_cycle = EXCLUDED.billing_cycle,
  metadata = public.hospital_service_subscriptions.metadata || EXCLUDED.metadata,
  updated_at = now();

INSERT INTO public.billing_service_lines (
  billing_id,
  hospital_id,
  service_code,
  service_plan_code,
  entitlement_action,
  line_amount,
  metadata
)
SELECT
  bh.id,
  bh.hospital_id,
  'implant_inventory',
  bh.plan,
  CASE
    WHEN bh.plan = 'free' THEN 'downgrade'
    WHEN bh.description ILIKE '업그레이드:%' THEN 'upgrade'
    WHEN bh.description ILIKE '다운그레이드:%' THEN 'downgrade'
    WHEN bh.payment_status = 'pending' THEN 'change'
    ELSE 'activate'
  END,
  COALESCE(bh.amount, 0),
  jsonb_build_object(
    'backfilled_from', 'billing_history',
    'payment_status', bh.payment_status,
    'payment_method', bh.payment_method
  )
FROM public.billing_history bh
ON CONFLICT (billing_id, service_code)
DO NOTHING;

-- ── 6. Custom access token hook 확장 ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  claims jsonb;
  v_hospital_id uuid;
  v_service_codes text[];
BEGIN
  SELECT p.hospital_id INTO v_hospital_id
  FROM public.profiles p
  WHERE p.id = (event->>'user_id')::uuid;

  claims := event->'claims';

  IF v_hospital_id IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata,hospital_id}',
      to_jsonb(v_hospital_id::text),
      true
    );
  END IF;

  SELECT COALESCE(
    ARRAY(
      SELECT hss.service_code
      FROM public.hospital_service_subscriptions hss
      JOIN public.service_catalog sc
        ON sc.code = hss.service_code
      WHERE hss.hospital_id = v_hospital_id
        AND hss.status IN ('trialing', 'active')
        AND (hss.current_period_end IS NULL OR hss.current_period_end > now())
      ORDER BY sc.sort_order, hss.service_code
    ),
    ARRAY[]::text[]
  )
  INTO v_service_codes;

  claims := jsonb_set(
    claims,
    '{app_metadata,service_codes}',
    to_jsonb(COALESCE(v_service_codes, ARRAY[]::text[])),
    true
  );

  RETURN jsonb_set(event, '{claims}', claims, true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
