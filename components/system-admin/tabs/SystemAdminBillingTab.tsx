import React, { useState } from 'react';
import { useAdminBilling } from '../../../hooks/admin/useAdminBilling';

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  completed: { label: '완료',   color: 'bg-emerald-50 text-emerald-600' },
  pending:   { label: '대기',   color: 'bg-amber-50 text-amber-600' },
  failed:    { label: '실패',   color: 'bg-rose-50 text-rose-600' },
  cancelled: { label: '취소',   color: 'bg-slate-100 text-slate-500' },
  refunded:  { label: '환불',   color: 'bg-purple-50 text-purple-600' },
};

const STATUS_CHECKBOXES = [
  { key: 'completed', label: '결제완료' },
  { key: 'cancelled', label: '취소' },
  { key: 'refunded',  label: '부분취소/환불' },
  { key: 'pending',   label: '입금대기' },
  { key: 'failed',    label: '실패' },
] as const;

const PAYMENT_METHOD: Record<string, string> = {
  card:            '신용카드',
  transfer:        '계좌이체',
  free:            '무료',
  trial:           '체험',
  admin_manual:    '관리자',
  plan_change:     '플랜변경',
  self_cancel:     '해지',
  credit_only:     '크레딧',
  payment_teacher: '-',
};

const PLAN_LABEL: Record<string, string> = {
  free: 'Free', basic: 'Basic', plus: 'Plus', business: 'Business',
};

type PresetKey = 'day' | 'week' | 'month1' | 'month3' | 'month6';

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: 'day',    label: '당일' },
  { key: 'week',   label: '1주일' },
  { key: 'month1', label: '1개월' },
  { key: 'month3', label: '3개월' },
  { key: 'month6', label: '6개월' },
];

function krw(amount: number) {
  return amount.toLocaleString('ko-KR') + '원';
}

