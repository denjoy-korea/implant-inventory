import React from 'react';
import type { Order as FailOrder } from '../../types';

interface FailOrderHistorySectionProps {
  activeOrders: FailOrder[];
  isReadOnly?: boolean;
  onDeleteOrder?: (orderId: string) => Promise<void>;
  onRequestDelete: (orderId: string) => void;
}

const FailOrderHistorySection: React.FC<FailOrderHistorySectionProps> = ({
  activeOrders,
  isReadOnly,
  onDeleteOrder,
  onRequestDelete,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
            교환 주문 이력
          </h3>
        </div>
        <span className="text-[10px] font-bold text-slate-500">{activeOrders.length}건</span>
      </div>
      {activeOrders.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {activeOrders.map((order) => (
            <div key={order.id} className="p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 hover:border-indigo-100 transition-all">
              <div className="flex justify-between items-start">
                <p className="text-xs font-black text-slate-800">{order.date} 주문</p>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${order.status === 'ordered' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-600'}`}>
                  {order.status === 'ordered' ? '발주중' : '입고완료'}
                </span>
              </div>
              <div className="space-y-1">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-[11px] font-bold">
                    <span className="text-slate-500">{item.brand} {item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}</span>
                    <span className="text-slate-800 tabular-nums">{item.quantity}개</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-slate-500">담당: {order.manager}</span>
                {!isReadOnly && onDeleteOrder && (
                  <button
                    onClick={() => onRequestDelete(order.id)}
                    className="text-[10px] font-bold text-slate-400 hover:text-rose-500 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-12 text-center">
          <svg className="w-12 h-12 text-slate-100 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-slate-500 font-medium">아직 교환 주문 이력이 없습니다.</p>
          <p className="text-[11px] text-slate-300 mt-1">'반품 신청' 버튼으로 첫 반품을 등록하세요.</p>
        </div>
      )}
    </div>
  );
};

export default FailOrderHistorySection;
