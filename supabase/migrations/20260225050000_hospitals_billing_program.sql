-- 병원(워크스페이스)별 청구프로그램 설정
-- null이면 미설정 상태로 간주하여 앱에서 워크스페이스 진입 전 선택을 강제한다.

ALTER TABLE public.hospitals
ADD COLUMN IF NOT EXISTS billing_program TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'hospitals_billing_program_check'
      AND conrelid = 'public.hospitals'::regclass
  ) THEN
    ALTER TABLE public.hospitals
    ADD CONSTRAINT hospitals_billing_program_check
      CHECK (
        billing_program IS NULL
        OR billing_program IN ('dentweb', 'oneclick', 'ezdent')
      );
  END IF;
END $$;

COMMENT ON COLUMN public.hospitals.billing_program IS '워크스페이스 청구프로그램 식별자(dentweb|oneclick|ezdent)';

CREATE INDEX IF NOT EXISTS idx_hospitals_billing_program
  ON public.hospitals (billing_program);
