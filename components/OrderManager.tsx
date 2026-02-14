
import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, OrderType, InventoryItem } from '../types';
import { getSizeMatchKey } from '../services/sizeNormalizer';

interface OrderManagerProps {
  orders: Order[];
  inventory: InventoryItem[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onQuickOrder: (item: InventoryItem) => void;
}

const OrderManager: React.FC<OrderManagerProps> = ({ 
  orders, 
  inventory,
  onUpdateOrderStatus, 
  onDeleteOrder,
  onQuickOrder
}) => {
  const [filterType, setFilterType] = useState<OrderType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

  // 비교를 위한 간단한 정규화 함수
  const simpleNormalize = (str: string) => String(str || "").trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const typeMatch = filterType === 'all' || order.type === filterType;
      const statusMatch = filterStatus === 'all' || order.status === filterStatus;
      return typeMatch && statusMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, filterType, filterStatus]);

  // 발주 권장 품목 추출
  const lowStockItems = useMemo(() => {
    return inventory
      .filter(item => {
        const isBelowRecommended = item.currentStock < item.recommendedStock;
        if (!isBelowRecommended) return false;

        // 이미 주문(입고대기) 중인지 확인
        const hasPendingOrder = orders.some(order => 
          order.status === 'ordered' && 
          simpleNormalize(order.manufacturer) === simpleNormalize(item.manufacturer) &&
          order.items.some(oi =>
            simpleNormalize(oi.brand) === simpleNormalize(item.brand) &&
            getSizeMatchKey(oi.size, order.manufacturer) === getSizeMatchKey(item.size, item.manufacturer)
          )
        );

        return !hasPendingOrder;
      })
      .sort((a, b) => (a.currentStock / a.recommendedStock) - (b.currentStock / b.recommendedStock));
  }, [inventory, orders]);

  // 상단 통계 계산 (건수 및 총 수량 합산)
  const stats = useMemo(() => {
    const totalOrders = orders.filter(o => filterType === 'all' || o.type === filterType);
    const pendingOrders = totalOrders.filter(o => o.status === 'ordered');
    const receivedOrders = totalOrders.filter(o => o.status === 'received');

    const sumQty = (list: Order[]) => list.reduce((acc, o) => acc + (o.items[0]?.quantity || 0), 0);
    const lowStockDeficit = lowStockItems.reduce((acc, item) => acc + (item.recommendedStock - item.currentStock), 0);

    return {
      totalCount: totalOrders.length,
      totalQty: sumQty(totalOrders),
      pendingCount: pendingOrders.length,
      pendingQty: sumQty(pendingOrders),
      receivedCount: receivedOrders.length,
      receivedQty: sumQty(receivedOrders),
      lowStockCount: lowStockItems.length,
      lowStockQty: lowStockDeficit,
    };
  }, [orders, lowStockItems, filterType]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* 주문 대시보드 헤더 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">주문 관리 마스터</h2>
          </div>
          <p className="text-sm text-slate-500 font-medium italic">재고 발주 및 FAIL 교환 주문 내역을 통합 관리합니다.</p>
        </div>

        <div className="grid grid-cols-4 gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm min-w-[560px]">
          <div className="text-center px-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">전체 주문</p>
            <div className="flex flex-col">
              <p className="text-xl font-black text-slate-800 tabular-nums">{stats.totalCount}<span className="text-[10px] ml-0.5">건</span></p>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">{stats.totalQty}개</p>
            </div>
          </div>
          <div className="text-center border-x border-slate-100 px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">입고 대기</p>
            <div className="flex flex-col">
              <p className="text-xl font-black text-rose-500 tabular-nums">{stats.pendingCount}<span className="text-[10px] ml-0.5">건</span></p>
              <p className="text-[11px] font-bold text-rose-300 mt-0.5">{stats.pendingQty}개</p>
            </div>
          </div>
          <div className="text-center border-r border-slate-100 px-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">처리 완료</p>
            <div className="flex flex-col">
              <p className="text-xl font-black text-emerald-500 tabular-nums">{stats.receivedCount}<span className="text-[10px] ml-0.5">건</span></p>
              <p className="text-[11px] font-bold text-emerald-300 mt-0.5">{stats.receivedQty}개</p>
            </div>
          </div>
          <div className="text-center px-2">
            <p className="text-[10px] font-bold text-rose-400 uppercase mb-1 tracking-tighter">발주 권장</p>
            <div className="flex flex-col">
              <p className="text-xl font-black text-rose-600 tabular-nums">{stats.lowStockCount}<span className="text-[10px] ml-0.5">품목</span></p>
              <p className="text-[11px] font-bold text-rose-400 mt-0.5">{stats.lowStockQty}개 부족</p>
            </div>
          </div>
        </div>
      </div>

      {/* 발주 권장 품목 섹션 (복구됨) */}
      {lowStockItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
              발주 권장 리스트 <span className="text-rose-500 ml-1">{lowStockItems.length}</span>
            </h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Low Stock Alert</p>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {lowStockItems.map(item => {
              const deficit = item.recommendedStock - item.currentStock;
              return (
                <div key={item.id} className="min-w-[260px] flex-shrink-0 bg-white p-6 rounded-[32px] border border-rose-100 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-rose-50 rounded-bl-[60px] -z-0 opacity-40 group-hover:bg-rose-100 transition-colors"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.manufacturer}</span>
                        <span className="text-base font-black text-slate-800 truncate max-w-[140px] leading-tight">{item.brand}</span>
                        <span className="text-xs font-bold text-slate-500 mt-0.5">{item.size}</span>
                      </div>
                      <div className="bg-rose-600 text-white px-2.5 py-1 rounded-xl text-[10px] font-black shadow-lg shadow-rose-100">
                        {deficit}개 필요
                      </div>
                    </div>
                    
                    <div className="flex items-end justify-between mt-6">
                      <div className="flex flex-col">
                        <p className="text-[9px] font-bold text-slate-400 uppercase mb-1">Current Stock</p>
                        <p className="text-lg font-black text-slate-700 tabular-nums">
                          {item.currentStock} <span className="text-xs text-slate-300 font-bold mx-0.5">/</span> {item.recommendedStock}
                        </p>
                      </div>
                      <button 
                        onClick={() => onQuickOrder(item)}
                        className="px-5 py-2.5 bg-slate-900 text-white text-[11px] font-black rounded-2xl hover:bg-rose-600 transition-all active:scale-95 shadow-xl shadow-slate-100"
                      >
                        즉시 발주
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 필터 바 */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          <button onClick={() => setFilterType('all')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${filterType === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>전체보기</button>
          <button onClick={() => setFilterType('replenishment')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${filterType === 'replenishment' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>재고 발주</button>
          <button onClick={() => setFilterType('fail_exchange')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${filterType === 'fail_exchange' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>FAIL 교환</button>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl">
          <button onClick={() => setFilterStatus('all')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${filterStatus === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}>모든 상태</button>
          <button onClick={() => setFilterStatus('ordered')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${filterStatus === 'ordered' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-500'}`}>입고대기</button>
          <button onClick={() => setFilterStatus('received')} className={`px-5 py-2 text-xs font-bold rounded-xl transition-all ${filterStatus === 'received' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500'}`}>입고완료</button>
        </div>
      </div>

      {/* 주문 리스트 테이블 */}
      <div className="bg-white rounded-[40px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">주문일자</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">유형</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">품목 내역</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">수량</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider">담당자</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">상태</th>
                <th className="px-8 py-6 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order) => {
                const groupColor = order.type === 'replenishment' ? 'border-l-indigo-500' : 'border-l-rose-500';
                const item = order.items[0] || { brand: 'N/A', size: 'N/A', quantity: 0 };
                
                return (
                  <tr 
                    key={order.id} 
                    className={`group transition-all border-l-4 ${groupColor} hover:bg-slate-50/50`}
                  >
                    <td className="px-8 py-5">
                      <span className="text-xs font-black text-slate-800">{order.date}</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase ${order.type === 'replenishment' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                        {order.type === 'replenishment' ? '재고 발주' : 'FAIL 교환'}
                      </span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-sm font-black text-slate-800">{order.manufacturer}</span>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800">{item.brand}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">{item.size}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5 text-center font-black text-slate-900 text-base tabular-nums">
                      {item.quantity}<span className="text-[10px] ml-0.5 font-bold">개</span>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-xs font-bold text-slate-600">{order.manager}</span>
                    </td>
                    <td className="px-8 py-5 text-center">
                      <button 
                        onClick={() => onUpdateOrderStatus(order.id, order.status === 'ordered' ? 'received' : 'ordered')}
                        className={`px-5 py-2 rounded-2xl text-[10px] font-black transition-all shadow-sm ${order.status === 'received' ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white shadow-rose-50'}`}
                      >
                        {order.status === 'received' ? '입고 완료' : '입고 확인'}
                      </button>
                    </td>
                    <td className="px-8 py-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => onDeleteOrder(order.id)} className="p-2.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="주문 삭제">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-2">
                       <svg className="w-12 h-12 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                       <p className="text-slate-400 font-medium italic text-sm">표시할 주문 내역이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { height: 8px; width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; border: 2px solid transparent; background-clip: content-box; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; background-clip: content-box; }
      `}</style>
    </div>
  );
};

export default OrderManager;
