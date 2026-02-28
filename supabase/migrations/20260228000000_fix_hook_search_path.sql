-- search_path 고정 — Supabase 보안 어드바이저 권고 해소
-- 함수 실행 중 스키마 인젝션 방지를 위해 search_path를 명시적으로 고정합니다.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  claims jsonb;
  hospital_id uuid;
BEGIN
  -- profiles 테이블에서 사용자의 hospital_id 조회
  SELECT p.hospital_id INTO hospital_id
  FROM public.profiles p
  WHERE p.id = (event->>'user_id')::uuid;

  claims := event->'claims';

  -- hospital_id가 있는 경우 JWT app_metadata에 삽입
  IF hospital_id IS NOT NULL THEN
    claims := jsonb_set(
      claims,
      '{app_metadata,hospital_id}',
      to_jsonb(hospital_id::text)
    );
  END IF;

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- 권한 재설정 (CREATE OR REPLACE 이후 유지되지만 명시)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
