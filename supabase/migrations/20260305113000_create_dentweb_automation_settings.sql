CREATE TABLE IF NOT EXISTS public.dentweb_automation_settings (
  hospital_id UUID PRIMARY KEY REFERENCES public.hospitals(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  interval_minutes INTEGER NOT NULL DEFAULT 60 CHECK (interval_minutes BETWEEN 5 AND 1440),
  manual_run_requested BOOLEAN NOT NULL DEFAULT false,
  manual_run_requested_at TIMESTAMPTZ NULL,
  last_run_at TIMESTAMPTZ NULL,
  last_status TEXT NOT NULL DEFAULT 'idle'
    CHECK (last_status IN ('idle', 'success', 'no_data', 'failed')),
  last_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dentweb_auto_settings_updated_at
  ON public.dentweb_automation_settings(updated_at DESC);

DROP TRIGGER IF EXISTS dentweb_automation_settings_updated_at ON public.dentweb_automation_settings;
CREATE TRIGGER dentweb_automation_settings_updated_at
  BEFORE UPDATE ON public.dentweb_automation_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.dentweb_automation_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hospital_auto_select" ON public.dentweb_automation_settings;
CREATE POLICY "hospital_auto_select" ON public.dentweb_automation_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.hospital_id = dentweb_automation_settings.hospital_id
    )
  );

DROP POLICY IF EXISTS "hospital_master_insert" ON public.dentweb_automation_settings;
CREATE POLICY "hospital_master_insert" ON public.dentweb_automation_settings
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.hospitals h
      WHERE h.id = dentweb_automation_settings.hospital_id
        AND h.master_admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "hospital_master_update" ON public.dentweb_automation_settings;
CREATE POLICY "hospital_master_update" ON public.dentweb_automation_settings
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.hospitals h
      WHERE h.id = dentweb_automation_settings.hospital_id
        AND h.master_admin_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.hospitals h
      WHERE h.id = dentweb_automation_settings.hospital_id
        AND h.master_admin_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "hospital_master_delete" ON public.dentweb_automation_settings;
CREATE POLICY "hospital_master_delete" ON public.dentweb_automation_settings
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.hospitals h
      WHERE h.id = dentweb_automation_settings.hospital_id
        AND h.master_admin_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.dentweb_automation_settings TO authenticated;
