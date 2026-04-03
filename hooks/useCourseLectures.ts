import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';

export interface CompletedCourse {
  enrollmentId: string;
  seasonId: string;
  seasonLabel: string | null;
  topicTitle: string;
  topicSlug: string;
  completedAt: string;
  videoCount: number;
}

export interface ReplayVideo {
  id: string;
  title: string;
  durationMinutes: number | null;
  sortOrder: number;
}

export function useCourseLectures(userId: string | null) {
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setCompletedCourses([]); return; }

    setLoading(true);
    supabase
      .rpc('get_my_completed_courses')
      .then(({ data, error }) => {
        if (!error && data) {
          setCompletedCourses(
            data.map((row: Record<string, unknown>) => ({
              enrollmentId: row.enrollment_id as string,
              seasonId: row.season_id as string,
              seasonLabel: row.season_label as string | null,
              topicTitle: row.topic_title as string,
              topicSlug: row.topic_slug as string,
              completedAt: row.completed_at as string,
              videoCount: Number(row.video_count),
            })),
          );
        }
        setLoading(false);
      });
  }, [userId]);

  /** 선택한 시즌의 영상 목록 조회 */
  const fetchVideos = useCallback(async (seasonId: string): Promise<ReplayVideo[]> => {
    const { data, error } = await supabase
      .from('course_replay_videos')
      .select('id, title, duration_minutes, sort_order')
      .eq('season_id', seasonId)
      .eq('is_active', true)
      .order('sort_order');

    if (error || !data) return [];
    return data.map((v) => ({
      id: v.id as string,
      title: v.title as string,
      durationMinutes: v.duration_minutes as number | null,
      sortOrder: v.sort_order as number,
    }));
  }, []);

  /**
   * Edge Function 호출 → 1시간 유효 Google Drive 스트리밍 URL 반환
   * URL에 access_token이 포함되므로 절대 로컬 스토리지에 저장하지 않을 것
   */
  const getVideoUrl = useCallback(async (
    videoId: string,
  ): Promise<{ url: string; title: string; expiresIn: number } | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;

    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-lecture-video-url`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ videoId }),
        },
      );

      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  return { completedCourses, loading, fetchVideos, getVideoUrl };
}
