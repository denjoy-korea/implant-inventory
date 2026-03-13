
import { useState } from 'react';
import { Order, ReturnStatus, RETURN_STATUS_LABELS } from '../../types';
import { displayMfr } from '../../hooks/useOrderManagerData';
import { GroupedOrder, GroupedReturnRequest } from '../../hooks/useOrderManager';

// ── Return card ────────────────────────────────────────────────────

interface ReturnCardProps {
  g: GroupedReturnRequest;
  isReadOnly?: boolean;
  returnActionLoadingId: string | null;
  onOpenReturnComplete: (g: GroupedReturnRequest) => void;
  handleReturnUpdateStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => void;
  setReturnDetailGroup: (g: GroupedReturnRequest | null) => void;
}

export function ReturnUnifiedCard({
  g,
  isReadOnly,
  returnActionLoadingId,
  onOpenReturnComplete,
  handleReturnUpdateStatus,
  setReturnDetailGroup,
}: ReturnCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const allItems = g.requests.flatMap(r => r.items);
  const visibleItems = isExpanded ? allItems : allItems.slice(0, 1);
  const isActing = g.requests.some(r => returnActionLoadingId === r.id);

  const statusBadgeClass =
    g.overallStatus === 'requested' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
    g.overallStatus === 'picked_up' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
    g.overallStatus === 'completed' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
    g.overallStatus === 'mixed' ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' :
    'bg-slate-100 border border-slate-200 text-slate-500';
  const statusLabel = g.overallStatus === 'mixed' ? '처리중' : RETURN_STATUS_LABELS[g.overallStatus as ReturnStatus];

  return (
    <article className="rounded-2xl border border-teal-200 bg-teal-50/40 px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{g.date}</p>
          <p className="text-sm font-black text-slate-800 truncate mt-0.5">{displayMfr(g.manufacturer)}</p>
        </div>
        <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-teal-50 border border-teal-100 text-teal-700 w-[56px] text-center">반품신청</span>
      </div>
      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">{g.totalItems}개 품목</span>
          <span className="text-sm font-black text-slate-900 tabular-nums">총 {g.totalQty}<span className="ml-0.5 text-[10px] text-slate-500">개</span></span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100">
          {visibleItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1 flex-wrap py-0.5">
              <span className="text-[11px] text-slate-600 font-medium">{item.brand} {item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}</span>
              <span className="text-[11px] text-slate-400">×{item.quantity}</span>
            </div>
          ))}
          {allItems.length > 1 && (
            <button
              onClick={() => setIsExpanded(v => !v)}
              className="mt-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
            >
              {isExpanded ? '▴ 접기' : `▾ +${allItems.length - 1}개 더 보기`}
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${statusBadgeClass}`}>{statusLabel}</span>
        {!isReadOnly && (
          <div className="flex items-center gap-1.5">
            {g.requests.some(r => r.status === 'requested') && (
              <button
                disabled={isActing}
                onClick={() => g.requests.filter(r => r.status === 'requested').forEach(r => handleReturnUpdateStatus(r.id, 'picked_up', 'requested'))}
                className="px-3 py-2 rounded-xl text-[11px] font-black bg-blue-50 border border-blue-200 text-blue-700 active:scale-95"
              >
                수거완료
              </button>
            )}
            {g.requests.some(r => r.status === 'picked_up') && (
              <button
                disabled={isActing}
                onClick={() => onOpenReturnComplete(g)}
                className="px-3 py-2 rounded-xl text-[11px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 active:scale-95"
              >
                반품완료
              </button>
            )}
            {g.overallStatus === 'requested' && (
              <button
                disabled={isActing}
                onClick={() => g.requests.forEach(r => handleReturnUpdateStatus(r.id, 'rejected', 'requested'))}
                className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-500 active:scale-95"
              >
                거절
              </button>
            )}
            {g.requests.every(r => r.status === 'completed' || r.status === 'rejected') && (
              <button
                onClick={() => setReturnDetailGroup(g)}
                className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-600 active:scale-95"
              >
                상세보기
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

// ── Order card ─────────────────────────────────────────────────────

interface OrderCardProps {
  group: GroupedOrder;
  isReadOnly?: boolean;
  setSelectedGroupModal: (g: GroupedOrder | null) => void;
  setCancelModalOrder: (orders: Order[] | null) => void;
  onDeleteOrder: (orderId: string) => void;
  formatManagerCell: (managers: string[], confirmers: string[]) => string;
}

export function OrderUnifiedCard({
  group,
  isReadOnly,
  setSelectedGroupModal,
  setCancelModalOrder,
  onDeleteOrder,
  formatManagerCell,
}: OrderCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const allOrderItems = group.orders.flatMap(o => o.items);
  const visibleItems = isExpanded ? allOrderItems : allOrderItems.slice(0, 1);

  const typeBadgeClass = group.type === 'replenishment'
    ? 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-indigo-700'
    : group.type === 'return'
      ? 'bg-gradient-to-br from-amber-50 to-white border border-amber-100 text-amber-700'
      : 'bg-gradient-to-br from-rose-50 to-white border border-rose-100 text-rose-700';

  const cardBorderClass = group.type === 'replenishment'
    ? 'border-indigo-100 bg-indigo-50/30'
    : group.type === 'return'
      ? 'border-amber-100 bg-amber-50/30'
      : 'border-rose-100 bg-rose-50/30';

  return (
    <article className={`rounded-2xl border px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] ${cardBorderClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500">{group.date}</p>
          <p className="text-sm font-black text-slate-800 truncate mt-0.5">{displayMfr(group.manufacturer)}</p>
        </div>
        <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${typeBadgeClass}`}>
          {group.type === 'replenishment' ? '발주' : group.type === 'return' ? '반품' : '수술중교환'}
        </span>
      </div>

      <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">{group.totalItems}개 품목</span>
          <span className="text-sm font-black text-slate-900 tabular-nums">총 {group.totalQuantity}<span className="ml-0.5 text-[10px] text-slate-500">개</span></span>
        </div>
        {allOrderItems.length > 0 && (
          <div className="mt-1.5 pt-1.5 border-t border-slate-100">
            {visibleItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-1 flex-wrap py-0.5">
                <span className="text-[11px] text-slate-600 font-medium">{item.brand} {item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}</span>
                <span className="text-[11px] text-slate-400">×{item.quantity}</span>
              </div>
            ))}
            {allOrderItems.length > 1 && (
              <button
                onClick={() => setIsExpanded(v => !v)}
                className="mt-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
              >
                {isExpanded ? '▴ 접기' : `▾ +${allOrderItems.length - 1}개 더 보기`}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-slate-500 truncate">담당자: {formatManagerCell(group.managers, group.confirmers)}</span>
        <div className="flex items-center gap-1.5">
          {group.overallStatus === 'cancelled' ? (
            <>
              <span className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-400">취소됨</span>
              {!isReadOnly && (
                <button
                  onClick={() => group.orders.forEach(o => onDeleteOrder(o.id))}
                  className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-500 hover:bg-slate-200 transition-all active:scale-95"
                >
                  삭제
                </button>
              )}
            </>
          ) : (
            <>
              {(group.overallStatus === 'ordered' || group.overallStatus === 'mixed') && !isReadOnly && (
                <button
                  onClick={() => {
                    const orderedItems = group.orders.filter(o => o.status === 'ordered');
                    if (orderedItems.length > 0) setCancelModalOrder(orderedItems);
                  }}
                  className="px-3 py-2 rounded-xl text-[11px] font-black bg-rose-50 text-rose-600 border border-rose-200 transition-all active:scale-95"
                >
                  취소
                </button>
              )}
              <button
                onClick={() => setSelectedGroupModal(group)}
                className={`px-3 py-2 rounded-xl text-[11px] font-black transition-all active:scale-95 ${group.overallStatus === 'received'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                  }`}
              >
                {group.overallStatus === 'received' ? '상세 확인' : '입고 확인'}
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
