-- surgery_records DELETE 정책: master 전용 제한 + 삭제 감사 로그
--
-- 변경 이유:
--   기존 정책(hospital_surgery_delete)은 같은 병원 authenticated 전체가 삭제 가능.
--   수술기록은 청구/감사 근거 데이터이므로 master 역할만 삭제 허용.

-- 1) DELETE 정책: master 전용
DROP POLICY IF EXISTS "hospital_surgery_delete" ON surgery_records;
CREATE POLICY "hospital_surgery_delete" ON surgery_records
  FOR DELETE TO authenticated
  USING (
    hospital_id = get_my_hospital_id()
    AND get_my_role() = 'master'
  );

-- 2) 삭제 감사 트리거 (SECURITY DEFINER로 audit_logs INSERT)
CREATE OR REPLACE FUNCTION public.log_surgery_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.audit_logs (action, actor_id, target_id, hospital_id, meta)
  VALUES (
    'surgery_delete',
    auth.uid(),
    OLD.id::text,
    OLD.hospital_id,
    jsonb_build_object(
      'patient_info',    OLD.patient_info,
      'date',            OLD.date,
      'manufacturer',    OLD.manufacturer,
      'brand',           OLD.brand,
      'classification',  OLD.classification
    )
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_surgery_delete ON surgery_records;
CREATE TRIGGER trg_log_surgery_delete
  AFTER DELETE ON surgery_records
  FOR EACH ROW EXECUTE FUNCTION public.log_surgery_delete();
