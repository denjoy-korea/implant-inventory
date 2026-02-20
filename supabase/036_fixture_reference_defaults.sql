-- ============================================
-- 036: 픽스쳐 기본 참조값 테이블
-- ============================================

CREATE TABLE IF NOT EXISTS fixture_reference_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer TEXT NOT NULL,
  brand TEXT NOT NULL,
  size TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  source TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT fixture_reference_defaults_unique UNIQUE (manufacturer, brand, size)
);

CREATE INDEX IF NOT EXISTS idx_fixture_reference_defaults_lookup
  ON fixture_reference_defaults(manufacturer, brand, size);

CREATE INDEX IF NOT EXISTS idx_fixture_reference_defaults_active
  ON fixture_reference_defaults(is_active, manufacturer, brand);

DROP TRIGGER IF EXISTS fixture_reference_defaults_updated_at ON fixture_reference_defaults;
CREATE TRIGGER fixture_reference_defaults_updated_at
  BEFORE UPDATE ON fixture_reference_defaults
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

ALTER TABLE fixture_reference_defaults ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fixture_reference_defaults_select_authenticated" ON fixture_reference_defaults;
CREATE POLICY "fixture_reference_defaults_select_authenticated" ON fixture_reference_defaults
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "fixture_reference_defaults_manage_admin" ON fixture_reference_defaults;
CREATE POLICY "fixture_reference_defaults_manage_admin" ON fixture_reference_defaults
  FOR ALL TO authenticated
  USING (
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

GRANT SELECT ON fixture_reference_defaults TO authenticated;
GRANT INSERT, UPDATE, DELETE ON fixture_reference_defaults TO authenticated;
