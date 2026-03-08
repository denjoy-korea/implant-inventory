-- ============================================================
-- 회원 탈퇴 시 409 FK 위반 수정
-- coupon_redemptions, beta_invite_codes의 FK CASCADE 누락 수정
-- ============================================================

-- coupon_redemptions: 3개 FK 모두 CASCADE/SET NULL 추가
ALTER TABLE public.coupon_redemptions
  DROP CONSTRAINT IF EXISTS coupon_redemptions_coupon_id_fkey,
  DROP CONSTRAINT IF EXISTS coupon_redemptions_user_id_fkey,
  DROP CONSTRAINT IF EXISTS coupon_redemptions_hospital_id_fkey;

ALTER TABLE public.coupon_redemptions
  ADD CONSTRAINT coupon_redemptions_coupon_id_fkey
    FOREIGN KEY (coupon_id) REFERENCES public.user_coupons(id) ON DELETE CASCADE,
  ADD CONSTRAINT coupon_redemptions_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT coupon_redemptions_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;

-- beta_invite_codes.referred_hospital_id: SET NULL (초대 코드 자체는 보존)
ALTER TABLE public.beta_invite_codes
  DROP CONSTRAINT IF EXISTS beta_invite_codes_referred_hospital_id_fkey;

ALTER TABLE public.beta_invite_codes
  ADD CONSTRAINT beta_invite_codes_referred_hospital_id_fkey
    FOREIGN KEY (referred_hospital_id) REFERENCES public.hospitals(id) ON DELETE SET NULL;
