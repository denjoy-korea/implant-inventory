-- ======================================================
-- UI 스누즈 설정 테이블
-- 기존 localStorage 기반 스누즈 → Supabase DB로 이동
-- 기기 간 공유 가능, 병원 단위로 격리
-- ======================================================

CREATE TABLE IF NOT EXISTS ui_snooze_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  key         TEXT NOT NULL,           -- e.g. 'optimize_snooze'
  data        JSONB NOT NULL DEFAULT '{}',  -- { [itemId]: ISO-expiry-string }
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (hospital_id, key)
);

ALTER TABLE ui_snooze_settings ENABLE ROW LEVEL SECURITY;

-- 병원 구성원은 자신의 병원 스누즈 설정만 읽기/쓰기 가능
CREATE POLICY "hospital members manage snooze settings"
  ON ui_snooze_settings
  FOR ALL
  TO authenticated
  USING (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  )
  WITH CHECK (
    hospital_id = (SELECT hospital_id FROM profiles WHERE id = auth.uid() LIMIT 1)
  );
