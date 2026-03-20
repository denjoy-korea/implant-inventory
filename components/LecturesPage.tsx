import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface Lecture {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  sort_order: number;
}

/** 유튜브 URL에서 video ID 추출 (watch?v=, youtu.be/, /embed/ 모두 대응) */
function extractYoutubeId(url: string): string | null {
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

const LecturesPage: React.FC = () => {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [selected, setSelected] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from('lectures')
        .select('id, title, description, youtube_url, sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      const rows = (data ?? []) as Lecture[];
      setLectures(rows);
      if (rows.length > 0) setSelected(rows[0]);
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
        강의 목록을 불러오는 중...
      </div>
    );
  }

  if (lectures.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-400">
        <svg className="w-12 h-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
        </svg>
        <p className="text-sm font-medium">등록된 강의가 없습니다.</p>
        <p className="text-xs text-slate-500">곧 새 강의가 업로드될 예정입니다.</p>
      </div>
    );
  }

  const videoId = selected ? extractYoutubeId(selected.youtube_url) : null;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">동영상 강의</h1>
        <p className="text-sm text-slate-400 mt-1">DenJOY 활용법을 영상으로 확인하세요.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* 플레이어 */}
        <div className="flex-1 space-y-4">
          {videoId ? (
            <div className="relative w-full rounded-2xl overflow-hidden bg-black shadow-xl" style={{ paddingTop: '56.25%' }}>
              <iframe
                className="absolute inset-0 w-full h-full"
                src={`https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`}
                title={selected?.title ?? '강의 영상'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="w-full rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 text-sm" style={{ paddingTop: '56.25%', position: 'relative' }}>
              <span className="absolute inset-0 flex items-center justify-center">유효하지 않은 영상 URL입니다.</span>
            </div>
          )}

          {selected && (
            <div className="bg-slate-800/60 rounded-2xl p-5 border border-slate-700">
              <h2 className="text-base font-bold text-white">{selected.title}</h2>
              {selected.description && (
                <p className="text-sm text-slate-400 mt-2 leading-relaxed whitespace-pre-line">{selected.description}</p>
              )}
            </div>
          )}
        </div>

        {/* 강의 목록 */}
        <div className="lg:w-72 shrink-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">강의 목록</h3>
          <div className="space-y-1.5">
            {lectures.map((lec, idx) => {
              const isActive = selected?.id === lec.id;
              const thumbId = extractYoutubeId(lec.youtube_url);
              return (
                <button
                  key={lec.id}
                  type="button"
                  onClick={() => setSelected(lec)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all text-sm ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/40'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {thumbId ? (
                    <img
                      src={`https://img.youtube.com/vi/${thumbId}/mqdefault.jpg`}
                      alt=""
                      className="w-16 h-10 rounded-lg object-cover shrink-0 bg-slate-700"
                    />
                  ) : (
                    <div className="w-16 h-10 rounded-lg bg-slate-700 shrink-0 flex items-center justify-center text-slate-500 text-xs">
                      ?
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-black shrink-0 ${isActive ? 'text-indigo-200' : 'text-slate-500'}`}>
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span className="truncate font-semibold">{lec.title}</span>
                    </div>
                    {lec.description && (
                      <p className={`text-[11px] mt-0.5 truncate ${isActive ? 'text-indigo-200/80' : 'text-slate-500'}`}>
                        {lec.description}
                      </p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LecturesPage;
