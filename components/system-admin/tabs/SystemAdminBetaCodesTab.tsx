import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { betaInviteService, BetaInviteCodeRow } from '../../../services/betaInviteService';
import { useToast } from '../../../hooks/useToast';
import { getBetaSignupPolicy } from '../../../utils/betaSignupPolicy';

function formatDateTime(value: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString('ko-KR', { hour12: false });
}

const SystemAdminBetaCodesTab: React.FC = () => {
  const policy = useMemo(() => getBetaSignupPolicy(), []);
  const [codes, setCodes] = useState<BetaInviteCodeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [distributedTo, setDistributedTo] = useState('');
  const [distributedContact, setDistributedContact] = useState('');
  const [note, setNote] = useState('');
  const [usageMode, setUsageMode] = useState<'single' | 'unlimited'>('single');
  const [editDistributedTo, setEditDistributedTo] = useState('');
  const [editDistributedContact, setEditDistributedContact] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editUsageMode, setEditUsageMode] = useState<'single' | 'unlimited'>('single');
  const { toast, showToast } = useToast();

  const usageModeLabel = (mode: 'single' | 'unlimited') => (
    mode === 'unlimited' ? '무제한' : '1회용'
  );

  const loadCodes = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await betaInviteService.listCodes();
      setCodes(rows);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '베타 코드 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const activeCount = useMemo(
    () => codes.filter((row) => row.is_active).length,
    [codes],
  );

  const handleCreateCode = async () => {
    setCreating(true);
    try {
      const created = await betaInviteService.createCode({
        distributedTo,
        distributedContact,
        note,
        usageMode,
      });
      setCodes((prev) => [created, ...prev]);
      setDistributedTo('');
      setDistributedContact('');
      setNote('');
      setUsageMode('single');
      try {
        await navigator.clipboard.writeText(created.code);
        showToast(`코드 생성 완료: ${created.code} (클립보드 복사됨)`, 'success');
      } catch {
        showToast(`코드 생성 완료: ${created.code}`, 'success');
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : '코드 생성에 실패했습니다.', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      showToast(`코드 복사 완료: ${code}`, 'success');
    } catch {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  const handleToggleActive = async (row: BetaInviteCodeRow) => {
    setTogglingId(row.id);
    try {
      await betaInviteService.setCodeActive(row.id, !row.is_active);
      setCodes((prev) => prev.map((item) => (
        item.id === row.id
          ? { ...item, is_active: !row.is_active, updated_at: new Date().toISOString() }
          : item
      )));
      showToast(`코드 상태가 ${row.is_active ? '비활성화' : '활성화'}되었습니다.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '코드 상태 변경에 실패했습니다.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleStartEdit = (row: BetaInviteCodeRow) => {
    setEditingId(row.id);
    setEditDistributedTo(row.distributed_to || '');
    setEditDistributedContact(row.distributed_contact || '');
    setEditNote(row.note || '');
    setEditUsageMode(row.usage_mode || 'single');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDistributedTo('');
    setEditDistributedContact('');
    setEditNote('');
    setEditUsageMode('single');
  };

  const handleSaveEdit = async (rowId: string) => {
    setSavingEditId(rowId);
    try {
      const updated = await betaInviteService.updateCodeMeta(rowId, {
        distributedTo: editDistributedTo,
        distributedContact: editDistributedContact,
        note: editNote,
        usageMode: editUsageMode,
      });
      setCodes((prev) => prev.map((item) => (item.id === rowId ? updated : item)));
      showToast('배포 대상 정보가 저장되었습니다.', 'success');
      handleCancelEdit();
    } catch (error) {
      showToast(error instanceof Error ? error.message : '배포 정보 저장에 실패했습니다.', 'error');
    } finally {
      setSavingEditId(null);
    }
  };

  const handleDeleteCode = async (row: BetaInviteCodeRow) => {
    const confirmed = window.confirm(`코드 ${row.code} 를 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.`);
    if (!confirmed) return;

    setDeletingId(row.id);
    try {
      await betaInviteService.deleteCode(row.id);
      setCodes((prev) => prev.filter((item) => item.id !== row.id));
      if (editingId === row.id) {
        handleCancelEdit();
      }
      showToast('코드가 삭제되었습니다.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '코드 삭제에 실패했습니다.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-indigo-200 bg-indigo-50 px-5 py-4">
          <p className="text-xs font-bold text-indigo-500 uppercase tracking-wider">가입 정책</p>
          <p className="mt-2 text-sm font-black text-indigo-800">
            {policy.requiresInviteCode ? '코드 필수 기간 진행 중' : '코드 제한 해제됨'}
          </p>
          <p className="mt-1 text-xs text-indigo-700 leading-relaxed">
            베타 기간: ~ {policy.endDateText}<br />
            자유 가입 시작: {policy.openDateText}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4">
          <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">활성 코드</p>
          <p className="mt-2 text-2xl font-black text-emerald-700">{activeCount}</p>
          <p className="mt-1 text-xs text-emerald-700">현재 회원가입 통과에 사용 가능한 코드 수</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">총 코드</p>
          <p className="mt-2 text-2xl font-black text-slate-800">{codes.length}</p>
          <p className="mt-1 text-xs text-slate-500">운영자가 발급한 전체 베타 초대 코드</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-800">베타 코드 생성</h3>
            <p className="text-xs text-slate-500 mt-1">생성 버튼을 누르면 코드가 자동 생성됩니다. 배포 대상 정보를 함께 기록하세요.</p>
          </div>
          <button
            type="button"
            onClick={handleCreateCode}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {creating ? '생성 중...' : '생성하기'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            value={distributedTo}
            onChange={(event) => setDistributedTo(event.target.value)}
            placeholder="배포 대상 (예: 김원장)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <input
            value={distributedContact}
            onChange={(event) => setDistributedContact(event.target.value)}
            placeholder="연락처/이메일 (선택)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="메모 (선택)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
          <select
            value={usageMode}
            onChange={(event) => setUsageMode(event.target.value === 'unlimited' ? 'unlimited' : 'single')}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="single">1회용 코드</option>
            <option value="unlimited">무제한 코드</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-800">발급 코드 목록</h3>
          <button
            type="button"
            onClick={() => void loadCodes()}
            className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            새로고침
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">불러오는 중...</div>
        ) : codes.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">생성된 베타 코드가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">코드</th>
                  <th className="px-4 py-3 text-left font-bold">배포 대상</th>
                  <th className="px-4 py-3 text-left font-bold">사용정책</th>
                  <th className="px-4 py-3 text-left font-bold">상태</th>
                  <th className="px-4 py-3 text-left font-bold">검증</th>
                  <th className="px-4 py-3 text-left font-bold">생성일</th>
                  <th className="px-4 py-3 text-right font-bold">작업</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {codes.map((row) => {
                  const isEditing = editingId === row.id;
                  return (
                    <tr key={row.id} className="text-slate-700">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <code className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700">{row.code}</code>
                          <button
                            type="button"
                            onClick={() => void handleCopyCode(row.code)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
                          >
                            복사
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-2 min-w-[240px]">
                            <input
                              value={editDistributedTo}
                              onChange={(event) => setEditDistributedTo(event.target.value)}
                              placeholder="배포 대상 (예: 김원장)"
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                            <input
                              value={editDistributedContact}
                              onChange={(event) => setEditDistributedContact(event.target.value)}
                              placeholder="연락처/이메일"
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                            <input
                              value={editNote}
                              onChange={(event) => setEditNote(event.target.value)}
                              placeholder="메모"
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            />
                            <select
                              value={editUsageMode}
                              onChange={(event) => setEditUsageMode(event.target.value === 'unlimited' ? 'unlimited' : 'single')}
                              className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-700 focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                            >
                              <option value="single">1회용 코드</option>
                              <option value="unlimited">무제한 코드</option>
                            </select>
                          </div>
                        ) : (
                          <>
                            <p className="font-semibold text-slate-800">{row.distributed_to || '-'}</p>
                            <p className="text-[11px] text-slate-500">{row.distributed_contact || '-'}</p>
                            {row.note && <p className="text-[11px] text-slate-500 mt-0.5">{row.note}</p>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${
                          row.usage_mode === 'unlimited'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {usageModeLabel(row.usage_mode || 'single')}
                        </span>
                        {row.usage_mode === 'single' && row.used_at && (
                          <p className="mt-1 text-[10px] text-rose-500 font-semibold">사용 완료</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${row.is_active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                          {row.is_active ? '활성' : '비활성'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-bold text-slate-700">{row.verify_count}회</p>
                        <p className="text-[11px] text-slate-500">{formatDateTime(row.last_verified_at)}</p>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-slate-500">{formatDateTime(row.created_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                disabled={savingEditId === row.id}
                                onClick={() => void handleSaveEdit(row.id)}
                                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
                              >
                                {savingEditId === row.id ? '저장 중...' : '저장'}
                              </button>
                              <button
                                type="button"
                                disabled={savingEditId === row.id}
                                onClick={handleCancelEdit}
                                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
                              >
                                취소
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={deletingId === row.id}
                                onClick={() => handleStartEdit(row)}
                                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                              >
                                정보수정
                              </button>
                              <button
                                type="button"
                                disabled={togglingId === row.id || deletingId === row.id}
                                onClick={() => void handleToggleActive(row)}
                                className={`inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors disabled:opacity-50 ${row.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'}`}
                              >
                                {togglingId === row.id ? '처리 중...' : row.is_active ? '비활성화' : '활성화'}
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === row.id}
                                onClick={() => void handleDeleteCode(row)}
                                className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-[11px] font-bold transition-colors bg-rose-50 text-rose-600 hover:bg-rose-100 disabled:opacity-50"
                              >
                                {deletingId === row.id ? '삭제 중...' : '삭제'}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[260] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default SystemAdminBetaCodesTab;
