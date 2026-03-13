-- picked_up_date 컬럼 추가 (수거 완료 날짜 추적)
ALTER TABLE public.return_requests
  ADD COLUMN IF NOT EXISTS picked_up_date date;

COMMENT ON COLUMN public.return_requests.picked_up_date IS '수거 완료 처리 날짜';
