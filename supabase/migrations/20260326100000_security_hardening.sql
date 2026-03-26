-- ════════════════════════════════════════════════════════════════════════════
-- 보안 패치 2026-03-26
--
-- 1. process_payment_callback 6-param REVOKE/GRANT
--    20260314040000에서 추가된 6-param 오버로드에 REVOKE 누락 →
--    authenticated 사용자가 PostgREST RPC로 직접 호출하여 플랜 업그레이드 가능
--
-- 2. dentweb_automation_settings SELECT — master 전용으로 제한
--    hospital_auto_select: 병원 전체 구성원이 row 전체(설정값 포함) 조회 가능 →
--    master 전용으로 변경 + staff용 safe view 제공
--
-- 3. profiles UPDATE — permissions 자기 상승 방지
--    WITH CHECK에 permissions 컬럼 보호 누락 →
--    일반 구성원이 자신의 permissions 컬럼을 임의로 변경 가능
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. process_payment_callback 6-param REVOKE/GRANT ─────────────────────

-- [C-4] 쿠폰 파라미터 포함 6-param 버전도 service_role 전용으로 제한
-- (기존 3-param은 20260305010000에서 이미 처리됨)
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT, UUID, UUID, INT)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION process_payment_callback(UUID, TEXT, TEXT, UUID, UUID, INT)
  FROM authenticated;
GRANT EXECUTE ON FUNCTION process_payment_callback(UUID, TEXT, TEXT, UUID, UUID, INT)
  TO service_role;

-- ── 2. dentweb_automation_settings SELECT — master 전용 ─────────────────

-- 기존 정책: 병원 전체 구성원이 행 전체 조회 가능
-- 변경: master만 직접 조회, staff는 safe view 경유
DROP POLICY IF EXISTS "hospital_auto_select" ON public.dentweb_automation_settings;
CREATE POLICY "hospital_master_select" ON public.dentweb_automation_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.hospitals h
      WHERE h.id = dentweb_automation_settings.hospital_id
        AND h.master_admin_id = auth.uid()
    )
  );

-- staff 용 safe view: 민감 정보(agent_token 등 미래 컬럼 포함 방어)를 제외한 상태 정보만 노출
CREATE OR REPLACE VIEW public.dentweb_automation_status AS
  SELECT
    hospital_id,
    enabled,
    interval_minutes,
    manual_run_requested,
    manual_run_requested_at,
    last_run_at,
    last_status,
    last_message,
    updated_at
    -- agent_token 등 민감 컬럼은 의도적으로 제외
  FROM public.dentweb_automation_settings;

-- View는 security_invoker로 동작하므로 RLS가 적용됨
-- 하지만 View SELECT 권한도 명시적으로 관리
REVOKE ALL ON public.dentweb_automation_status FROM PUBLIC;
GRANT SELECT ON public.dentweb_automation_status TO authenticated;

-- ── 3. profiles UPDATE — permissions 자기 상승 방지 ───────────────────────

-- WITH CHECK에 permissions 보호 추가:
-- 자신의 프로필 수정 시 permissions 컬럼을 현재 DB 값에서 변경 불가
-- 마스터가 멤버 수정 시에는 permissions 변경 허용 (정상 관리 기능)

DROP POLICY IF EXISTS "profiles_update" ON profiles;
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
    -- 본인 프로필: role/status/hospital_id/permissions 변경 불가
    (
      id = (SELECT auth.uid())
      AND role = get_my_role()
      AND status = get_my_status()
      AND permissions IS NOT DISTINCT FROM (
        SELECT p.permissions FROM profiles p WHERE p.id = (SELECT auth.uid())
      )
      AND (
        hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
        OR (
          get_my_hospital_id() IS NULL
          AND is_my_own_hospital(hospital_id)
        )
      )
    )
    -- 마스터가 멤버 수정: dental_staff만, active/inactive만 허용, permissions 변경 허용
    OR (
      id != (SELECT auth.uid())
      AND hospital_id IN (
        SELECT h.id FROM hospitals h WHERE h.master_admin_id = (SELECT auth.uid())
      )
      AND role = 'dental_staff'
      AND status IN ('active', 'inactive')
    )
  );
