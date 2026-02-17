-- 015_readonly_status.sql
-- 플랜 다운그레이드 시 초과 멤버를 readonly 상태로 전환하기 위한 마이그레이션

-- 1. profiles 테이블의 status CHECK 제약조건 업데이트
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'readonly', 'paused'));

-- 2. 다운그레이드 시 초과 멤버를 readonly로 전환하는 함수
CREATE OR REPLACE FUNCTION handle_downgrade_members(
  p_hospital_id UUID,
  p_max_users INT
)
RETURNS INT AS $$
DECLARE
  v_excess_count INT := 0;
BEGIN
  -- master를 제외한 active 멤버를 최근 가입순으로 초과분만큼 readonly 전환
  WITH active_non_master AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as rn
    FROM profiles
    WHERE hospital_id = p_hospital_id
      AND status = 'active'
      AND role != 'master'
  ),
  total_active AS (
    SELECT COUNT(*) as cnt
    FROM profiles
    WHERE hospital_id = p_hospital_id
      AND status = 'active'
  )
  UPDATE profiles
  SET status = 'readonly', updated_at = NOW()
  WHERE id IN (
    SELECT anm.id
    FROM active_non_master anm, total_active ta
    WHERE anm.rn > (p_max_users - 1)  -- master 1명은 항상 유지
      AND ta.cnt > p_max_users
  );

  GET DIAGNOSTICS v_excess_count = ROW_COUNT;
  RETURN v_excess_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 업그레이드 시 readonly 멤버를 active로 복구하는 함수
CREATE OR REPLACE FUNCTION reactivate_readonly_members(
  p_hospital_id UUID
)
RETURNS INT AS $$
DECLARE
  v_reactivated INT := 0;
BEGIN
  UPDATE profiles
  SET status = 'active', updated_at = NOW()
  WHERE hospital_id = p_hospital_id
    AND status = 'readonly';

  GET DIAGNOSTICS v_reactivated = ROW_COUNT;
  RETURN v_reactivated;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
