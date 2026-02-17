-- ============================================
-- 007: 보안/플랜 서버 강제 로직
-- ============================================

-- 1) profiles.role 제약에 admin 추가 (기존 DB 보정)
ALTER TABLE profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('master', 'dental_staff', 'staff', 'admin'));

-- 2) 회원가입 트리거 보정 (admin 직접 생성 차단)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role TEXT;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'staff');
  IF v_role NOT IN ('master', 'dental_staff', 'staff') THEN
    v_role := 'staff';
  END IF;

  INSERT INTO profiles (id, email, name, role, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', ''),
    v_role,
    CASE
      WHEN v_role IN ('master', 'staff') THEN 'active'
      ELSE 'pending'
    END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3) hospitals SELECT 노출 축소 + 공개 검색 RPC
DROP POLICY IF EXISTS "anyone_search_hospitals" ON hospitals;
DROP POLICY IF EXISTS "hospital_members_view_hospital" ON hospitals;

CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT USING (
    id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE OR REPLACE FUNCTION search_hospitals_public(search_query TEXT DEFAULT '')
RETURNS TABLE (
  id UUID,
  name TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT h.id, h.name, h.created_at
  FROM hospitals h
  WHERE COALESCE(search_query, '') = ''
     OR h.name ILIKE '%' || search_query || '%'
  ORDER BY h.name
  LIMIT 20;
END;
$$;

REVOKE ALL ON FUNCTION search_hospitals_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION search_hospitals_public(TEXT) TO authenticated;

-- 4) 플랜 제한 계산 함수
CREATE OR REPLACE FUNCTION _plan_max_items(p_plan TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 80
    WHEN 'basic' THEN 200
    WHEN 'plus' THEN 500
    WHEN 'business' THEN 2147483647
    WHEN 'ultimate' THEN 2147483647
    ELSE 80
  END;
$$;

CREATE OR REPLACE FUNCTION _plan_max_users(p_plan TEXT)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT CASE p_plan
    WHEN 'free' THEN 1
    WHEN 'basic' THEN 1
    WHEN 'plus' THEN 5
    WHEN 'business' THEN 2147483647
    WHEN 'ultimate' THEN 2147483647
    ELSE 1
  END;
$$;

CREATE OR REPLACE FUNCTION _can_manage_hospital(p_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT role INTO v_role
  FROM profiles
  WHERE id = auth.uid();

  IF v_role = 'admin' THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM hospitals h
    WHERE h.id = p_hospital_id
      AND h.master_admin_id = auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION _can_manage_hospital(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION _can_manage_hospital(UUID) TO authenticated;

-- 5) 체험 시작 RPC (1회 강제)
CREATE OR REPLACE FUNCTION start_hospital_trial(p_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  UPDATE hospitals
  SET
    plan = 'plus',
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

REVOKE ALL ON FUNCTION start_hospital_trial(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_hospital_trial(UUID) TO authenticated;

-- 6) 플랜 변경 RPC (서버 검증)
CREATE OR REPLACE FUNCTION change_hospital_plan(
  p_hospital_id UUID,
  p_plan TEXT,
  p_billing_cycle TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_expires_at TIMESTAMPTZ;
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  IF p_plan NOT IN ('free', 'basic', 'plus', 'business', 'ultimate') THEN
    RETURN FALSE;
  END IF;

  IF p_plan = 'ultimate'
     AND NOT EXISTS (
       SELECT 1
       FROM profiles p
       WHERE p.id = auth.uid()
         AND p.role = 'admin'
     ) THEN
    RETURN FALSE;
  END IF;

  IF p_plan IN ('free', 'ultimate') THEN
    v_expires_at := NULL;
    p_billing_cycle := NULL;
  ELSE
    IF p_billing_cycle NOT IN ('monthly', 'yearly') THEN
      RETURN FALSE;
    END IF;

    IF p_billing_cycle = 'yearly' THEN
      v_expires_at := now() + interval '365 days';
    ELSE
      v_expires_at := now() + interval '30 days';
    END IF;
  END IF;

  UPDATE hospitals
  SET
    plan = p_plan,
    plan_expires_at = v_expires_at,
    billing_cycle = p_billing_cycle,
    trial_used = TRUE
  WHERE id = p_hospital_id;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION change_hospital_plan(UUID, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION change_hospital_plan(UUID, TEXT, TEXT) TO authenticated;

-- 7) 체험 만료 동기화 RPC (조회 시 서버에서 정리)
CREATE OR REPLACE FUNCTION expire_trial_if_needed(p_hospital_id UUID)
RETURNS TABLE (
  plan TEXT,
  plan_expires_at TIMESTAMPTZ,
  billing_cycle TEXT,
  trial_started_at TIMESTAMPTZ,
  trial_used BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM hospitals h
    WHERE h.id = p_hospital_id
      AND (
        h.id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
        OR _can_manage_hospital(p_hospital_id)
      )
  ) THEN
    RETURN;
  END IF;

  UPDATE hospitals
  SET
    plan = 'free',
    plan_expires_at = NULL,
    billing_cycle = NULL,
    trial_used = TRUE
  WHERE id = p_hospital_id
    AND trial_started_at IS NOT NULL
    AND COALESCE(trial_used, FALSE) = FALSE
    AND now() >= (trial_started_at + interval '14 days');

  RETURN QUERY
  SELECT h.plan, h.plan_expires_at, h.billing_cycle, h.trial_started_at, h.trial_used
  FROM hospitals h
  WHERE h.id = p_hospital_id
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION expire_trial_if_needed(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION expire_trial_if_needed(UUID) TO authenticated;

-- 8) 플랜별 품목 제한 강제
CREATE OR REPLACE FUNCTION enforce_inventory_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan TEXT;
  v_max_items INTEGER;
  v_count INTEGER;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.hospital_id = NEW.hospital_id THEN
    RETURN NEW;
  END IF;

  SELECT plan INTO v_plan
  FROM hospitals
  WHERE id = NEW.hospital_id;

  v_max_items := _plan_max_items(COALESCE(v_plan, 'free'));

  IF v_max_items < 2147483647 THEN
    SELECT COUNT(*) INTO v_count
    FROM inventory i
    WHERE i.hospital_id = NEW.hospital_id;

    IF v_count >= v_max_items THEN
      RAISE EXCEPTION 'PLAN_LIMIT_ITEMS_EXCEEDED'
        USING ERRCODE = 'P0001',
              DETAIL = format('max_items=%s', v_max_items);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS inventory_plan_limit_trigger ON inventory;
CREATE TRIGGER inventory_plan_limit_trigger
  BEFORE INSERT OR UPDATE OF hospital_id
  ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION enforce_inventory_plan_limit();

-- 9) 플랜별 활성 사용자 제한 강제
CREATE OR REPLACE FUNCTION enforce_active_member_plan_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_plan TEXT;
  v_max_users INTEGER;
  v_count INTEGER;
BEGIN
  IF NEW.role = 'admin' THEN
    RETURN NEW;
  END IF;

  IF NEW.hospital_id IS NULL OR NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.hospital_id IS NOT DISTINCT FROM NEW.hospital_id
     AND OLD.status = 'active'
     AND NEW.status = 'active' THEN
    RETURN NEW;
  END IF;

  SELECT plan INTO v_plan
  FROM hospitals
  WHERE id = NEW.hospital_id;

  v_max_users := _plan_max_users(COALESCE(v_plan, 'free'));

  IF v_max_users < 2147483647 THEN
    SELECT COUNT(*) INTO v_count
    FROM profiles p
    WHERE p.hospital_id = NEW.hospital_id
      AND p.status = 'active'
      AND p.role <> 'admin'
      AND p.id <> NEW.id;

    IF v_count >= v_max_users THEN
      RAISE EXCEPTION 'PLAN_LIMIT_USERS_EXCEEDED'
        USING ERRCODE = 'P0001',
              DETAIL = format('max_users=%s', v_max_users);
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_plan_user_limit_trigger ON profiles;
CREATE TRIGGER profiles_plan_user_limit_trigger
  BEFORE INSERT OR UPDATE OF hospital_id, status
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION enforce_active_member_plan_limit();
