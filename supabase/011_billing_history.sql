-- ============================================
-- 011: 결제 이력 테이블 + Make 연동 필드
-- ============================================

-- 1) billing_history 테이블
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  plan TEXT NOT NULL,
  billing_cycle TEXT CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly')),
  amount INTEGER NOT NULL DEFAULT 0,
  payment_method TEXT DEFAULT 'payment_teacher',
  payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'completed', 'failed', 'cancelled')),
  payment_ref TEXT,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_billing_history_hospital ON billing_history(hospital_id);
CREATE INDEX IF NOT EXISTS idx_billing_history_status ON billing_history(payment_status);
CREATE INDEX IF NOT EXISTS idx_billing_history_created ON billing_history(created_at DESC);

-- updated_at 트리거
CREATE TRIGGER billing_history_updated_at
  BEFORE UPDATE ON billing_history
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 2) hospitals에 Make 웹훅 ID 컬럼 추가
ALTER TABLE hospitals ADD COLUMN IF NOT EXISTS make_webhook_id TEXT DEFAULT NULL;

-- 3) RLS 활성화
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;

-- 병원 멤버: 자기 병원 결제 이력 조회
CREATE POLICY "billing_history_hospital_select" ON billing_history
  FOR SELECT USING (hospital_id = get_my_hospital_id());

-- 운영자: 전체 결제 이력 조회
CREATE POLICY "billing_history_admin_select" ON billing_history
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 결제 이력 생성: 병원 관리자 또는 운영자
CREATE POLICY "billing_history_insert" ON billing_history
  FOR INSERT WITH CHECK (
    hospital_id = get_my_hospital_id()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 결제 이력 수정: 운영자만
CREATE POLICY "billing_history_admin_update" ON billing_history
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 4) 결제 이력 조회 RPC (RLS 우회)
CREATE OR REPLACE FUNCTION get_billing_history(p_hospital_id UUID)
RETURNS SETOF billing_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  -- 운영자이거나 해당 병원 멤버만 조회 가능
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR hospital_id = p_hospital_id)
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT * FROM billing_history
  WHERE hospital_id = p_hospital_id
  ORDER BY created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION get_billing_history(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_billing_history(UUID) TO authenticated;
