-- 거래처 연락처 테이블 (병원별 제조사 영업사원 정보)
CREATE TABLE IF NOT EXISTS vendor_contacts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id  uuid        NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
  manufacturer text        NOT NULL,
  rep_name     text,
  phone        text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(hospital_id, manufacturer)
);

ALTER TABLE vendor_contacts ENABLE ROW LEVEL SECURITY;

-- 같은 병원 소속 인증 사용자는 모두 조회/수정 가능
CREATE POLICY "hospital_members_vendor_contacts" ON vendor_contacts
  FOR ALL TO authenticated
  USING (
    hospital_id IN (
      SELECT hospital_id FROM profiles
      WHERE id = auth.uid() AND hospital_id IS NOT NULL
    )
  )
  WITH CHECK (
    hospital_id IN (
      SELECT hospital_id FROM profiles
      WHERE id = auth.uid() AND hospital_id IS NOT NULL
    )
  );
