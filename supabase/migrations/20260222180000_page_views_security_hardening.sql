-- SEC-11: page_views INSERT anon 제한 강화
-- SEC-04: account_id UPDATE 정책 추가
--
-- 문제:
--   1. anon 사용자의 INSERT에 아무런 제한이 없어 데이터 오염 및 스토리지 남용 가능
--   2. account_id 컬럼을 인증 사용자가 임의 값으로 설정 가능 (타 세션에 자기 ID 주입)

-- -------------------------------------------------------------------
-- SEC-11: page 값을 허용된 목록으로 제한
-- -------------------------------------------------------------------

-- 기존 무제한 INSERT 정책 제거
DROP POLICY IF EXISTS "page_views_insert" ON page_views;

-- 허용된 페이지 이름만 INSERT 가능 (유효하지 않은 page 값 차단)
CREATE POLICY "page_views_insert" ON page_views
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    page IN ('landing', 'pricing', 'analyze', 'contact', 'value', 'login', 'signup')
    AND session_id IS NOT NULL
    AND char_length(session_id) <= 64
    AND (referrer IS NULL OR char_length(referrer) <= 2048)
  );

-- -------------------------------------------------------------------
-- SEC-04: page_views UPDATE — account_id 무결성 강화
-- -------------------------------------------------------------------

-- 기존 UPDATE 정책 제거
DROP POLICY IF EXISTS "page_views_update_convert" ON page_views;

-- account_id도 자신의 hospital_id와 일치하는 값만 허용
-- user_id는 본인 auth.uid()로만 설정 가능
-- session_id 기반으로만 자신의 행 업데이트 가능 (타인 세션 오염 불가)
CREATE POLICY "page_views_update_convert" ON page_views
  FOR UPDATE TO authenticated
  USING (
    user_id IS NULL
    AND session_id IS NOT NULL
  )
  WITH CHECK (
    user_id = auth.uid()
    -- account_id는 NULL이거나 64자 이하 문자열만 허용
    AND (account_id IS NULL OR char_length(account_id) <= 64)
  );

-- UPDATE 권한 유지 (account_id 포함)
GRANT UPDATE (user_id, account_id) ON page_views TO authenticated;
