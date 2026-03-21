-- ============================================================
-- item_pricing: 품목별 매입단가 / 진료수가
-- ============================================================

CREATE TABLE IF NOT EXISTS public.item_pricing (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hospital_id     UUID        NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  manufacturer    TEXT        NOT NULL,
  brand           TEXT        NOT NULL,
  size            TEXT        NOT NULL,
  purchase_price  INTEGER     NOT NULL DEFAULT 0,
  treatment_fee   INTEGER     NOT NULL DEFAULT 0,
  updated_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT item_pricing_unique UNIQUE (hospital_id, manufacturer, brand, size)
);

CREATE INDEX IF NOT EXISTS item_pricing_hospital_idx ON public.item_pricing (hospital_id);

-- updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.update_item_pricing_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER item_pricing_updated_at
  BEFORE UPDATE ON public.item_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_item_pricing_updated_at();

-- ============================================================
-- item_pricing_history: 단가 변경 이력
-- ============================================================

CREATE TABLE IF NOT EXISTS public.item_pricing_history (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_pricing_id      UUID        NOT NULL REFERENCES public.item_pricing(id) ON DELETE CASCADE,
  hospital_id          UUID        NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
  -- 비정규화 (삭제 후에도 이력 조회 가능)
  manufacturer         TEXT        NOT NULL,
  brand                TEXT        NOT NULL,
  size                 TEXT        NOT NULL,
  -- 변경 내용
  field_changed        TEXT        NOT NULL,  -- 'purchase_price' | 'treatment_fee' | 'both' | 'initial'
  old_purchase_price   INTEGER,
  new_purchase_price   INTEGER,
  old_treatment_fee    INTEGER,
  new_treatment_fee    INTEGER,
  change_source        TEXT        NOT NULL DEFAULT 'settings',  -- 'settings' | 'receipt_confirmation'
  changed_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS item_pricing_history_item_idx   ON public.item_pricing_history (item_pricing_id);
CREATE INDEX IF NOT EXISTS item_pricing_history_hosp_idx   ON public.item_pricing_history (hospital_id);
CREATE INDEX IF NOT EXISTS item_pricing_history_hosp_at_idx ON public.item_pricing_history (hospital_id, changed_at DESC);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.item_pricing         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_pricing_history ENABLE ROW LEVEL SECURITY;

-- item_pricing: 같은 hospital_id 소속 인증 사용자만 접근
CREATE POLICY "item_pricing_select" ON public.item_pricing
  FOR SELECT TO authenticated
  USING (
    hospital_id = (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "item_pricing_insert" ON public.item_pricing
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "item_pricing_update" ON public.item_pricing
  FOR UPDATE TO authenticated
  USING (
    hospital_id = (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "item_pricing_delete" ON public.item_pricing
  FOR DELETE TO authenticated
  USING (
    hospital_id = (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

-- item_pricing_history: SELECT only (client에서 insert는 service layer에서 직접 처리)
CREATE POLICY "item_pricing_history_select" ON public.item_pricing_history
  FOR SELECT TO authenticated
  USING (
    hospital_id = (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );

CREATE POLICY "item_pricing_history_insert" ON public.item_pricing_history
  FOR INSERT TO authenticated
  WITH CHECK (
    hospital_id = (
      SELECT hospital_id FROM public.profiles WHERE id = auth.uid() LIMIT 1
    )
  );
