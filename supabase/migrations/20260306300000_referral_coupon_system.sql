-- ═══════════════════════════════════════════════════════════
-- Referral coupon system
-- 1. code_type에 'referral' 추가
-- 2. beta_invite_codes에 referrer 추적 컬럼
-- 3. referral_reward 쿠폰 템플릿 (10% 할인, 1회)
-- 4. issue_referral_reward: 결제 완료 시 초대자에게 보상 쿠폰 지급
-- 5. process_payment_callback 확장: 레퍼럴 보상 자동 트리거
-- ═══════════════════════════════════════════════════════════

-- 1) code_type CHECK 제약 업데이트: 'referral' 추가
ALTER TABLE public.beta_invite_codes
  DROP CONSTRAINT IF EXISTS beta_invite_codes_code_type_chk;
ALTER TABLE public.beta_invite_codes
  ADD CONSTRAINT beta_invite_codes_code_type_chk
  CHECK (code_type IN ('beta', 'partner', 'promo', 'referral'));

-- 2) referrer 추적: 누가 이 코드로 가입했는지
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS referred_hospital_id uuid REFERENCES public.hospitals(id);

-- user_coupons에 referral 출처 추가
ALTER TABLE public.user_coupons
  DROP CONSTRAINT IF EXISTS user_coupons_source_type_check;
ALTER TABLE public.user_coupons
  ADD CONSTRAINT user_coupons_source_type_check
  CHECK (source_type IN ('partner', 'promo', 'admin', 'referral_reward'));

-- 3) referral_reward 쿠폰 템플릿 (10% 할인, 1회)
INSERT INTO public.coupon_templates (name, description, discount_type, discount_value, max_uses, valid_days)
VALUES (
  '초대 보상 10% 할인',
  '신규 회원 초대 보상 - 다음 결제 시 10% 할인 (1회)',
  'percentage',
  10,
  1,
  90
) ON CONFLICT DO NOTHING;

