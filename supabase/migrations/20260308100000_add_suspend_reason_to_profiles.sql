-- 플랜 다운그레이드로 접근 제한된 멤버를 구분하기 위한 suspend_reason 컬럼 추가
-- 기존 paused 상태(데이터 초기화)와 플랜 다운그레이드 접근제한을 구분함
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS suspend_reason text;

COMMENT ON COLUMN profiles.suspend_reason IS 'paused 상태의 사유: plan_downgrade(플랜 다운그레이드) | NULL(데이터 초기화 등 기존 사유)';
