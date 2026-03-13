import { useState } from 'react';
import { Order, ReturnStatus, RETURN_STATUS_LABELS } from '../../types';
import { displayMfr, formatManagerCell } from '../../hooks/useOrderManagerData';
import { GroupedOrder, GroupedReturnRequest, UnifiedRow } from '../../hooks/useOrderManager';
import { OrderUnifiedTable } from './OrderUnifiedTable';

interface Props {
  unifiedRows: UnifiedRow[];
  isReadOnly?: boolean;
  historyOnly?: boolean;
  returnActionLoadingId: string | null;
  setSelectedGroupModal: (g: GroupedOrder | null) => void;
  setCancelModalOrder: (orders: Order[] | null) => void;
  setReturnDetailGroup: (g: GroupedReturnRequest | null) => void;
  onOpenReturnComplete: (g: GroupedReturnRequest) => void;
  setShowHistoryPanel: (b: boolean) => void;
  handleReturnUpdateStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => void;
  onDeleteOrder: (orderId: string) => void;
}

export function OrderTableSection({
  unifiedRows,
  isReadOnly,
  historyOnly,
  returnActionLoadingId,
  setSelectedGroupModal,
  setCancelModalOrder,
  setReturnDetailGroup,
  onOpenReturnComplete,
  setShowHistoryPanel,
  handleReturnUpdateStatus,
  onDeleteOrder,
}: Props) {
  // 접기/펴기 상태 (card id → expanded)
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const toggleExpand = (id: string) =>
    setExpandedCards(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className={`bg-white rounded-[32px] border border-slate-200 shadow-sm ring-1 ring-slate-100/50 overflow-hidden relative ${!historyOnly ? 'hidden md:block' : ''}`}>
      <div className="absolute top-0 left-1/2 w-full h-8 bg-gradient-to-r from-transparent via-indigo-50/50 to-transparent -translate-x-1/2"></div>
      <div className="px-4 sm:px-7 py-5 border-b border-slate-100/50 flex items-center justify-between relative z-10">
        <div>
          <h3 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-indigo-400 to-indigo-600 shadow-sm" />
            주문/반품 내역
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHistoryPanel(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black transition-all border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            히스토리
          </button>
          <span className="text-[10px] font-black text-slate-500 bg-slate-100/80 px-2 py-1 rounded-lg">{unifiedRows.length}건</span>
        </div>
      </div>

      {/* 모바일 카드 목록 */}
      <div className="md:hidden px-3 pt-3 pb-3 space-y-2.5 relative z-10">
        {unifiedRows.length > 0 ? unifiedRows.map((row) => {
          if (row.kind === 'return') {
            const g = row.data;
            const allItems = g.requests.flatMap(r => r.items);
            const isActing = g.requests.some(r => returnActionLoadingId === r.id);
            const statusBadgeClass =
              g.overallStatus === 'requested' ? 'bg-yellow-50 border border-yellow-200 text-yellow-700' :
              g.overallStatus === 'picked_up' ? 'bg-blue-50 border border-blue-200 text-blue-700' :
              g.overallStatus === 'completed' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' :
              g.overallStatus === 'mixed' ? 'bg-indigo-50 border border-indigo-200 text-indigo-700' :
              'bg-slate-100 border border-slate-200 text-slate-500';
            const statusLabel = g.overallStatus === 'mixed' ? '처리중' : RETURN_STATUS_LABELS[g.overallStatus as ReturnStatus];
            return (
              <article key={`mobile-return-${g.id}`} className="rounded-2xl border border-teal-200 bg-teal-50/40 px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)]">
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
                    {(expandedCards.has(g.id) ? allItems : allItems.slice(0, 1)).map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1 flex-wrap py-0.5">
                        <span className="text-[11px] text-slate-600 font-medium">{item.brand} {item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}</span>
                        <span className="text-[11px] text-slate-400">×{item.quantity}</span>
                      </div>
                    ))}
                    {allItems.length > 1 && (
                      <button
                        onClick={() => toggleExpand(g.id)}
                        className="mt-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        {expandedCards.has(g.id) ? '▴ 접기' : `▾ +${allItems.length - 1}개 더 보기`}
                      </button>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${statusBadgeClass}`}>{statusLabel}</span>
                  {!isReadOnly && (
                    <div className="flex items-center gap-1.5">
                      {g.requests.some(r => r.status === 'requested') && (
                        <button disabled={isActing} onClick={() => g.requests.filter(r => r.status === 'requested').forEach(r => handleReturnUpdateStatus(r.id, 'picked_up', 'requested'))} className="px-3 py-2 rounded-xl text-[11px] font-black bg-blue-50 border border-blue-200 text-blue-700 active:scale-95">수거완료</button>
                      )}
                      {g.requests.some(r => r.status === 'picked_up') && (
                        <button disabled={isActing} onClick={() => onOpenReturnComplete(g)} className="px-3 py-2 rounded-xl text-[11px] font-black bg-emerald-50 border border-emerald-200 text-emerald-700 active:scale-95">반품완료</button>
                      )}
                      {g.overallStatus === 'requested' && (
                        <button disabled={isActing} onClick={() => g.requests.forEach(r => handleReturnUpdateStatus(r.id, 'rejected', 'requested'))} className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-500 active:scale-95">거절</button>
                      )}
                      {g.requests.every(r => r.status === 'completed' || r.status === 'rejected') && (
                        <button onClick={() => setReturnDetailGroup(g)} className="px-3 py-2 rounded-xl text-[11px] font-black bg-slate-100 text-slate-600 active:scale-95">상세보기</button>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          }
          const group = row.data;
          const typeBadgeClass = group.type === 'replenishment'
            ? 'bg-gradient-to-br from-indigo-50 to-white border border-indigo-100 text-indigo-700'
            : group.type === 'return'
              ? 'bg-gradient-to-br from-amber-50 to-white border border-amber-100 text-amber-700'
              : 'bg-gradient-to-br from-rose-50 to-white border border-rose-100 text-rose-700';
          return (
            <article
              key={`mobile-group-${group.id}`}
              className={`rounded-2xl border px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] ${
                group.type === 'replenishment' ? 'border-indigo-100 bg-indigo-50/30' :
                group.type === 'return' ? 'border-amber-100 bg-amber-50/30' :
                'border-rose-100 bg-rose-50/30'
              }`}
            >
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
                {(() => {
                  const allOrderItems = group.orders.flatMap(o => o.items);
                  if (!allOrderItems[0]) return null;
                  const isExp = expandedCards.has(group.id);
                  return (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-100">
                      {(isExp ? allOrderItems : allOrderItems.slice(0, 1)).map((item, idx) => (
                        <div key={idx} className="flex items-center gap-1 flex-wrap py-0.5">
                          <span className="text-[11px] text-slate-600 font-medium">{item.brand} {item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}</span>
                          <span className="text-[11px] text-slate-400">×{item.quantity}</span>
                        </div>
                      ))}
                      {allOrderItems.length > 1 && (
                        <button
                          onClick={() => toggleExpand(group.id)}
                          className="mt-1 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
                        >
                          {isExp ? '▴ 접기' : `▾ +${allOrderItems.length - 1}개 더 보기`}
                        </button>
                      )}
                    </div>
                  );
                })()}
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
        }) : (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-500">표시할 내역이 없습니다.</p>
          </div>
        )}
      </div>

      {/* 데스크톱 테이블 */}
      <OrderUnifiedTable
        unifiedRows={unifiedRows}
        isReadOnly={isReadOnly}
        returnActionLoadingId={returnActionLoadingId}
        setSelectedGroupModal={setSelectedGroupModal}
        setCancelModalOrder={setCancelModalOrder}
        setReturnDetailGroup={setReturnDetailGroup}
        onOpenReturnComplete={onOpenReturnComplete}
        handleReturnUpdateStatus={handleReturnUpdateStatus}
        onDeleteOrder={onDeleteOrder}
      />
    </div>
  );
}
