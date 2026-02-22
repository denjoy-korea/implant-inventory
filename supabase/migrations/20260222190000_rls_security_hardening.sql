-- =============================================================================
-- RLS 보안 강화 마이그레이션
-- 발견된 취약점:
--   CRITICAL: member_invitations UPDATE 정책 — TO 절 없이 USING(true) 사용
--   CRITICAL: member_invitations anon SELECT — token 없이 모든 pending 초대 노출
--   HIGH:     profiles master_manage_members — 역할 상승(admin) 방어 없음
--   MEDIUM:   operation_logs INSERT — hospital_id 소속 검증 없음
--   HIGH:     withdrawal_reasons — SELECT 정책 없음 (시스템 어드민도 조회 불가)
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- [CRITICAL] member_invitations: UPDATE 정책 교체
-- 기존: USING(true) WITH CHECK(true) — TO 절 없음 → anon/authenticated 모두 UPDATE 가능
-- 수정: TO service_role 만 허용 (accept-invite Edge Function은 service role key 사용)
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "service role can update invitations" ON member_invitations;

-- Edge Function(accept-invite)은 SUPABASE_SERVICE_ROLE_KEY로 RLS를 우회하므로
-- 일반 역할에 대한 UPDATE 정책은 필요 없음.
-- 단, master_admin은 초대 취소(status → expired) 가능하도록 별도 정책 추가.
CREATE POLICY "master can cancel own hospital invitations"
  ON member_invitations
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM hospitals h
      WHERE h.id = member_invitations.hospital_id
        AND h.master_admin_id = auth.uid()
    )
    AND status = 'pending'
  )
  WITH CHECK (
    -- master는 status를 'expired'로만 변경 가능 (수락 상태 조작 불가)
    status IN ('pending', 'expired')
    AND EXISTS (
      SELECT 1 FROM hospitals h
      WHERE h.id = member_invitations.hospital_id
        AND h.master_admin_id = auth.uid()
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- [CRITICAL] member_invitations: anon SELECT — token 없이 전체 노출 방지
-- 기존: USING(status = 'pending' AND expires_at > now()) → 모든 pending 초대 목록 노출
-- 수정: anon은 직접 token을 알고 있는 경우에만 조회 가능
--       (token은 URL에 포함되어 있으므로 이미 알고 있는 경우에만 조회)
--       → Supabase에서는 USING 절의 컬럼 필터를 쿼리에서 추가해야 하므로,
--         anon의 SELECT를 인증된 사용자로만 제한하거나 Edge Function 경유로 변경.
--
-- 실용적 해결책: anon SELECT 정책 삭제 후 accept-invite Edge Function이
--               service_role로 token 조회를 담당하도록 위임 (이미 구현됨).
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anon can read pending invitation by token" ON member_invitations;

-- accept-invite Edge Function은 service_role key를 사용하므로 RLS 우회 가능.
-- 클라이언트 SDK에서 anon으로 member_invitations를 직접 조회할 수 없게 됨.
-- 초대 유효성 검사는 반드시 accept-invite Edge Function 경유 사용.

-- ─────────────────────────────────────────────────────────────────────────────
-- [HIGH] profiles: master_manage_members — 역할 상승(to admin) 방어
-- 기존: WITH CHECK 없음 → master가 멤버를 admin으로 승격 가능
-- 수정: WITH CHECK 추가 — role은 'dental_staff'만 허용, status는 'active'/'inactive'만
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "master_manage_members" ON profiles;

CREATE POLICY "master_manage_members"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    hospital_id IN (
      SELECT h.id FROM hospitals h WHERE h.master_admin_id = auth.uid()
    )
    -- master 자신의 프로필은 이 정책으로 수정 불가 (own_profile 정책으로만 수정)
    AND id != auth.uid()
  )
  WITH CHECK (
    hospital_id IN (
      SELECT h.id FROM hospitals h WHERE h.master_admin_id = auth.uid()
    )
    -- master는 멤버의 role을 'dental_staff'로만 유지 가능 (admin 승격 불가)
    AND role = 'dental_staff'
    -- status는 'active' 또는 'inactive'만 허용
    AND status IN ('active', 'inactive')
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- [MEDIUM] operation_logs: INSERT — hospital_id 소속 검증 추가
-- 기존: user_id = auth.uid() 만 검증 → 타 병원의 hospital_id로 INSERT 가능
-- 수정: hospital_id도 자신이 소속된 병원이어야 함
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "operation_logs_insert" ON operation_logs;

CREATE POLICY "operation_logs_insert"
  ON operation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND hospital_id IN (
      SELECT hospital_id FROM profiles
      WHERE id = auth.uid()
        AND status = 'active'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- [HIGH] withdrawal_reasons: 시스템 어드민 SELECT 정책 추가
-- 기존: SELECT 정책 없음 → RLS 활성화 상태에서 아무도 SELECT 불가
-- 수정: system_admin 역할만 조회 가능
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "admin_select_withdrawal_reasons" ON withdrawal_reasons;

CREATE POLICY "admin_select_withdrawal_reasons"
  ON withdrawal_reasons
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role = 'system_admin'
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- [CRITICAL] profiles: anyone_find_by_phone — USING(true) 정책 제거
-- 이 정책은 모든 사람(anon 포함)이 profiles 전체를 SELECT 가능하게 함
-- → 이메일, 전화번호, 역할, session_token 등 민감 정보 노출
-- hospital_members_viewable 정책으로 동일 병원 내 조회 기능은 유지됨
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "anyone_find_by_phone" ON profiles;
