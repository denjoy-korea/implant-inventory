-- return_request_items에 실수령 수량 컬럼 추가
-- 반품 완료 시 실제 수거된 수량을 기록하여 재고 정확도 향상
-- NULL = 기존 방식 유지 (신청 수량 그대로 처리, 하위 호환)

ALTER TABLE return_request_items
  ADD COLUMN actual_received_qty INTEGER DEFAULT NULL
  CONSTRAINT chk_actual_received_qty_non_negative
    CHECK (actual_received_qty IS NULL OR actual_received_qty >= 0);

COMMENT ON COLUMN return_request_items.actual_received_qty IS
  '반품 완료 시 실제 수거된 수량. NULL = 미입력(기존 방식, 신청 수량 기준으로 처리됨)';
