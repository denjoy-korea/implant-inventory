-- 045: 문의 내역 테이블 생성
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  role text,
  phone text NOT NULL,
  weekly_surgeries text NOT NULL,
  inquiry_type text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
  admin_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE contact_inquiries IS '문의하기 폼 제출 내역';
COMMENT ON COLUMN contact_inquiries.status IS 'pending=접수, in_progress=처리중, resolved=완료';

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_contact_inquiries_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_contact_inquiries_updated_at
  BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_contact_inquiries_updated_at();

-- RLS
ALTER TABLE contact_inquiries ENABLE ROW LEVEL SECURITY;

-- 누구나 문의 등록 가능 (비로그인 포함)
CREATE POLICY "anyone can submit inquiry"
  ON contact_inquiries FOR INSERT
  WITH CHECK (true);

-- 관리자만 조회/수정 가능
CREATE POLICY "admin can view inquiries"
  ON contact_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );

CREATE POLICY "admin can update inquiry status"
  ON contact_inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
  );
