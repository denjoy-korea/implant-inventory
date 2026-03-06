import ModalShell from '../shared/ModalShell';
import { displayMfr } from '../../hooks/useOrderManagerData';
import { ExchangeReturnTarget } from '../../hooks/useOrderManager';

interface Props {
  exchangeReturnTarget: ExchangeReturnTarget | null;
  setExchangeReturnTarget: (t: ExchangeReturnTarget | null) => void;
  isExchangeReturnSubmitting: boolean;
  exchangeItemQuantities: Record<string, number>;
  exchangeTotalQty: number;
  adjustExchangeQty: (key: string, delta: number, max: number) => void;
  handleExchangeReturnSubmit: () => void;
}

export function OrderExchangeReturnModal({
  exchangeReturnTarget,
  setExchangeReturnTarget,
  isExchangeReturnSubmitting,
  exchangeItemQuantities,
  exchangeTotalQty,
  adjustExchangeQty,
  handleExchangeReturnSubmit,
}: Props) {
  const target = exchangeReturnTarget;

  return (
    <ModalShell
      isOpen={!!exchangeReturnTarget}
      onClose={() => setExchangeReturnTarget(null)}
      title="교환 반품 처리"
      maxWidth="sm:max-w-2xl"
      className="flex flex-col h-[calc(100dvh-68px)] sm:h-auto sm:max-h-[85vh]"
      closeable={!isExchangeReturnSubmitting}
      closeOnBackdrop={!isExchangeReturnSubmitting}
      backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
      zIndex={150}
    >
      {target && (
        <>
          {/* Header */}
          <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  <h2 className="text-base font-black text-slate-900">{displayMfr(target.manufacturer)} 교환 반품 처리</h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 ml-6">{target.count}건 · 수량을 조정 후 반품 처리하세요</p>
              </div>
              <button onClick={() => setExchangeReturnTarget(null)} disabled={isExchangeReturnSubmitting} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 whitespace-nowrap">브랜드</th>
                  <th className="px-2 py-2.5 text-left text-[11px] font-bold text-slate-500 whitespace-nowrap">규격</th>
                  <th className="px-2 py-2.5 text-right text-[11px] font-bold text-slate-500 whitespace-nowrap">최대</th>
                  <th className="px-2 py-2.5 text-center text-[11px] font-bold text-violet-500 whitespace-nowrap">수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {target.groups.map(g => {
                  const key = `${g.brand}|${g.size}`;
                  const qty = exchangeItemQuantities[key] ?? g.maxQty;
                  return (
                    <tr key={key} className={`transition-colors ${qty === 0 ? 'opacity-40' : 'hover:bg-slate-50/60'}`}>
                      <td className="px-4 py-3 font-semibold text-slate-700 whitespace-nowrap">{g.brand}</td>
                      <td className="px-2 py-3 text-slate-500 whitespace-nowrap">{(!g.size || g.size === '기타') ? '-' : g.size}</td>
                      <td className="px-2 py-3 text-right text-slate-400 tabular-nums whitespace-nowrap">{g.maxQty}</td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => adjustExchangeQty(key, -1, g.maxQty)}
                            disabled={qty <= 0}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
                          >
                            <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                          </button>
                          <span className="w-6 text-center font-black text-slate-800 tabular-nums text-sm">{qty}</span>
                          <button
                            onClick={() => adjustExchangeQty(key, +1, g.maxQty)}
                            disabled={qty >= g.maxQty}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-colors active:scale-95"
                          >
                            <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="px-4 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
            <p className="text-xs text-slate-500">
              {exchangeTotalQty > 0
                ? <><span className="font-black text-violet-600">{exchangeTotalQty}개</span> 반품 처리</>
                : '수량을 1 이상으로 설정하세요'
              }
            </p>
            <button
              onClick={handleExchangeReturnSubmit}
              disabled={isExchangeReturnSubmitting || exchangeTotalQty === 0}
              className="h-10 px-5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {isExchangeReturnSubmitting ? '처리 중...' : '반품 처리 완료'}
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
