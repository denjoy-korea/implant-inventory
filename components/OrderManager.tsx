
import React, { useMemo, useState } from 'react';
import { Order, OrderStatus, OrderType, InventoryItem } from '../types';
import { getSizeMatchKey } from '../services/sizeNormalizer';

interface OrderManagerProps {
  orders: Order[];
  inventory: InventoryItem[];
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onDeleteOrder: (orderId: string) => void;
  onQuickOrder: (item: InventoryItem) => void;
  isReadOnly?: boolean;
}

const OrderManager: React.FC<OrderManagerProps> = ({
  orders,
  inventory,
  onUpdateOrderStatus,
  onDeleteOrder,
  onQuickOrder,
  isReadOnly
}) => {
  const [filterType, setFilterType] = useState<OrderType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');

  const simpleNormalize = (str: string) => String(str || "").trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const typeMatch = filterType === 'all' || order.type === filterType;
      const statusMatch = filterStatus === 'all' || order.status === filterStatus;
      return typeMatch && statusMatch;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, filterType, filterStatus]);

  const lowStockItems = useMemo(() => {
    return inventory
      .filter(item => {
        const isBelowRecommended = item.currentStock < item.recommendedStock;
        if (!isBelowRecommended) return false;
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

  // 탭별 건수 (전체 orders 기준)
  const typeCounts: Record<'all' | 'replenishment' | 'fail_exchange', number> = useMemo(() => ({
    all: orders.length,
    replenishment: orders.filter(o => o.type === 'replenishment').length,
    fail_exchange: orders.filter(o => o.type === 'fail_exchange').length,
  }), [orders]);

  const TYPE_TABS: { key: 'all' | 'replenishment' | 'fail_exchange'; label: string }[] = [
    { key: 'all', label: '전체' },
    { key: 'replenishment', label: '재고 발주' },
    { key: 'fail_exchange', label: 'FAIL 교환' },
  ];

  const STATUS_FILTERS: { key: 'all' | OrderStatus; label: string }[] = [
    { key: 'all', label: '모든 상태' },
    { key: 'ordered', label: '입고대기' },
    { key: 'received', label: '입고완료' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">

      {/* ── Zone 1: KPI Strip ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between px-6 py-5">
          <div className="flex items-center divide-x divide-slate-100">
            {/* 전체 주문 */}
            <div className="pr-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                전체 주문<br />TOTAL ORDERS
              </p>
              <p className="text-2xl font-black text-slate-800 tabular-nums leading-none">
                {stats.totalCount}<span className="text-xs ml-0.5 font-bold">건</span>
              </p>
              <p className="text-[11px] font-bold text-slate-400 mt-1">{stats.totalQty}개</p>
            </div>

            {/* 입고 대기 */}
            <div className="px-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                입고 대기<br />PENDING
              </p>
              <p className="text-2xl font-black text-rose-500 tabular-nums leading-none">
                {stats.pendingCount}<span className="text-xs ml-0.5 font-bold">건</span>
              </p>
              <p className="text-[11px] font-bold text-rose-300 mt-1">{stats.pendingQty}개</p>
            </div>

            {/* 처리 완료 */}
            <div className="px-8">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                처리 완료<br />RECEIVED
              </p>
              <p className="text-2xl font-black text-emerald-500 tabular-nums leading-none">
                {stats.receivedCount}<span className="text-xs ml-0.5 font-bold">건</span>
              </p>
              <p className="text-[11px] font-bold text-emerald-300 mt-1">{stats.receivedQty}개</p>
            </div>

            {/* 발주 권장 */}
            <div className="pl-8">
              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1.5">
                발주 권장<br />LOW STOCK
              </p>
              <p className="text-2xl font-black text-rose-600 tabular-nums leading-none">
                {stats.lowStockCount}<span className="text-xs ml-0.5 font-bold">품목</span>
              </p>
              <p className="text-[11px] font-bold text-rose-400 mt-1">{stats.lowStockQty}개 부족</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Zone 2: 유형 탭 + 상태 필터 ── */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 shadow-sm px-4 py-3">
        {/* 유형 탭 */}
        <div className="flex gap-1">
          {TYPE_TABS.map(({ key, label }) => {
            const isActive = filterType === key;
            const isFail = key === 'fail_exchange';
            return (
              <button
                key={key}
                onClick={() => setFilterType(key)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  isActive
                    ? isFail
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {label}
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                    isActive ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {typeCounts[key]}
                </span>
              </button>
            );
          })}
        </div>

        {/* 상태 필터 */}
        <div className="flex items-center gap-0.5 p-1 bg-slate-100 rounded-xl">
          {STATUS_FILTERS.map(({ key, label }) => {
            const isActive = filterStatus === key;
            const activeColor =
              key === 'ordered' ? 'text-rose-600' :
              key === 'received' ? 'text-emerald-600' :
              'text-indigo-600';
            return (
              <button
                key={key}
                onClick={() => setFilterStatus(key)}
                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
                  isActive ? `bg-white shadow-sm ${activeColor}` : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Zone 3: 발주 권장 배너 ── */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse flex-shrink-0" />
              <span className="text-sm font-black text-rose-700">
                발주 권장 품목 {lowStockItems.length}종
              </span>
              <span className="text-xs font-bold text-rose-400">
                재고 기준 권장 수량 미달 품목입니다.
              </span>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-xs font-bold text-rose-500">
                누적 {stats.lowStockQty}개 부족
              </span>
              {!isReadOnly && (
                <span className="text-[10px] font-bold text-rose-400 italic">
                  품목 클릭 시 즉시 발주
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(item => {
              const deficit = item.recommendedStock - item.currentStock;
              return (
                <button
                  key={item.id}
                  onClick={() => !isReadOnly && onQuickOrder(item)}
                  disabled={isReadOnly}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border rounded-xl text-[11px] font-bold transition-all ${
                    isReadOnly
                      ? 'border-rose-100 text-rose-300 cursor-not-allowed opacity-70'
                      : 'border-rose-200 text-rose-700 hover:bg-rose-600 hover:text-white hover:border-rose-600 cursor-pointer active:scale-95'
                  }`}
                >
                  <span className="text-[9px] font-bold text-slate-400 uppercase leading-none">
                    {item.manufacturer}
                  </span>
                  <span>{item.brand} {item.size}</span>
                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-600 rounded-md text-[9px] font-black">
                    {deficit}개
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Zone 4: 주문 내역 테이블 ── */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 sticky top-[44px] z-10">
              <tr>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">주문일자</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">유형</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">품목 내역</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">수량</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">담당자</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center">상태</th>
                <th className="px-6 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredOrders.length > 0 ? filteredOrders.map((order, idx) => {
                const accentColor = order.type === 'replenishment' ? 'border-l-indigo-400' : 'border-l-rose-400';
                const item = order.items[0] || { brand: 'N/A', size: 'N/A', quantity: 0 };
                const isEven = idx % 2 === 1;
                return (
                  <tr
                    key={order.id}
                    className={`group transition-colors border-l-[3px] ${accentColor} hover:bg-indigo-50/30 ${isEven ? 'bg-slate-100/70' : ''}`}
                  >
                    <td className="px-6 py-2.5">
                      <span className="text-xs font-black text-slate-800">{order.date}</span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                        order.type === 'replenishment'
                          ? 'bg-indigo-50 text-indigo-600'
                          : 'bg-rose-50 text-rose-600'
                      }`}>
                        {order.type === 'replenishment' ? '재고 발주' : 'FAIL 교환'}
                      </span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className="text-sm font-black text-slate-800">{order.manufacturer}</span>
                    </td>
                    <td className="px-6 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-[11px] font-black text-slate-800">{item.brand}</span>
                        <span className="text-[10px] font-bold text-slate-400 mt-0.5">{item.size}</span>
                      </div>
                    </td>
                    <td className="px-6 py-2.5 text-center font-black text-slate-900 text-base tabular-nums">
                      {item.quantity}<span className="text-[10px] ml-0.5 font-bold">개</span>
                    </td>
                    <td className="px-6 py-2.5">
                      <span className="text-xs font-bold text-slate-600">{order.manager}</span>
                    </td>
                    <td className="px-6 py-2.5 text-center">
                      <button
                        onClick={() => !isReadOnly && onUpdateOrderStatus(order.id, order.status === 'ordered' ? 'received' : 'ordered')}
                        disabled={isReadOnly}
                        className={`px-4 py-1.5 rounded-xl text-[10px] font-black transition-all ${
                          isReadOnly
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : order.status === 'received'
                            ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                            : 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white'
                        }`}
                      >
                        {order.status === 'received' ? '입고 완료' : '입고 확인'}
                      </button>
                    </td>
                    <td className="px-6 py-2.5 text-right">
                      {!isReadOnly && (
                        <button
                          onClick={() => onDeleteOrder(order.id)}
                          className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                          title="주문 삭제"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={8} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-slate-100" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p className="text-slate-400 font-medium italic text-sm">표시할 주문 내역이 없습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderManager;
