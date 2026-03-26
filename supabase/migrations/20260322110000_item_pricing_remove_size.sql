-- item_pricing: size 컬럼 제거 및 UNIQUE 재설정 (브랜드 단위 단가 관리)

ALTER TABLE public.item_pricing DROP CONSTRAINT item_pricing_unique;
ALTER TABLE public.item_pricing DROP COLUMN size;
ALTER TABLE public.item_pricing ADD CONSTRAINT item_pricing_unique UNIQUE (hospital_id, manufacturer, brand);

ALTER TABLE public.item_pricing_history DROP COLUMN size;
