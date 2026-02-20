-- ============================================
-- 034: IBS 규격 표기 통일 (구표기 -> 신표기)
-- 대상:
--   1) IBS 제조사/브랜드 스왑 레코드 보정
--      - manufacturer in ('Magicore','Magic FC Mini','Magic FC')
--      - brand = 'IBS Implant'
--      => manufacturer='IBS Implant', brand=기존 manufacturer
--   2) IBS 규격 표기를 신표준으로 통일
--      - 구표기: D:3.5 L:11 Cuff:4
--      - 신표기: C4 Φ3.5 X 11
-- ============================================

CREATE OR REPLACE FUNCTION public.canonicalize_ibs_size(
  p_size TEXT,
  p_manufacturer TEXT
) RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_size TEXT;
  v_mfr_key TEXT;
  v_match TEXT[];
  v_d TEXT;
  v_l TEXT;
  v_c TEXT;
  v_d_fmt TEXT;
  v_l_fmt TEXT;
  v_c_fmt TEXT;
BEGIN
  IF p_size IS NULL THEN
    RETURN NULL;
  END IF;

  -- IBS 제조사 판별 (공백/하이픈/언더스코어 무시)
  v_mfr_key := lower(regexp_replace(coalesce(p_manufacturer, ''), '[\s\-_]', '', 'g'));
  IF NOT (v_mfr_key = 'ibs' OR strpos(v_mfr_key, 'ibsimplant') > 0) THEN
    RETURN p_size;
  END IF;

  v_size := btrim(p_size);
  IF v_size = '' THEN
    RETURN v_size;
  END IF;

  -- cuff 추출: "Cuff:4" 또는 "C4 Φ..."
  v_match := regexp_match(v_size, '(?i)cuff[:\s]*([0-9]+(?:\.[0-9]+)?)');
  IF v_match IS NOT NULL THEN
    v_c := v_match[1];
  ELSE
    v_match := regexp_match(v_size, '(?i)^\s*c\s*([0-9]+(?:\.[0-9]+)?)\s*[Φφ]');
    IF v_match IS NOT NULL THEN
      v_c := v_match[1];
    END IF;
  END IF;

  -- diameter 추출: "D:3.5" 우선, 없으면 "Φ3.5"
  v_match := regexp_match(v_size, '(?i)d[:\s]*([0-9]+(?:\.[0-9]+)?)');
  IF v_match IS NOT NULL THEN
    v_d := v_match[1];
  ELSE
    v_match := regexp_match(v_size, '(?i)[Φφ]\s*([0-9]+(?:\.[0-9]+)?)');
    IF v_match IS NOT NULL THEN
      v_d := v_match[1];
    END IF;
  END IF;

  -- length 추출: "L:11" 우선, 없으면 "X 11"
  v_match := regexp_match(v_size, '(?i)l[:\s]*([0-9]+(?:\.[0-9]+)?)');
  IF v_match IS NOT NULL THEN
    v_l := v_match[1];
  ELSE
    v_match := regexp_match(v_size, '(?i)[×xX*]\s*([0-9]+(?:\.[0-9]+)?)');
    IF v_match IS NOT NULL THEN
      v_l := v_match[1];
    END IF;
  END IF;

  -- 직경/길이 둘 중 하나라도 파싱 실패하면 원문 유지
  IF v_d IS NULL OR v_l IS NULL THEN
    RETURN v_size;
  END IF;

  -- 앱과 동일한 문자열 포맷 규칙
  -- diameter: 정수면 1자리 소수 강제 (3 -> 3.0)
  -- length/cuff: 불필요한 .0 제거
  v_d_fmt := (v_d::numeric)::text;
  IF position('.' IN v_d_fmt) = 0 THEN
    v_d_fmt := v_d_fmt || '.0';
  END IF;
  v_l_fmt := (v_l::numeric)::text;

  IF v_c IS NOT NULL THEN
    v_c_fmt := (v_c::numeric)::text;
    RETURN format('C%s Φ%s X %s', v_c_fmt, v_d_fmt, v_l_fmt);
  END IF;

  RETURN format('Φ%s X %s', v_d_fmt, v_l_fmt);
