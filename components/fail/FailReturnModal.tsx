import React from 'react';

interface RecommendedItem {
  brand: string;
  size: string;
  remainingToOrder: number;
}

interface FailReturnModalProps {
  activeM: string;
  currentRemainingFails: number;
  currentUserName: string;
  isOrderSubmitting: boolean;
  recommendedExchangeItems: RecommendedItem[];
  recommendedScrollPct: number;
  setRecommendedScrollPct: (pct: number) => void;
  recommendedScrollRef: React.RefObject<HTMLDivElement | null>;
  orderModalRef: React.RefObject<HTMLDivElement | null>;
  orderModalCloseButtonRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onSubmit: () => void;
}

const FailReturnModal: React.FC<FailReturnModalProps> = ({
  activeM,
  currentRemainingFails,
  currentUserName,
  isOrderSubmitting,
  recommendedExchangeItems,
  recommendedScrollPct,
  setRecommendedScrollPct,
  recommendedScrollRef,
  orderModalRef,
  orderModalCloseButtonRef,
  onClose,
  onSubmit,
}) => (
  <div
    className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    onClick={onClose}
  >
    <div
      ref={orderModalRef}
      className="bg-white w-full max-w-lg sm:max-w-2xl rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="fail-order-modal-title"
      aria-describedby="fail-order-modal-desc"
    >
      <div className="px-6 py-5 sm:px-8 sm:pt-8 sm:pb-6 flex justify-between items-start gap-3">
        <div>
          <h3 id="fail-order-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">반품 처리</h3>
          <p id="fail-order-modal-desc" className="text-sm text-slate-500 mt-1">{activeM} / 반품 가능 잔량: <span className="font-bold text-slate-700">{currentRemainingFails}건</span></p>
        </div>
        <button
          ref={orderModalCloseButtonRef}
          onClick={onClose}
          aria-label="반품 처리 모달 닫기"
          className="mt-1 h-8 w-8 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="h-px bg-slate-100 mx-6 sm:mx-8" />

      <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-6 custom-scrollbar">
        {recommendedExchangeItems.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                반품 권장 품목
              </h4>
            </div>
            <div
              ref={recommendedScrollRef}
              className="flex gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide touch-pan-x"
              onScroll={() => {
                const el = recommendedScrollRef.current;
                if (!el) return;
                const max = el.scrollWidth - el.clientWidth;
                setRecommendedScrollPct(max > 0 ? (el.scrollLeft / max) * 100 : 0);
              }}
            >
              {recommendedExchangeItems.map((item) => (
                <div
                  key={`${item.brand}|${item.size}`}
                  className="flex-shrink-0 bg-rose-50 border border-rose-100 p-3.5 sm:p-4 rounded-2xl min-w-[150px]"
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-tighter">PENDING {item.remainingToOrder}건</span>
                  </div>
                  <p className="text-xs font-black text-slate-800 truncate">{item.brand}</p>
                  <p className="text-[11px] font-bold text-slate-500">{item.size === '기타' ? '규격정보없음' : item.size}</p>
                </div>
              ))}
            </div>
            {recommendedExchangeItems.length > 3 && (
              <input
                type="range"
                min={0}
                max={100}
                value={recommendedScrollPct}
                onChange={(e) => {
                  const el = recommendedScrollRef.current;
                  if (!el) return;
                  const pct = Number(e.target.value);
                  el.scrollLeft = ((el.scrollWidth - el.clientWidth) * pct) / 100;
                  setRecommendedScrollPct(pct);
                }}
                className="w-full mt-2 accent-rose-400 cursor-pointer"
                aria-label="반품 권장 품목 스크롤"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">반품신청일자</label>
            <input type="text" value={new Date().toLocaleDateString('ko-KR')} readOnly className="w-full bg-white border border-slate-200 p-3 rounded-xl font-black text-slate-700 shadow-sm outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">반품 담당자</label>
            <div className="w-full bg-slate-100 border border-slate-200 p-3 rounded-xl font-black text-slate-500 shadow-sm cursor-not-allowed">
              {currentUserName}
            </div>
          </div>
        </div>

        {/* 전자장부 확인 안내 */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5">
          <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="text-xs text-amber-800 leading-relaxed">
            <p className="font-black mb-0.5">반품 처리 후 전자장부 확인 필요</p>
            <p className="font-medium">재고 차감은 이미 처리되었습니다. 반품으로 인한 <span className="font-black">주문금액 변동</span>은 전자장부에서 직접 확인하세요.</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5 sm:px-8 sm:py-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="text-sm font-bold text-slate-600">
          총 반품 건수: <span className="text-xl font-black ml-1 tabular-nums text-rose-600">{currentRemainingFails}</span><span className="text-slate-400 font-normal ml-1">건</span>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button onClick={onClose} className="flex-1 sm:flex-none min-h-11 px-6 py-3 text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all">취소</button>
          <button
            onClick={onSubmit}
            disabled={isOrderSubmitting || currentRemainingFails === 0}
            className={`flex-1 sm:flex-none min-h-11 px-8 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl active:scale-95 transition-all ${isOrderSubmitting || currentRemainingFails === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-700'}`}
          >
            {isOrderSubmitting ? '처리 중...' : '반품 처리 완료'}
          </button>
        </div>
      </div>
    </div>
  </div>
);

export default FailReturnModal;
