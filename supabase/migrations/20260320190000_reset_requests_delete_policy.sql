-- data_reset_requests DELETE RLS 정책 추가
-- INSERT/UPDATE 정책은 있었으나 DELETE 정책이 누락되어 admin이 삭제 불가했던 버그 수정

DROP POLICY IF EXISTS "reset_requests_delete_admin" ON data_reset_requests;
CREATE POLICY "reset_requests_delete_admin" ON data_reset_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );
