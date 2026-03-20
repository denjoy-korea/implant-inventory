
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { DbBillingHistory, DbProfile, UserRole } from '../types';
import { decryptProfile } from '../services/mappers';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../hooks/useToast';

const ROLE_LABELS: Record<UserRole, { label: string; color: string }> = {
  admin: { label: '운영자', color: 'bg-rose-50 text-rose-600' },
  master: { label: '치과관리자', color: 'bg-indigo-50 text-indigo-600' },
  dental_staff: { label: '치과스태프', color: 'bg-emerald-50 text-emerald-600' },
  staff: { label: '개인회원', color: 'bg-slate-100 text-slate-600' },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: '활성', color: 'bg-emerald-50 text-emerald-600' },
  pending: { label: '대기', color: 'bg-amber-50 text-amber-600' },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  completed: { label: '완료', color: 'bg-emerald-50 text-emerald-600' },
  pending:   { label: '대기', color: 'bg-amber-50 text-amber-600' },
  failed:    { label: '실패', color: 'bg-rose-50 text-rose-600' },
  cancelled: { label: '취소', color: 'bg-slate-100 text-slate-500' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  card:         '신용카드',
  transfer:     '계좌이체',
  free:         '무료',
  trial:        '체험',
  credit:       '크레딧',
  plan_change:  '플랜 변경',
  admin_manual: '어드민 수동',
};

const PLAN_LABELS: Record<string, string> = {
  free: 'Free', basic: 'Basic', plus: 'Plus', business: 'Business',
};

function formatKRW(amount: number): string {
  return amount.toLocaleString('ko-KR') + '원';
}

interface PendingRoleChange {
  profileId: string;
  name: string;
  newRole: UserRole;
}

type AdminTab = 'users' | 'payments' | 'lectures';

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

const AdminPanel: React.FC = () => {
  const [tab, setTab] = useState<AdminTab>('users');

  // --- 회원 탭 ---
  const [profiles, setProfiles] = useState<DbProfile[]>([]);
  const [hospitals, setHospitals] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [pendingRoleChange, setPendingRoleChange] = useState<PendingRoleChange | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<{ profileId: string; email: string } | null>(null);
  const { showToast } = useToast();

  // --- 결제 탭 ---
  const [billingRows, setBillingRows] = useState<DbBillingHistory[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingFilter, setBillingFilter] = useState<string>('all');

  // --- 강의 탭 ---
  const [lectureRows, setLectureRows] = useState<LectureRow[]>([]);
  const [lectureLoading, setLectureLoading] = useState(false);
  const [lectureForm, setLectureForm] = useState<LectureForm>(EMPTY_FORM);
  const [lectureFormSaving, setLectureFormSaving] = useState(false);
  const [editingLecture, setEditingLecture] = useState<LectureRow | null>(null);
  const [pendingDeleteLecture, setPendingDeleteLecture] = useState<LectureRow | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const [profileRes, hospitalRes] = await Promise.all([
      supabase.rpc('get_all_profiles'),
      supabase.from('hospitals').select('id, name'),
    ]);

    if (profileRes.data) {
      const decrypted = await Promise.all((profileRes.data as DbProfile[]).map(decryptProfile));
      setProfiles(decrypted);
    }
    if (hospitalRes.data) {
      const map: Record<string, string> = {};
      hospitalRes.data.forEach((h: { id: string; name: string }) => { map[h.id] = h.name; });
      setHospitals(map);
    }
    setIsLoading(false);
  };

  const loadBilling = useCallback(async () => {
    setBillingLoading(true);
    const query = supabase
      .from('billing_history')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    if (billingFilter !== 'all') query.eq('payment_status', billingFilter);
    const { data } = await query;
    setBillingRows((data as DbBillingHistory[]) ?? []);
    setBillingLoading(false);
  }, [billingFilter]);

  useEffect(() => {
    if (tab === 'payments') loadBilling();
    if (tab === 'lectures') void loadLectures();
  }, [tab, loadBilling]);

  const loadLectures = async () => {
    setLectureLoading(true);
    const { data } = await supabase
      .from('lectures')
      .select('*')
      .order('sort_order', { ascending: true });
    setLectureRows((data ?? []) as LectureRow[]);
    setLectureLoading(false);
  };

  const saveLecture = async () => {
    if (!lectureForm.title.trim() || !lectureForm.youtube_url.trim()) return;
    setLectureFormSaving(true);
    const payload = {
      title: lectureForm.title.trim(),
      description: lectureForm.description.trim() || null,
      youtube_url: lectureForm.youtube_url.trim(),
      sort_order: parseInt(lectureForm.sort_order, 10) || 0,
    };
    if (editingLecture) {
      await supabase.from('lectures').update(payload).eq('id', editingLecture.id);
      setEditingLecture(null);
    } else {
      await supabase.from('lectures').insert({ ...payload, is_active: true });
    }
    setLectureForm(EMPTY_FORM);
    setLectureFormSaving(false);
    void loadLectures();
  };

  const toggleLectureActive = async (row: LectureRow) => {
    await supabase.from('lectures').update({ is_active: !row.is_active }).eq('id', row.id);
    void loadLectures();
  };

  const confirmDeleteLecture = async () => {
    if (!pendingDeleteLecture) return;
    await supabase.from('lectures').delete().eq('id', pendingDeleteLecture.id);
    setPendingDeleteLecture(null);
    void loadLectures();
  };

  const startEditLecture = (row: LectureRow) => {
    setEditingLecture(row);
    setLectureForm({
      title: row.title,
      description: row.description ?? '',
      youtube_url: row.youtube_url,
      sort_order: String(row.sort_order),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditLecture = () => {
    setEditingLecture(null);
    setLectureForm(EMPTY_FORM);
  };

  const updateRole = async (profileId: string, newRole: UserRole) => {
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', profileId);
      loadData();
    } catch {
      showToast('역할 변경에 실패했습니다. 다시 시도해 주세요.', 'error');
    }
  };

  const updateStatus = async (profileId: string, newStatus: 'active' | 'pending') => {
    await supabase.from('profiles').update({ status: newStatus }).eq('id', profileId);
    loadData();
  };

  const deleteUser = (profileId: string, email: string) => {
    setPendingDeleteUser({ profileId, email });
  };

  const confirmDeleteUser = async () => {
    if (!pendingDeleteUser) return;
    await supabase.from('profiles').delete().eq('id', pendingDeleteUser.profileId);
    setPendingDeleteUser(null);
    loadData();
  };

  const filteredProfiles = profiles.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = profiles.filter(p => p.status === 'active').length;
  const masterCount = profiles.filter(p => p.role === 'master').length;

  const completedPayments = billingRows.filter(r => r.payment_status === 'completed');
  const totalRevenue = completedPayments.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="max-w-6xl mx-auto my-10 px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* 탭 */}
      <div className="flex gap-1 mb-8 bg-slate-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab('users')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'users' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          회원 관리
        </button>
        <button
          onClick={() => setTab('payments')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'payments' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          결제 내역
        </button>
        <button
          onClick={() => setTab('lectures')}
          className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === 'lectures' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          강의 관리
        </button>
      </div>

      {/* 결제 탭 */}
      {tab === 'payments' && (
        <div>
          <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                결제 내역
              </h2>
              <p className="text-slate-500 mt-1">전체 병원의 결제 기록을 조회합니다.</p>
            </div>
            <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">전체</p>
                <p className="text-2xl font-black text-indigo-600">{billingRows.length}</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">완료</p>
                <p className="text-2xl font-black text-emerald-500">{completedPayments.length}</p>
              </div>
              <div className="w-px h-8 bg-slate-100" />
              <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">총 수익</p>
                <p className="text-2xl font-black text-violet-500">{formatKRW(totalRevenue)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
              <div className="flex gap-1">
                {(['all', 'completed', 'pending', 'failed', 'cancelled'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setBillingFilter(f)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${billingFilter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
                  >
                    {f === 'all' ? '전체' : (PAYMENT_STATUS_LABELS[f]?.label ?? f)}
                  </button>
                ))}
              </div>
              <button onClick={loadBilling} className="ml-auto p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all" title="새로고침">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

            {billingLoading ? (
              <div className="py-20 text-center text-slate-400">불러오는 중...</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                      <th className="px-5 py-3">병원</th>
                      <th className="px-5 py-3">플랜</th>
                      <th className="px-5 py-3">주기</th>
                      <th className="px-5 py-3">결제 수단</th>
                      <th className="px-5 py-3 text-right">금액</th>
                      <th className="px-5 py-3">상태</th>
                      <th className="px-5 py-3">참조번호</th>
                      <th className="px-5 py-3">비고</th>
                      <th className="px-5 py-3">일시</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {billingRows.map(row => {
                      const ps = PAYMENT_STATUS_LABELS[row.payment_status] ?? { label: row.payment_status, color: 'bg-slate-100 text-slate-500' };
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-700">
                            {row.hospital_id ? (hospitals[row.hospital_id] || row.hospital_id.slice(0, 8) + '…') : '-'}
                          </td>
                          <td className="px-5 py-3 text-slate-600">{PLAN_LABELS[row.plan] ?? row.plan}</td>
                          <td className="px-5 py-3 text-slate-500">{row.billing_cycle === 'yearly' ? '연간' : row.billing_cycle === 'monthly' ? '월간' : '-'}</td>
                          <td className="px-5 py-3 text-slate-500">{PAYMENT_METHOD_LABELS[row.payment_method] ?? row.payment_method ?? '-'}</td>
                          <td className="px-5 py-3 text-right font-bold text-slate-800">{formatKRW(row.amount)}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${ps.color}`}>{ps.label}</span>
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                            {row.payment_ref ? (
                              <span title={row.payment_ref}>{row.payment_ref.slice(0, 16)}{row.payment_ref.length > 16 ? '…' : ''}</span>
                            ) : '-'}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400 max-w-[140px]">
                            {row.description ? (
                              <span title={row.description} className="truncate block">
                                {row.description.length > 20 ? row.description.slice(0, 20) + '…' : row.description}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                            {new Date(row.created_at).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </td>
                        </tr>
                      );
                    })}
                    {billingRows.length === 0 && (
                      <tr><td colSpan={9} className="py-20 text-center text-slate-400">결제 내역이 없습니다.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 강의 관리 탭 */}
      {tab === 'lectures' && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.845v6.31a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">강의 관리</h2>
              <p className="text-slate-500 text-sm mt-0.5">회원에게 노출되는 동영상 강의를 추가·수정·삭제합니다.</p>
            </div>
          </div>

          {/* 추가/수정 폼 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="text-sm font-bold text-slate-700">{editingLecture ? '강의 수정' : '새 강의 추가'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">제목 *</label>
                <input
                  type="text"
                  placeholder="예: DenJOY 시작하기"
                  value={lectureForm.title}
                  onChange={e => setLectureForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">유튜브 URL *</label>
                <input
                  type="text"
                  placeholder="https://www.youtube.com/watch?v=..."
                  value={lectureForm.youtube_url}
                  onChange={e => setLectureForm(f => ({ ...f, youtube_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">설명 (선택)</label>
                <input
                  type="text"
                  placeholder="간략한 강의 소개"
                  value={lectureForm.description}
                  onChange={e => setLectureForm(f => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 mb-1 block">정렬 순서</label>
                <input
                  type="number"
                  placeholder="0"
                  value={lectureForm.sort_order}
                  onChange={e => setLectureForm(f => ({ ...f, sort_order: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => void saveLecture()}
                disabled={lectureFormSaving || !lectureForm.title.trim() || !lectureForm.youtube_url.trim()}
                className="px-5 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                {lectureFormSaving ? '저장 중...' : (editingLecture ? '수정 저장' : '강의 추가')}
              </button>
              {editingLecture && (
                <button
                  onClick={cancelEditLecture}
                  className="px-5 py-2 bg-slate-100 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-200 transition-all"
                >
                  취소
                </button>
              )}
            </div>
          </div>

          {/* 강의 목록 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">강의 목록 ({lectureRows.length})</span>
              <button onClick={() => void loadLectures()} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-all" title="새로고침">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
            {lectureLoading ? (
              <div className="py-16 text-center text-slate-400 text-sm">불러오는 중...</div>
            ) : lectureRows.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-sm">등록된 강의가 없습니다.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {lectureRows.map((row, idx) => (
                  <div key={row.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/50 transition-colors group">
                    <span className="text-xs font-black text-slate-300 w-5 text-center shrink-0">{idx + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${row.is_active ? 'text-slate-800' : 'text-slate-400 line-through'}`}>{row.title}</span>
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${row.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                          {row.is_active ? '공개' : '비공개'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{row.youtube_url}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={() => void toggleLectureActive(row)}
                        className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all text-xs font-bold"
                        title={row.is_active ? '비공개로 전환' : '공개로 전환'}
                      >
                        {row.is_active ? '숨김' : '공개'}
                      </button>
                      <button
                        onClick={() => startEditLecture(row)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                        title="수정"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setPendingDeleteLecture(row)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="삭제"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 회원 탭 */}
      {tab === 'users' && (
      <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            전체 회원 관리
          </h2>
          <p className="text-slate-500 mt-2">Supabase에 등록된 전체 회원을 관리합니다.</p>
        </div>

        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-6">
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">전체</p>
            <p className="text-2xl font-black text-indigo-600">{profiles.length}</p>
          </div>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">활성</p>
            <p className="text-2xl font-black text-emerald-500">{activeCount}</p>
          </div>
          <div className="w-px h-8 bg-slate-100"></div>
          <div className="text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">병원</p>
            <p className="text-2xl font-black text-violet-500">{masterCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="이름 또는 이메일로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all text-sm"
            />
          </div>
          <button
            onClick={loadData}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-white rounded-lg transition-all"
            title="새로고침"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {isLoading ? (
          <div className="px-6 py-20 text-center text-slate-400">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-6 py-4">사용자</th>
                  <th className="px-6 py-4">이메일</th>
                  <th className="px-6 py-4">연락처</th>
                  <th className="px-6 py-4">역할</th>
                  <th className="px-6 py-4">상태</th>
                  <th className="px-6 py-4">소속 병원</th>
                  <th className="px-6 py-4">가입일</th>
                  <th className="px-6 py-4 text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProfiles.map((p) => {
                  const role = ROLE_LABELS[p.role] || ROLE_LABELS.staff;
                  const status = STATUS_LABELS[p.status] || STATUS_LABELS.pending;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                            {p.name.charAt(0) || '?'}
                          </div>
                          <span className="font-semibold text-slate-700">{p.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">{p.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{p.phone || '-'}</td>
                      <td className="px-6 py-4">
                        <select
                          value={p.role}
                          onChange={(e) => {
                            const newRole = e.target.value as UserRole;
                            if (newRole === p.role) return;
                            setPendingRoleChange({ profileId: p.id, name: p.name, newRole });
                          }}
                          className={`text-xs font-bold px-2 py-1 rounded cursor-pointer border-0 ${role.color}`}
                        >
                          <option value="admin">운영자</option>
                          <option value="master">치과관리자</option>
                          <option value="dental_staff">치과스태프</option>
                          <option value="staff">개인회원</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => updateStatus(p.id, p.status === 'active' ? 'pending' : 'active')}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${status.color} hover:opacity-80 transition-opacity`}
                        >
                          {status.label}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {p.hospital_id ? hospitals[p.hospital_id] || p.hospital_id.slice(0, 8) : '-'}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400">
                        {new Date(p.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {p.role !== 'admin' && (
                          <button
                            onClick={() => deleteUser(p.id, p.email)}
                            className="text-slate-300 hover:text-rose-600 p-2 rounded-lg hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                            title="회원 삭제"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <svg className="w-12 h-12 text-slate-200 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <p className="text-slate-400 italic">등록된 회원이 없습니다.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <p>Admin Authorization Level: FULL</p>
        <p>Supabase DB Connected</p>
      </div>
      </div>
      )}

      {pendingRoleChange && (
        <ConfirmModal
          title="역할 변경 확인"
          message={`${pendingRoleChange.name}의 역할을 '${ROLE_LABELS[pendingRoleChange.newRole]?.label}'로 변경하시겠습니까?`}
          tip="이 작업은 해당 사용자의 접근 권한에 즉시 영향을 줍니다."
          confirmLabel="변경"
          confirmColor="rose"
          onConfirm={() => {
            updateRole(pendingRoleChange.profileId, pendingRoleChange.newRole);
            setPendingRoleChange(null);
          }}
          onCancel={() => setPendingRoleChange(null)}
        />
      )}
      {pendingDeleteUser && (
        <ConfirmModal
          title="사용자 삭제 확인"
          message={`${pendingDeleteUser.email} 사용자를 정말 삭제하시겠습니까?`}
          tip="이 작업은 되돌릴 수 없습니다."
          confirmLabel="삭제"
          confirmColor="rose"
          onConfirm={confirmDeleteUser}
          onCancel={() => setPendingDeleteUser(null)}
        />
      )}
      {pendingDeleteLecture && (
        <ConfirmModal
          title="강의 삭제 확인"
          message={`"${pendingDeleteLecture.title}" 강의를 삭제하시겠습니까?`}
          tip="삭제 후 복구할 수 없습니다."
          confirmLabel="삭제"
          confirmColor="rose"
          onConfirm={() => void confirmDeleteLecture()}
          onCancel={() => setPendingDeleteLecture(null)}
        />
      )}
    </div>
  );
};

export default AdminPanel;
