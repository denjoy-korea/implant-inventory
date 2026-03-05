import React, { useState } from 'react';
import { Order } from '../../types';
import ModalShell from '../shared/ModalShell';

interface OrderCancelModalProps {
  orders: Order[];
  onConfirm: (reason: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const CANCEL_REASON_PRESETS = [
  '수술 취소',
  '환자 변경',
  '재고 충분 확인',
  '가격·규격 협의 필요',
];

const Spinner = () => (
  <svg
    className="animate-spin h-4 w-4 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  orders,
  onConfirm,
  onClose,
  isLoading,
}) => {
  const [reason, setReason] = useState('');

  const firstOrder = orders[0];
  const allItems = orders.flatMap(o => o.items);

  return (
    <ModalShell
      isOpen={true}
      onClose={() => !isLoading && onClose()}
      title="발주 취소"
      titleId="order-cancel-modal-title"
      role="alertdialog"
      closeable={!isLoading}
      className="p-6 max-h-[90vh] flex flex-col"
    >
        {/* 헤더 */}
        <div className="shrink-0 mb-4">
          {isLoading ? (
            <div className="flex items-center gap-2 mb-1">
              <Spinner />
              <h3 className="text-base font-bold text-red-500">발주 취소 처리 중...</h3>
            </div>
          ) : (
            <h3 id="order-cancel-modal-title" className="text-base font-bold text-slate-800 mb-1">발주 취소</h3>
          )}
          <p className="text-sm text-slate-500">
            {isLoading
              ? '잠시만 기다려 주세요. 취소 처리가 완료되면 자동으로 닫힙니다.'
              : '아래 발주를 취소합니다. 취소된 발주는 이력으로 보존됩니다.'}
          </p>
          {isLoading && (
            <div className="mt-3 h-1.5 w-full bg-red-100 rounded-full overflow-hidden">
              <div className="h-full bg-red-400 rounded-full animate-pulse w-3/5" />
            </div>
          )}
        </div>

        {/* 취소 대상 품목 전체 표시 */}
        <div className={`rounded-xl px-4 py-3 mb-4 flex flex-col min-h-0 overflow-hidden transition-colors ${isLoading ? 'bg-red-50' : 'bg-slate-50'}`}>
          <div className="flex items-center justify-between mb-2 shrink-0">
            <p className={`text-sm font-semibold ${isLoading ? 'text-red-700' : 'text-slate-700'}`}>{firstOrder?.manufacturer}</p>
            <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">
              {allItems.length}종 취소
            </span>
          </div>
          <div className={`space-y-1 overflow-y-auto max-h-48 pr-1 transition-opacity ${isLoading ? 'opacity-50' : 'opacity-100'}`}>
            {allItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">{item.brand} {item.size}</span>
                <span className="text-xs text-slate-400">×{item.quantity}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 shrink-0">발주일 {firstOrder?.date}</p>
        </div>

        {/* 취소 사유 - 로딩 중에는 숨김 */}
        {!isLoading && (
          <div className="mb-5 shrink-0">
            <label className="block text-sm font-bold text-slate-700 mb-2">
              취소 사유
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CANCEL_REASON_PRESETS.map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setReason(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors ${
                    reason === preset
                      ? 'bg-slate-700 text-white border-slate-700'
                      : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="직접 입력 또는 위에서 선택"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
            />
          </div>
        )}

        <div className="flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            돌아가기
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading}
            className={`flex-1 py-2.5 text-sm font-bold text-white rounded-xl transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
              isLoading
                ? 'bg-red-400 opacity-80'
                : 'bg-red-500 hover:bg-red-600'
            }`}
          >
            {isLoading ? (
              <>
                <Spinner />
                취소 처리 중...
              </>
            ) : (
              '취소 확인'
            )}
          </button>
        </div>
    </ModalShell>
  );
};

export default OrderCancelModal;
