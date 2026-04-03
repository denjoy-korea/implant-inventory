-- ============================================================
-- Public course catalog:
-- - course_topics: 상세페이지 본체가 되는 강의 주제
-- - course_seasons: 날짜/금액/모집 상태만 바뀌는 시즌(회차)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.course_topics (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               TEXT        NOT NULL UNIQUE,
  title              TEXT        NOT NULL,
  category           TEXT,
  short_description  TEXT,
  hero_badge         TEXT,
  hero_headline      TEXT,
  hero_summary       TEXT,
  instructor_name    TEXT,
  instructor_role    TEXT,
  is_published       BOOLEAN     NOT NULL DEFAULT false,
  sort_order         INTEGER     NOT NULL DEFAULT 0,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.course_seasons (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id           UUID        NOT NULL REFERENCES public.course_topics(id) ON DELETE CASCADE,
  season_number      INTEGER     NOT NULL CHECK (season_number > 0),
  season_label       TEXT,
  start_date         DATE,
  end_date           DATE,
  price_krw          INTEGER     NOT NULL DEFAULT 0 CHECK (price_krw >= 0),
  original_price_krw INTEGER     CHECK (original_price_krw IS NULL OR original_price_krw >= 0),
  status             TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft', 'scheduled', 'open', 'closed')),
  capacity           INTEGER     CHECK (capacity IS NULL OR capacity >= 0),
  is_featured        BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT course_seasons_unique_topic_season UNIQUE (topic_id, season_number)
);

CREATE INDEX IF NOT EXISTS course_topics_sort_idx
  ON public.course_topics (sort_order, created_at);

CREATE INDEX IF NOT EXISTS course_seasons_topic_idx
  ON public.course_seasons (topic_id, season_number DESC);

CREATE OR REPLACE FUNCTION public.update_course_topics_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_course_seasons_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS course_topics_updated_at ON public.course_topics;
CREATE TRIGGER course_topics_updated_at
  BEFORE UPDATE ON public.course_topics
  FOR EACH ROW EXECUTE FUNCTION public.update_course_topics_updated_at();

DROP TRIGGER IF EXISTS course_seasons_updated_at ON public.course_seasons;
CREATE TRIGGER course_seasons_updated_at
  BEFORE UPDATE ON public.course_seasons
  FOR EACH ROW EXECUTE FUNCTION public.update_course_seasons_updated_at();

ALTER TABLE public.course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_seasons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "course_topics_public_select" ON public.course_topics;
CREATE POLICY "course_topics_public_select" ON public.course_topics
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

DROP POLICY IF EXISTS "course_topics_admin_insert" ON public.course_topics;
CREATE POLICY "course_topics_admin_insert" ON public.course_topics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "course_topics_admin_update" ON public.course_topics;
CREATE POLICY "course_topics_admin_update" ON public.course_topics
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "course_topics_admin_delete" ON public.course_topics;
CREATE POLICY "course_topics_admin_delete" ON public.course_topics
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "course_seasons_public_select" ON public.course_seasons;
CREATE POLICY "course_seasons_public_select" ON public.course_seasons
  FOR SELECT TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.course_topics t
      WHERE t.id = course_seasons.topic_id
        AND t.is_published = true
    )
  );

DROP POLICY IF EXISTS "course_seasons_admin_insert" ON public.course_seasons;
CREATE POLICY "course_seasons_admin_insert" ON public.course_seasons
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "course_seasons_admin_update" ON public.course_seasons;
CREATE POLICY "course_seasons_admin_update" ON public.course_seasons
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "course_seasons_admin_delete" ON public.course_seasons;
CREATE POLICY "course_seasons_admin_delete" ON public.course_seasons
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

-- legacy lectures table: 기존 서비스_role 전용 정책을 운영자 인증 기반으로 정리
DROP POLICY IF EXISTS "lectures_insert" ON public.lectures;
CREATE POLICY "lectures_insert" ON public.lectures
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "lectures_update" ON public.lectures;
CREATE POLICY "lectures_update" ON public.lectures
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

DROP POLICY IF EXISTS "lectures_delete" ON public.lectures;
CREATE POLICY "lectures_delete" ON public.lectures
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin'
    )
  );

INSERT INTO public.course_topics (
  slug,
  title,
  category,
  short_description,
  hero_badge,
  hero_headline,
  hero_summary,
  instructor_name,
  instructor_role,
  is_published,
  sort_order
)
VALUES (
  'implant-inventory',
  '덴트웹 임플란트 재고관리',
  '데이터 엔지니어링',
  '엑셀 정리 시간을 줄이고 덴트웹 입력 구조를 운영 데이터로 바꾸는 실전 강의입니다.',
  'PREMIUM CLASS',
  '재고가 쌓여나는 건
엑셀 탓이 아닙니다',
  '입력 구조부터 바꾸면 재고, 수술기록, 발주 판단이 같은 기준 위에서 움직이기 시작합니다.',
  '맹준호',
  'DenJOY 데이터 전략 리드',
  true,
  1
)
ON CONFLICT (slug) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  short_description = EXCLUDED.short_description,
  hero_badge = EXCLUDED.hero_badge,
  hero_headline = EXCLUDED.hero_headline,
  hero_summary = EXCLUDED.hero_summary,
  instructor_name = EXCLUDED.instructor_name,
  instructor_role = EXCLUDED.instructor_role,
  is_published = EXCLUDED.is_published,
  sort_order = EXCLUDED.sort_order;

WITH target_topic AS (
  SELECT id
  FROM public.course_topics
  WHERE slug = 'implant-inventory'
)
INSERT INTO public.course_seasons (
  topic_id,
  season_number,
  season_label,
  start_date,
  end_date,
  price_krw,
  original_price_krw,
  status,
  capacity,
  is_featured
)
SELECT
  target_topic.id,
  seeded.season_number,
  seeded.season_label,
  seeded.start_date,
  seeded.end_date,
  seeded.price_krw,
  seeded.original_price_krw,
  seeded.status,
  seeded.capacity,
  seeded.is_featured
FROM target_topic
JOIN (
  VALUES
    (4, '4회차', DATE '2026-05-12', DATE '2026-06-02',  99000, 280000, 'open',      20, true),
    (3, '3회차', DATE '2026-03-11', DATE '2026-04-01', 129000, 280000, 'closed',    20, false),
    (2, '2회차', DATE '2026-01-14', DATE '2026-02-04', 149000, 280000, 'closed',    16, false)
) AS seeded(season_number, season_label, start_date, end_date, price_krw, original_price_krw, status, capacity, is_featured)
  ON true
ON CONFLICT (topic_id, season_number) DO UPDATE SET
  season_label = EXCLUDED.season_label,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  price_krw = EXCLUDED.price_krw,
  original_price_krw = EXCLUDED.original_price_krw,
  status = EXCLUDED.status,
  capacity = EXCLUDED.capacity,
  is_featured = EXCLUDED.is_featured;
