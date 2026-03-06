-- touch_last_active_at 갱신 주기 완화: 5분 -> 1일
-- 이미 배포된 함수가 있어도 CREATE OR REPLACE로 안전하게 덮어쓴다.

CREATE OR REPLACE FUNCTION public.touch_last_active_at()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  UPDATE public.profiles
  SET last_active_at = now()
  WHERE id = v_user_id
    AND (
      last_active_at IS NULL
      OR last_active_at < now() - interval '1 day'
    );

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.touch_last_active_at() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.touch_last_active_at() TO authenticated;
