-- =============================================
-- 회원 탈퇴: auth.users에서 실제 삭제
-- Supabase SQL Editor에서 실행하세요
-- =============================================

CREATE OR REPLACE FUNCTION delete_my_account()
RETURNS void AS $$
DECLARE
  _user_id UUID := auth.uid();
  _hospital_id UUID;
BEGIN
  -- 1. 사용자 hospital_id 조회
  SELECT hospital_id INTO _hospital_id
  FROM profiles WHERE id = _user_id;

  -- 2. 소유한 병원/워크스페이스 삭제 (master_admin인 경우만)
  --    CASCADE로 inventory, surgery_records, orders, order_items 자동 삭제
  IF _hospital_id IS NOT NULL THEN
    DELETE FROM hospitals
    WHERE id = _hospital_id AND master_admin_id = _user_id;
  END IF;

  -- 3. auth.users 삭제 → profiles ON DELETE CASCADE로 자동 삭제
  DELETE FROM auth.users WHERE id = _user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
