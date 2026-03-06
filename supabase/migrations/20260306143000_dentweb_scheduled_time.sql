-- interval_minutes → scheduled_time (HH:MM)
ALTER TABLE public.dentweb_automation_settings
  ADD COLUMN IF NOT EXISTS scheduled_time TEXT NOT NULL DEFAULT '18:00'
  CHECK (scheduled_time ~ '^\d{2}:\d{2}$');

-- interval_minutes는 유지 (하위호환), 새 로직에서는 무시
COMMENT ON COLUMN public.dentweb_automation_settings.interval_minutes IS 'deprecated: use scheduled_time';
COMMENT ON COLUMN public.dentweb_automation_settings.scheduled_time IS 'Daily run time in HH:MM (24h format, KST)';
