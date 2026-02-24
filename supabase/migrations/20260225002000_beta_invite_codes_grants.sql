-- beta_invite_codes 권한 보강
-- - 운영자(authenticated + RLS 정책) CRUD 허용
-- - anon은 직접 테이블 접근 금지 (RPC만 사용)

DO $$
BEGIN
  IF to_regclass('public.beta_invite_codes') IS NULL THEN
    RAISE EXCEPTION 'BETA_INVITE_CODES_TABLE_MISSING';
  END IF;

  EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.beta_invite_codes TO authenticated';
END $$;
