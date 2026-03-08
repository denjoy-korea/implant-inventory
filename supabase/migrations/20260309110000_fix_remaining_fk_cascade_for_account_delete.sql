-- ============================================================
-- 회원 탈퇴 FK 위반 추가 수정 (2차)
-- data_reset_requests, coupon_templates CASCADE/SET NULL 추가
-- ============================================================

-- data_reset_requests: hospital 삭제 시 요청 기록도 함께 삭제
ALTER TABLE public.data_reset_requests
  DROP CONSTRAINT IF EXISTS data_reset_requests_hospital_id_fkey;

ALTER TABLE public.data_reset_requests
  ADD CONSTRAINT data_reset_requests_hospital_id_fkey
    FOREIGN KEY (hospital_id) REFERENCES public.hospitals(id) ON DELETE CASCADE;

-- coupon_templates: 작성자 계정 삭제 시 NULL로 처리 (템플릿은 유지)
ALTER TABLE public.coupon_templates
  DROP CONSTRAINT IF EXISTS coupon_templates_created_by_fkey;

ALTER TABLE public.coupon_templates
  ADD CONSTRAINT coupon_templates_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
