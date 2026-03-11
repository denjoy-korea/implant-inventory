-- =============================================================================
-- 로그인 회원용 실시간 상담
-- 병원 단위 단일 상담방 + 메시지 + unread/read marker
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.support_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL UNIQUE REFERENCES public.hospitals(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  admin_last_read_at TIMESTAMPTZ,
  member_last_read_at TIMESTAMPTZ,
  admin_unread_count INTEGER NOT NULL DEFAULT 0 CHECK (admin_unread_count >= 0),
  member_unread_count INTEGER NOT NULL DEFAULT 0 CHECK (member_unread_count >= 0),
  last_message_at TIMESTAMPTZ,
  last_message_preview TEXT,
  last_message_sender_kind TEXT CHECK (last_message_sender_kind IN ('member', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_kind TEXT NOT NULL CHECK (sender_kind IN ('member', 'admin')),
  sender_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_threads_last_message_at
  ON public.support_threads (last_message_at DESC NULLS LAST, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_support_threads_status
  ON public.support_threads (status, last_message_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_support_messages_thread_created_at
  ON public.support_messages (thread_id, created_at ASC);

COMMENT ON TABLE public.support_threads IS '병원 단위 고객지원 상담방';
COMMENT ON TABLE public.support_messages IS '고객지원 상담 메시지';

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.support_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(public.get_my_role() = 'admin', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.can_access_support_thread(p_thread_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.support_is_admin() THEN
    RETURN TRUE;
  END IF;

  v_hospital_id := public.get_my_hospital_id();

  RETURN EXISTS (
    SELECT 1
    FROM public.support_threads st
    WHERE st.id = p_thread_id
      AND st.hospital_id = v_hospital_id
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.update_support_threads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.prepare_support_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  NEW.body := BTRIM(COALESCE(NEW.body, ''));
  IF NEW.body = '' THEN
    RAISE EXCEPTION 'support_message_empty';
  END IF;

  SELECT p.name, p.role
  INTO v_name, v_role
  FROM public.profiles p
  WHERE p.id = auth.uid();

  IF v_name IS NULL THEN
    RAISE EXCEPTION 'support_profile_not_found';
  END IF;

  NEW.sender_id := auth.uid();
  NEW.sender_name := v_name;
  NEW.sender_kind := CASE WHEN v_role = 'admin' THEN 'admin' ELSE 'member' END;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_support_thread_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_preview TEXT;
BEGIN
  v_preview := LEFT(REGEXP_REPLACE(NEW.body, '\s+', ' ', 'g'), 120);

  IF NEW.sender_kind = 'admin' THEN
    UPDATE public.support_threads
    SET
      last_message_at = NEW.created_at,
      last_message_preview = v_preview,
      last_message_sender_kind = 'admin',
      member_unread_count = member_unread_count + 1,
      admin_unread_count = 0,
      admin_last_read_at = NEW.created_at,
      status = 'open',
      updated_at = NEW.created_at
    WHERE id = NEW.thread_id;
  ELSE
    UPDATE public.support_threads
    SET
      last_message_at = NEW.created_at,
      last_message_preview = v_preview,
      last_message_sender_kind = 'member',
      admin_unread_count = admin_unread_count + 1,
      member_unread_count = 0,
      member_last_read_at = NEW.created_at,
      status = 'open',
      updated_at = NEW.created_at
    WHERE id = NEW.thread_id;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_support_thread_read(p_thread_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_hospital_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  IF public.support_is_admin() THEN
    UPDATE public.support_threads
    SET
      admin_last_read_at = NOW(),
      admin_unread_count = 0,
      updated_at = GREATEST(updated_at, NOW())
    WHERE id = p_thread_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'support_thread_not_found';
    END IF;

    RETURN;
  END IF;

  v_hospital_id := public.get_my_hospital_id();

  UPDATE public.support_threads
  SET
    member_last_read_at = NOW(),
    member_unread_count = 0,
    updated_at = GREATEST(updated_at, NOW())
  WHERE id = p_thread_id
    AND hospital_id = v_hospital_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'support_thread_forbidden';
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_support_threads_updated_at ON public.support_threads;
CREATE TRIGGER trg_support_threads_updated_at
  BEFORE UPDATE ON public.support_threads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_support_threads_updated_at();

DROP TRIGGER IF EXISTS trg_support_messages_prepare ON public.support_messages;
CREATE TRIGGER trg_support_messages_prepare
  BEFORE INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.prepare_support_message();

DROP TRIGGER IF EXISTS trg_support_messages_sync_thread ON public.support_messages;
CREATE TRIGGER trg_support_messages_sync_thread
  AFTER INSERT ON public.support_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_support_thread_on_message();

DROP POLICY IF EXISTS "support_threads_select" ON public.support_threads;
CREATE POLICY "support_threads_select"
  ON public.support_threads
  FOR SELECT
  TO authenticated
  USING (
    public.support_is_admin()
    OR hospital_id = public.get_my_hospital_id()
  );

DROP POLICY IF EXISTS "support_threads_insert_member" ON public.support_threads;
CREATE POLICY "support_threads_insert_member"
  ON public.support_threads
  FOR INSERT
  TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND hospital_id = public.get_my_hospital_id()
    AND NOT public.support_is_admin()
  );

DROP POLICY IF EXISTS "support_threads_update_admin" ON public.support_threads;
CREATE POLICY "support_threads_update_admin"
  ON public.support_threads
  FOR UPDATE
  TO authenticated
  USING (public.support_is_admin())
  WITH CHECK (public.support_is_admin());

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
    AND sender_id = auth.uid()
    AND LENGTH(BTRIM(COALESCE(body, ''))) > 0
  );

GRANT SELECT, INSERT, UPDATE ON public.support_threads TO authenticated;
GRANT SELECT, INSERT ON public.support_messages TO authenticated;
GRANT EXECUTE ON FUNCTION public.support_is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_support_thread(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_support_thread_read(UUID) TO authenticated;

DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END;
END;
$$;

NOTIFY pgrst, 'reload schema';
