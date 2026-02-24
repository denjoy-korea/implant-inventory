-- 베타 기간 회원가입 코드 서버 강제
-- - 2026-03-31(KST)까지 master/staff 직접 가입은 beta_invite_code 필수
-- - 초대 링크 수락(dental_staff)은 기존 흐름 유지

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
  v_invite_id uuid;
  v_invite_is_active boolean;
  v_invite_expires_at timestamptz;
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

    EXECUTE
      'SELECT id, is_active, expires_at
         FROM public.beta_invite_codes
        WHERE code = $1
        LIMIT 1'
      INTO v_invite_id, v_invite_is_active, v_invite_expires_at
      USING v_invite_code;

    IF v_invite_id IS NULL THEN
      RAISE EXCEPTION 'BETA_INVITE_CODE_INVALID';
    END IF;

    IF v_invite_is_active IS NOT true THEN
      RAISE EXCEPTION 'BETA_INVITE_CODE_INACTIVE';
    END IF;

    IF v_invite_expires_at IS NOT NULL AND v_invite_expires_at < now() THEN
      RAISE EXCEPTION 'BETA_INVITE_CODE_EXPIRED';
    END IF;

    EXECUTE
      'UPDATE public.beta_invite_codes
          SET verify_count = verify_count + 1,
              last_verified_at = now(),
              updated_at = now()
        WHERE id = $1'
      USING v_invite_id;
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
