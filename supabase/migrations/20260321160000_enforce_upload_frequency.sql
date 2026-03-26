-- P1-4: 수술기록 업로드 빈도 서버 강제
--
-- 문제: canUploadSurgery() 클라이언트 전용 → 직접 INSERT로 무제한 업로드 가능
-- 수정: BEFORE INSERT 트리거로 플랜별 빈도 검증, AFTER INSERT로 last_surgery_upload_at 갱신
--
-- 플랜별 빈도:
--   free    → monthly (월 1회)
--   basic   → weekly  (주 1회)
--   plus+   → unlimited (무제한)

-- ── 1. hospitals 테이블에 last_surgery_upload_at 컬럼 추가 ─────────────────
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS last_surgery_upload_at TIMESTAMPTZ DEFAULT NULL;

-- ── 2. BEFORE INSERT 트리거: 업로드 빈도 초과 시 거부 ─────────────────────
CREATE OR REPLACE FUNCTION _check_upload_frequency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan                  TEXT;
  v_last_upload           TIMESTAMPTZ;
  v_required_interval     INTERVAL;
BEGIN
  SELECT h.plan, h.last_surgery_upload_at
    INTO v_plan, v_last_upload
  FROM hospitals h
  WHERE h.id = NEW.hospital_id;

  -- plus / business / ultimate: 무제한
  IF v_plan IN ('plus', 'business', 'ultimate') THEN
    RETURN NEW;
  END IF;

  -- last_surgery_upload_at 없으면 첫 업로드 → 허용
  IF v_last_upload IS NULL THEN
    RETURN NEW;
  END IF;

  -- free: monthly (30일), basic: weekly (7일)
  v_required_interval := CASE v_plan
    WHEN 'basic' THEN INTERVAL '7 days'
    ELSE INTERVAL '30 days'   -- free 또는 알 수 없는 플랜
  END;

  IF now() - v_last_upload < v_required_interval THEN
    RAISE EXCEPTION 'upload_frequency_limit_exceeded: plan=% last_upload=% required_interval=%',
      v_plan, v_last_upload, v_required_interval;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_upload_frequency ON surgery_records;
CREATE TRIGGER trg_check_upload_frequency
  BEFORE INSERT ON surgery_records
  FOR EACH ROW
  EXECUTE FUNCTION _check_upload_frequency();

-- ── 3. AFTER INSERT 트리거: 업로드 타임스탬프 갱신 ─────────────────────────
-- 주의: 행 단위 트리거이므로 배치 업로드 시 마지막 행이 최종 시각을 결정함
CREATE OR REPLACE FUNCTION _update_last_surgery_upload_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE hospitals
    SET last_surgery_upload_at = now()
  WHERE id = NEW.hospital_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_last_surgery_upload_at ON surgery_records;
CREATE TRIGGER trg_update_last_surgery_upload_at
  AFTER INSERT ON surgery_records
  FOR EACH ROW
  EXECUTE FUNCTION _update_last_surgery_upload_at();
