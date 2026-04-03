
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { DbBillingHistory, DbProfile, UserRole } from '../types';
import { decryptProfile } from '../services/mappers';
import ConfirmModal from './ConfirmModal';
import { useToast } from '../hooks/useToast';
import SystemAdminLecturesTab from './system-admin/tabs/SystemAdminLecturesTab';

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
  }, [tab, loadBilling]);

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
        <SystemAdminLecturesTab />
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
    </div>
  );
};

export default AdminPanel;
