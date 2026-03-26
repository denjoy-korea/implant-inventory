-- P1-5: 데이터 조회 기간 서버 강제 (RLS)
--
-- 문제: canViewDataFrom() 클라이언트 전용 → 모든 과거 데이터 직접 쿼리 가능
-- 수정: surgery_records SELECT RLS에 날짜 필터 추가
--
-- 플랜별 조회 가능 기간 (types/plan.ts viewMonths 와 동일):
--   free     → 3개월
--   basic    → 12개월
--   plus+    → 24개월 (무제한에 가까움)
--
-- admin 역할 (profiles.role = 'admin'): 기간 제한 없음

-- ── 1. 플랜별 조회 가능 개월 수 헬퍼 ────────────────────────────────────────
CREATE OR REPLACE FUNCTION _plan_view_months(p_plan TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_plan
    WHEN 'free'     THEN 3
    WHEN 'basic'    THEN 12
    WHEN 'plus'     THEN 24
    WHEN 'business' THEN 24
    WHEN 'ultimate' THEN 24
    ELSE 3
  END;
$$;

-- ── 2. 현재 사용자의 유효 플랜 조회 헬퍼 (SECURITY DEFINER: hospitals RLS 우회) ──
CREATE OR REPLACE FUNCTION _get_my_effective_plan()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan TEXT;
BEGIN
  SELECT h.plan INTO v_plan
  FROM hospitals h
  JOIN profiles p ON p.hospital_id = h.id
  WHERE p.id = auth.uid();
  RETURN COALESCE(v_plan, 'free');
END;
$$;

REVOKE EXECUTE ON FUNCTION _get_my_effective_plan() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION _get_my_effective_plan() TO authenticated;

-- ── 3. surgery_records SELECT RLS: 날짜 필터 + admin bypass ────────────────
-- 현재 정책 "hospital_surgery_select" 교체
-- (가장 최근 버전: 20260228030000_fix_rls_add_to_authenticated.sql)
DROP POLICY IF EXISTS "hospital_surgery_select" ON surgery_records;

CREATE POLICY "hospital_surgery_select" ON surgery_records
  FOR SELECT
  TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = (SELECT auth.uid())
    )
    AND (
      -- admin 역할: 기간 제한 없음
      EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
      )
      OR
      -- 일반 사용자: 플랜별 조회 기간 제한
      date >= (
        now() - (_plan_view_months(_get_my_effective_plan()) * INTERVAL '1 month')
      )
    )
  );
