import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useCourseLectures, CompletedCourse, ReplayVideo } from '../hooks/useCourseLectures';

interface CourseLectureReplayProps {
  userId: string;
}

const CourseLectureReplay: React.FC<CourseLectureReplayProps> = ({ userId }) => {
  const { completedCourses, loading, fetchVideos, getVideoUrl } = useCourseLectures(userId);

  const [selectedCourse, setSelectedCourse] = useState<CompletedCourse | null>(null);
  const [videos, setVideos] = useState<ReplayVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);

  const [activeVideo, setActiveVideo] = useState<ReplayVideo | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState(false);

  // URL 만료 전 자동 갱신 타이머
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleSelectCourse = useCallback(async (course: CompletedCourse) => {
    setSelectedCourse(course);
    setActiveVideo(null);
    setStreamUrl(null);
    setVideos([]);
    setVideosLoading(true);
    const list = await fetchVideos(course.seasonId);
    setVideos(list);
    setVideosLoading(false);
  }, [fetchVideos]);

  const loadStreamUrl = useCallback(async (video: ReplayVideo) => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    setUrlLoading(true);
    setUrlError(false);
    setStreamUrl(null);

    const result = await getVideoUrl(video.id);
    if (!result) {
      setUrlError(true);
      setUrlLoading(false);
      return;
    }

    setStreamUrl(result.url);
    setUrlLoading(false);

    // 만료 5분 전 자동 갱신
    const refreshMs = Math.max((result.expiresIn - 300) * 1000, 60_000);
    refreshTimerRef.current = setTimeout(() => {
      loadStreamUrl(video);
    }, refreshMs);
  }, [getVideoUrl]);

  const handleSelectVideo = useCallback(async (video: ReplayVideo) => {
    setActiveVideo(video);
    await loadStreamUrl(video);
  }, [loadStreamUrl]);

  // 영상 변경 시 재생 위치 초기화
  useEffect(() => {
    if (videoRef.current && streamUrl) {
      videoRef.current.load();
    }
  }, [streamUrl]);

  // 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400 text-sm py-4">
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        강의 목록 불러오는 중…
      </div>
    );
  }

  if (completedCourses.length === 0) return null;

  return (
    <section>
      <h2 className="text-[13px] font-bold text-slate-400 uppercase tracking-wider mb-4">
        강의 다시보기
      </h2>

      {/* 수료 강의 카드 목록 */}
      {!selectedCourse && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedCourses.map((course) => (
            <button
              key={course.enrollmentId}
              type="button"
              onClick={() => handleSelectCourse(course)}
              className="group bg-white rounded-2xl border border-slate-200 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/10 p-6 text-left transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="w-12 h-12 rounded-xl bg-violet-50 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                  <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600">
                  수료
                </span>
              </div>
              <h3 className="text-[16px] font-bold text-slate-900 mb-1">{course.topicTitle}</h3>
              {course.seasonLabel && (
                <p className="text-[13px] text-slate-500">{course.seasonLabel}</p>
              )}
              {course.videoCount > 0 && (
                <div className="mt-4 flex items-center gap-1 text-[13px] font-semibold text-violet-600 group-hover:gap-2 transition-all">
                  영상 {course.videoCount}개 보기
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              )}
              {course.videoCount === 0 && (
                <p className="mt-4 text-[12px] text-slate-400">영상 준비 중</p>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 선택된 강의 + 영상 플레이어 */}
      {selectedCourse && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          {/* 헤더 */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100">
            <button
              type="button"
              onClick={() => { setSelectedCourse(null); setActiveVideo(null); setStreamUrl(null); }}
              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500"
              aria-label="강의 목록으로 돌아가기"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h3 className="text-[15px] font-bold text-slate-900">{selectedCourse.topicTitle}</h3>
              {selectedCourse.seasonLabel && (
                <p className="text-[12px] text-slate-400">{selectedCourse.seasonLabel}</p>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* 영상 플레이어 */}
            <div className="flex-1 bg-black">
              {urlLoading && (
                <div className="aspect-video flex items-center justify-center">
                  <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
              {urlError && (
                <div className="aspect-video flex flex-col items-center justify-center gap-3 text-white">
                  <svg className="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                  </svg>
                  <p className="text-sm text-slate-300">영상을 불러오지 못했습니다.</p>
                  {activeVideo && (
                    <button
                      type="button"
                      onClick={() => loadStreamUrl(activeVideo)}
                      className="text-sm text-violet-400 hover:text-violet-300 underline"
                    >
                      다시 시도
                    </button>
                  )}
                </div>
              )}
              {!urlLoading && !urlError && streamUrl && (
                // controlsList="nodownload" — 다운로드 버튼 숨김
                // disablePictureInPicture — PiP 비활성화 (공유 위험 최소화)
                <video
                  ref={videoRef}
                  className="w-full aspect-video"
                  controls
                  controlsList="nodownload"
                  disablePictureInPicture
                  preload="metadata"
                >
                  <source src={streamUrl} type="video/mp4" />
                  브라우저가 비디오를 지원하지 않습니다.
                </video>
              )}
              {!urlLoading && !urlError && !streamUrl && !activeVideo && (
                <div className="aspect-video flex flex-col items-center justify-center gap-2 text-slate-400">
                  <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                  </svg>
                  <p className="text-sm">영상을 선택하세요</p>
                </div>
              )}
            </div>

            {/* 영상 목록 사이드바 */}
            <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-slate-100 overflow-y-auto max-h-[360px] lg:max-h-[480px]">
              {videosLoading ? (
                <div className="flex items-center gap-2 p-4 text-slate-400 text-sm">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  목록 불러오는 중…
                </div>
              ) : videos.length === 0 ? (
                <p className="p-4 text-sm text-slate-400">등록된 영상이 없습니다.</p>
              ) : (
                <ul>
                  {videos.map((video, idx) => {
                    const isActive = activeVideo?.id === video.id;
                    return (
                      <li key={video.id}>
                        <button
                          type="button"
                          onClick={() => handleSelectVideo(video)}
                          className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                            isActive ? 'bg-violet-50' : ''
                          }`}
                        >
                          <span className={`mt-0.5 text-[12px] font-bold min-w-[20px] ${
                            isActive ? 'text-violet-600' : 'text-slate-300'
                          }`}>
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-[13px] font-medium leading-snug truncate ${
                              isActive ? 'text-violet-700' : 'text-slate-700'
                            }`}>
                              {video.title}
                            </p>
                            {video.durationMinutes && (
                              <p className="text-[11px] text-slate-400 mt-0.5">
                                {video.durationMinutes}분
                              </p>
                            )}
                          </div>
                          {isActive && (
                            <svg className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z" />
                            </svg>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CourseLectureReplay;