END;
$$;

COMMENT ON FUNCTION public.canonicalize_ibs_size(TEXT, TEXT)
IS 'IBS Implant 구표기(D/L/Cuff 포함)를 신표준(Cn Φd X l)으로 정규화';

DO $$
DECLARE
  v_swapped_inventory INT := 0;
  v_swapped_surgery INT := 0;
  v_swapped_orders INT := 0;
  v_norm_inventory INT := 0;
  v_norm_surgery INT := 0;
  v_norm_order_items INT := 0;
BEGIN
  -- 1) IBS 제조사/브랜드 스왑 보정
  UPDATE inventory i
  SET manufacturer = 'IBS Implant',
      brand = i.manufacturer
  WHERE i.brand = 'IBS Implant'
    AND i.manufacturer IN ('Magicore', 'Magic FC Mini', 'Magic FC');
  GET DIAGNOSTICS v_swapped_inventory = ROW_COUNT;

  UPDATE surgery_records s
  SET manufacturer = 'IBS Implant',
      brand = s.manufacturer
  WHERE s.brand = 'IBS Implant'
    AND s.manufacturer IN ('Magicore', 'Magic FC Mini', 'Magic FC');
  GET DIAGNOSTICS v_swapped_surgery = ROW_COUNT;

  UPDATE orders o
  SET manufacturer = 'IBS Implant'
  WHERE o.manufacturer IN ('Magicore', 'Magic FC Mini', 'Magic FC');
  GET DIAGNOSTICS v_swapped_orders = ROW_COUNT;

  -- 2) IBS 규격 표기 정규화 (구표기 -> 신표기)
  UPDATE inventory i
  SET size = public.canonicalize_ibs_size(i.size, i.manufacturer)
  WHERE i.size IS NOT NULL
    AND (
      lower(regexp_replace(coalesce(i.manufacturer, ''), '[\s\-_]', '', 'g')) = 'ibs'
      OR lower(regexp_replace(coalesce(i.manufacturer, ''), '[\s\-_]', '', 'g')) LIKE '%ibsimplant%'
    )
    AND public.canonicalize_ibs_size(i.size, i.manufacturer) IS DISTINCT FROM i.size;
  GET DIAGNOSTICS v_norm_inventory = ROW_COUNT;

  UPDATE surgery_records s
  SET size = public.canonicalize_ibs_size(s.size, s.manufacturer)
  WHERE s.size IS NOT NULL
    AND (
      lower(regexp_replace(coalesce(s.manufacturer, ''), '[\s\-_]', '', 'g')) = 'ibs'
      OR lower(regexp_replace(coalesce(s.manufacturer, ''), '[\s\-_]', '', 'g')) LIKE '%ibsimplant%'
    )
    AND public.canonicalize_ibs_size(s.size, s.manufacturer) IS DISTINCT FROM s.size;
  GET DIAGNOSTICS v_norm_surgery = ROW_COUNT;

  UPDATE order_items oi
  SET size = public.canonicalize_ibs_size(oi.size, o.manufacturer)
  FROM orders o
  WHERE oi.order_id = o.id
    AND oi.size IS NOT NULL
    AND (
      lower(regexp_replace(coalesce(o.manufacturer, ''), '[\s\-_]', '', 'g')) = 'ibs'
      OR lower(regexp_replace(coalesce(o.manufacturer, ''), '[\s\-_]', '', 'g')) LIKE '%ibsimplant%'
    )
    AND public.canonicalize_ibs_size(oi.size, o.manufacturer) IS DISTINCT FROM oi.size;
  GET DIAGNOSTICS v_norm_order_items = ROW_COUNT;

  RAISE NOTICE '[034] IBS swap fixed: inventory=% surgery_records=% orders=%',
    v_swapped_inventory, v_swapped_surgery, v_swapped_orders;
  RAISE NOTICE '[034] IBS size normalized: inventory=% surgery_records=% order_items=%',
    v_norm_inventory, v_norm_surgery, v_norm_order_items;
END $$;
