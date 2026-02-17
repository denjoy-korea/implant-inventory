-- 019_operation_logs.sql
-- 감사 로그(작업 이력) 테이블

CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_operation_logs_hospital ON operation_logs(hospital_id);
CREATE INDEX idx_operation_logs_hospital_action ON operation_logs(hospital_id, action);
CREATE INDEX idx_operation_logs_hospital_created ON operation_logs(hospital_id, created_at DESC);

-- RLS
ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- SELECT: same hospital members can read
CREATE POLICY "operation_logs_select" ON operation_logs
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
    )
  );

-- INSERT: authenticated users can insert their own logs
CREATE POLICY "operation_logs_insert" ON operation_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );
