-- Migration 040: session_token for duplicate login prevention
-- profiles 테이블에 session_token 컬럼 추가 및 RPC 함수 생성

-- 1. profiles 테이블에 session_token 컬럼 추가
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_token TEXT DEFAULT NULL;

-- 2. 로그인 시 세션 토큰 설정 (본인만 업데이트 가능)
CREATE OR REPLACE FUNCTION set_session_token(p_token TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE profiles SET session_token = p_token WHERE id = auth.uid();
END;
$$;

-- 3. 현재 세션 토큰 조회 (본인만)
CREATE OR REPLACE FUNCTION get_session_token()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT session_token FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;
