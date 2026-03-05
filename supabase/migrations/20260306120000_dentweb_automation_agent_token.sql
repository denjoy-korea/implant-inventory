-- dentweb_automation_settings: 에이전트 토큰 + 상태 기계 확장
-- Plan: docs/01-plan/features/dentweb-automation-refactor.plan.md

-- 1. last_status CHECK 제약 변경 ('running' 추가)
ALTER TABLE public.dentweb_automation_settings
  DROP CONSTRAINT IF EXISTS dentweb_automation_settings_last_status_check;

ALTER TABLE public.dentweb_automation_settings
  ADD CONSTRAINT dentweb_automation_settings_last_status_check
    CHECK (last_status IN ('idle', 'running', 'success', 'no_data', 'failed'));

-- 2. 신규 컬럼: claimed_at (running 상태 시작 시점)
ALTER TABLE public.dentweb_automation_settings
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NULL;

-- 3. 신규 컬럼: agent_token (에이전트 인증용 UUID)
ALTER TABLE public.dentweb_automation_settings
  ADD COLUMN IF NOT EXISTS agent_token TEXT NULL;

-- 4. 신규 컬럼: stale_timeout_minutes (running → failed 자동 복구)
ALTER TABLE public.dentweb_automation_settings
  ADD COLUMN IF NOT EXISTS stale_timeout_minutes INTEGER NOT NULL DEFAULT 30;

ALTER TABLE public.dentweb_automation_settings
  DROP CONSTRAINT IF EXISTS dentweb_automation_settings_stale_timeout_check;

ALTER TABLE public.dentweb_automation_settings
  ADD CONSTRAINT dentweb_automation_settings_stale_timeout_check
    CHECK (stale_timeout_minutes BETWEEN 5 AND 120);

-- 5. agent_token 유니크 인덱스 (조회 성능 + 중복 방지)
CREATE UNIQUE INDEX IF NOT EXISTS idx_dentweb_auto_agent_token
  ON public.dentweb_automation_settings(agent_token)
  WHERE agent_token IS NOT NULL;
