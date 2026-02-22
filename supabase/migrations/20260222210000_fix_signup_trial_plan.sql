-- =============================================================================
-- 가입 시 플랜 등록 버그 수정
--
-- 문제 1: users_update_own_profile WITH CHECK가 hospital_id를 null → 값으로
--         변경하는 UPDATE를 차단
--         → profile.hospital_id가 null로 남음 → hospitalId='' → trial 스킵
--
-- 문제 2: start_hospital_trial RPC에 p_plan 파라미터 없음
--         → p_plan을 포함해 호출하면 PGRST202 → 플랜이 항상 'plus'로 하드코딩
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- [FIX 1] users_update_own_profile: 가입 시 hospital_id 최초 설정 허용
--
-- 기존: hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
--       → 현재 null인 경우 null만 허용 (변경 불가)
-- 수정: 현재 null이고 해당 hospital의 master_admin_id = auth.uid()인 경우 허용
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_update_own_profile" ON profiles;

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = get_my_role()
    AND status = get_my_status()
    AND (
      -- 기존 hospital_id 유지 (일반 프로필 업데이트 시)
      hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
      -- 최초 가입 시 hospital_id 설정 허용:
      -- 현재 null이고, 설정하려는 hospital의 master_admin_id가 본인일 때
      OR (
        get_my_hospital_id() IS NULL
        AND hospital_id IN (
          SELECT id FROM hospitals WHERE master_admin_id = auth.uid()
        )
      )
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- [FIX 2] start_hospital_trial: p_plan 파라미터 추가 (DEFAULT 'plus')
--
-- 기존: plan = 'plus' 하드코딩
-- 수정: p_plan 파라미터로 선택된 플랜 반영
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_hospital_trial(
  p_hospital_id UUID,
  p_plan TEXT DEFAULT 'plus'
)
RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  UPDATE hospitals SET
    plan = p_plan,
    trial_started_at = now(),
    trial_used = FALSE,
    plan_expires_at = NULL,
    billing_cycle = NULL
  WHERE id = p_hospital_id
    AND COALESCE(trial_used, FALSE) = FALSE
    AND trial_started_at IS NULL;

  RETURN FOUND;
END;
$$;
