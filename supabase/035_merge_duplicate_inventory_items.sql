-- ============================================
-- 035: inventory 중복 품목 병합
-- 기준 키:
--   hospital_id + manufacturer + brand + size
--
-- 동작:
--   1) 중복 그룹에서 기준 레코드(keep_id) 선정
--      - created_at 오름차순, id 오름차순
--   2) 중복 레코드(drop_id)의 initial_stock / stock_adjustment를 keep_id에 합산
--   3) inventory_audits.inventory_id를 keep_id로 재연결(테이블 존재 시)
--   4) drop_id 레코드 삭제
--   5) 향후 동일 중복 방지를 위한 UNIQUE INDEX 생성
-- ============================================

DO $$
DECLARE
  v_group_count INT := 0;
  v_drop_count INT := 0;
  v_relinked_audits INT := 0;
  v_deleted_count INT := 0;
BEGIN
  CREATE TEMP TABLE tmp_inventory_dupe_map (
    keep_id UUID NOT NULL,
    drop_id UUID NOT NULL
  ) ON COMMIT DROP;

  INSERT INTO tmp_inventory_dupe_map (keep_id, drop_id)
  SELECT r.keep_id, r.id
  FROM (
    SELECT
      i.id,
      first_value(i.id) OVER (
        PARTITION BY i.hospital_id, i.manufacturer, i.brand, i.size
        ORDER BY i.created_at ASC, i.id ASC
      ) AS keep_id
    FROM inventory i
  ) r
  WHERE r.id <> r.keep_id;

  SELECT COUNT(*) INTO v_drop_count FROM tmp_inventory_dupe_map;
  SELECT COUNT(DISTINCT keep_id) INTO v_group_count FROM tmp_inventory_dupe_map;

  IF v_drop_count = 0 THEN
    RAISE NOTICE '[035] merge skip: 중복 inventory 품목 없음';
  ELSE
    -- 중복 레코드의 재고값을 keep 레코드로 합산
    WITH dup_sum AS (
      SELECT
        m.keep_id,
        SUM(COALESCE(i.initial_stock, 0)) AS sum_initial_stock,
        SUM(COALESCE(i.stock_adjustment, 0)) AS sum_stock_adjustment
      FROM tmp_inventory_dupe_map m
      JOIN inventory i
        ON i.id = m.drop_id
      GROUP BY m.keep_id
    )
    UPDATE inventory k
    SET
      initial_stock = COALESCE(k.initial_stock, 0) + d.sum_initial_stock,
      stock_adjustment = COALESCE(k.stock_adjustment, 0) + d.sum_stock_adjustment,
      updated_at = now()
    FROM dup_sum d
    WHERE k.id = d.keep_id;

    -- 실사 이력 FK 재연결
    IF to_regclass('public.inventory_audits') IS NOT NULL THEN
      UPDATE inventory_audits ia
      SET inventory_id = m.keep_id
      FROM tmp_inventory_dupe_map m
      WHERE ia.inventory_id = m.drop_id;
      GET DIAGNOSTICS v_relinked_audits = ROW_COUNT;
    END IF;

    -- 중복 레코드 삭제
    DELETE FROM inventory i
    USING tmp_inventory_dupe_map m
    WHERE i.id = m.drop_id;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    RAISE NOTICE '[035] merge done: 그룹=% / 삭제=% / audit relink=%',
      v_group_count, v_deleted_count, v_relinked_audits;
  END IF;
END $$;

-- 향후 exact 중복 방지
CREATE UNIQUE INDEX IF NOT EXISTS idx_inventory_unique_item
ON public.inventory (hospital_id, manufacturer, brand, size);
