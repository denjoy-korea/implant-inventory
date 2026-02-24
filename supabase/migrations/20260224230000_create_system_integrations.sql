-- system_integrations: 서드파티 연동 설정 (암호화된 값 저장)
CREATE TABLE IF NOT EXISTS public.system_integrations (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,        -- ENCv2: 형식 암호화된 값
  label      TEXT,                 -- 표시용 이름
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS
ALTER TABLE public.system_integrations ENABLE ROW LEVEL SECURITY;

-- system_admin 역할만 접근 가능
CREATE POLICY "system_admin_only_select" ON public.system_integrations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "system_admin_only_insert" ON public.system_integrations
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "system_admin_only_update" ON public.system_integrations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "system_admin_only_delete" ON public.system_integrations
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

GRANT ALL ON public.system_integrations TO authenticated;
