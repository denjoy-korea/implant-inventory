-- =============================================================================
-- support chat member reset visibility
-- - 상담 종료 시 회원 화면에서만 기존 대화 이력을 숨긴다.
-- - 운영자는 전체 이력을 그대로 본다.
-- =============================================================================

ALTER TABLE public.support_threads
  ADD COLUMN IF NOT EXISTS member_reset_at TIMESTAMPTZ;

COMMENT ON COLUMN public.support_threads.member_reset_at
  IS '회원 화면에서 표시할 대화 이력 시작 시점. 이 값 이전 메시지는 운영자만 볼 수 있음.';

DROP POLICY IF EXISTS "support_messages_select" ON public.support_messages;
CREATE POLICY "support_messages_select"
  ON public.support_messages
  FOR SELECT
  TO authenticated
  USING (
    public.can_access_support_thread(thread_id)
    AND (
      (SELECT public.support_is_admin())
      OR created_at >= COALESCE(
        (
          SELECT st.member_reset_at
          FROM public.support_threads st
          WHERE st.id = thread_id
        ),
        '-infinity'::timestamptz
      )
    )
  );

NOTIFY pgrst, 'reload schema';
