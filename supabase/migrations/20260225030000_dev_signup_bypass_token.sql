-- 개발환경 전용 회원가입 우회 토큰 지원
-- - 프로덕션은 기본적으로 우회 불가(토큰 미설정)
-- - 개발 DB에서만 아래 설정 후 사용:
--   ALTER DATABASE postgres SET app.settings.beta_dev_signup_bypass_token = 'your-dev-token';
-- - 클라이언트 dev 환경변수:
--   VITE_DEV_SIGNUP_BYPASS_TOKEN=your-dev-token

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

      -- 원자적으로 1회 소모: 성공 시 한 건만 업데이트됨
      EXECUTE
        'UPDATE public.beta_invite_codes
            SET is_active = false,
                used_at = now(),
                used_by = $2,
                verify_count = verify_count + 1,
                last_verified_at = now(),
                updated_at = now()
          WHERE code = $1
            AND is_active = true
            AND used_at IS NULL
            AND (expires_at IS NULL OR expires_at >= now())
          RETURNING id'
        INTO v_consumed_id
        USING v_invite_code, NEW.id;

      IF v_consumed_id IS NULL THEN
        EXECUTE
          'SELECT id, is_active, expires_at, used_at
             FROM public.beta_invite_codes
            WHERE code = $1
            LIMIT 1'
          INTO v_lookup_id, v_lookup_is_active, v_lookup_expires_at, v_lookup_used_at
          USING v_invite_code;

        IF v_lookup_id IS NULL THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_INVALID';
        ELSIF v_lookup_used_at IS NOT NULL THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_ALREADY_USED';
        ELSIF v_lookup_is_active IS NOT true THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_INACTIVE';
        ELSIF v_lookup_expires_at IS NOT NULL AND v_lookup_expires_at < now() THEN
          RAISE EXCEPTION 'BETA_INVITE_CODE_EXPIRED';
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
