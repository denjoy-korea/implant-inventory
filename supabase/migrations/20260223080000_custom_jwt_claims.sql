-- C-1: custom_access_token hook — JWT에 hospital_id 자동 삽입
-- ───────────────────────────────────────────────────────────────────────────
-- 목적: 로그인 시 발급되는 JWT의 app_metadata에 사용자의 hospital_id를 포함시킴.
-- 적용: Supabase Auth Hook (custom_access_token) — Dashboard에서 별도 등록 필요.
--
-- 등록 방법:
--   Authentication → Hooks → Custom Access Token Hook
--   → Schema: public / Function: custom_access_token_hook → Save
--
-- 주의: hook 적용 전 발급된 기존 JWT에는 hospital_id가 없음.
--       재로그인 시 자동으로 포함됨. 기존 세션은 소프트-패스(로그만).
-- ───────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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

-- auth admin에게만 실행 권한 부여 (Supabase 내부 hook 실행자)
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;

-- 일반 사용자 직접 호출 차단
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;
