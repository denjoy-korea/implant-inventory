-- 베타 초대코드 사용정책 확장
-- - usage_mode='single'    : 1회용 (가입 시 소모)
-- - usage_mode='unlimited' : 무제한 (가입 시 소모되지 않음)
-- - verify RPC는 유효성만 검증하며 소모하지 않음
-- - 개발 우회 토큰 로직은 기존과 동일 유지

ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS usage_mode text;

UPDATE public.beta_invite_codes
   SET usage_mode = 'single'
 WHERE usage_mode IS NULL;

ALTER TABLE public.beta_invite_codes
  ALTER COLUMN usage_mode SET DEFAULT 'single',
  ALTER COLUMN usage_mode SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'beta_invite_codes_usage_mode_chk'
      AND conrelid = 'public.beta_invite_codes'::regclass
  ) THEN
    ALTER TABLE public.beta_invite_codes
      ADD CONSTRAINT beta_invite_codes_usage_mode_chk
      CHECK (usage_mode IN ('single', 'unlimited'));
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_usage_mode
  ON public.beta_invite_codes(usage_mode);

CREATE OR REPLACE FUNCTION public.verify_beta_invite_code(p_code text)
RETURNS TABLE(ok boolean, message text)
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
BEGIN
  v_normalized_code := upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'));

  IF v_normalized_code = '' THEN
    RETURN QUERY SELECT false, '초대 코드를 입력해주세요.';
    RETURN;
  END IF;

  SELECT id, usage_mode, is_active, expires_at, used_at
    INTO v_id, v_usage_mode, v_is_active, v_expires_at, v_used_at
    FROM public.beta_invite_codes
   WHERE code = v_normalized_code
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, '유효하지 않은 베타테스터 초대 코드입니다.';
    RETURN;
  END IF;

  IF v_is_active IS NOT true THEN
    RETURN QUERY SELECT false, '비활성화된 코드입니다. 운영팀에 문의해주세요.';
    RETURN;
  END IF;

  IF v_expires_at IS NOT NULL AND v_expires_at < now() THEN
    RETURN QUERY SELECT false, '만료된 코드입니다. 운영팀에 문의해주세요.';
    RETURN;
  END IF;

  IF coalesce(v_usage_mode, 'single') = 'single' AND v_used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, '이미 사용된 코드입니다. 운영팀에 문의해주세요.';
    RETURN;
  END IF;

  RETURN QUERY SELECT true, '베타테스터 코드가 확인되었습니다.';
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_beta_cutoff CONSTANT timestamptz := '2026-04-01T00:00:00+09:00';
  v_invite_code text;
  v_consumed_id uuid;
  v_lookup_id uuid;
  v_lookup_usage_mode text;
  v_lookup_is_active boolean;
  v_lookup_expires_at timestamptz;
  v_lookup_used_at timestamptz;
  v_dev_bypass_token text;
  v_dev_bypass_expected text;
  v_dev_bypass_allowed boolean := false;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  IF v_role NOT IN ('master', 'dental_staff', 'staff') THEN
    v_role := 'staff';
  END IF;

  -- 공개 회원가입(master/staff)만 베타 코드 강제
  IF v_role IN ('master', 'staff') AND now() < v_beta_cutoff THEN
    IF to_regclass('public.beta_invite_codes') IS NULL THEN
      RAISE EXCEPTION 'BETA_INVITE_CODES_TABLE_MISSING';
    END IF;

    v_dev_bypass_token := trim(coalesce(NEW.raw_user_meta_data->>'beta_dev_bypass_token', ''));
    v_dev_bypass_expected := trim(coalesce(current_setting('app.settings.beta_dev_signup_bypass_token', true), ''));
    v_dev_bypass_allowed := (
      v_dev_bypass_expected <> ''
      AND v_dev_bypass_token <> ''
      AND v_dev_bypass_token = v_dev_bypass_expected
    );

    IF NOT v_dev_bypass_allowed THEN
      v_invite_code := upper(regexp_replace(trim(coalesce(NEW.raw_user_meta_data->>'beta_invite_code', '')), '\s+', '', 'g'));

      IF v_invite_code = '' THEN
        RAISE EXCEPTION 'BETA_INVITE_CODE_REQUIRED';
      END IF;

      -- 1) 1회용 코드 소모
      EXECUTE
        'UPDATE public.beta_invite_codes
            SET is_active = false,
                used_at = now(),
                used_by = $2,
                verify_count = verify_count + 1,
                last_verified_at = now(),
                updated_at = now()
          WHERE code = $1
            AND usage_mode = ''single''
            AND is_active = true
            AND used_at IS NULL
            AND (expires_at IS NULL OR expires_at >= now())
          RETURNING id'
        INTO v_consumed_id
        USING v_invite_code, NEW.id;

      -- 2) 무제한 코드 통과 (소모 없음)
      IF v_consumed_id IS NULL THEN
        EXECUTE
          'UPDATE public.beta_invite_codes
              SET verify_count = verify_count + 1,
                  last_verified_at = now(),
                  updated_at = now()
            WHERE code = $1
              AND usage_mode = ''unlimited''
              AND is_active = true
              AND (expires_at IS NULL OR expires_at >= now())
            RETURNING id'
          INTO v_consumed_id
          USING v_invite_code;
      END IF;

      IF v_consumed_id IS NULL THEN
        EXECUTE
          'SELECT id, usage_mode, is_active, expires_at, used_at
             FROM public.beta_invite_codes
            WHERE code = $1
            LIMIT 1'
          INTO v_lookup_id, v_lookup_usage_mode, v_lookup_is_active, v_lookup_expires_at, v_lookup_used_at
          USING v_invite_code;

        IF v_lookup_id IS NULL THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_INVALID';
        ELSIF v_lookup_is_active IS NOT true THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_INACTIVE';
        ELSIF v_lookup_expires_at IS NOT NULL AND v_lookup_expires_at < now() THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_EXPIRED';
        ELSIF coalesce(v_lookup_usage_mode, 'single') = 'single' AND v_lookup_used_at IS NOT NULL THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_ALREADY_USED';
        ELSE
          RAISE EXCEPTION 'BETA_INVITE_CODE_INVALID';
        END IF;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, email, name, role, phone, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    v_role,
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    CASE
      WHEN v_role IN ('master', 'staff') THEN 'active'
      ELSE 'pending'
    END
  );

  RETURN NEW;
END;
$$;
