import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { betaInviteService, BetaInviteCodeRow, CodeType } from '../../../services/betaInviteService';
import { couponService, CouponTemplate, UserCoupon, CouponStats, RedemptionStats, ChannelStat } from '../../../services/couponService';
import { useToast } from '../../../hooks/useToast';
import { getBetaSignupPolicy } from '../../../utils/betaSignupPolicy';
import ConfirmModal from '../../ConfirmModal';
import CouponTemplateSection from './code-management/CouponTemplateSection';
import CouponLookupSection from './code-management/CouponLookupSection';
import CouponStatsSection from './code-management/CouponStatsSection';

const CODE_TYPE_LABELS: Record<CodeType, string> = {
  beta: '베타코드',
  partner: '제휴코드',
  promo: '프로모코드',
  referral: '초대코드',
};

const CODE_TYPE_COLORS: Record<CodeType, string> = {
  beta: 'bg-blue-50 text-blue-700 border-blue-200',
  partner: 'bg-violet-50 text-violet-700 border-violet-200',
  promo: 'bg-orange-50 text-orange-700 border-orange-200',
  referral: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

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
  const [confirmDeleteRow, setConfirmDeleteRow] = useState<BetaInviteCodeRow | null>(null);
  const [codeType, setCodeType] = useState<CodeType>('beta');
  const [channel, setChannel] = useState('');
  const [filterType, setFilterType] = useState<CodeType | ''>('');
  const [distributedTo, setDistributedTo] = useState('');
  const [distributedContact, setDistributedContact] = useState('');
  const [note, setNote] = useState('');
  const [usageMode, setUsageMode] = useState<'single' | 'unlimited'>('single');
  const [editDistributedTo, setEditDistributedTo] = useState('');
  const [editDistributedContact, setEditDistributedContact] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editUsageMode, setEditUsageMode] = useState<'single' | 'unlimited'>('single');
  // ── 쿠폰 관련 상태 ──
  const [templates, setTemplates] = useState<CouponTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [userCoupons, setUserCoupons] = useState<UserCoupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [couponHospitalId, setCouponHospitalId] = useState('');

  // ── 통계 상태 ──
  const [couponStats, setCouponStats] = useState<CouponStats | null>(null);
  const [redemptionStats, setRedemptionStats] = useState<RedemptionStats | null>(null);
  const [channelStats, setChannelStats] = useState<ChannelStat[]>([]);

  const { toast, showToast } = useToast();

  const usageModeLabel = (mode: 'single' | 'unlimited') => (
    mode === 'unlimited' ? '무제한' : '1회용'
  );

  const loadCodes = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await betaInviteService.listCodes(filterType || undefined);
      setCodes(rows);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '코드 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, filterType]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  // ── 쿠폰 템플릿 로드 ──
  const loadTemplates = useCallback(async () => {
    setTemplatesLoading(true);
    try {
      const rows = await couponService.listTemplates();
      setTemplates(rows);
    } catch {
      showToast('쿠폰 템플릿 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setTemplatesLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    void loadTemplates();
  }, [loadTemplates]);

  // ── 통계 로드 ──
  const loadStats = useCallback(async () => {
    try {
      const [cs, rs, chs] = await Promise.all([
        couponService.getCouponStats(),
        couponService.getRedemptionStats(),
        couponService.getChannelStats(),
      ]);
      setCouponStats(cs);
      setRedemptionStats(rs);
      setChannelStats(chs);
    } catch {
      // 통계 실패해도 페이지 동작에 영향 없음
    }
  }, []);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  const handleCreateTemplate = async (params: {
    name: string;
    description?: string;
    discountType: 'percentage' | 'fixed_amount';
    discountValue: number;
    maxUses: number;
    validDays: number | null;
  }) => {
    if (!params.name.trim()) {
      showToast('템플릿 이름을 입력하세요.', 'error');
      return;
    }
    try {
      const created = await couponService.createTemplate({
        name: params.name,
        description: params.description,
        discountType: params.discountType,
        discountValue: params.discountValue,
        maxUses: params.maxUses,
        validDays: params.validDays,
      });
      setTemplates((prev) => [created, ...prev]);
      showToast('쿠폰 템플릿이 생성되었습니다.', 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '템플릿 생성에 실패했습니다.', 'error');
    }
  };

  const handleToggleTemplate = async (tpl: CouponTemplate) => {
    try {
      const updated = await couponService.updateTemplate(tpl.id, { isActive: !tpl.is_active });
      setTemplates((prev) => prev.map((t) => (t.id === tpl.id ? updated : t)));
      showToast(`템플릿이 ${tpl.is_active ? '비활성화' : '활성화'}되었습니다.`, 'success');
    } catch {
      showToast('템플릿 상태 변경에 실패했습니다.', 'error');
    }
  };

  const handleSearchCoupons = async () => {
    if (!couponHospitalId.trim()) {
      showToast('병원 ID를 입력하세요.', 'error');
      return;
    }
    setCouponsLoading(true);
    try {
      const rows = await couponService.listUserCoupons(couponHospitalId.trim());
      setUserCoupons(rows);
    } catch {
      showToast('쿠폰 목록을 불러오지 못했습니다.', 'error');
    } finally {
      setCouponsLoading(false);
    }
  };

  const handleRevokeCoupon = async (couponId: string) => {
    try {
      await couponService.revokeCoupon(couponId);
      setUserCoupons((prev) => prev.map((c) =>
        c.id === couponId ? { ...c, status: 'revoked' as const } : c
      ));
      showToast('쿠폰이 회수되었습니다.', 'success');
    } catch {
      showToast('쿠폰 회수에 실패했습니다.', 'error');
    }
  };

  const activeCount = useMemo(
    () => codes.filter((row) => row.is_active).length,
    [codes],
  );

  const handleCopyCode = async (code: string) => {
    // 1차: Clipboard API
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(code);
        showToast(`코드 복사 완료: ${code}`, 'success');
        return;
      } catch {
        // 포커스 없음 등으로 실패 시 execCommand 폴백
      }
    }
    // 2차: execCommand 폴백 (구형 브라우저 / 포커스 없는 경우)
    try {
      const el = document.createElement('textarea');
      el.value = code;
      el.style.position = 'fixed';
      el.style.opacity = '0';
      document.body.appendChild(el);
      el.focus();
      el.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(el);
      if (ok) {
        showToast(`코드 복사 완료: ${code}`, 'success');
      } else {
        showToast('클립보드 복사에 실패했습니다.', 'error');
      }
    } catch {
      showToast('클립보드 복사에 실패했습니다.', 'error');
    }
  };

  const handleCreateCode = async () => {
    if (codeType === 'partner' && !channel.trim()) {
      showToast('제휴코드는 채널명을 입력해야 합니다.', 'error');
      return;
    }
    setCreating(true);
    try {
      const created = await betaInviteService.createCode({
        codeType,
        channel: channel.trim() || undefined,
        distributedTo,
        distributedContact,
        note,
        usageMode,
      });
      setCodes((prev) => [created, ...prev]);
      setDistributedTo('');
      setDistributedContact('');
      setNote('');
      setChannel('');
      setUsageMode('single');
      await handleCopyCode(created.code);
    } catch (error) {
      showToast(error instanceof Error ? error.message : '코드 생성에 실패했습니다.', 'error');
    } finally {
      setCreating(false);
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
    setConfirmDeleteRow(row);
  };

  const handleDeleteCodeConfirmed = async () => {
    const row = confirmDeleteRow;
    if (!row) return;
    setConfirmDeleteRow(null);
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
          <p className="mt-1 text-xs text-slate-500">
            베타 {codes.filter(c => c.code_type === 'beta').length} / 제휴 {codes.filter(c => c.code_type === 'partner').length} / 프로모 {codes.filter(c => c.code_type === 'promo').length}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-800">코드 생성</h3>
            <p className="text-xs text-slate-500 mt-1">코드 타입을 선택하고 생성 버튼을 누르면 코드가 자동 생성됩니다.</p>
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

        <div className="flex gap-2">
          {(['beta', 'partner', 'promo'] as CodeType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setCodeType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                codeType === t
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
              }`}
            >
              {CODE_TYPE_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {codeType === 'partner' && (
            <input
              value={channel}
              onChange={(event) => setChannel(event.target.value)}
              placeholder="채널명 * (예: 유튜브닥터림)"
              className="w-full rounded-xl border border-violet-300 bg-violet-50 px-3 py-2 text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          )}
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
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-black text-slate-800">발급 코드 목록</h3>
            <select
              value={filterType}
              onChange={(event) => setFilterType(event.target.value as CodeType | '')}
              className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 focus:outline-none focus:border-indigo-400"
            >
              <option value="">전체 타입</option>
              <option value="beta">베타코드</option>
              <option value="partner">제휴코드</option>
              <option value="promo">프로모코드</option>
            </select>
          </div>
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
          <div className="px-5 py-12 text-center text-sm text-slate-400">생성된 코드가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">타입</th>
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
                        <span className={`inline-flex px-2 py-1 rounded-full text-[10px] font-bold border ${CODE_TYPE_COLORS[row.code_type || 'beta']}`}>
                          {CODE_TYPE_LABELS[row.code_type || 'beta']}
                        </span>
                        {row.channel && (
                          <p className="mt-1 text-[10px] text-violet-600 font-semibold">{row.channel}</p>
                        )}
                      </td>
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

      {/* ── 쿠폰 템플릿 관리 ── */}
      <CouponTemplateSection
        templates={templates}
        templatesLoading={templatesLoading}
        onCreateTemplate={handleCreateTemplate}
        onToggleTemplate={handleToggleTemplate}
      />

      {/* ── 발급 쿠폰 조회 ── */}
      <CouponLookupSection
        userCoupons={userCoupons}
        couponsLoading={couponsLoading}
        couponHospitalId={couponHospitalId}
        onHospitalIdChange={setCouponHospitalId}
        onSearch={handleSearchCoupons}
        onRevoke={handleRevokeCoupon}
      />

      {/* ── 운영 통계 ── */}
      <CouponStatsSection
        couponStats={couponStats}
        redemptionStats={redemptionStats}
        channelStats={channelStats}
      />

      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[260] px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      {confirmDeleteRow && (
        <ConfirmModal
          title="코드 삭제"
          message={`코드 "${confirmDeleteRow.code}"를 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`}
          onConfirm={handleDeleteCodeConfirmed}
          onCancel={() => setConfirmDeleteRow(null)}
        />
      )}
    </div>
  );
};

export default SystemAdminBetaCodesTab;
