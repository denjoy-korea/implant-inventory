import React, { useState } from 'react';
import { Order } from '../../types';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] flex flex-col">
        <h3 className="text-base font-bold text-slate-800 mb-1 shrink-0">발주 취소</h3>
        <p className="text-sm text-slate-500 mb-4 shrink-0">
          아래 발주를 취소합니다. 취소된 발주는 이력으로 보존됩니다.
        </p>

        {/* 취소 대상 품목 전체 표시 */}
        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 flex flex-col min-h-0 overflow-hidden">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <p className="text-sm font-semibold text-slate-700">{firstOrder?.manufacturer}</p>
            <span className="text-[10px] font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">
              {allItems.length}종 취소
            </span>
          </div>
          <div className="space-y-1 overflow-y-auto max-h-48 pr-1">
            {allItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs text-slate-600 font-medium">{item.brand} {item.size}</span>
                <span className="text-xs text-slate-400">×{item.quantity}</span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 shrink-0">발주일 {firstOrder?.date}</p>
        </div>

        <div className="mb-5 shrink-0">
          <label className="block text-sm font-bold text-slate-700 mb-2">
            취소 사유
          </label>
          {/* 빠른 선택 */}
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

        <div className="flex gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            돌아가기
          </button>
          <button
            onClick={() => onConfirm(reason)}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-bold text-white bg-red-500 rounded-xl hover:bg-red-600 transition-colors disabled:opacity-50"
          >
            {isLoading ? '취소 중...' : '취소 확인'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderCancelModal;
