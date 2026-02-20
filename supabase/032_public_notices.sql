-- ============================================
-- 032: 업데이트 소식(public_notices) DB 전환
-- ============================================

CREATE TABLE IF NOT EXISTS public_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '업데이트'
    CHECK (category IN ('공지', '업데이트', '오류수정', '이벤트')),
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  author TEXT NOT NULL DEFAULT '관리자',
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_notices_created_at ON public_notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_notices_category ON public_notices(category);
CREATE INDEX IF NOT EXISTS idx_public_notices_important ON public_notices(is_important);

DROP TRIGGER IF EXISTS public_notices_updated_at ON public_notices;
CREATE TRIGGER public_notices_updated_at
  BEFORE UPDATE ON public_notices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE public_notices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_notices_select_all" ON public_notices;
CREATE POLICY "public_notices_select_all" ON public_notices
  FOR SELECT TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "public_notices_insert_admin" ON public_notices;
CREATE POLICY "public_notices_insert_admin" ON public_notices
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "public_notices_update_admin" ON public_notices;
CREATE POLICY "public_notices_update_admin" ON public_notices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "public_notices_delete_admin" ON public_notices;
CREATE POLICY "public_notices_delete_admin" ON public_notices
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

GRANT SELECT ON public_notices TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public_notices TO authenticated;
