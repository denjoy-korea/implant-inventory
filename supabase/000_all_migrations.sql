-- ============================================
-- 임플란트 재고관리 시스템 - 전체 마이그레이션
-- Supabase SQL Editor에서 한 번에 실행하세요
-- ============================================

-- ============================================
-- 001: 테이블 생성
-- ============================================

CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  master_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT,
  biz_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('master', 'dental_staff', 'staff', 'admin')),
  hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  manufacturer TEXT NOT NULL,
  brand TEXT NOT NULL,
  size TEXT NOT NULL,
  initial_stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_hospital ON inventory(hospital_id);
CREATE INDEX idx_inventory_manufacturer ON inventory(hospital_id, manufacturer);

CREATE TABLE surgery_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  date DATE,
  patient_info TEXT,
  tooth_number TEXT,
  quantity INTEGER DEFAULT 1,
  surgery_record TEXT,
  classification TEXT DEFAULT '식립' CHECK (
    classification IN ('식립', '골이식만', '수술중 FAIL', '청구', 'FAIL 교환완료')
  ),
  manufacturer TEXT,
  brand TEXT,
  size TEXT,
  bone_quality TEXT,
  initial_fixation TEXT,
  healing TEXT,
  next_visit TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_surgery_hospital ON surgery_records(hospital_id);
CREATE INDEX idx_surgery_date ON surgery_records(hospital_id, date);
CREATE INDEX idx_surgery_classification ON surgery_records(hospital_id, classification);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('replenishment', 'fail_exchange')),
  manufacturer TEXT NOT NULL,
  date DATE NOT NULL,
  manager TEXT NOT NULL,
  status TEXT DEFAULT 'ordered' CHECK (status IN ('ordered', 'received')),
  received_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_hospital ON orders(hospital_id);
CREATE INDEX idx_orders_status ON orders(hospital_id, status);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);

-- ============================================
-- 002: 트리거
-- ============================================

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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hospitals_updated_at
  BEFORE UPDATE ON hospitals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 003: RLS 정책
-- ============================================

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_members_view_hospital" ON hospitals
  FOR SELECT USING (
    id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "master_update_own_hospital" ON hospitals
  FOR UPDATE USING (master_admin_id = auth.uid());

CREATE POLICY "authenticated_insert_hospital" ON hospitals
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

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

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_hospital_id()
RETURNS UUID AS $$
  SELECT hospital_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION get_my_status()
RETURNS TEXT AS $$
  SELECT status FROM profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER SET search_path = public;

REVOKE ALL ON FUNCTION get_my_hospital_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION get_my_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_hospital_id() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_status() TO authenticated;

CREATE POLICY "users_view_own_profile" ON profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "hospital_members_viewable" ON profiles
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "users_update_own_profile" ON profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid()
    AND role = get_my_role()
    AND status = get_my_status()
    AND hospital_id IS NOT DISTINCT FROM get_my_hospital_id()
  );

CREATE POLICY "master_manage_members" ON profiles
  FOR UPDATE USING (
    hospital_id IN (
      SELECT h.id FROM hospitals h WHERE h.master_admin_id = auth.uid()
    )
  );

ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_inventory_select" ON inventory
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_inventory_insert" ON inventory
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_inventory_update" ON inventory
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_inventory_delete" ON inventory
  FOR DELETE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

ALTER TABLE surgery_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_surgery_select" ON surgery_records
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_surgery_insert" ON surgery_records
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_surgery_update" ON surgery_records
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_orders_select" ON orders
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_orders_insert" ON orders
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_orders_update" ON orders
  FOR UPDATE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_orders_delete" ON orders
  FOR DELETE USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "order_items_select" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "order_items_insert" ON order_items
  FOR INSERT WITH CHECK (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "order_items_delete" ON order_items
  FOR DELETE USING (
    order_id IN (
      SELECT id FROM orders WHERE hospital_id IN (
        SELECT hospital_id FROM profiles WHERE id = auth.uid()
      )
    )
  );

-- ============================================
-- 004: Storage 버킷
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('biz-documents', 'biz-documents', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('excel-backups', 'excel-backups', false);

CREATE POLICY "users_upload_own_biz_doc" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'biz-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "users_view_own_biz_doc" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'biz-documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================
-- 005: 플랜 필드 추가
-- ============================================

ALTER TABLE hospitals
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'basic', 'plus', 'business', 'ultimate'));

