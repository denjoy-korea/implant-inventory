-- =============================================================================
-- support chat insert hardening
-- - thread/message sender metadata를 DB에서 auth 세션 기준으로 고정
-- - support chat RLS 정책을 client supplied id에 덜 의존하도록 단순화
-- =============================================================================

CREATE OR REPLACE FUNCTION public.prepare_support_thread()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
  v_hospital_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  SELECT p.name, p.role, p.hospital_id
  INTO v_name, v_role, v_hospital_id
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_hospital_id IS NULL THEN
    RAISE EXCEPTION 'support_hospital_not_found';
  END IF;

  IF v_role = 'admin' THEN
    RAISE EXCEPTION 'support_thread_member_only';
  END IF;

  IF NEW.hospital_id IS DISTINCT FROM v_hospital_id THEN
    RAISE EXCEPTION 'support_thread_forbidden';
  END IF;

  NEW.created_by_user_id := auth.uid();
  NEW.created_by_name := COALESCE(NULLIF(BTRIM(v_name), ''), '이름 미상');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_threads_prepare ON public.support_threads;
CREATE TRIGGER trg_support_threads_prepare
  BEFORE INSERT ON public.support_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_support_thread();

DROP POLICY IF EXISTS "support_threads_select" ON public.support_threads;
CREATE POLICY "support_threads_select"
  ON public.support_threads
  FOR SELECT
  TO authenticated
  USING (
    (SELECT public.support_is_admin())
    OR hospital_id = (SELECT public.get_my_hospital_id())
  );

DROP POLICY IF EXISTS "support_threads_insert_member" ON public.support_threads;
CREATE POLICY "support_threads_insert_member"
  ON public.support_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    hospital_id = (SELECT public.get_my_hospital_id())
    AND NOT (SELECT public.support_is_admin())
  );

DROP POLICY IF EXISTS "support_threads_update_admin" ON public.support_threads;
CREATE POLICY "support_threads_update_admin"
  ON public.support_threads
  FOR UPDATE
  TO authenticated
  USING ((SELECT public.support_is_admin()))
  WITH CHECK ((SELECT public.support_is_admin()));

DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
CREATE POLICY "support_messages_select"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (public.can_access_support_thread(thread_id));

DROP POLICY IF EXISTS "support_messages_insert" ON public.support_messages;
CREATE POLICY "support_messages_insert"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.can_access_support_thread(thread_id)
    AND LENGTH(BTRIM(COALESCE(body, ''))) > 0
  );

NOTIFY pgrst, 'reload schema';
