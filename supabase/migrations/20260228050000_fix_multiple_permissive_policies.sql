-- =============================================================================
-- Multiple Permissive Policies 해소 — 중복 정책 병합
--
-- 같은 테이블/역할/액션에 정책이 2개 이상 → PostgreSQL이 OR로 모두 평가 → 비효율
-- 수정: 의미론적으로 동일한 정책을 하나로 병합
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles SELECT: users_view_own_profile + hospital_members_viewable → 1개로
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "hospital_members_viewable" ON profiles;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = (SELECT auth.uid())
    OR hospital_id = get_my_hospital_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles UPDATE: users_update_own_profile + master_manage_members → 1개로
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "master_manage_members" ON profiles;

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE TO authenticated
  USING (
    -- 본인 프로필 수정
    id = (SELECT auth.uid())
    -- 마스터가 자기 병원 멤버 수정 (본인 제외)
    OR (
      id != (SELECT auth.uid())
      AND hospital_id IN (
        SELECT h.id FROM hospitals h WHERE h.master_admin_id = (SELECT auth.uid())
      )
    )
  )
  WITH CHECK (
    -- 본인 프로필: role/status/hospital_id 변경 제한
    (
      id = (SELECT auth.uid())
      AND role = get_my_role()
      AND status = get_my_status()
      AND (
        hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
        OR (
          get_my_hospital_id() IS NULL
          AND is_my_own_hospital(hospital_id)
        )
      )
    )
    -- 마스터가 멤버 수정: dental_staff만, active/inactive만 허용
    OR (
      id != (SELECT auth.uid())
      AND hospital_id IN (
        SELECT h.id FROM hospitals h WHERE h.master_admin_id = (SELECT auth.uid())
      )
      AND role = 'dental_staff'
      AND status IN ('active', 'inactive')
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- member_invitations SELECT: 2개 → 1개로
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "hospital master can select invitations" ON member_invitations;
DROP POLICY IF EXISTS "master can select own hospital invitations" ON member_invitations;

CREATE POLICY "master_invitations_select" ON member_invitations
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.hospital_id = member_invitations.hospital_id
        AND profiles.role = 'master'
    )
    OR EXISTS (
      SELECT 1 FROM hospitals
      WHERE hospitals.id = hospital_id
        AND hospitals.master_admin_id = (SELECT auth.uid())
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- fixture_reference_defaults SELECT: 2개 → 1개로
-- FOR ALL 정책을 SELECT 제외 INSERT/UPDATE/DELETE로 분리
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "fixture_reference_defaults_select_authenticated" ON fixture_reference_defaults;
DROP POLICY IF EXISTS "fixture_reference_defaults_manage_admin" ON fixture_reference_defaults;

-- 통합 SELECT: 일반 사용자는 is_active=true만, admin은 전체 조회 가능
CREATE POLICY "fixture_reference_defaults_select" ON fixture_reference_defaults
  FOR SELECT TO authenticated
  USING (
    is_active = TRUE
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

-- admin INSERT/UPDATE/DELETE
CREATE POLICY "fixture_reference_defaults_insert_admin" ON fixture_reference_defaults
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "fixture_reference_defaults_update_admin" ON fixture_reference_defaults
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );

CREATE POLICY "fixture_reference_defaults_delete_admin" ON fixture_reference_defaults
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = (SELECT auth.uid()) AND p.role = 'admin'
    )
  );
