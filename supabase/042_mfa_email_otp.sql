-- ============================================================
-- 042: 이메일 OTP 2차 인증 + 기기 신뢰
-- ============================================================

-- 1. profiles.mfa_enabled 컬럼 추가
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. 신뢰 기기 테이블
CREATE TABLE IF NOT EXISTS trusted_devices (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_token TEXT       NOT NULL,
  device_name  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_trusted_devices_user  ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_token ON trusted_devices(device_token);

-- 3. RLS
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_select" ON trusted_devices;
DROP POLICY IF EXISTS "own_insert" ON trusted_devices;
DROP POLICY IF EXISTS "own_delete" ON trusted_devices;

CREATE POLICY "own_select" ON trusted_devices
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "own_insert" ON trusted_devices
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "own_delete" ON trusted_devices
  FOR DELETE TO authenticated USING (user_id = auth.uid());

-- 4. RPC: MFA 활성화/비활성화
CREATE OR REPLACE FUNCTION toggle_mfa_enabled(p_enabled BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET mfa_enabled = p_enabled WHERE id = auth.uid();
END;
$$;

-- 5. RPC: 신뢰 기기 검증
CREATE OR REPLACE FUNCTION check_trusted_device(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM trusted_devices
  WHERE user_id     = auth.uid()
    AND device_token = p_token
    AND expires_at   > now();
  RETURN v_count > 0;
END;
$$;

-- 6. RPC: 신뢰 기기 등록
CREATE OR REPLACE FUNCTION register_trusted_device(
  p_token       TEXT,
  p_device_name TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 만료된 기기 정리 (본인 것만)
  DELETE FROM trusted_devices
  WHERE user_id = auth.uid() AND expires_at <= now();

  INSERT INTO trusted_devices (user_id, device_token, device_name)
  VALUES (auth.uid(), p_token, p_device_name)
  ON CONFLICT DO NOTHING;
END;
$$;

-- 7. RPC: 신뢰 기기 목록 조회
CREATE OR REPLACE FUNCTION get_trusted_devices()
RETURNS TABLE(
  id          UUID,
  device_name TEXT,
  created_at  TIMESTAMPTZ,
  expires_at  TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT td.id, td.device_name, td.created_at, td.expires_at
  FROM trusted_devices td
  WHERE td.user_id   = auth.uid()
    AND td.expires_at > now()
  ORDER BY td.created_at DESC;
END;
$$;

-- 8. RPC: 신뢰 기기 제거
CREATE OR REPLACE FUNCTION remove_trusted_device(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM trusted_devices WHERE id = p_id AND user_id = auth.uid();
END;
$$;
