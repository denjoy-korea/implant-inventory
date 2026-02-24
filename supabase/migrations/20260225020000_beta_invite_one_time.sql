-- 베타 초대코드 1회용 정책
-- - 코드 검증 RPC는 "유효성 확인"만 수행 (소모하지 않음)
-- - 실제 회원가입(handle_new_user) 시점에 원자적으로 1회 소모

ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS used_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS used_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_used_at
  ON public.beta_invite_codes(used_at);

CREATE OR REPLACE FUNCTION public.verify_beta_invite_code(p_code text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_code text;
  v_id uuid;
  v_is_active boolean;
  v_expires_at timestamptz;
  v_used_at timestamptz;
BEGIN
  v_normalized_code := upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'));

  IF v_normalized_code = '' THEN
    RETURN QUERY SELECT false, '초대 코드를 입력해주세요.';
    RETURN;
  END IF;

  SELECT id, is_active, expires_at, used_at
    INTO v_id, v_is_active, v_expires_at, v_used_at
    FROM public.beta_invite_codes
   WHERE code = v_normalized_code
   LIMIT 1;

  IF v_id IS NULL THEN
    RETURN QUERY SELECT false, '유효하지 않은 베타테스터 초대 코드입니다.';
    RETURN;
  END IF;

  IF v_used_at IS NOT NULL THEN
    RETURN QUERY SELECT false, '이미 사용된 코드입니다. 운영팀에 문의해주세요.';
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
  v_lookup_is_active boolean;
  v_lookup_expires_at timestamptz;
  v_lookup_used_at timestamptz;
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
