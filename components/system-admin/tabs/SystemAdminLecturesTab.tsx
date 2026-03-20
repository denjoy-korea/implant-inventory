import React, { useState, useEffect, useCallback } from 'react';
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

const EMPTY_FORM: LectureForm = { title: '', description: '', youtube_url: '', sort_order: '0' };

export default function SystemAdminLecturesTab() {
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

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!form.title.trim() || !form.youtube_url.trim()) return;
    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      youtube_url: form.youtube_url.trim(),
      sort_order: parseInt(form.sort_order, 10) || 0,
    };
    if (editing) {
      const { error } = await supabase.from('lectures').update(payload).eq('id', editing.id);
      if (error) { showToast('수정에 실패했습니다.', 'error'); }
      else { showToast('강의가 수정되었습니다.', 'success'); setEditing(null); }
    } else {
      const { error } = await supabase.from('lectures').insert({ ...payload, is_active: true });
      if (error) { showToast('추가에 실패했습니다.', 'error'); }
      else { showToast('강의가 추가되었습니다.', 'success'); }
    }
    setForm(EMPTY_FORM);
    setSaving(false);
    void load();
  };

  const toggleActive = async (row: LectureRow) => {
    await supabase.from('lectures').update({ is_active: !row.is_active }).eq('id', row.id);
    void load();
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    await supabase.from('lectures').delete().eq('id', pendingDelete.id);
    setPendingDelete(null);
    showToast('강의가 삭제되었습니다.', 'success');
    void load();
  };

  const startEdit = (row: LectureRow) => {
    setEditing(row);
    setForm({ title: row.title, description: row.description ?? '', youtube_url: row.youtube_url, sort_order: String(row.sort_order) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => { setEditing(null); setForm(EMPTY_FORM); };

  return (
    <div className="space-y-4">
      {/* 폼 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
          </svg>
          <h2 className="text-sm font-bold text-slate-700">{editing ? '강의 수정' : '새 강의 추가'}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">제목 *</label>
            <input type="text" placeholder="예: DenJOY 시작하기" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">유튜브 URL *</label>
            <input type="text" placeholder="https://www.youtube.com/watch?v=..." value={form.youtube_url}
              onChange={e => setForm(f => ({ ...f, youtube_url: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">설명 (선택)</label>
            <input type="text" placeholder="간략한 강의 소개" value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
          <div>
            <label className="text-[11px] font-bold text-slate-400 mb-1 block">정렬 순서</label>
            <input type="number" placeholder="0" value={form.sort_order}
              onChange={e => setForm(f => ({ ...f, sort_order: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => void save()}
            disabled={saving || !form.title.trim() || !form.youtube_url.trim()}
            className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            {saving ? '저장 중...' : (editing ? '수정 저장' : '강의 추가')}
          </button>
          {editing && (
            <button onClick={cancelEdit}
              className="px-4 py-2 bg-slate-100 text-slate-600 text-xs font-bold rounded-xl hover:bg-slate-200 transition-colors">
              취소
            </button>
          )}
        </div>
      </div>

      {/* 목록 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500">강의 목록 ({rows.length})</span>
          <button onClick={() => void load()} className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors" title="새로고침">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">등록된 강의가 없습니다.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-5 py-2.5 text-left text-xs font-bold text-slate-500 w-8">#</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500">제목</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500">URL</th>
                <th className="px-4 py-2.5 text-left text-xs font-bold text-slate-500 w-20">상태</th>
                <th className="px-4 py-2.5 text-right text-xs font-bold text-slate-500 w-28">액션</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, idx) => (
                <tr key={row.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="px-5 py-3 text-xs font-black text-slate-300">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <p className={`font-semibold text-xs ${row.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{row.title}</p>
                    {row.description && <p className="text-[11px] text-slate-400 mt-0.5">{row.description}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] text-slate-400 font-mono truncate block max-w-[200px]">{row.youtube_url}</span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => void toggleActive(row)}
                      className={`inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full transition-colors ${row.is_active ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${row.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {row.is_active ? '공개' : '숨김'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(row)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="수정">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => setPendingDelete(row)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="삭제">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {pendingDelete && (
        <ConfirmModal
          title="강의 삭제 확인"
          message={`"${pendingDelete.title}" 강의를 삭제하시겠습니까?`}
          tip="삭제 후 복구할 수 없습니다."
          confirmLabel="삭제"
          confirmColor="rose"
          onConfirm={() => void confirmDelete()}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}
