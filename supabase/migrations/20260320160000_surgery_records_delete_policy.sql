-- surgery_records DELETE RLS 정책 추가
-- 자병원 레코드만 삭제 가능 (hospital_id 기준)

DROP POLICY IF EXISTS "hospital_surgery_delete" ON surgery_records;
CREATE POLICY "hospital_surgery_delete" ON surgery_records
  FOR DELETE TO authenticated
  USING (hospital_id = get_my_hospital_id());

GRANT DELETE ON surgery_records TO authenticated;
