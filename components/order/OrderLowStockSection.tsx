import { LowStockEntry, displayMfr } from '../../hooks/useOrderManagerData';

interface Props {
  groupedLowStock: [string, LowStockEntry[]][];
  orderedLowStockGroups: [string, number][];
  lowStockCount: number;
  lowStockQty: number;
  isReadOnly?: boolean;
  setShowBulkOrderModal: (b: boolean) => void;
  setBrandOrderModalMfr: (mfr: string) => void;
}

export function OrderLowStockSection({
  groupedLowStock,
  orderedLowStockGroups,
  lowStockCount,
  lowStockQty,
  isReadOnly,
  setShowBulkOrderModal,
  setBrandOrderModalMfr,
}: Props) {
  if (groupedLowStock.length === 0 && orderedLowStockGroups.length === 0) return null;

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <h3 className="text-base font-black text-slate-800 tracking-tight">발주 권장 품목</h3>
          <span className="text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">{lowStockCount}종 · {lowStockQty}개 부족</span>
        </div>
        <p className="hidden sm:block text-xs text-slate-400 mt-1.5 ml-5">재고가 권장 수량보다 부족한 품목입니다. 제조사에 발주를 진행하세요.</p>
      </div>
      <div className="px-5 sm:px-7 pb-5 sm:pb-6">
        {/* 모바일 레이아웃 */}
        <div className="sm:hidden space-y-3">
          <button
            onClick={() => { if (!isReadOnly) setShowBulkOrderModal(true); }}
            disabled={isReadOnly}
            className={`w-full h-12 rounded-2xl flex items-center justify-center gap-2 text-sm font-black transition-all active:scale-[0.98] ${isReadOnly ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-rose-500 text-white shadow-sm shadow-rose-200'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            일괄주문
          </button>
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {groupedLowStock.map(([mfr, entries]) => {
              const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);
              return (
                <button
                  key={mfr}
                  onClick={() => { if (!isReadOnly) setBrandOrderModalMfr(mfr); }}
                  disabled={isReadOnly}
                  className="flex-none flex flex-col gap-0.5 bg-rose-50 border border-rose-100 rounded-2xl px-3.5 py-2.5 min-w-[90px] text-left active:scale-[0.97] transition-transform"
                >
                  <span className="text-[11px] font-black text-slate-700 whitespace-nowrap truncate max-w-[100px]">{displayMfr(mfr)}</span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-rose-600 tabular-nums leading-none">{entries.length}</span>
                    <span className="text-[10px] font-bold text-slate-400">종</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-400">{totalDeficit}개 부족</span>
                </button>
              );
            })}
            {orderedLowStockGroups.map(([mfr, count]) => (
              <div
                key={`ordered-${mfr}`}
                className="flex-none flex flex-col gap-0.5 bg-emerald-50 border border-emerald-100 rounded-2xl px-3.5 py-2.5 min-w-[90px] text-left opacity-75"
              >
                <span className="text-[11px] font-black text-slate-600 whitespace-nowrap truncate max-w-[100px]">{mfr}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-emerald-600 tabular-nums leading-none">{count}</span>
                  <span className="text-[10px] font-bold text-slate-400">종</span>
                </div>
                <span className="text-[10px] font-bold text-emerald-500">발주 진행중</span>
              </div>
            ))}
          </div>
        </div>
        {/* 데스크톱 레이아웃 */}
        <div className="hidden sm:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <button
            onClick={() => { if (isReadOnly) return; setShowBulkOrderModal(true); }}
            disabled={isReadOnly}
            className={`group relative rounded-2xl border-2 border-dashed p-4 transition-all text-left ${isReadOnly ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-50' : 'border-rose-300 bg-white hover:bg-rose-50 hover:shadow-md hover:border-rose-400 cursor-pointer active:scale-[0.98]'}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              <span className="text-xs font-black text-rose-600">일괄주문</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-1">부족 품목을 한번에 발주</p>
          </button>
          {groupedLowStock.map(([mfr, entries]) => {
            const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);
            return (
              <button
                key={mfr}
                onClick={() => { if (!isReadOnly) setBrandOrderModalMfr(mfr); }}
                disabled={isReadOnly}
                className="group relative rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50/80 to-pink-50/40 p-4 transition-all hover:shadow-md hover:border-rose-400 hover:bg-rose-50 active:scale-[0.98] cursor-pointer text-left w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  <span className="text-xs font-black text-slate-700 truncate group-hover:text-rose-700 transition-colors">{displayMfr(mfr)}</span>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-black text-rose-600 tabular-nums">{entries.length}</span>
                  <span className="text-xs font-bold text-slate-400">종</span>
                </div>
                <p className="text-[10px] font-bold text-rose-400 mt-1">{totalDeficit}개 부족</p>
                <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[9px] font-bold text-rose-500 bg-white border border-rose-200 px-2 py-0.5 rounded-full">발주 신청 →</span>
                </div>
              </button>
            );
          })}
          {orderedLowStockGroups.map(([mfr, count]) => (
            <div
              key={`ordered-${mfr}`}
              className="relative rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 p-4 text-left opacity-75"
            >
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs font-black text-slate-700 truncate">{mfr}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-black text-emerald-600 tabular-nums">{count}</span>
                <span className="text-xs font-bold text-slate-400">종</span>
              </div>
              <p className="text-[10px] font-bold text-emerald-500 mt-1">발주 진행중</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
