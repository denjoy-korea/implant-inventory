-- 온보딩 진행 상태를 hospitals 테이블에 비트마스크로 저장
-- bit 0 (1):  welcome seen
-- bit 1 (2):  fixture downloaded
-- bit 2 (4):  surgery downloaded
-- bit 3 (8):  inventory audit seen
-- bit 4 (16): fail audit done

ALTER TABLE public.hospitals
  ADD COLUMN IF NOT EXISTS onboarding_flags SMALLINT NOT NULL DEFAULT 0;
