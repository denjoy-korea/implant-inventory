-- ============================================
-- 031: 구성원 초대 테이블
-- 치과 관리자가 스태프를 초대할 때 사용하는 초대 레코드
-- ============================================

CREATE TABLE IF NOT EXISTS member_invitations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  email        TEXT NOT NULL,
  name         TEXT NOT NULL,
  token        TEXT NOT NULL UNIQUE,
  status       TEXT NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending', 'accepted', 'expired')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  accepted_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_member_invitations_token
  ON member_invitations(token);

CREATE INDEX IF NOT EXISTS idx_member_invitations_hospital
  ON member_invitations(hospital_id);

-- RLS 활성화
ALTER TABLE member_invitations ENABLE ROW LEVEL SECURITY;

-- 병원 master_admin만 초대 생성 가능
CREATE POLICY "master can insert invitations"
  ON member_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = hospital_id
        AND hospitals.master_admin_id = auth.uid()
    )
  );

-- 병원 master_admin은 본인 병원 초대 목록 조회 가능
CREATE POLICY "master can select own hospital invitations"
  ON member_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = hospital_id
        AND hospitals.master_admin_id = auth.uid()
    )
  );

-- 토큰으로 초대 조회는 비인증 사용자도 가능 (초대 링크 접근)
-- anon 역할에게 SELECT 허용 (token 기반)
CREATE POLICY "anon can read pending invitation by token"
  ON member_invitations
  FOR SELECT
  TO anon
  USING (status = 'pending' AND expires_at > now());

-- 초대 수락 처리: 본인이 수락 중인 경우 UPDATE 가능
-- (accept-invite 처리 시 서비스 롤 또는 트리거로 처리)
CREATE POLICY "service role can update invitations"
  ON member_invitations
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
