-- ============================================
-- 005: 플랜 필드 추가 (hospitals 테이블)
-- ============================================

-- 플랜 타입 (free/basic/plus/business + hidden: ultimate)
ALTER TABLE hospitals
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'basic', 'plus', 'business', 'ultimate'));

-- 플랜 만료일 (null = 무기한, free는 항상 null)
ALTER TABLE hospitals
  ADD COLUMN plan_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 결제 주기 (monthly/yearly)
ALTER TABLE hospitals
  ADD COLUMN billing_cycle TEXT DEFAULT NULL
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

-- 체험 시작일 (null = 체험 안 함)
ALTER TABLE hospitals
  ADD COLUMN trial_started_at TIMESTAMPTZ DEFAULT NULL;

-- 체험 종료 여부 (true = 체험 완료, 재체험 불가)
ALTER TABLE hospitals
  ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT false;

-- 인덱스: 플랜별 병원 조회 (관리용)
CREATE INDEX idx_hospitals_plan ON hospitals(plan);
