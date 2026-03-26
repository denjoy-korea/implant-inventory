-- P0-2: 기능 게이트 서버측 강제 (RLS)
--
-- 문제: planService.canAccess() 클라이언트 전용
--       Free/Basic 사용자가 Supabase 직접 쿼리로 Plus 전용 데이터 접근 가능
--
-- 대상:
--   detected_fails           → Plus+ 전용
--   return_requests          → Plus+ 전용
--   return_request_items     → Plus+ 전용 (return_requests 조인)
--
-- 설계 원칙:
--   SELECT만 제한 (다운그레이드 후 데이터 보존, 트라이얼 중 데이터 생성 허용)
--   INSERT/UPDATE/DELETE는 기존 hospital_id 격리만 유지

-- ── 1. 플랜 체크 헬퍼 함수 ──────────────────────────────────────────────────
-- hospitals.plan은 트라이얼 중에도 해당 트라이얼 플랜(plus 등)을 반영하므로
-- plan 컬럼만 확인하면 충분 (batch_update_initial_stock 패턴 동일)
CREATE OR REPLACE FUNCTION _hospital_plan_allows(
  p_hospital_id UUID,
  p_min_plan    TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan       TEXT;
  v_plan_level INT;
  v_min_level  INT;
BEGIN
  SELECT plan INTO v_plan
  FROM hospitals
  WHERE id = p_hospital_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  v_plan_level := CASE COALESCE(v_plan, 'free')
    WHEN 'free'     THEN 0
    WHEN 'basic'    THEN 1
    WHEN 'plus'     THEN 2
    WHEN 'business' THEN 3
    WHEN 'ultimate' THEN 4
    ELSE 0
  END;

  v_min_level := CASE p_min_plan
    WHEN 'free'     THEN 0
    WHEN 'basic'    THEN 1
    WHEN 'plus'     THEN 2
    WHEN 'business' THEN 3
    WHEN 'ultimate' THEN 4
    ELSE 0
  END;

  RETURN v_plan_level >= v_min_level;
END;
$$;

-- 일반 사용자 직접 호출 차단 (RLS 내부에서만 사용)
REVOKE EXECUTE ON FUNCTION _hospital_plan_allows(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION _hospital_plan_allows(UUID, TEXT) TO authenticated;

-- ── 2. detected_fails: ALL → SELECT(플랜 체크) + 나머지(hospital_id만) ─────
-- 현재 정책: "detected_fails_hospital_member_access" (ALL, hospital_id = get_my_hospital_id())
DROP POLICY IF EXISTS "detected_fails_hospital_member_access" ON detected_fails;
DROP POLICY IF EXISTS "detected_fails_select_plan_gate" ON detected_fails;
DROP POLICY IF EXISTS "detected_fails_write_hospital_isolation" ON detected_fails;

-- SELECT: Plus+ 플랜 필요
CREATE POLICY "detected_fails_select_plan_gate"
  ON detected_fails
  FOR SELECT
  TO authenticated
  USING (
    hospital_id = get_my_hospital_id()
    AND _hospital_plan_allows(hospital_id, 'plus')
  );

-- INSERT/UPDATE/DELETE: hospital_id 격리만 유지 (데이터 생성·보존)
CREATE POLICY "detected_fails_write_hospital_isolation"
  ON detected_fails
  FOR ALL
  TO authenticated
  USING (hospital_id = get_my_hospital_id())
  WITH CHECK (hospital_id = get_my_hospital_id());

-- ── 3. return_requests: ALL → SELECT(플랜 체크) + 나머지(hospital_id만) ─────
-- 현재 정책: "return_requests_hospital_isolation" (ALL, hospital_id via profiles)
DROP POLICY IF EXISTS "return_requests_hospital_isolation" ON return_requests;
DROP POLICY IF EXISTS "return_requests_select_plan_gate" ON return_requests;
DROP POLICY IF EXISTS "return_requests_write_hospital_isolation" ON return_requests;

-- SELECT: Plus+ 플랜 필요
CREATE POLICY "return_requests_select_plan_gate"
  ON return_requests
  FOR SELECT
  TO authenticated
  USING (
    hospital_id = get_my_hospital_id()
    AND _hospital_plan_allows(hospital_id, 'plus')
  );

-- INSERT/UPDATE/DELETE: hospital_id 격리만 유지
CREATE POLICY "return_requests_write_hospital_isolation"
  ON return_requests
  FOR ALL
  TO authenticated
  USING (hospital_id = get_my_hospital_id())
  WITH CHECK (hospital_id = get_my_hospital_id());

-- ── 4. return_request_items: ALL → SELECT(플랜 체크) + 나머지 ───────────────
-- 현재 정책: "return_request_items_hospital_isolation"
-- (ALL, return_request_id IN (...) 서브쿼리)
DROP POLICY IF EXISTS "return_request_items_hospital_isolation" ON return_request_items;
DROP POLICY IF EXISTS "return_request_items_select_plan_gate" ON return_request_items;
DROP POLICY IF EXISTS "return_request_items_write_isolation" ON return_request_items;

-- SELECT: Plus+ 플랜 필요 (부모 return_requests를 통해 hospital_id 확인)
CREATE POLICY "return_request_items_select_plan_gate"
  ON return_request_items
  FOR SELECT
  TO authenticated
  USING (
    return_request_id IN (
      SELECT id FROM return_requests
      WHERE hospital_id = get_my_hospital_id()
        AND _hospital_plan_allows(hospital_id, 'plus')
    )
  );

-- INSERT/UPDATE/DELETE: hospital_id 격리만 유지
CREATE POLICY "return_request_items_write_isolation"
  ON return_request_items
  FOR ALL
  TO authenticated
  USING (
    return_request_id IN (
      SELECT id FROM return_requests WHERE hospital_id = get_my_hospital_id()
    )
  )
  WITH CHECK (
    return_request_id IN (
      SELECT id FROM return_requests WHERE hospital_id = get_my_hospital_id()
    )
  );
