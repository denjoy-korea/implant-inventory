import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../../services/supabaseClient';
import { DbBillingHistory } from '../../../types';

const PAYMENT_STATUS: Record<string, { label: string; color: string }> = {
  completed: { label: '완료', color: 'bg-emerald-50 text-emerald-600' },
  pending:   { label: '대기', color: 'bg-amber-50 text-amber-600' },
  failed:    { label: '실패', color: 'bg-rose-50 text-rose-600' },
  cancelled: { label: '취소', color: 'bg-slate-100 text-slate-500' },
};

const PAYMENT_METHOD: Record<string, string> = {
  card: '신용카드',
  transfer: '계좌이체',
  free: '무료',
  trial: '체험',
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Free', basic: 'Basic', plus: 'Plus', business: 'Business',
};

function krw(amount: number) {
  return amount.toLocaleString('ko-KR') + '원';
}

const SystemAdminBillingTab: React.FC = () => {
  const [rows, setRows] = useState<DbBillingHistory[]>([]);
  const [hospitals, setHospitals] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [hospitalFilter, setHospitalFilter] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [billingRes, hospitalRes] = await Promise.all([
      (() => {
        const q = supabase
          .from('billing_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(500);
        if (filter !== 'all') q.eq('payment_status', filter);
        return q;
      })(),
      supabase.from('hospitals').select('id, name'),
    ]);

    setRows((billingRes.data as DbBillingHistory[]) ?? []);

    if (hospitalRes.data) {
      const map: Record<string, string> = {};
      hospitalRes.data.forEach((h: { id: string; name: string }) => { map[h.id] = h.name; });
      setHospitals(map);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = useCallback(async (id: string) => {
    if (!window.confirm('이 결제 내역을 삭제하시겠습니까? (테스트 전용)')) return;
    setDeletingId(id);
    const { error } = await supabase.from('billing_history').delete().eq('id', id);
    if (error) {
      alert('삭제 실패: ' + error.message);
    } else {
      setRows(prev => prev.filter(r => r.id !== id));
    }
    setDeletingId(null);
  }, []);

  const displayRows = hospitalFilter
    ? rows.filter(r => (r.hospital_id_snapshot || r.hospital_id) === hospitalFilter.id)
    : rows;

  const completed = rows.filter(r => r.payment_status === 'completed');
  const totalRevenue = completed.reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      {/* KPI */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '전체 건수', value: rows.length, color: 'text-indigo-600' },
          { label: '완료 건수', value: completed.length, color: 'text-emerald-500' },
          { label: '총 수익', value: krw(totalRevenue), color: 'text-violet-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-2xl border border-slate-200 px-6 py-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{k.label}</p>
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* 필터 툴바 */}
        <div className="flex items-center gap-2 p-4 border-b border-slate-100 bg-slate-50">
          {(['all', 'completed', 'pending', 'failed', 'cancelled'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filter === f ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'}`}
            >
              {f === 'all' ? '전체' : (PAYMENT_STATUS[f]?.label ?? f)}
            </button>
          ))}
          {hospitalFilter && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
              {hospitalFilter.name}
              <button onClick={() => setHospitalFilter(null)} className="ml-1 hover:text-indigo-900">✕</button>
            </div>
          )}
          <button onClick={load} className={`${hospitalFilter ? '' : 'ml-auto'} p-2 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-white transition-all`} title="새로고침">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50/50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                  <th className="px-5 py-3">병원</th>
                  <th className="px-5 py-3">플랜</th>
                  <th className="px-5 py-3">주기</th>
                  <th className="px-5 py-3">결제 수단</th>
                  <th className="px-5 py-3 text-right">금액</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">결제 참조번호</th>
                  <th className="px-5 py-3 whitespace-nowrap">일시</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayRows.map(row => {
                  const ps = PAYMENT_STATUS[row.payment_status] ?? { label: row.payment_status, color: 'bg-slate-100 text-slate-500' };
                  const hospitalName = row.hospital_id ? (hospitals[row.hospital_id] || row.hospital_id.slice(0, 8) + '…') : '-';
                  const displayName = row.hospital_name_snapshot || hospitalName;
                  const snapshotId = row.hospital_id_snapshot || row.hospital_id;
                  const isFiltered = hospitalFilter?.id === snapshotId;
                  const phoneLast4 = row.phone_last4_snapshot;
                  return (
                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${isFiltered ? 'bg-indigo-50/30' : ''}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => snapshotId && setHospitalFilter(isFiltered ? null : { id: snapshotId, name: displayName })}
                            className="font-medium text-slate-700 hover:text-indigo-600 text-left transition-colors"
                            title={snapshotId ? '이 병원만 보기' : undefined}
                          >
                            {displayName}
                          </button>
                          {row.hospital_id === null && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-400">탈퇴</span>
                          )}
                        </div>
                        {phoneLast4 && (
                          <div className="text-[10px] text-slate-400 mt-0.5">☎ ****-{phoneLast4}</div>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-600">{PLAN_LABEL[row.plan] ?? row.plan}</td>
                      <td className="px-5 py-3 text-slate-500">
                        {row.billing_cycle === 'yearly' ? '연간' : row.billing_cycle === 'monthly' ? '월간' : '-'}
                      </td>
                      <td className="px-5 py-3 text-slate-500">{PAYMENT_METHOD[row.payment_method ?? ''] ?? (row.payment_method ?? '-')}</td>
                      <td className="px-5 py-3 text-right font-bold text-slate-800">{krw(row.amount)}</td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${ps.color}`}>{ps.label}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono">
                        {row.payment_ref
                          ? <span title={row.payment_ref}>{row.payment_ref.slice(0, 18)}{row.payment_ref.length > 18 ? '…' : ''}</span>
                          : (row.description ?? '-')}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors disabled:opacity-40"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {displayRows.length === 0 && (
                  <tr><td colSpan={9} className="py-16 text-center text-slate-400 text-sm">{hospitalFilter ? `"${hospitalFilter.name}" 결제 내역이 없습니다.` : '결제 내역이 없습니다.'}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SystemAdminBillingTab;
