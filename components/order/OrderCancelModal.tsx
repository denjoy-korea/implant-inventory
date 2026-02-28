import React, { useState } from 'react';
import { Order } from '../../types';

interface OrderCancelModalProps {
  order: Order;
  onConfirm: (orderId: string, reason: string) => void;
  onClose: () => void;
  isLoading?: boolean;
}

const OrderCancelModal: React.FC<OrderCancelModalProps> = ({
  order,
  onConfirm,
  onClose,
  isLoading,
}) => {
  const [reason, setReason] = useState('');

  const itemSummary = order.items
    .map(i => `${i.brand} ${i.size} ×${i.quantity}`)
    .join(', ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
        <h3 className="text-base font-bold text-slate-800 mb-1">발주 취소</h3>
        <p className="text-sm text-slate-500 mb-4">
          아래 발주를 취소합니다. 취소된 발주는 이력으로 보존됩니다.
        </p>

        <div className="bg-slate-50 rounded-xl px-4 py-3 mb-4 space-y-1">
          <p className="text-sm font-semibold text-slate-700">{order.manufacturer}</p>
          <p className="text-xs text-slate-500">{itemSummary}</p>
          <p className="text-xs text-slate-400">발주일 {order.date}</p>
        </div>

        <div className="mb-5">
          <label className="block text-sm font-bold text-slate-700 mb-1.5">
            취소 사유 <span className="text-slate-400 font-normal">(선택)</span>
          </label>
          <input
            type="text"
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="예: 수술 취소, 재고 확인 후 불필요"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-300 transition-all"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            돌아가기
          </button>
          <button
            onClick={() => onConfirm(order.id, reason)}
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
