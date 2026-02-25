-- 온보딩 플래그 원자적 비트 OR 업데이트 함수 (SEC-W3)
-- SELECT → UPDATE 패턴 대신 단일 UPDATE로 race condition 제거
CREATE OR REPLACE FUNCTION public.set_onboarding_flag(
  p_hospital_id UUID,
  p_flag        SMALLINT
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.hospitals
  SET onboarding_flags = onboarding_flags | p_flag
  WHERE id = p_hospital_id;
$$;
