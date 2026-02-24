-- 베타 테스터 초대 코드 관리
-- - 운영자(admin)만 코드 CRUD 가능
-- - 회원가입 전(anon 포함) 코드 검증은 SECURITY DEFINER RPC로만 허용

CREATE TABLE IF NOT EXISTS public.beta_invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  distributed_to text NULL,
  distributed_contact text NULL,
  note text NULL,
  is_active boolean NOT NULL DEFAULT true,
  verify_count integer NOT NULL DEFAULT 0,
  last_verified_at timestamptz NULL,
  expires_at timestamptz NULL,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT beta_invite_codes_code_upper_chk CHECK (code = upper(code))
);

CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_active_created_at
  ON public.beta_invite_codes(is_active, created_at DESC);

ALTER TABLE public.beta_invite_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "beta_invite_codes_admin_select" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_select"
  ON public.beta_invite_codes
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "beta_invite_codes_admin_insert" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_insert"
  ON public.beta_invite_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "beta_invite_codes_admin_update" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_update"
  ON public.beta_invite_codes
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "beta_invite_codes_admin_delete" ON public.beta_invite_codes;
CREATE POLICY "beta_invite_codes_admin_delete"
  ON public.beta_invite_codes
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

CREATE OR REPLACE FUNCTION public.verify_beta_invite_code(p_code text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalized_code text;
  v_row public.beta_invite_codes%ROWTYPE;
BEGIN
  v_normalized_code := upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'));

  IF v_normalized_code = '' THEN
    RETURN QUERY SELECT false, '초대 코드를 입력해주세요.';
    RETURN;
  END IF;

  SELECT *
    INTO v_row
    FROM public.beta_invite_codes
   WHERE code = v_normalized_code
   LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '유효하지 않은 베타테스터 초대 코드입니다.';
    RETURN;
  END IF;

  IF v_row.is_active IS NOT true THEN
    RETURN QUERY SELECT false, '비활성화된 코드입니다. 운영팀에 문의해주세요.';
    RETURN;
  END IF;

  IF v_row.expires_at IS NOT NULL AND v_row.expires_at < now() THEN
    RETURN QUERY SELECT false, '만료된 코드입니다. 운영팀에 문의해주세요.';
    RETURN;
  END IF;

  UPDATE public.beta_invite_codes
     SET verify_count = verify_count + 1,
         last_verified_at = now(),
         updated_at = now()
   WHERE id = v_row.id;

  RETURN QUERY SELECT true, '베타테스터 코드가 확인되었습니다.';
END;
$$;

REVOKE ALL ON FUNCTION public.verify_beta_invite_code(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_beta_invite_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_beta_invite_code(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_beta_invite_code(text) TO service_role;
