-- ═══════════════════════════════════════════════════════════
-- Phase 1: beta_invite_codes에 code_type, channel 컬럼 추가
-- 기존 데이터는 code_type='beta' 기본값으로 무결성 유지
-- ═══════════════════════════════════════════════════════════

-- 코드 타입 구분
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS code_type text NOT NULL DEFAULT 'beta';

-- CHECK 제약
DO $$ BEGIN
  ALTER TABLE public.beta_invite_codes
    ADD CONSTRAINT beta_invite_codes_code_type_chk
    CHECK (code_type IN ('beta', 'partner', 'promo'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 제휴 채널명 (partner 코드 전용)
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS channel text;

-- 자동 지급할 쿠폰 템플릿 ID (Phase 2에서 FK 연결)
ALTER TABLE public.beta_invite_codes
  ADD COLUMN IF NOT EXISTS coupon_template_id uuid;

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_beta_invite_codes_code_type
  ON public.beta_invite_codes(code_type);

-- partner 코드에서 channel은 필수
DO $$ BEGIN
  ALTER TABLE public.beta_invite_codes
    ADD CONSTRAINT beta_invite_codes_partner_channel_chk
    CHECK (code_type != 'partner' OR channel IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
