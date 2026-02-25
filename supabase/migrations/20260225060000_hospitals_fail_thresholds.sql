-- FAIL 교환 발주 제조사별 기준량 설정
-- fail_thresholds: { "OSSTEM": 15, "IBS Implant": 10, "디오": 8 }
ALTER TABLE hospitals
  ADD COLUMN IF NOT EXISTS fail_thresholds JSONB NOT NULL DEFAULT '{}'::jsonb;
