-- ============================================
-- 임플란트 재고관리 시스템 - Supabase 스키마
-- Supabase SQL Editor에서 순서대로 실행하세요
-- ============================================

-- 1. hospitals 테이블
CREATE TABLE hospitals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  master_admin_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  phone TEXT,
  biz_file_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. profiles 테이블 (auth.users 확장)
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

-- 3. inventory 테이블
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

-- 4. surgery_records 테이블
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
  -- healing, next_visit: 017_drop_healing_next_visit.sql 에서 제거됨
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_surgery_hospital ON surgery_records(hospital_id);
CREATE INDEX idx_surgery_date ON surgery_records(hospital_id, date);
CREATE INDEX idx_surgery_classification ON surgery_records(hospital_id, classification);

-- 5. orders 테이블
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

-- 6. order_items 테이블
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  brand TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0)
);

CREATE INDEX idx_order_items_order ON order_items(order_id);
