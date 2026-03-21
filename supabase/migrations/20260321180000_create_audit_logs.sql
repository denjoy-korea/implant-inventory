-- audit_logs: 운영상 중요한 액션 추적 테이블
-- 대상: kick_member, refund, surgery_delete 등

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  action      TEXT        NOT NULL,
  actor_id    UUID        REFERENCES auth.users(id)      ON DELETE SET NULL,
  target_id   TEXT,
  hospital_id UUID        REFERENCES public.hospitals(id) ON DELETE SET NULL,
  meta        JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_logs_hospital_id_idx ON public.audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx      ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx  ON public.audit_logs(created_at DESC);

-- RLS: 시스템 관리자만 SELECT, INSERT는 service role(RLS 우회)로만 허용
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_logs_admin_select" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (get_my_role() = 'admin');
