
import { Order, ReturnStatus, RETURN_STATUS_LABELS } from '../../types';
import { displayMfr, formatManagerCell } from '../../hooks/useOrderManagerData';
import { GroupedOrder, GroupedReturnRequest, UnifiedRow } from '../../hooks/useOrderManager';

interface OrderUnifiedTableProps {
  unifiedRows: UnifiedRow[];
  isReadOnly?: boolean;
  returnActionLoadingId: string | null;
  setSelectedGroupModal: (g: GroupedOrder | null) => void;
  setCancelModalOrder: (orders: Order[] | null) => void;
  setReturnDetailGroup: (g: GroupedReturnRequest | null) => void;
  onOpenReturnComplete: (g: GroupedReturnRequest) => void;
  handleReturnUpdateStatus: (returnId: string, status: ReturnStatus, currentStatus: ReturnStatus) => void;
  onDeleteOrder: (orderId: string) => void;
}

export function OrderUnifiedTable({
  unifiedRows,
  isReadOnly,
  returnActionLoadingId,
  setSelectedGroupModal,
  setCancelModalOrder,
  setReturnDetailGroup,
  onOpenReturnComplete,
  handleReturnUpdateStatus,
  onDeleteOrder,
}: OrderUnifiedTableProps) {
  return (
    <div className="hidden md:block relative z-10">
      <table className="w-full text-left border-collapse table-fixed">
        <colgroup>
          <col className="w-[10%]" />
          <col className="w-[6%]" />
          <col className="w-[11%]" />
          <col className="w-[20%]" />
          <col className="w-[6%]" />
          <col className="w-[8%]" />
          <col className="w-[9%]" />
          <col className="w-[18%]" />
        </colgroup>
        <thead className="bg-slate-50/50 border-b border-slate-100/50 backdrop-blur-sm">
          <tr>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">주문일자</th>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">유형</th>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">제조사</th>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">품목 내역</th>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider text-center">수량</th>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider">담당자/확인자</th>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider text-center">상태</th>
            <th className="px-3 lg:px-5 py-3 text-[10px] font-bold text-slate-500 tracking-wider text-right">관리</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {unifiedRows.length > 0 ? unifiedRows.map((row) => {
            if (row.kind === 'return') {
              const g = row.data;
              const isActing = g.requests.some(req => returnActionLoadingId === req.id);
              const allItems = g.requests.flatMap(req => req.items);
              const first = allItems[0];
              const statusBadgeClass =
                g.overallStatus === 'requested' ? 'bg-yellow-50 border border-yellow-100 text-yellow-700' :
                g.overallStatus === 'picked_up' ? 'bg-blue-50 border border-blue-100 text-blue-700' :
                g.overallStatus === 'completed' ? 'bg-emerald-50 border border-emerald-100 text-emerald-600' :
                g.overallStatus === 'mixed' ? 'bg-purple-50 border border-purple-100 text-purple-700' :
                'bg-slate-100 text-slate-400';
              const statusLabel =
                g.overallStatus === 'mixed' ? '처리중' :
                RETURN_STATUS_LABELS[g.overallStatus as ReturnStatus];
              return (
                <tr key={`return-${g.id}`} className="group transition-all duration-300 border-l-[3px] border-l-teal-400 bg-teal-50/25 hover:bg-teal-50/50">
                  <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-700">{g.date}</span></td>
                  <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap">
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black inline-flex items-center justify-center w-[60px] bg-teal-50 border border-teal-100 text-teal-700">반품신청</span>
                  </td>
                  <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-xs font-black text-slate-800">{displayMfr(g.manufacturer)}</span></td>
                  <td className="px-2 lg:px-4 py-2.5">
                    {first && (
                      <div className="flex items-center gap-1 text-[11px] min-w-0">
                        <span className="font-bold text-slate-700 truncate">{first.brand}</span>
                        <span className="text-slate-500 shrink-0">{first.size === '기타' || first.size === '-' ? '규격정보없음' : first.size}</span>
                        <span className="text-slate-400 shrink-0">×{first.quantity}</span>
                        {allItems.length > 1 && <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-0.5">외 {allItems.length - 1}종</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap font-black text-slate-800 text-sm tabular-nums">{g.totalQty}<span className="text-[10px] ml-0.5 font-bold text-slate-400">개</span></td>
                  <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded-md">{formatManagerCell(g.managers, g.confirmers)}</span></td>
                  <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-black inline-block ${statusBadgeClass}`}>{statusLabel}</span>
                  </td>
                  <td className="px-2 lg:px-4 py-2.5 text-right whitespace-nowrap">
                    {!isReadOnly && (
                      <div className="flex items-center justify-end gap-1">
                        {g.requests.some(req => req.status === 'requested') && (
                          <button disabled={isActing} onClick={() => g.requests.filter(req => req.status === 'requested').forEach(req => handleReturnUpdateStatus(req.id, 'picked_up', 'requested'))} className="px-2 py-1 rounded-lg text-[10px] font-black text-blue-700 bg-blue-50 border border-blue-100 hover:bg-blue-100 transition-all active:scale-95">수거완료</button>
                        )}
                        {g.requests.some(req => req.status === 'picked_up') && (
                          <button disabled={isActing} onClick={() => onOpenReturnComplete(g)} className="px-2 py-1 rounded-lg text-[10px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 hover:bg-emerald-100 transition-all active:scale-95">반품완료</button>
                        )}
                        {g.overallStatus === 'requested' && (
                          <button disabled={isActing} onClick={() => g.requests.forEach(req => handleReturnUpdateStatus(req.id, 'rejected', 'requested'))} className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">거절</button>
                        )}
                        {g.requests.every(req => req.status === 'completed' || req.status === 'rejected') && (
                          <button onClick={() => setReturnDetailGroup(g)} className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95">상세보기</button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            }
            const group = row.data;
            const rowBgClass = group.type === 'replenishment'
              ? 'border-l-indigo-300 bg-indigo-50/15 hover:bg-indigo-50/40'
              : group.type === 'return'
                ? 'border-l-amber-300 bg-amber-50/20 hover:bg-amber-50/40'
                : 'border-l-rose-300 bg-rose-50/20 hover:bg-rose-50/40';
            return (
              <tr key={group.id} className={`group transition-all duration-300 border-l-[3px] ${rowBgClass}`}>
                <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-700">{group.date}</span></td>
                <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap">
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black inline-flex items-center justify-center w-[60px] ${group.type === 'replenishment' ? 'bg-indigo-50 border border-indigo-100 text-indigo-700' : group.type === 'return' ? 'bg-amber-50 border border-amber-100 text-amber-700' : 'bg-rose-50 border border-rose-100 text-rose-700'}`}>
                    {group.type === 'replenishment' ? '발주' : group.type === 'return' ? '반품' : '수술중교환'}
                  </span>
                </td>
                <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-xs font-black text-slate-800">{displayMfr(group.manufacturer)}</span></td>
                <td className="px-2 lg:px-4 py-2.5">
                  {(() => {
                    const allItems = group.orders.flatMap(o => o.items);
                    const first = allItems[0];
                    if (!first) return null;
                    return (
                      <div className="flex items-center gap-1 text-[11px] min-w-0">
                        <span className="font-bold text-slate-700 truncate">{first.brand}</span>
                        <span className="text-slate-500 shrink-0">{first.size}</span>
                        <span className="text-slate-400 shrink-0">×{first.quantity}</span>
                        {allItems.length > 1 && (
                          <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-0.5">외 {allItems.length - 1}종</span>
                        )}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap font-black text-slate-800 text-sm tabular-nums">{group.totalQuantity}<span className="text-[10px] ml-0.5 font-bold text-slate-400">개</span></td>
                <td className="px-2 lg:px-4 py-2.5 whitespace-nowrap"><span className="text-[11px] font-bold text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded-md">{formatManagerCell(group.managers, group.confirmers)}</span></td>
                <td className="px-2 lg:px-4 py-2.5 text-center whitespace-nowrap">
                  {group.overallStatus === 'cancelled' ? (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-slate-100 text-slate-400 inline-block">취소됨</span>
                  ) : group.overallStatus === 'received' ? (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-emerald-50 text-emerald-600 border border-emerald-100 inline-block">완료</span>
                  ) : group.overallStatus === 'ordered' ? (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-rose-50 border border-rose-100 text-rose-600 inline-block">대기중</span>
                  ) : (
                    <span className="px-2 py-1 rounded-lg text-[10px] font-black bg-indigo-50 border border-indigo-100 text-indigo-600 inline-block">부분완료</span>
                  )}
                </td>
                <td className="px-2 lg:px-4 py-2.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    {(group.overallStatus === 'ordered' || group.overallStatus === 'mixed') && !isReadOnly && (
                      <button
                        onClick={() => {
                          const orderedItems = group.orders.filter(o => o.status === 'ordered');
                          if (orderedItems.length > 0) setCancelModalOrder(orderedItems);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 hover:bg-rose-100 transition-all active:scale-95"
                      >
                        취소
                      </button>
                    )}
                    {group.overallStatus === 'cancelled' && !isReadOnly && (
                      <button
                        onClick={() => group.orders.forEach(o => onDeleteOrder(o.id))}
                        className="px-2 py-1 rounded-lg text-[10px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                      >
                        삭제
                      </button>
                    )}
                    {group.overallStatus !== 'cancelled' && (
                      <button
                        onClick={() => setSelectedGroupModal(group)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all active:scale-95 border ${group.overallStatus === 'ordered' || group.overallStatus === 'mixed'
                          ? 'bg-indigo-600 text-white border-indigo-500 hover:bg-indigo-700'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                          }`}
                      >
                        상세 보기
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          }) : (
            <tr>
              <td colSpan={8} className="px-8 py-24 text-center">
                <div className="flex flex-col items-center gap-2">
                  <svg className="w-12 h-12 text-slate-200 drop-shadow-sm" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-slate-400 font-bold text-sm mt-2">표시할 주문 내역이 없습니다.</p>
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
