-- ============================================================
-- fix_delete_my_account_orphan_hospital
-- 이메일 인증 경로 등에서 profile.hospital_id가 null인 채로
-- hospitals.master_admin_id만 연결된 고아 병원을 탈퇴 시 삭제
-- ============================================================

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
  -- profile.hospital_id가 null이면 h는 NULL → v_is_master = NULL (이전 버그)
  -- 수정: hospital_id가 없을 때도 master_admin_id로 직접 찾아 is_master 판단
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

  -- Fallback: profile.hospital_id가 null인 고아 병원 삭제
  -- (이메일 인증 경로에서 병원 생성 후 hospital_id 업데이트 실패한 경우 등)
  DELETE FROM hospitals WHERE master_admin_id = v_user_id;

  -- auth.users 삭제 (CASCADE → profiles)
  DELETE FROM auth.users WHERE id = v_user_id;
END;
$$;
