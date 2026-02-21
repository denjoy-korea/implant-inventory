-- 047: contact_inquiries RLS 정책 재설정
-- 기존 정책 제거 후 재생성

DROP POLICY IF EXISTS "anyone can submit inquiry" ON contact_inquiries;
DROP POLICY IF EXISTS "admin can view inquiries" ON contact_inquiries;
DROP POLICY IF EXISTS "admin can update inquiry status" ON contact_inquiries;
DROP POLICY IF EXISTS "admin can delete inquiry" ON contact_inquiries;

-- 비로그인(anon) 포함 누구나 INSERT 가능
CREATE POLICY "anyone can insert inquiry"
  ON contact_inquiries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- 관리자만 조회
CREATE POLICY "admin can select inquiries"
  ON contact_inquiries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 관리자만 수정
CREATE POLICY "admin can update inquiries"
  ON contact_inquiries
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 관리자만 삭제
CREATE POLICY "admin can delete inquiries"
  ON contact_inquiries
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

-- 권한 재확인
GRANT INSERT ON contact_inquiries TO anon;
GRANT INSERT, SELECT, UPDATE, DELETE ON contact_inquiries TO authenticated;
