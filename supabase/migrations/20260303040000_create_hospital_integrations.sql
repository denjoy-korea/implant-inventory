CREATE TABLE IF NOT EXISTS public.hospital_integrations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  provider    TEXT NOT NULL CHECK (provider IN ('notion', 'slack', 'solapi')),
  config      TEXT NOT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(hospital_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_hospital_integrations_hospital
  ON public.hospital_integrations(hospital_id);

ALTER TABLE public.hospital_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_master_select" ON public.hospital_integrations
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

CREATE POLICY "hospital_master_insert" ON public.hospital_integrations
  FOR INSERT WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

CREATE POLICY "hospital_master_update" ON public.hospital_integrations
  FOR UPDATE USING (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

CREATE POLICY "hospital_master_delete" ON public.hospital_integrations
  FOR DELETE USING (
    hospital_id IN (
      SELECT hospital_id FROM public.profiles
      WHERE id = auth.uid() AND role = 'master' AND status = 'active'
    )
  );

GRANT ALL ON public.hospital_integrations TO authenticated;
