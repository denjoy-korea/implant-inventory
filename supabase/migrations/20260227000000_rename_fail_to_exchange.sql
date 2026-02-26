-- 수술중FAIL → 수술중교환 용어 순화
-- FAIL 교환완료 → 교환완료

-- 1) CHECK 제약 조건 제거
ALTER TABLE surgery_records DROP CONSTRAINT IF EXISTS surgery_records_classification_check;

-- 2) 기존 데이터 업데이트
UPDATE surgery_records SET classification = '수술중교환' WHERE classification = '수술중 FAIL';
UPDATE surgery_records SET classification = '교환완료' WHERE classification = 'FAIL 교환완료';

-- 3) 새 CHECK 제약 조건 추가
ALTER TABLE surgery_records ADD CONSTRAINT surgery_records_classification_check
  CHECK (classification IN ('식립', '골이식만', '수술중교환', '청구', '교환완료'));

-- 4) inventory 의 제조사 접두어 변경
UPDATE inventory SET manufacturer = replace(manufacturer, '수술중FAIL_', '수술중교환_')
  WHERE manufacturer LIKE '수술중FAIL\_%';
