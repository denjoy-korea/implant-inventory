import React, { useMemo, useState } from 'react';
import { ReturnRequest, RETURN_REASON_LABELS, ReturnReason, ReturnStatus } from '../../types/return';

interface FailOrderHistorySectionProps {
  returnRequests: ReturnRequest[];
  isReadOnly?: boolean;
  onRequestDelete: (returnId: string) => void;
}

// ── Color maps ─────────────────────────────────────────────────────────────────
const STATUS_CLS: Record<ReturnStatus, string> = {
  requested: 'bg-orange-50 text-orange-600 border-orange-200',
  picked_up: 'bg-blue-50 text-blue-600 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  rejected:  'bg-rose-50 text-rose-600 border-rose-200',
};
const STATUS_LBL: Record<ReturnStatus, string> = {
  requested: '신청', picked_up: '수거', completed: '완료', rejected: '거절',
};
const REASON_CLS: Record<ReturnReason, string> = {
  exchange:     'bg-indigo-50 text-indigo-600 border-indigo-100',
  defective:    'bg-rose-50 text-rose-600 border-rose-100',
  excess_stock: 'bg-amber-50 text-amber-600 border-amber-100',
};
const REASON_BAR_CLS: Record<ReturnReason, string> = {
  exchange:     'bg-indigo-400',
  defective:    'bg-rose-400',
  excess_stock: 'bg-amber-400',
};