ALTER TABLE hospitals
  ADD COLUMN plan_expires_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE hospitals
  ADD COLUMN billing_cycle TEXT DEFAULT NULL
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

ALTER TABLE hospitals
  ADD COLUMN trial_started_at TIMESTAMPTZ DEFAULT NULL;

ALTER TABLE hospitals
  ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX idx_hospitals_plan ON hospitals(plan);

-- ============================================
-- 006: profiles.phone 컬럼 추가
-- ============================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS phone TEXT;

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

-- ============================================
-- 019: 감사 로그 (Operation Logs)
-- ============================================

CREATE TABLE IF NOT EXISTS operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  action TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_operation_logs_hospital ON operation_logs(hospital_id);
CREATE INDEX idx_operation_logs_hospital_action ON operation_logs(hospital_id, action);
CREATE INDEX idx_operation_logs_hospital_created ON operation_logs(hospital_id, created_at DESC);

ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "operation_logs_select" ON operation_logs
  FOR SELECT USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "operation_logs_insert" ON operation_logs
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- ============================================
-- 020: 데이터 초기화 요청 + paused 상태 지원
-- ============================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'readonly', 'paused'));

CREATE TABLE IF NOT EXISTS data_reset_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'scheduled', 'completed', 'cancelled', 'rejected')),
  approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_data_reset_requests_hospital ON data_reset_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_data_reset_requests_status ON data_reset_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_reset_requests_created_at ON data_reset_requests(created_at DESC);

ALTER TABLE data_reset_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reset_requests_select" ON data_reset_requests;
CREATE POLICY "reset_requests_select" ON data_reset_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
    OR EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.hospital_id = data_reset_requests.hospital_id
    )
  );

DROP POLICY IF EXISTS "reset_requests_insert" ON data_reset_requests;
CREATE POLICY "reset_requests_insert" ON data_reset_requests
  FOR INSERT WITH CHECK (
    requested_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM profiles p
        WHERE p.id = auth.uid()
          AND p.role = 'admin'
      )
      OR EXISTS (
        SELECT 1
        FROM hospitals h
        WHERE h.id = hospital_id
          AND h.master_admin_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "reset_requests_update_admin" ON data_reset_requests;
CREATE POLICY "reset_requests_update_admin" ON data_reset_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "reset_requests_update_hospital_member" ON data_reset_requests;
CREATE POLICY "reset_requests_update_hospital_member" ON data_reset_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.hospital_id = data_reset_requests.hospital_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = auth.uid()
        AND p.hospital_id = data_reset_requests.hospital_id
    )
  );

DROP FUNCTION IF EXISTS admin_reset_hospital_data(UUID);

CREATE OR REPLACE FUNCTION admin_reset_hospital_data(p_hospital_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_is_admin BOOLEAN := FALSE;
  v_is_member BOOLEAN := FALSE;
  v_due_scheduled_request BOOLEAN := FALSE;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = v_user_id
      AND p.role = 'admin'
  )
  INTO v_is_admin;

  IF NOT v_is_admin THEN
    SELECT EXISTS (
      SELECT 1
      FROM profiles p
      WHERE p.id = v_user_id
        AND p.hospital_id = p_hospital_id
    )
    INTO v_is_member;

    SELECT EXISTS (
      SELECT 1
      FROM data_reset_requests r
      WHERE r.hospital_id = p_hospital_id
        AND r.status = 'scheduled'
        AND r.scheduled_at IS NOT NULL
        AND r.scheduled_at <= now()
    )
    INTO v_due_scheduled_request;

    IF NOT (v_is_member AND v_due_scheduled_request) THEN
      RETURN FALSE;
    END IF;
  END IF;

  IF to_regclass('public.order_items') IS NOT NULL THEN
    EXECUTE
      'DELETE FROM public.order_items
       WHERE order_id IN (SELECT id FROM public.orders WHERE hospital_id = $1)'
    USING p_hospital_id;
  END IF;

  DELETE FROM orders WHERE hospital_id = p_hospital_id;
  DELETE FROM surgery_records WHERE hospital_id = p_hospital_id;
  DELETE FROM inventory WHERE hospital_id = p_hospital_id;

  IF to_regclass('public.inventory_audits') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.inventory_audits WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  IF to_regclass('public.operation_logs') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.operation_logs WHERE hospital_id = $1' USING p_hospital_id;
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION admin_reset_hospital_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_reset_hospital_data(UUID) TO authenticated;
