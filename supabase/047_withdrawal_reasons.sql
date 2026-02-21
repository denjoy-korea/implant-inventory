-- 탈퇴 사유 기록 테이블 (계정 삭제 후에도 보존)
CREATE TABLE IF NOT EXISTS withdrawal_reasons (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL,
  email       TEXT        NOT NULL,
  reason      TEXT        NOT NULL,
  reason_detail TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인증된 사용자만 본인 탈퇴 사유 입력 가능
ALTER TABLE withdrawal_reasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own_insert" ON withdrawal_reasons
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