const REASONS: ReturnReason[] = ['exchange', 'defective', 'excess_stock'];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtShort(s: string | null | undefined): string {
  if (!s) return '-';
  const d = new Date(s.includes('T') ? s : s + 'T00:00:00');
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ── Component ──────────────────────────────────────────────────────────────────
const FailOrderHistorySection: React.FC<FailOrderHistorySectionProps> = ({
  returnRequests, isReadOnly, onRequestDelete,
}) => {
  const [listOpen, setListOpen] = useState(false);

  // reason × status cross-tabulation (for flow summary)
  const stats = useMemo(() => {
    const statusTotals: Record<ReturnStatus, number> = {
      requested: 0, picked_up: 0, completed: 0, rejected: 0,
    };
    let grandTotal = 0;
    for (const req of returnRequests) {
      const qty = req.items.reduce((s, i) => s + i.quantity, 0);
      statusTotals[req.status] += qty;
      grandTotal += qty;
    }
    return { statusTotals, grandTotal };
  }, [returnRequests]);

  // 월별 × reason 집계 (for bar chart)
  const monthlyData = useMemo(() => {
    const map = new Map<string, Record<ReturnReason, number>>();
    for (const req of returnRequests) {
      const key = req.requestedDate.slice(0, 7); // YYYY-MM
      if (!map.has(key)) {
        map.set(key, { exchange: 0, defective: 0, excess_stock: 0 });
      }
      const qty = req.items.reduce((s, i) => s + i.quantity, 0);
      map.get(key)![req.reason] += qty;
    }
    // 시간순 정렬
    const months = [...map.keys()].sort();
    return months.map(key => ({
      key,
      label: `${parseInt(key.slice(5), 10)}월`,
      data: map.get(key)!,
      total: REASONS.reduce((s, r) => s + map.get(key)![r], 0),
    }));
  }, [returnRequests]);

  const maxBarValue = useMemo(
    () => Math.max(...monthlyData.map(m => m.total), 1),
    [monthlyData],
  );

  const sorted = useMemo(
    () => [...returnRequests].sort((a, b) => b.requestedDate.localeCompare(a.requestedDate)),
    [returnRequests],
  );

  const hasExcessStock = monthlyData.some(m => m.data.excess_stock > 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Header */}
      <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
        <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
        반품 이력
        <span className="text-[10px] font-bold text-slate-400">{returnRequests.length}건</span>
      </h3>

      {returnRequests.length === 0 ? (
        <div className="py-12 text-center">
          <svg className="w-12 h-12 text-slate-100 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">반품 이력이 없습니다.</p>
          <p className="text-[11px] text-slate-300 mt-1">'반품 신청' 버튼으로 첫 반품을 등록하세요.</p>
        </div>
      ) : (
        <>
          {/* ── A. Flow Summary ────────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* 신청 */}
            <div className="flex-1 min-w-[72px] bg-orange-50 border border-orange-100 rounded-xl p-3 text-center">
              <div className="text-[10px] font-bold text-orange-500 mb-1">신청</div>
              <div className="text-xl font-black text-orange-600 tabular-nums">{stats.statusTotals.requested}</div>
              <div className="text-[9px] text-orange-400 font-medium">개</div>
            </div>

            <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* 수거 */}
            <div className="flex-1 min-w-[72px] bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
              <div className="text-[10px] font-bold text-blue-500 mb-1">수거</div>
              <div className="text-xl font-black text-blue-600 tabular-nums">{stats.statusTotals.picked_up}</div>
              <div className="text-[9px] text-blue-400 font-medium">개</div>
            </div>

            <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            {/* 완료 */}
            <div className="flex-1 min-w-[72px] bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
              <div className="text-[10px] font-bold text-emerald-500 mb-1">완료</div>
              <div className="text-xl font-black text-emerald-600 tabular-nums">{stats.statusTotals.completed}</div>
              <div className="text-[9px] text-emerald-400 font-medium">개</div>
            </div>

            {/* 거절 badge (조건부) */}
            {stats.statusTotals.rejected > 0 && (
              <div className="bg-rose-50 border border-rose-100 rounded-lg px-3 py-2 text-center min-w-[56px]">
                <div className="text-[9px] font-bold text-rose-400">거절</div>
                <div className="text-sm font-black text-rose-500 tabular-nums">{stats.statusTotals.rejected}</div>
              </div>
            )}
          </div>

          {/* ── B. Stacked Bar Chart ───────────────────────────────────────────── */}
          <div>
            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
                <span className="text-[11px] font-medium text-slate-500">수술중교환</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="text-[11px] font-medium text-slate-500">수술후FAIL</span>
              </div>
              {hasExcessStock && (
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="text-[11px] font-medium text-slate-500">초과재고</span>
                </div>
              )}
            </div>

            {/* Bars */}
            <div className="flex items-end gap-2 overflow-x-auto" style={{ height: '128px' }}>
              {monthlyData.map(({ key, label, data, total }) => {
                const barHeightPct = total === 0 ? 0 : (total / maxBarValue) * 100;
                return (
                  <div key={key} className="flex-1 min-w-[32px] flex flex-col items-center gap-1">
                    {/* Total label */}
                    <div className="text-[11px] font-black text-slate-600 tabular-nums" style={{ height: '16px' }}>
                      {total > 0 ? total : ''}
                    </div>
                    {/* Bar container */}
                    <div className="w-full flex flex-col justify-end" style={{ height: '88px' }}>
                      <div
                        className="w-full rounded-t-lg overflow-hidden flex flex-col-reverse"
                        style={{ height: `${barHeightPct}%`, minHeight: total > 0 ? '4px' : '0' }}
                      >
                        {REASONS.map(reason => {
                          const segQty = data[reason];
                          if (segQty === 0) return null;
                          return (
                            <div
                              key={reason}
                              className={REASON_BAR_CLS[reason]}
                              style={{ height: `${(segQty / total) * 100}%`, minHeight: '2px' }}
                            />
                          );
                        })}
                      </div>
                    </div>
                    {/* X-axis label */}
                    <div className="text-[11px] font-bold text-slate-400 whitespace-nowrap">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── C. Return List (collapsible) ──────────────────────────────────── */}
          <div>
            <button
              onClick={() => setListOpen(v => !v)}
              className="flex items-center gap-2 text-[11px] font-black text-slate-500 hover:text-slate-700 transition-colors w-full text-left"
            >
              <svg
                className={`w-3.5 h-3.5 transition-transform ${listOpen ? 'rotate-90' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
              반품 목록
              <span className="font-normal text-slate-400">({sorted.length}건)</span>
            </button>

            {listOpen && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2 text-left font-black text-slate-500 whitespace-nowrap">상태</th>
                      <th className="px-3 py-2 text-left font-black text-slate-500 whitespace-nowrap">유형</th>
                      <th className="px-3 py-2 text-right font-black text-slate-500 whitespace-nowrap">수량</th>
                      <th className="px-3 py-2 text-left font-black text-slate-500 whitespace-nowrap">담당자</th>
                      <th className="px-3 py-2 text-left font-black text-slate-500 whitespace-nowrap">신청일</th>
                      <th className="px-3 py-2 text-left font-black text-slate-500 whitespace-nowrap">수거일</th>
                      <th className="px-3 py-2 text-left font-black text-slate-500 whitespace-nowrap">완료일</th>
                      {!isReadOnly && <th className="px-3 py-2" />}
                    </tr>
                  </thead>
                  <tbody>
                    {sorted.map(req => {
                      const totalQty = req.items.reduce((s, i) => s + i.quantity, 0);
                      const canDelete = req.status === 'requested' || req.status === 'picked_up';
                      return (
                        <tr key={req.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full border font-bold ${STATUS_CLS[req.status]}`}>
                              {STATUS_LBL[req.status]}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex px-1.5 py-0.5 rounded-full border font-bold ${REASON_CLS[req.reason]}`}>
                              {RETURN_REASON_LABELS[req.reason]}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right font-black text-slate-700 tabular-nums">{totalQty}</td>
                          <td className="px-3 py-2 text-slate-600 font-medium">{req.manager}</td>
                          <td className="px-3 py-2 text-slate-500 tabular-nums">{fmtShort(req.requestedDate)}</td>
                          <td className="px-3 py-2 text-slate-500 tabular-nums">{fmtShort(req.pickedUpDate)}</td>
                          <td className="px-3 py-2 text-slate-500 tabular-nums">{fmtShort(req.completedDate)}</td>
                          {!isReadOnly && (
                            <td className="px-3 py-2">
                              {canDelete && (
                                <button
                                  onClick={() => onRequestDelete(req.id)}
                                  className="text-slate-300 hover:text-rose-500 font-bold hover:bg-rose-50 rounded px-1.5 py-0.5 transition-colors"
                                >
                                  삭제
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default FailOrderHistorySection;
