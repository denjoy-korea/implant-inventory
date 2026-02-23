-- ============================================================
-- withdrawal_pii_anonymization
-- 개인정보보호법 §21 준수: 탈퇴 시 PII 즉시 파기 + 감사 로그 보존
-- ============================================================

-- 1. operation_logs FK: CASCADE → SET NULL (감사 로그 보존)
ALTER TABLE operation_logs DROP CONSTRAINT IF EXISTS operation_logs_hospital_id_fkey;
ALTER TABLE operation_logs DROP CONSTRAINT IF EXISTS operation_logs_user_id_fkey;

ALTER TABLE operation_logs ALTER COLUMN hospital_id DROP NOT NULL;
ALTER TABLE operation_logs ALTER COLUMN user_id DROP NOT NULL;

ALTER TABLE operation_logs
  ADD CONSTRAINT operation_logs_hospital_id_fkey
  FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE SET NULL;

ALTER TABLE operation_logs
  ADD CONSTRAINT operation_logs_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. surgery_records: PII 익명화 추적 컬럼
ALTER TABLE surgery_records ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- 3. delete_my_account() 재작성
CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID;
  v_hospital_id UUID;
  v_email      TEXT;
  v_name       TEXT;
  v_is_master  BOOLEAN;
BEGIN
  -- 현재 인증 사용자 확인
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION '인증이 필요합니다.';
  END IF;

  -- 사용자 정보 조회
  SELECT
    p.hospital_id,
    u.email,
    p.name,
    (h.master_admin_id = v_user_id) AS is_master
  INTO v_hospital_id, v_email, v_name, v_is_master
  FROM profiles p
  JOIN auth.users u ON u.id = v_user_id
  LEFT JOIN hospitals h ON h.id = p.hospital_id
  WHERE p.id = v_user_id;

  -- 감사 로그 기록 (SET NULL FK이므로 삭제 후에도 레코드 보존됨)
  INSERT INTO operation_logs (
    hospital_id,
    user_id,
    user_email,
    user_name,
    action,
    description,
    metadata
  ) VALUES (
    v_hospital_id,
    v_user_id,
    COALESCE(v_email, ''),
    COALESCE(v_name, ''),
    'account_self_deleted',
    '사용자 자발적 탈퇴',
    jsonb_build_object(
      'was_master', v_is_master,
      'deleted_at', now()
    )
  );

  -- Master: surgery_records PII 익명화
  IF v_is_master AND v_hospital_id IS NOT NULL THEN
    UPDATE surgery_records
    SET
      patient_info      = NULL,
      patient_info_hash = NULL,
      anonymized_at     = now()
    WHERE hospital_id = v_hospital_id
      AND anonymized_at IS NULL;
  END IF;

  -- profiles PII 익명화 (본인)
  UPDATE profiles
  SET
    name       = '[탈퇴]',
    phone      = NULL,
    email_hash = NULL,
    phone_hash = NULL
  WHERE id = v_user_id;

  -- Master: 병원 삭제 (CASCADE → inventory, orders, surgery_records)
  IF v_is_master AND v_hospital_id IS NOT NULL THEN
    DELETE FROM hospitals WHERE id = v_hospital_id;
  END IF;

  -- auth.users 삭제 (CASCADE → profiles)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
