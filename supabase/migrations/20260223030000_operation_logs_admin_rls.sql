-- =============================================================================
-- operation_logs: admin INSERT 예외 정책 추가
--
-- 문제: 기존 operation_logs_insert 정책은 hospital_id 소속 검증을 요구하나
--       system admin(role='admin')은 hospital_id = NULL 이므로 항상 INSERT 실패.
--       결과: 계정 비활성화/재활성화/강제 삭제의 감사 로그가 항상 누락됨.
--
-- 수정: admin 역할은 hospital_id 소속 검증 없이 INSERT 허용.
--       (admin은 전체 병원 관리 권한을 가짐)
-- =============================================================================

DROP POLICY IF EXISTS "operation_logs_insert" ON operation_logs;

CREATE POLICY "operation_logs_insert"
  ON operation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      -- 일반 사용자: 자신이 소속된 활성 병원에만 INSERT 가능
      hospital_id IN (
        SELECT hospital_id FROM profiles
        WHERE id = auth.uid()
          AND status = 'active'
      )
      -- system admin: 감사 목적으로 타 병원 hospital_id로도 INSERT 가능
      OR EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
          AND role = 'admin'
      )
    )
  );
