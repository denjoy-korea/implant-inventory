-- 접속 로그 테이블
-- Edge Middleware에서 anon key로 INSERT, master/admin만 SELECT 가능

CREATE TABLE IF NOT EXISTS access_logs (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  ip         text        NOT NULL,
  country    text,
  city       text,
  region     text,
  path       text,
  user_agent text,
  blocked    boolean     NOT NULL DEFAULT false,  -- 해외 차단 여부
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스 (최신순 조회, IP 검색 최적화)
CREATE INDEX IF NOT EXISTS access_logs_created_at_idx ON access_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS access_logs_ip_idx         ON access_logs (ip);
CREATE INDEX IF NOT EXISTS access_logs_blocked_idx    ON access_logs (blocked);

-- RLS 활성화
ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;

-- Edge Middleware(anon key)가 INSERT 가능
CREATE POLICY "access_logs_insert"
  ON access_logs FOR INSERT TO anon
  WITH CHECK (true);

-- master / admin 역할만 SELECT 가능
CREATE POLICY "access_logs_select"
  ON access_logs FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('master', 'admin')
    )
  );
