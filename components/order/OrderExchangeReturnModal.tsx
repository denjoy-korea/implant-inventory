import React, { useState } from 'react';
import ModalShell from '../shared/ModalShell';
import { displayMfr } from '../../hooks/useOrderManagerData';
import { ExchangeReturnTarget } from '../../hooks/useOrderManager';

interface Props {
  exchangeReturnTarget: ExchangeReturnTarget | null;
  setExchangeReturnTarget: (t: ExchangeReturnTarget | null) => void;
  isExchangeReturnSubmitting: boolean;
  onAddToReturnCart: (manufacturer: string, exchangeQty: number, failQty: number) => void;
}

export function OrderExchangeReturnModal({
  exchangeReturnTarget,
  setExchangeReturnTarget,
  isExchangeReturnSubmitting,
  onAddToReturnCart,
}: Props) {
  const [exchangeQty, setExchangeQty] = useState(0);
  const [failQty, setFailQty] = useState(0);

  const target = exchangeReturnTarget;
  const maxExchange = target?.count ?? 0;
  const totalQty = exchangeQty + failQty;

  const adjustExchange = (delta: number) =>
    setExchangeQty(prev => Math.min(maxExchange, Math.max(0, prev + delta)));
  const adjustFail = (delta: number) =>
    setFail(prev => Math.max(0, prev + delta));

  // reset on open
  React.useEffect(() => {
    if (exchangeReturnTarget) {
      setExchangeQty(0);
      setFailQty(0);
    }
  }, [exchangeReturnTarget?.manufacturer]);

  const setFail = setFailQty;

  const handleAddToCart = () => {
    if (!target || totalQty === 0) return;
    onAddToReturnCart(target.manufacturer, exchangeQty, failQty);
    setExchangeReturnTarget(null);
  };

  return (
    <ModalShell
      isOpen={!!exchangeReturnTarget}
      onClose={() => setExchangeReturnTarget(null)}
      title="교환 반품 처리"
      maxWidth="sm:max-w-md"
      className="flex flex-col h-[calc(100dvh-68px)] sm:h-auto sm:max-h-[85vh]"
      closeable={!isExchangeReturnSubmitting}
      closeOnBackdrop={!isExchangeReturnSubmitting}
      backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
      zIndex={150}
    >
      {target && (
        <>
          {/* Header */}
          <div className="px-5 sm:px-6 pt-4 pb-3 border-b border-slate-100 shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <h2 className="text-base font-black text-slate-900">{displayMfr(target.manufacturer)} 교환 반품 처리</h2>
                </div>
                <p className="text-xs text-slate-400 mt-0.5 ml-6">수량을 입력 후 장바구니에 담으세요</p>
              </div>
              <button
                onClick={() => setExchangeReturnTarget(null)}
                disabled={isExchangeReturnSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Spacer pushes cards to bottom */}
          <div className="flex-1" />

          {/* Cards */}
          <div className="px-5 sm:px-6 py-4">
            <div className="grid grid-cols-2 gap-3">

              {/* 수술중 교환 */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="mb-4">
                  <span className="inline-block text-[10px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 mb-2">수술중 교환</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">반품 가능 잔량</p>
                  <p className="text-2xl font-black text-slate-800 tabular-nums leading-tight">
                    {maxExchange}<span className="text-sm font-bold text-slate-400 ml-1">건</span>
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">반품 처리 수량</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustExchange(-1)}
                      disabled={exchangeQty <= 0}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={maxExchange}
                      value={exchangeQty}
                      onChange={e => setExchangeQty(Math.min(maxExchange, Math.max(0, parseInt(e.target.value) || 0)))}
                      className="flex-1 min-w-0 text-center text-2xl font-black text-indigo-600 tabular-nums bg-white border border-slate-200 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                    />
                    <button
                      type="button"
                      onClick={() => adjustExchange(1)}
                      disabled={exchangeQty >= maxExchange}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold text-right mt-1.5">최대 {maxExchange}건</p>
                </div>
              </div>

              {/* 수술후 FAIL */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="mb-4">
                  <span className="inline-block text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5 mb-2">수술후 FAIL</span>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">반품 유형</p>
                  <p className="text-sm font-black text-slate-700 leading-tight mt-0.5">불량 반품</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">반품 처리 수량</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => adjustFail(-1)}
                      disabled={failQty <= 0}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" />
                      </svg>
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={failQty}
                      onChange={e => setFailQty(Math.max(0, parseInt(e.target.value) || 0))}
                      className="flex-1 min-w-0 text-center text-2xl font-black text-rose-600 tabular-nums bg-white border border-slate-200 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                    />
                    <button
                      type="button"
                      onClick={() => adjustFail(1)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors active:scale-95 shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-300 font-bold text-right mt-1.5">제한 없음</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4 shrink-0">
            <p className="text-xs text-slate-500">
              {totalQty > 0
                ? <><span className="font-black text-violet-600">{totalQty}건</span> 반품 처리</>
                : '수량을 입력하세요'
              }
            </p>
            <button
              onClick={handleAddToCart}
              disabled={totalQty === 0}
              className="h-10 px-5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              장바구니 담기
            </button>
          </div>
        </>
      )}
    </ModalShell>
  );
}
