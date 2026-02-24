-- 청구프로그램 옵션에서 ezdent 제거
-- 기존 ezdent 값은 재선택 유도를 위해 NULL로 되돌린다.

UPDATE public.hospitals
   SET billing_program = NULL
 WHERE billing_program = 'ezdent';

ALTER TABLE public.hospitals
  DROP CONSTRAINT IF EXISTS hospitals_billing_program_check;

ALTER TABLE public.hospitals
  ADD CONSTRAINT hospitals_billing_program_check
  CHECK (
    billing_program IS NULL
    OR billing_program IN ('dentweb', 'oneclick')
  );

COMMENT ON COLUMN public.hospitals.billing_program IS '워크스페이스 청구프로그램 식별자(dentweb|oneclick)';
