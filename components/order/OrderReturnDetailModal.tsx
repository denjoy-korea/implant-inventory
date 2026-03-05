import { ReturnStatus, RETURN_STATUS_LABELS, RETURN_REASON_LABELS } from '../../types';
import { displayMfr, formatManagerCell } from '../../hooks/useOrderManagerData';
import { GroupedReturnRequest } from '../../hooks/useOrderManager';

interface Props {
  returnDetailGroup: GroupedReturnRequest | null;
  setReturnDetailGroup: (g: GroupedReturnRequest | null) => void;
}

export function OrderReturnDetailModal({ returnDetailGroup, setReturnDetailGroup }: Props) {
  if (!returnDetailGroup) return null;

  const g = returnDetailGroup;
  const allItems = g.requests.flatMap(r => r.items);
  const reason = g.requests[0]?.reason;
  const memo = g.requests[0]?.memo;

  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0" onClick={() => setReturnDetailGroup(null)}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-teal-50 border border-teal-100 text-teal-700">반품신청</span>
              <h3 className="text-base font-black text-slate-900">{displayMfr(g.manufacturer)}</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{g.date} · {reason ? RETURN_REASON_LABELS[reason] : ''}</p>
          </div>
          <button onClick={() => setReturnDetailGroup(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-3">
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-500 w-16 shrink-0">담당자/확인자</span>
            <span className="font-bold">{formatManagerCell(g.managers, g.confirmers)}</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-600">
            <span className="font-semibold text-slate-500 w-16 shrink-0">상태</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${
              g.overallStatus === 'completed' ? 'bg-emerald-50 border border-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
            }`}>{g.overallStatus === 'mixed' ? '처리중' : RETURN_STATUS_LABELS[g.overallStatus as ReturnStatus]}</span>
          </div>
          {memo && (
            <div className="flex items-start gap-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-500 w-16 shrink-0">메모</span>
              <span>{memo}</span>
            </div>
          )}
          <div className="mt-2 rounded-xl border border-slate-100 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500">브랜드</th>
                  <th className="px-3 py-2 text-left text-[11px] font-bold text-slate-500">규격</th>
                  <th className="px-3 py-2 text-right text-[11px] font-bold text-slate-500">수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {allItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-3 py-2 font-semibold text-slate-700">{item.brand}</td>
                    <td className="px-3 py-2 text-slate-500">{(!item.size || item.size === '기타') ? '-' : item.size}</td>
                    <td className="px-3 py-2 text-right font-black text-slate-800 tabular-nums">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <span className="text-xs text-slate-500">총 <span className="font-black text-slate-700">{g.totalQty}개</span> · {allItems.length}종</span>
          <button onClick={() => setReturnDetailGroup(null)} className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 transition-colors">닫기</button>
        </div>
      </div>
    </div>
  );
}
