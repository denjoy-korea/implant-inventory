-- 치과 내 직책(원장/실장/팀장/스탭)을 저장하는 clinic_role 컬럼 추가
-- UserRole(master/dental_staff/staff/admin)은 시스템 권한용으로 그대로 유지

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS clinic_role text
    CHECK (clinic_role IN ('director', 'manager', 'team_lead', 'staff'));

ALTER TABLE member_invitations
  ADD COLUMN IF NOT EXISTS clinic_role text
    CHECK (clinic_role IN ('director', 'manager', 'team_lead', 'staff'));
