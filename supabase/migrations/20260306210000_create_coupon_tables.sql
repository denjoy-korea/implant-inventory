-- Phase 2: coupon_templates, user_coupons, coupon_redemptions + functions
-- Originally applied via Supabase MCP; full DDL recorded here for reproducibility.

-- =======================================
-- coupon_templates: coupon rule definitions
-- =======================================
CREATE TABLE IF NOT EXISTS public.coupon_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,

  discount_type text NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage', 'fixed_amount')),
  discount_value numeric NOT NULL
    CHECK (discount_value > 0 AND (discount_type = 'fixed_amount' OR discount_value <= 100)),
  max_uses int NOT NULL DEFAULT 10
    CHECK (max_uses > 0),
  valid_days int
    CHECK (valid_days IS NULL OR valid_days > 0),

  applicable_plans text[] NOT NULL DEFAULT '{}',

  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.coupon_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupon_templates_admin_all ON public.coupon_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

GRANT ALL ON public.coupon_templates TO service_role;

-- FK: beta_invite_codes.coupon_template_id -> coupon_templates.id
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'beta_invite_codes_coupon_template_fk'
  ) THEN
    ALTER TABLE public.beta_invite_codes
      ADD CONSTRAINT beta_invite_codes_coupon_template_fk
      FOREIGN KEY (coupon_template_id)
      REFERENCES public.coupon_templates(id);
  END IF;
END $$;

-- Seed: default partner coupon template
INSERT INTO public.coupon_templates (name, description, discount_type, discount_value, max_uses, valid_days)
VALUES (
  '제휴 20% 할인',
  '제휴 채널 가입자 전용 - 결제 금액 20% 할인 (10회)',
  'percentage',
  20,
  10,
  365
) ON CONFLICT DO NOTHING;

-- =======================================
-- user_coupons: per-user coupon wallet
-- =======================================
CREATE TABLE IF NOT EXISTS public.user_coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.coupon_templates(id),
  source_code_id uuid REFERENCES public.beta_invite_codes(id),
  source_type text NOT NULL DEFAULT 'partner'
    CHECK (source_type IN ('partner', 'promo', 'admin')),

  discount_type text NOT NULL,
  discount_value numeric NOT NULL
    CHECK (discount_value > 0 AND (discount_type = 'fixed_amount' OR discount_value <= 100)),
  max_uses int NOT NULL,
  used_count int NOT NULL DEFAULT 0
    CHECK (used_count >= 0),

  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,

  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'exhausted', 'expired', 'revoked')),

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_coupons_uses_limit CHECK (used_count <= max_uses)
);

CREATE INDEX IF NOT EXISTS idx_user_coupons_user_status
  ON public.user_coupons(user_id, status);
CREATE INDEX IF NOT EXISTS idx_user_coupons_hospital
  ON public.user_coupons(hospital_id);

ALTER TABLE public.user_coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY user_coupons_owner_select ON public.user_coupons
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

CREATE POLICY user_coupons_admin_modify ON public.user_coupons
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

GRANT ALL ON public.user_coupons TO service_role;

-- =======================================
-- coupon_redemptions: usage history
-- =======================================
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL REFERENCES public.user_coupons(id),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  hospital_id uuid NOT NULL REFERENCES public.hospitals(id),

  billing_id uuid,
  billing_cycle text,

  original_amount int NOT NULL,
  discount_amount int NOT NULL CHECK (discount_amount >= 0),
  final_amount int NOT NULL CHECK (final_amount >= 0),

  redeemed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon
  ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_hospital
  ON public.coupon_redemptions(hospital_id, redeemed_at DESC);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY coupon_redemptions_owner_select ON public.coupon_redemptions
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

GRANT ALL ON public.coupon_redemptions TO service_role;

-- =======================================
-- issue_partner_coupon: auto-issue on signup
-- =======================================
CREATE OR REPLACE FUNCTION public.issue_partner_coupon(
  p_user_id uuid,
  p_hospital_id uuid,
  p_code_id uuid,
  p_template_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_template coupon_templates;
  v_coupon_id uuid;
  v_expires timestamptz;
BEGIN
  SELECT * INTO v_template
    FROM coupon_templates
    WHERE id = p_template_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_template.valid_days IS NOT NULL THEN
    v_expires := now() + (v_template.valid_days || ' days')::interval;
  ELSE
    v_expires := NULL;
  END IF;

  INSERT INTO user_coupons (
    user_id, hospital_id, template_id, source_code_id, source_type,
    discount_type, discount_value, max_uses,
    issued_at, expires_at, status
  ) VALUES (
    p_user_id, p_hospital_id, p_template_id, p_code_id, 'partner',
    v_template.discount_type, v_template.discount_value, v_template.max_uses,
    now(), v_expires, 'active'
  ) RETURNING id INTO v_coupon_id;

  RETURN v_coupon_id;
END;
$$;

-- =======================================
-- redeem_coupon: atomic coupon usage
-- =======================================
CREATE OR REPLACE FUNCTION public.redeem_coupon(
  p_coupon_id uuid,
  p_user_id uuid,
  p_hospital_id uuid,
  p_billing_id uuid,
  p_billing_cycle text,
  p_original_amount int
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_coupon user_coupons;
  v_discount int;
  v_final int;
BEGIN
  SELECT * INTO v_coupon
    FROM user_coupons
    WHERE id = p_coupon_id
      AND user_id = p_user_id
      AND hospital_id = p_hospital_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_not_found');
  END IF;

  IF v_coupon.status != 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_not_active');
  END IF;

  IF v_coupon.used_count >= v_coupon.max_uses THEN
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_exhausted');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND now() > v_coupon.expires_at THEN
    UPDATE user_coupons SET status = 'expired', updated_at = now()
      WHERE id = p_coupon_id;
    RETURN jsonb_build_object('ok', false, 'error', 'coupon_expired');
  END IF;

  IF v_coupon.discount_type = 'percentage' THEN
    v_discount := FLOOR(p_original_amount * v_coupon.discount_value / 100);
  ELSE
    v_discount := LEAST(v_coupon.discount_value::int, p_original_amount);
  END IF;

  v_final := GREATEST(p_original_amount - v_discount, 0);

  UPDATE user_coupons
    SET used_count = used_count + 1,
        status = CASE
          WHEN used_count + 1 >= max_uses THEN 'exhausted'
          ELSE 'active'
        END,
        updated_at = now()
    WHERE id = p_coupon_id;

  INSERT INTO coupon_redemptions (
    coupon_id, user_id, hospital_id,
    billing_id, billing_cycle,
    original_amount, discount_amount, final_amount
  ) VALUES (
    p_coupon_id, p_user_id, p_hospital_id,
    p_billing_id, p_billing_cycle,
    p_original_amount, v_discount, v_final
  );

  RETURN jsonb_build_object(
    'ok', true,
    'discount_amount', v_discount,
    'final_amount', v_final
  );
END;
$$;
