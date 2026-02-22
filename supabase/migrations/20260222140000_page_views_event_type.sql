-- 050: page_views에 이벤트 타입 컬럼 추가
-- 페이지 뷰 외에 버튼 클릭, 모달 오픈, 폼 제출 등 UI 이벤트도 기록

ALTER TABLE page_views ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE page_views ADD COLUMN IF NOT EXISTS event_data JSONB;

CREATE INDEX IF NOT EXISTS idx_page_views_event_type ON page_views (event_type);

COMMENT ON COLUMN page_views.event_type IS 'NULL=페이지뷰, pricing_waitlist_button_click, pricing_waitlist_modal_open, pricing_waitlist_submit_start, pricing_waitlist_submit_success, pricing_waitlist_submit_error';
COMMENT ON COLUMN page_views.event_data IS '{"plan":"plus"} 등 이벤트 구조화 데이터';
