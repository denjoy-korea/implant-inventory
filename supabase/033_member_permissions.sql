-- 033: 구성원 세부 권한 관리
-- profiles 테이블에 permissions JSONB 컬럼 추가

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN profiles.permissions IS '구성원 세부 권한 설정 (JSON). 예: {"canViewInventory":true,"canEditInventory":true,...}';

-- 기존 active/readonly 스태프에 기본 permissions 채우기 (master 제외)
UPDATE profiles
SET permissions = '{
  "canViewInventory": true,
  "canEditInventory": true,
  "canViewSurgery": true,
  "canEditSurgery": true,
  "canManageOrders": true,
  "canViewAnalytics": true,
  "canManageFails": true
}'::jsonb
WHERE role != 'master'
  AND (permissions = '{}'::jsonb OR permissions IS NULL);

-- master는 사용하지 않으므로 빈 객체 유지

-- RLS: master가 같은 hospital의 staff permissions 업데이트 허용
-- 기존 policies 확인 후 필요시 추가
-- (profiles에 이미 master_update 정책이 있을 경우 permissions 컬럼도 자동 포함됨)
