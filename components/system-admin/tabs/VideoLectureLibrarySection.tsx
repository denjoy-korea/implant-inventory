import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import ConfirmModal from '../../ConfirmModal';
import { useToast } from '../../../hooks/useToast';

interface LectureRow {
  id: string;
  title: string;
  description: string | null;
  youtube_url: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

interface LectureForm {
  title: string;
  description: string;
  youtube_url: string;
  sort_order: string;
}

const EMPTY_FORM: LectureForm = {
  title: '',
  description: '',
  youtube_url: '',
  sort_order: '0',
};

const VideoLectureLibrarySection: React.FC = () => {
  const [rows, setRows] = useState<LectureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<LectureForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<LectureRow | null>(null);
  const [pendingDelete, setPendingDelete] = useState<LectureRow | null>(null);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('lectures')
      .select('*')
      .order('sort_order', { ascending: true });
    setRows((data ?? []) as LectureRow[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form.title.trim() || !form.youtube_url.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      youtube_url: form.youtube_url.trim(),
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
    };
    if (editing) {
      const { error } = await supabase.from('lectures').update(payload).eq('id', editing.id);
      if (error) showToast('동영상 강의 수정에 실패했습니다.', 'error');
      else {
        showToast('동영상 강의가 수정되었습니다.', 'success');
        setEditing(null);
      }
    } else {
      const { error } = await supabase.from('lectures').insert({ ...payload, is_active: true });
      if (error) showToast('동영상 강의 추가에 실패했습니다.', 'error');
      else showToast('동영상 강의가 추가되었습니다.', 'success');
    }
    setForm(EMPTY_FORM);
    setSaving(false);
    void load();
  };

  const toggleActive = async (row: LectureRow) => {
    const { error } = await supabase
      .from('lectures')
      .update({ is_active: !row.is_active })
      .eq('id', row.id);
    if (error) {
      showToast('동영상 강의 상태 변경에 실패했습니다.', 'error');
      return;
    }
    void load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { error } = await supabase.from('lectures').delete().eq('id', pendingDelete.id);
    if (error) {
      showToast('동영상 강의 삭제에 실패했습니다.', 'error');
      return;
    }
    setPendingDelete(null);
    showToast('동영상 강의가 삭제되었습니다.', 'success');
    void load();
  };

  const startEdit = (row: LectureRow) => {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description ?? '',
      youtube_url: row.youtube_url,
      sort_order: String(row.sort_order),
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4 mb-5">
          <div>
            <p className="text-xs font-black tracking-[0.28em] text-slate-400 mb-2">VIDEO LIBRARY</p>
            <h3 className="text-xl font-black text-slate-900">기존 대시보드 동영상 강의</h3>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
            내부 학습용
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">제목 *</label>
            <input
              type="text"
              value={form.title}
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">유튜브 URL *</label>
            <input
              type="text"
              value={form.youtube_url}
              onChange={(event) => setForm((prev) => ({ ...prev, youtube_url: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">설명</label>
            <input
              type="text"
              value={form.description}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">정렬 순서</label>
            <input
              type="number"
              value={form.sort_order}
              onChange={(event) => setForm((prev) => ({ ...prev, sort_order: event.target.value }))}
              className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || !form.title.trim() || !form.youtube_url.trim()}
            className="rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? '저장 중...' : editing ? '수정 저장' : '동영상 추가'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setForm(EMPTY_FORM);
              }}
              className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-black text-slate-600 transition-colors hover:bg-slate-200"
            >
              취소
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-xs font-black text-slate-500">동영상 목록 ({rows.length})</span>
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-500 hover:text-indigo-600"
            >
              새로고침
            </button>
          </div>
          {loading ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">불러오는 중...</div>
          ) : rows.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-400">등록된 동영상 강의가 없습니다.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {rows.map((row) => (
                <div key={row.id} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-bold ${row.is_active ? 'text-slate-900' : 'text-slate-400 line-through'}`}>
                        {row.title}
                      </p>
                      <button
                        type="button"
                        onClick={() => void toggleActive(row)}
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-black ${row.is_active ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-500'}`}
                      >
                        {row.is_active ? '공개' : '숨김'}
                      </button>
                    </div>
                    {row.description && <p className="text-xs text-slate-500 mb-1">{row.description}</p>}
                    <p className="truncate text-[11px] font-mono text-slate-400">{row.youtube_url}</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="rounded-xl bg-indigo-50 px-3 py-2 text-[11px] font-black text-indigo-700 hover:bg-indigo-100"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDelete(row)}
                      className="rounded-xl bg-rose-50 px-3 py-2 text-[11px] font-black text-rose-700 hover:bg-rose-100"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {pendingDelete && (
        <ConfirmModal
          title="동영상 강의 삭제"
          message={`"${pendingDelete.title}" 항목을 삭제하시겠습니까?`}
          tip="대시보드 동영상 강의 목록에서 즉시 제거됩니다."
          confirmLabel="삭제"
          confirmColor="rose"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
};

export default VideoLectureLibrarySection;
