-- 042_analysis_leads.sql
-- 무료 분석 리드 수집 테이블

CREATE TABLE IF NOT EXISTS analysis_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  type text NOT NULL CHECK (type IN ('report_only', 'detailed_analysis')),
  hospital_name text,
  region text,
  contact text,
  score integer,
  grade text,
  report_summary text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS 활성화
ALTER TABLE analysis_leads ENABLE ROW LEVEL SECURITY;

-- anon 사용자도 INSERT 가능 (비로그인 분석 사용자)
CREATE POLICY "anon_insert_analysis_leads"
  ON analysis_leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 인증된 admin role만 SELECT 가능
CREATE POLICY "admin_select_analysis_leads"
  ON analysis_leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 테이블 권한 부여 (RLS와 별개로 필요)
GRANT INSERT ON analysis_leads TO anon;
GRANT INSERT ON analysis_leads TO authenticated;
GRANT SELECT ON analysis_leads TO authenticated;