const SystemAdminBillingTab: React.FC = () => {
  const {
    displayRows,
    hospitals,
    loading,
    statusSet,
    toggleStatus,
    dateStart, setDateStart,
    dateEnd, setDateEnd,
    nameSearch, setNameSearch,
    phoneSearch, setPhoneSearch,
    deletingId,
    hospitalFilter, setHospitalFilter,
    kpi,
    load,
    handleDelete,
    handleExcelDownload,
  } = useAdminBilling();

  const [preset, setPreset] = useState<PresetKey | null>('week');

  function applyPreset(p: PresetKey) {
    setPreset(p);
    const end = new Date();
    const start = new Date();
    if (p === 'week')   start.setDate(end.getDate() - 7);
    else if (p === 'month1') start.setMonth(end.getMonth() - 1);
    else if (p === 'month3') start.setMonth(end.getMonth() - 3);
    else if (p === 'month6') start.setMonth(end.getMonth() - 6);
    setDateStart(start.toISOString().slice(0, 10));
    setDateEnd(end.toISOString().slice(0, 10));
  }

  return (
    <div className="space-y-5">
      {/* KPI 카드 (5개) — 항상 전체 기준, 테스트 결제 제외 */}
      <div className="grid grid-cols-5 gap-3">
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">전체 건수</p>
          <p className="text-2xl font-black text-indigo-600">{kpi.totalCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">완료</p>
          <p className="text-2xl font-black text-emerald-500">{kpi.completedCount}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">순 수익</p>
          <p className="text-2xl font-black text-violet-500">{krw(kpi.netRevenue)}</p>
          {kpi.totalRefunds > 0 && (
            <p className="text-[10px] text-slate-400 mt-0.5">총액 {krw(kpi.grossRevenue)} − 환불 {krw(kpi.totalRefunds)}</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">환불</p>
          <p className="text-2xl font-black text-purple-500">{krw(kpi.totalRefunds)}</p>
          {kpi.refundedCount > 0 && (
            <p className="text-[10px] text-slate-400 mt-0.5">{kpi.refundedCount}건</p>
          )}
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 px-5 py-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">대기/취소</p>
          <p className="text-2xl font-black text-amber-500">{kpi.pendingCount + kpi.cancelledCount}</p>
          {(kpi.pendingCount > 0 || kpi.cancelledCount > 0) && (
            <p className="text-[10px] text-slate-400 mt-0.5">대기 {kpi.pendingCount} · 취소 {kpi.cancelledCount}</p>
          )}
        </div>
      </div>

      {/* 검색 필터 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden text-sm">
        <table className="w-full border-collapse">
          <tbody>
            {/* 거래일시 */}
            <tr className="border-b border-slate-200">
              <td className="bg-indigo-50 px-5 py-3 w-[120px] font-medium text-indigo-700 text-center align-middle border-r border-slate-200 whitespace-nowrap">
                거래일시
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="date"
                    value={dateStart}
                    onChange={e => { setDateStart(e.target.value); setPreset(null); }}
                    className="border border-slate-200 rounded px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                  />
                  <span className="text-slate-400 text-xs">00:00</span>
                  <span className="text-slate-400">→</span>
                  <input
                    type="date"
                    value={dateEnd}
                    onChange={e => { setDateEnd(e.target.value); setPreset(null); }}
                    className="border border-slate-200 rounded px-2.5 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                  />
                  <span className="text-slate-400 text-xs">23:59</span>
                  <div className="flex items-center gap-1 ml-2">
                    {PRESETS.map(p => (
                      <button
                        key={p.key}
                        onClick={() => applyPreset(p.key)}
                        className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                          preset === p.key
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
              </td>
            </tr>

            {/* 결제상태 */}
            <tr className="border-b border-slate-200">
              <td className="bg-indigo-50 px-5 py-3 font-medium text-indigo-700 text-center align-middle border-r border-slate-200 whitespace-nowrap">
                결제상태
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-6">
                  {STATUS_CHECKBOXES.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={statusSet.has(key)}
                        onChange={() => toggleStatus(key)}
                        className="w-3.5 h-3.5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-400 cursor-pointer"
                      />
                      <span className="text-sm text-slate-600">{label}</span>
                    </label>
                  ))}
                </div>
              </td>
            </tr>

            {/* 검색 */}
            <tr>
              <td className="bg-indigo-50 px-5 py-3 font-medium text-indigo-700 text-center align-middle border-r border-slate-200 whitespace-nowrap">
                검색
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">병원명</span>
                    <input
                      type="text"
                      value={nameSearch}
                      onChange={e => setNameSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && load()}
                      placeholder="입력"
                      className="border border-slate-200 rounded px-2.5 py-1.5 text-sm w-36 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-500 whitespace-nowrap">연락처</span>
                    <input
                      type="text"
                      value={phoneSearch}
                      onChange={e => setPhoneSearch(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && load()}
                      placeholder="끝 4자리"
                      className="border border-slate-200 rounded px-2.5 py-1.5 text-sm w-28 focus:outline-none focus:ring-1 focus:ring-indigo-400 focus:border-indigo-400"
                    />
                  </div>
                  <button
                    onClick={load}
                    className="px-5 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded hover:bg-indigo-700 transition-colors"
                  >
                    확인
                  </button>
                  <button
                    onClick={handleExcelDownload}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-sm font-bold rounded hover:bg-emerald-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    엑셀 다운로드
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* 결제 내역 테이블 */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {hospitalFilter && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-indigo-50 border-b border-indigo-100">
            <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span className="text-xs font-bold text-indigo-700">{hospitalFilter.name} 필터 중</span>
            <button onClick={() => setHospitalFilter(null)} className="ml-1 text-indigo-400 hover:text-indigo-700 text-xs">✕ 해제</button>
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">불러오는 중...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                  <th className="px-5 py-3 whitespace-nowrap">거래일시</th>
                  <th className="px-5 py-3">병원</th>
                  <th className="px-5 py-3">플랜</th>
                  <th className="px-5 py-3">주기</th>
                  <th className="px-5 py-3">결제수단</th>
                  <th className="px-5 py-3 text-right">결제금액</th>
                  <th className="px-5 py-3 text-right">환불</th>
                  <th className="px-5 py-3">상태</th>
                  <th className="px-5 py-3">비고</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayRows.map(row => {
                  const ps = PAYMENT_STATUS_LABELS[row.payment_status] ?? { label: row.payment_status, color: 'bg-slate-100 text-slate-500' };
                  const hospitalName = row.hospital_id ? (hospitals[row.hospital_id] || row.hospital_id.slice(0, 8) + '…') : '-';
                  const displayName = row.hospital_name_snapshot || hospitalName;
                  const snapshotId = row.hospital_id_snapshot || row.hospital_id;
                  const isFiltered = hospitalFilter?.id === snapshotId;
                  const phoneLast4 = row.phone_last4_snapshot;
                  const creditUsed = row.credit_used_amount ?? 0;
                  const refundAmt = row.refund_amount ?? 0;
                  const descText = row.description || (row.payment_ref
                    ? row.payment_ref.slice(0, 22) + (row.payment_ref.length > 22 ? '…' : '')
                    : '-');

                  return (
                    <tr key={row.id} className={`hover:bg-slate-50/50 transition-colors ${isFiltered ? 'bg-indigo-50/30' : ''}`}>
                      {/* 거래일시 */}
                      <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleString('ko-KR', {
                          year: '2-digit', month: '2-digit', day: '2-digit',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>
                      {/* 병원 */}
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
                      {/* 플랜 */}
                      <td className="px-5 py-3 text-slate-600">{PLAN_LABEL[row.plan] ?? row.plan}</td>
                      {/* 주기 */}
                      <td className="px-5 py-3 text-slate-500">
                        {row.billing_cycle === 'yearly' ? '연간' : row.billing_cycle === 'monthly' ? '월간' : '-'}
                      </td>
                      {/* 결제수단 */}
                      <td className="px-5 py-3 text-slate-500">
                        {PAYMENT_METHOD[row.payment_method ?? ''] ?? (row.payment_method ?? '-')}
                      </td>
                      {/* 결제금액 */}
                      <td className="px-5 py-3 text-right">
                        <span className="font-bold text-slate-800">{krw(row.amount)}</span>
                        {creditUsed > 0 && (
                          <div className="text-[10px] text-violet-500 mt-0.5">크레딧 {krw(creditUsed)}</div>
                        )}
                      </td>
                      {/* 환불 */}
                      <td className="px-5 py-3 text-right">
                        {refundAmt > 0 ? (
                          <span className="font-bold text-rose-500">{krw(refundAmt)}</span>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      {/* 상태 */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${ps.color}`}>
                            {ps.label}
                          </span>
                          {row.is_test_payment && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600">테스트</span>
                          )}
                        </div>
                      </td>
                      {/* 비고 */}
                      <td className="px-5 py-3 text-xs text-slate-400 font-mono max-w-[160px] truncate" title={row.description || row.payment_ref || undefined}>
                        {descText}
                      </td>
                      {/* 삭제 */}
                      <td className="px-5 py-3">
                        <button
                          onClick={() => handleDelete(row.id)}
                          disabled={deletingId === row.id}
                          className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors disabled:opacity-40"
                          title="삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {displayRows.length === 0 && (
                  <tr>
                    <td colSpan={10} className="py-20 text-center">
                      <div className="text-slate-400 text-sm">조회 결과가 없어요</div>
                      <div className="text-slate-300 text-xs mt-1">입력한 정보가 올바른지 확인해주세요.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* 푸터 */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center">
          <span className="text-xs font-bold text-slate-500">총 {displayRows.length}건</span>
        </div>
      </div>
    </div>
  );
};

export default SystemAdminBillingTab;
