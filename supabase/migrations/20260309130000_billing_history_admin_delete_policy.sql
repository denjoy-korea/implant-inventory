-- billing_history: admin DELETE RLS 정책 추가
-- admin은 결제 내역을 삭제할 수 있음 (테스트 데이터 정리 등)
DROP POLICY IF EXISTS "billing_history_admin_delete" ON billing_history;
CREATE POLICY "billing_history_admin_delete" ON billing_history
  FOR DELETE TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND role = 'admin')
  );
