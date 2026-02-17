-- ============================================
-- 재고 실사 (Inventory Audit) 스키마
-- ============================================

-- 1. inventory 테이블에 실사 조정값 컬럼 추가
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS stock_adjustment INTEGER DEFAULT 0;

-- 2. inventory_audits 테이블 생성
CREATE TABLE IF NOT EXISTS inventory_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  inventory_id UUID NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  audit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  system_stock INTEGER NOT NULL,
  actual_stock INTEGER NOT NULL,
  difference INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_inventory_audits_hospital ON inventory_audits(hospital_id);
CREATE INDEX idx_inventory_audits_inventory ON inventory_audits(inventory_id);
CREATE INDEX idx_inventory_audits_date ON inventory_audits(audit_date);

-- 3. RLS 정책
ALTER TABLE inventory_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hospital_audit_select" ON inventory_audits
  FOR SELECT USING (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "hospital_audit_insert" ON inventory_audits
  FOR INSERT WITH CHECK (
    hospital_id IN (SELECT hospital_id FROM profiles WHERE id = auth.uid())
  );
