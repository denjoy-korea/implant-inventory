-- ============================================================
-- 강의 다시보기 시스템
-- - course_enrollments: 수료 기록 (어드민이 수동 부여)
-- - course_replay_videos: 시즌별 Google Drive 영상 목록
-- ============================================================

-- 수료 기록
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  season_id     UUID        NOT NULL REFERENCES public.course_seasons(id) ON DELETE CASCADE,
  enrolled_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ,               -- NULL = 수강 중, NOT NULL = 수료
  granted_by    UUID        REFERENCES auth.users(id),  -- 어드민 수동 부여 시 기록
  CONSTRAINT course_enrollments_unique UNIQUE (user_id, season_id)
);

CREATE INDEX IF NOT EXISTS course_enrollments_user_idx
  ON public.course_enrollments (user_id, completed_at);

CREATE INDEX IF NOT EXISTS course_enrollments_season_idx
  ON public.course_enrollments (season_id);

-- Google Drive 기반 강의 다시보기 영상
CREATE TABLE IF NOT EXISTS public.course_replay_videos (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id        UUID        NOT NULL REFERENCES public.course_seasons(id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  drive_file_id    TEXT        NOT NULL,   -- Google Drive 파일 ID (공유 링크에서 추출)
  duration_minutes INTEGER,
  sort_order       INTEGER     NOT NULL DEFAULT 0,
  is_active        BOOLEAN     NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_replay_videos_season_idx
  ON public.course_replay_videos (season_id, sort_order);

-- ============================================================
-- RLS
-- ============================================================

ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_replay_videos ENABLE ROW LEVEL SECURITY;

-- enrollments: 본인 기록만 조회
DROP POLICY IF EXISTS "enrollments_select_own" ON public.course_enrollments;
CREATE POLICY "enrollments_select_own" ON public.course_enrollments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- enrollments: 어드민만 insert/update/delete
DROP POLICY IF EXISTS "enrollments_admin_insert" ON public.course_enrollments;
CREATE POLICY "enrollments_admin_insert" ON public.course_enrollments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "enrollments_admin_update" ON public.course_enrollments;
CREATE POLICY "enrollments_admin_update" ON public.course_enrollments
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "enrollments_admin_delete" ON public.course_enrollments;
CREATE POLICY "enrollments_admin_delete" ON public.course_enrollments
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- replay_videos: 수료한 사용자만 조회 (RLS가 1차 접근 제어)
DROP POLICY IF EXISTS "replay_videos_enrolled_select" ON public.course_replay_videos;
CREATE POLICY "replay_videos_enrolled_select" ON public.course_replay_videos
  FOR SELECT TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.course_enrollments e
      WHERE e.user_id = auth.uid()
        AND e.season_id = course_replay_videos.season_id
        AND e.completed_at IS NOT NULL
    )
  );

-- replay_videos: 어드민 CRUD
DROP POLICY IF EXISTS "replay_videos_admin_insert" ON public.course_replay_videos;
CREATE POLICY "replay_videos_admin_insert" ON public.course_replay_videos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "replay_videos_admin_update" ON public.course_replay_videos;
CREATE POLICY "replay_videos_admin_update" ON public.course_replay_videos
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "replay_videos_admin_delete" ON public.course_replay_videos;
CREATE POLICY "replay_videos_admin_delete" ON public.course_replay_videos
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================
-- RPC: 내 수료 강의 + 영상 목록 한 번에 조회
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_my_completed_courses()
RETURNS TABLE (
  enrollment_id  UUID,
  season_id      UUID,
  season_label   TEXT,
  topic_title    TEXT,
  topic_slug     TEXT,
  completed_at   TIMESTAMPTZ,
  video_count    BIGINT
)
LANGUAGE sql SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    e.id            AS enrollment_id,
    s.id            AS season_id,
    s.season_label,
    t.title         AS topic_title,
    t.slug          AS topic_slug,
    e.completed_at,
    COUNT(v.id)     AS video_count
  FROM public.course_enrollments e
  JOIN public.course_seasons s ON s.id = e.season_id
  JOIN public.course_topics  t ON t.id = s.topic_id
  LEFT JOIN public.course_replay_videos v
         ON v.season_id = e.season_id AND v.is_active = true
  WHERE e.user_id = auth.uid()
    AND e.completed_at IS NOT NULL
  GROUP BY e.id, s.id, s.season_label, t.title, t.slug, e.completed_at
  ORDER BY e.completed_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_completed_courses() TO authenticated;
