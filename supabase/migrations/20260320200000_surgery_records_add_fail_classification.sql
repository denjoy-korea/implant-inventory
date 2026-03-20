-- surgery_records.classification CHECK 제약에 '수술후FAIL' 추가
ALTER TABLE surgery_records
  DROP CONSTRAINT surgery_records_classification_check;

ALTER TABLE surgery_records
  ADD CONSTRAINT surgery_records_classification_check
  CHECK (classification = ANY (ARRAY[
    '식립'::text,
    '골이식만'::text,
    '수술중교환'::text,
    '청구'::text,
    '교환완료'::text,
    '수술후FAIL'::text
  ]));