-- 4) issue_referral_reward: 초대자에게 보상 쿠폰 발급
CREATE OR REPLACE FUNCTION public.issue_referral_reward(
  p_referrer_user_id uuid,
  p_referrer_hospital_id uuid,
  p_referred_billing_id uuid
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_template coupon_templates;
  v_coupon_id uuid;
  v_expires timestamptz;
  v_already_rewarded boolean;
BEGIN
  -- 이미 이 결제건으로 보상 지급했는지 중복 체크
  SELECT EXISTS(
    SELECT 1 FROM user_coupons
    WHERE source_type = 'referral_reward'
      AND source_code_id IS NOT NULL
      AND hospital_id = p_referrer_hospital_id
      AND id IN (
        SELECT coupon_id FROM coupon_redemptions WHERE billing_id = p_referred_billing_id
      )
  ) INTO v_already_rewarded;

  IF v_already_rewarded THEN
    RETURN NULL;
  END IF;

  -- referral_reward 템플릿 조회 (가장 최근 활성 템플릿)
  SELECT * INTO v_template
    FROM coupon_templates
    WHERE name = '초대 보상 10% 할인'
      AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_template.valid_days IS NOT NULL THEN
    v_expires := now() + (v_template.valid_days || ' days')::interval;
  ELSE
    v_expires := NULL;
  END IF;

  INSERT INTO user_coupons (
    user_id, hospital_id, template_id, source_type,
    discount_type, discount_value, max_uses,
    issued_at, expires_at, status
  ) VALUES (
    p_referrer_user_id, p_referrer_hospital_id, v_template.id, 'referral_reward',
    v_template.discount_type, v_template.discount_value, v_template.max_uses,
    now(), v_expires, 'active'
  ) RETURNING id INTO v_coupon_id;

  RETURN v_coupon_id;
END;
$$;

-- 5) process_payment_callback 확장: 결제 완료 시 레퍼럴 보상 트리거
CREATE OR REPLACE FUNCTION process_payment_callback(
  p_billing_id UUID,
  p_payment_ref TEXT,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_billing RECORD;
  v_expires_at TIMESTAMPTZ;
  v_changed_at TIMESTAMPTZ := now();
  v_jwt_role TEXT := current_setting('request.jwt.claim.role', true);
  v_referral_code RECORD;
  v_referrer_profile RECORD;
BEGIN
  IF COALESCE(v_jwt_role, '') <> 'service_role' THEN
    RETURN FALSE;
  END IF;

  IF p_status NOT IN ('completed', 'failed') THEN
    RETURN FALSE;
  END IF;

  SELECT * INTO v_billing
  FROM billing_history
  WHERE id = p_billing_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  IF v_billing.payment_status IN ('completed', 'cancelled') THEN
    RETURN FALSE;
  END IF;

  IF p_status = 'completed' THEN
    UPDATE billing_history
    SET
      payment_status = 'completed',
      payment_ref    = p_payment_ref,
      updated_at     = now()
    WHERE id = p_billing_id;

    IF v_billing.billing_cycle = 'yearly' THEN
      v_expires_at := v_changed_at + interval '1 year';
    ELSIF v_billing.billing_cycle = 'monthly' THEN
      v_expires_at := v_changed_at + interval '1 month';
    ELSE
      v_expires_at := NULL;
    END IF;

    UPDATE hospitals
    SET
      plan           = v_billing.plan,
      plan_expires_at = v_expires_at,
      billing_cycle  = v_billing.billing_cycle,
      plan_changed_at = v_changed_at,
      trial_used     = TRUE
    WHERE id = v_billing.hospital_id;

    -- NOTE: coupon redemption은 toss-payment-confirm Edge Function에서 처리.
    -- 여기서 중복 호출하면 used_count 이중 차감 및 coupon_redemptions 중복 발생.

    -- Referral reward: 이 병원이 referral 코드로 가입했다면, 초대자에게 보상 쿠폰 지급
    -- 첫 유료 결제 시에만 (이전 completed billing이 없는 경우)
    IF NOT EXISTS (
      SELECT 1 FROM billing_history
      WHERE hospital_id = v_billing.hospital_id
        AND payment_status = 'completed'
        AND id != p_billing_id
    ) THEN
      SELECT * INTO v_referral_code
      FROM beta_invite_codes
      WHERE code_type = 'referral'
        AND referred_hospital_id = v_billing.hospital_id
      LIMIT 1;

      IF FOUND AND v_referral_code.created_by IS NOT NULL THEN
        SELECT id, hospital_id INTO v_referrer_profile
        FROM profiles
        WHERE id = v_referral_code.created_by;

        IF FOUND AND v_referrer_profile.hospital_id IS NOT NULL
           AND v_referrer_profile.hospital_id != v_billing.hospital_id THEN
          PERFORM issue_referral_reward(
            v_referrer_profile.id,
            v_referrer_profile.hospital_id,
            p_billing_id
          );
        END IF;
      END IF;
    END IF;

  ELSE
    UPDATE billing_history
    SET
      payment_status = 'failed',
      payment_ref    = p_payment_ref,
      updated_at     = now()
    WHERE id = p_billing_id;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION issue_referral_reward(uuid, uuid, uuid) TO service_role;

-- 6) verify_beta_invite_code 업데이트: code_type 반환 추가
CREATE OR REPLACE FUNCTION public.verify_beta_invite_code(p_code text)
RETURNS TABLE(ok boolean, message text, code_type text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_code text;
  v_id uuid;
  v_usage_mode text;
  v_is_active boolean;
  v_expires_at timestamptz;
  v_used_at timestamptz;
  v_code_type text;
BEGIN
  v_normalized_code := upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'));

  IF v_normalized_code = '' THEN
    RETURN QUERY SELECT false, '초대 코드를 입력해주세요.', NULL::text;
    RETURN;
  END IF;

  SELECT b.id, b.usage_mode, b.is_active, b.expires_at, b.used_at, b.code_type
    INTO v_id, v_usage_mode, v_is_active, v_expires_at, v_used_at, v_code_type
    FROM public.beta_invite_codes b
   WHERE b.code = v_normalized_code
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, '유효하지 않은 초대 코드입니다.', NULL::text;
    RETURN;
  END IF;

  IF v_is_active IS NOT true THEN
    RETURN QUERY SELECT false, '비활성화된 코드입니다. 운영팀에 문의해주세요.', NULL::text;
    RETURN;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN QUERY SELECT false, '만료된 코드입니다. 운영팀에 문의해주세요.', NULL::text;
    RETURN;
  END IF;

  IF coalesce(v_usage_mode, 'single') = 'single' AND v_used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, '이미 사용된 코드입니다.', NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, '코드가 확인되었습니다.', v_code_type;
END;
$$;

-- 7) create_my_referral_code: 사용자가 자신의 초대 코드 생성
CREATE OR REPLACE FUNCTION public.create_my_referral_code()
RETURNS TABLE(code text, id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_hospital_id uuid;
  v_code text;
  v_id uuid;
  v_seg1 text;
  v_seg2 text;
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_attempt int := 0;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'NOT_AUTHENTICATED';
  END IF;

  -- 유료 플랜 사용자만 초대 코드 생성 가능
  SELECT p.hospital_id INTO v_hospital_id
  FROM profiles p
  JOIN hospitals h ON h.id = p.hospital_id
  WHERE p.id = v_user_id
    AND h.plan != 'free';

  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'PAID_PLAN_REQUIRED';
  END IF;

  -- 이미 활성 referral 코드가 있으면 그것을 반환
  SELECT b.code, b.id INTO v_code, v_id
  FROM beta_invite_codes b
  WHERE b.created_by = v_user_id
    AND b.code_type = 'referral'
    AND b.is_active = true
    AND b.usage_mode = 'unlimited'
  LIMIT 1;

  IF v_code IS NOT NULL THEN
    RETURN QUERY SELECT v_code, v_id;
    RETURN;
  END IF;

  -- 새 코드 생성 (최대 6회 시도)
  LOOP
    v_attempt := v_attempt + 1;
    IF v_attempt > 6 THEN
      RAISE EXCEPTION 'CODE_GENERATION_FAILED';
    END IF;

    -- 랜덤 4자리 세그먼트 2개 생성
    v_seg1 := '';
    v_seg2 := '';
    FOR i IN 1..4 LOOP
      v_seg1 := v_seg1 || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
      v_seg2 := v_seg2 || substr(v_chars, floor(random() * length(v_chars))::int + 1, 1);
    END LOOP;
    v_code := 'INVITE-' || v_seg1 || '-' || v_seg2;

    BEGIN
      INSERT INTO beta_invite_codes (
        code, code_type, usage_mode, is_active, created_by
      ) VALUES (
        v_code, 'referral', 'unlimited', true, v_user_id
      ) RETURNING beta_invite_codes.id INTO v_id;

      RETURN QUERY SELECT v_code, v_id;
      RETURN;
    EXCEPTION WHEN unique_violation THEN
      CONTINUE;
    END;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION create_my_referral_code() TO authenticated;

-- 8) get_my_referral_info: 내 초대 코드 + 초대 현황 조회
CREATE OR REPLACE FUNCTION public.get_my_referral_info()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_code text;
  v_code_id uuid;
  v_referred_count int;
  v_reward_coupons json;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN json_build_object('code', null, 'referred_count', 0, 'rewards', '[]'::json);
  END IF;

  -- 내 활성 referral 코드
  SELECT b.code, b.id INTO v_code, v_code_id
  FROM beta_invite_codes b
  WHERE b.created_by = v_user_id
    AND b.code_type = 'referral'
    AND b.is_active = true
  LIMIT 1;

  -- 초대로 가입한 병원 수
  SELECT count(*) INTO v_referred_count
  FROM beta_invite_codes b
  WHERE b.created_by = v_user_id
    AND b.code_type = 'referral'
    AND b.referred_hospital_id IS NOT NULL;

  -- 받은 보상 쿠폰 목록
  SELECT coalesce(json_agg(row_to_json(r)), '[]'::json) INTO v_reward_coupons
  FROM (
    SELECT uc.id, uc.discount_type, uc.discount_value, uc.status,
           uc.issued_at, uc.expires_at, uc.used_count, uc.max_uses
    FROM user_coupons uc
    WHERE uc.user_id = v_user_id
      AND uc.source_type = 'referral_reward'
    ORDER BY uc.issued_at DESC
    LIMIT 20
  ) r;

  RETURN json_build_object(
    'code', v_code,
    'referred_count', v_referred_count,
    'rewards', v_reward_coupons
  );
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_referral_info() TO authenticated;

-- 9) link_referral_hospital: 가입 후 병원 ID를 referral 코드에 연결 (service_role 또는 본인)
CREATE OR REPLACE FUNCTION public.link_referral_hospital(p_code text, p_hospital_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  UPDATE beta_invite_codes
  SET referred_hospital_id = p_hospital_id,
      updated_at = now()
  WHERE code = upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'))
    AND code_type = 'referral'
    AND referred_hospital_id IS NULL
    AND created_by != v_user_id;  -- 자기 코드로 자기 병원 연결 방지

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION link_referral_hospital(text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION link_referral_hospital(text, uuid) TO service_role;

-- 10) coupon_redemptions: (coupon_id, billing_id) UNIQUE 제약 — 이중 redeem 방어
CREATE UNIQUE INDEX IF NOT EXISTS uq_coupon_redemptions_coupon_billing
  ON public.coupon_redemptions(coupon_id, billing_id)
  WHERE billing_id IS NOT NULL;
