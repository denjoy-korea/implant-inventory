-- ============================================================
-- trial_fingerprints: 무료체험 1회 제한 — 탈퇴 후 재가입 방지
-- ============================================================
-- 탈퇴 시 profiles.email_hash / phone_hash 가 NULL 처리 + 레코드 삭제되므로
-- trial_used 이력이 사라지는 취약점을 보완.
-- trial_fingerprints 는 profiles / hospitals 와 FK CASCADE 없이 독립 보존됨.

-- ─────────────────────────────────────────────────────────────
-- 1. profiles 에 name_hash 컬럼 추가
-- ─────────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS name_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_name_hash
  ON profiles(name_hash) WHERE name_hash IS NOT NULL;

-- ─────────────────────────────────────────────────────────────
-- 2. trial_fingerprints 테이블
--    - hospital_id: FK 없음 (탈퇴/삭제 후에도 레코드 보존)
--    - 일반 사용자 접근 불가, admin 전용
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trial_fingerprints (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email_hash  TEXT,
  phone_hash  TEXT,
  name_hash   TEXT,
  hospital_id UUID,                           -- no FK, 추적용
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tf_email_hash
  ON trial_fingerprints(email_hash)  WHERE email_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tf_phone_hash
  ON trial_fingerprints(phone_hash)  WHERE phone_hash IS NOT NULL;

-- 이름+전화번호 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_tf_name_phone
  ON trial_fingerprints(name_hash, phone_hash)
  WHERE name_hash IS NOT NULL AND phone_hash IS NOT NULL;

ALTER TABLE trial_fingerprints ENABLE ROW LEVEL SECURITY;

-- admin 만 접근 가능 (시스템 운영자가 예외 처리 시 수동 DELETE 가능)
CREATE POLICY "trial_fingerprints_admin_only"
  ON trial_fingerprints FOR ALL
  USING (get_my_role() = 'admin');

-- ─────────────────────────────────────────────────────────────
-- 3. start_hospital_trial RPC 업데이트
--    신규 파라미터: p_email_hash, p_phone_hash, p_name_hash
--
--    중복 판정 순서:
--      ① trial_fingerprints 조회 (탈퇴 후 재가입 포함)
--      ② 기존 profiles 조회 (핑거프린트 도입 전 계정 하위 호환)
--      ③ 핑거프린트 INSERT 후 체험 시작
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION start_hospital_trial(
  p_hospital_id UUID,
  p_plan        TEXT    DEFAULT 'plus',
  p_email_hash  TEXT    DEFAULT NULL,
  p_phone_hash  TEXT    DEFAULT NULL,
  p_name_hash   TEXT    DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT _can_manage_hospital(p_hospital_id) THEN
    RETURN FALSE;
  END IF;

  -- ① trial_fingerprints 중복 체크 (탈퇴 후 재가입 포함)
  IF p_email_hash IS NOT NULL OR p_phone_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM trial_fingerprints
      WHERE
        (email_hash IS NOT NULL AND email_hash = p_email_hash)
        OR (phone_hash IS NOT NULL AND phone_hash = p_phone_hash)
        OR (
          name_hash  IS NOT NULL AND phone_hash IS NOT NULL
          AND name_hash = p_name_hash AND phone_hash = p_phone_hash
        )
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- ② 기존 profiles 중복 체크 (핑거프린트 시스템 도입 전 계정 하위 호환)
  IF p_email_hash IS NOT NULL OR p_phone_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM profiles p
      JOIN hospitals h ON h.id = p.hospital_id
      WHERE
        h.trial_used = TRUE
        AND h.id != p_hospital_id
        AND (
          (p.email_hash IS NOT NULL AND p.email_hash = p_email_hash)
          OR (p.phone_hash IS NOT NULL AND p.phone_hash = p_phone_hash)
        )
    ) THEN
      RETURN FALSE;
    END IF;
  END IF;

  -- ③ 핑거프린트 기록 (적어도 하나의 해시가 있을 때만)
  IF p_email_hash IS NOT NULL OR p_phone_hash IS NOT NULL OR p_name_hash IS NOT NULL THEN
    INSERT INTO trial_fingerprints(email_hash, phone_hash, name_hash, hospital_id)
    VALUES (p_email_hash, p_phone_hash, p_name_hash, p_hospital_id);
  END IF;

  -- ④ 체험 시작
  UPDATE hospitals SET
    plan             = p_plan,
    trial_started_at = now(),
    trial_used       = FALSE,
    plan_expires_at  = NULL,
    billing_cycle    = NULL
  WHERE id = p_hospital_id
    AND COALESCE(trial_used, FALSE) = FALSE
    AND trial_started_at IS NULL;

  RETURN FOUND;
END;
$$;

-- grant 유지 (기존 마이그레이션에서 부여된 것)
GRANT EXECUTE ON FUNCTION start_hospital_trial(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
