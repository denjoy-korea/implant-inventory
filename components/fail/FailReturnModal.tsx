import React, { useState } from 'react';
import { Z } from '../../utils/zIndex';
import ModalShell from '../shared/ModalShell';

interface FailReturnModalProps {
  activeM: string;
  currentRemainingFails: number;
  returnPendingCount: number;
  currentUserName: string;
  isOrderSubmitting: boolean;
  onClose: () => void;
  onSubmit: (exchangeQty: number, failQty: number) => void;
}

const FailReturnModal: React.FC<FailReturnModalProps> = ({
  activeM,
  currentRemainingFails,
  returnPendingCount,
  currentUserName,
  isOrderSubmitting,
  onClose,
  onSubmit,
}) => {
  const [exchangeQty, setExchangeQty] = useState(0);
  const [failQty, setFailQty] = useState(0);

  const adjustExchange = (delta: number) =>
    setExchangeQty(prev => Math.min(currentRemainingFails, Math.max(0, prev + delta)));

  const adjustFail = (delta: number) =>
    setFailQty(prev => Math.max(0, prev + delta));

  const totalQty = exchangeQty + failQty;

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title="반품 처리"
      titleId="fail-order-modal-title"
      describedBy="fail-order-modal-desc"
      zIndex={Z.MODAL}
      maxWidth="max-w-lg sm:max-w-2xl"
      className="rounded-2xl sm:rounded-3xl flex flex-col max-h-[90vh]"
    >
      <div className="px-6 py-5 sm:px-8 sm:pt-8 sm:pb-6 flex justify-between items-start gap-3">
        <div>
          <h3 id="fail-order-modal-title" className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">반품 처리</h3>
          <p id="fail-order-modal-desc" className="text-sm text-slate-500 mt-1">
            {activeM} / 반품 가능 잔량: <span className="font-bold text-slate-700">{currentRemainingFails}건</span>{returnPendingCount > 0 && <span className="text-amber-500 font-semibold ml-1">(대기중 {returnPendingCount}건)</span>}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="반품 처리 모달 닫기"
          className="mt-1 h-11 w-11 inline-flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="h-px bg-slate-100 mx-6 sm:mx-8" />

      <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8 sm:py-6 space-y-6 custom-scrollbar">

        {/* 두 카드 */}
        <div className="grid grid-cols-2 gap-3">

          {/* 왼쪽: 수술중 교환 반품 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="mb-4">
              <span className="inline-block text-[11px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5 mb-2">수술중 교환</span>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">반품 가능 잔량</p>
              <p className="text-2xl font-black text-slate-800 tabular-nums leading-tight">
                {currentRemainingFails}<span className="text-sm font-bold text-slate-400 ml-1">건</span>
              </p>
              {returnPendingCount > 0 && (
                <p className="text-[11px] font-bold text-amber-500 mt-0.5">대기중 {returnPendingCount}건</p>
              )}
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">반품 처리 수량</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="수량 감소"
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
                  max={currentRemainingFails}
                  value={exchangeQty}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 0;
                    setExchangeQty(Math.min(currentRemainingFails, Math.max(0, v)));
                  }}
                  aria-label="교환 반품 수량"
                  className="flex-1 min-w-0 text-center text-2xl font-black text-indigo-600 tabular-nums bg-white border border-slate-200 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                />
                <button
                  type="button"
                  aria-label="수량 증가"
                  onClick={() => adjustExchange(1)}
                  disabled={exchangeQty >= currentRemainingFails}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 font-bold text-right mt-1.5">최대 {currentRemainingFails}건</p>
            </div>
          </div>

          {/* 오른쪽: 수술후 FAIL 반품 */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
            <div className="mb-4">
              <span className="inline-block text-[11px] font-black text-rose-600 bg-rose-50 border border-rose-100 rounded-full px-2 py-0.5 mb-2">수술후 FAIL</span>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">반품 유형</p>
              <p className="text-sm font-black text-slate-700 leading-tight mt-0.5">불량 반품</p>
            </div>
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">반품 처리 수량</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="수량 감소"
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
                  aria-label="FAIL 반품 수량"
                  className="flex-1 min-w-0 text-center text-2xl font-black text-rose-600 tabular-nums bg-white border border-slate-200 rounded-xl py-1.5 focus:outline-none focus:ring-2 focus:ring-rose-300"
                />
                <button
                  type="button"
                  aria-label="수량 증가"
                  onClick={() => adjustFail(1)}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors active:scale-95 shrink-0"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </button>
              </div>
              <p className="text-[11px] text-slate-300 font-bold text-right mt-1.5">제한 없음</p>
            </div>
          </div>
        </div>

        {/* 날짜 + 담당자 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 bg-slate-50 p-4 sm:p-6 rounded-2xl border border-slate-100">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">반품신청일자</label>
            <input
              type="text"
              value={new Date().toLocaleDateString('ko-KR')}
              readOnly
              className="w-full bg-white border border-slate-200 p-3 rounded-xl font-black text-slate-700 shadow-sm outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">반품 담당자</label>
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
        <div className="text-sm font-bold text-slate-600 flex items-center gap-3">
          <span>총 반품 건수: <span className="text-xl font-black tabular-nums text-rose-600">{totalQty}</span><span className="text-slate-400 font-normal ml-1">건</span></span>
          {exchangeQty > 0 && failQty > 0 && (
            <span className="text-xs text-slate-400 font-normal">
              (교환 {exchangeQty} + FAIL {failQty})
            </span>
          )}
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={onClose}
            className="flex-1 sm:flex-none min-h-11 px-6 py-3 text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all"
          >
            취소
          </button>
          <button
            onClick={() => onSubmit(exchangeQty, failQty)}
            disabled={isOrderSubmitting || totalQty === 0}
            className={`flex-1 sm:flex-none min-h-11 px-8 py-3 bg-slate-900 text-white text-sm font-black rounded-2xl active:scale-95 transition-all ${isOrderSubmitting || totalQty === 0 ? 'opacity-60 cursor-not-allowed' : 'hover:bg-slate-700'}`}
          >
            {isOrderSubmitting ? '처리 중...' : '반품 신청하기'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default FailReturnModal;
