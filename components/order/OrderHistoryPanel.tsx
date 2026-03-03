import { useState, useEffect } from 'react';
import { Order } from '../../types';

const displayMfr = (name: string) => name === 'IBS' ? 'IBS Implant' : name;

interface OrderHistoryPanelProps {
    orders: Order[];
    onClose: () => void;
    onReceiptConfirm?: (order: Order) => void;
    isReadOnly?: boolean;
}

type OrderType = Order['type'];
type OrderStatus = Order['status'];

const TYPE_LABEL: Record<OrderType, string> = {
    replenishment: '발주',
    return: '반품',
    fail_exchange: '교환',
};

const TYPE_COLOR: Record<OrderType, string> = {
    replenishment: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    return: 'bg-amber-50 text-amber-700 border-amber-200',
    fail_exchange: 'bg-rose-50 text-rose-700 border-rose-200',
};

const STATUS_LABEL: Record<OrderStatus, string> = {
    ordered: '대기중',
    received: '완료',
    cancelled: '취소됨',
};

const STATUS_COLOR: Record<OrderStatus, string> = {
    ordered: 'bg-rose-50 text-rose-700 border-rose-100',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};

export function OrderHistoryPanel({ orders, onClose, onReceiptConfirm, isReadOnly }: OrderHistoryPanelProps) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    // 날짜별로 그룹화 (최신순)
    const byDate = orders.reduce<Record<string, Order[]>>((acc, order) => {
        const d = order.date;
        if (!acc[d]) acc[d] = [];
        acc[d].push(order);
        return acc;
    }, {});

    const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

    // 최근 날짜는 기본 열림
    const [expandedDates, setExpandedDates] = useState<Set<string>>(
        () => new Set(sortedDates.slice(0, 2))
    );

    const toggleDate = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            next.has(date) ? next.delete(date) : next.add(date);
            return next;
        });
    };

    const totalOrders = orders.length;
    const totalItems = orders.reduce((s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0);

    return (
        <div className={`transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <div className="bg-white rounded-[28px] border border-slate-200 shadow-md ring-1 ring-slate-100/50 overflow-hidden">

                {/* Header */}
                <div className="px-5 sm:px-7 py-4 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                주문 히스토리
                            </h3>
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-lg font-black text-slate-600">{totalOrders}건</span>
                            <span className="text-slate-300">·</span>
                            <span>{sortedDates.length}개 날짜</span>
                            <span className="text-slate-300">·</span>
                            <span>총 {totalItems}개</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => setExpandedDates(new Set(sortedDates))}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            전체 펼치기
                        </button>
                        <button
                            onClick={() => setExpandedDates(new Set())}
                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            전체 접기
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Date-grouped content */}
                <div className="max-h-[480px] overflow-y-auto overscroll-contain divide-y divide-slate-50">
                    {sortedDates.length === 0 ? (
                        <div className="py-16 text-center text-slate-400 font-semibold text-sm">
                            주문 내역이 없습니다.
                        </div>
                    ) : sortedDates.map(date => {
                        const dayOrders = byDate[date];
                        const isExpanded = expandedDates.has(date);
                        const dayTotal = dayOrders.reduce((s, o) => s + o.items.reduce((is, i) => is + i.quantity, 0), 0);
                        const hasPending = dayOrders.some(o => o.status === 'ordered');
                        const allDone = dayOrders.every(o => o.status === 'received');

                        return (
                            <div key={date}>
                                {/* Date header */}
                                <button
                                    onClick={() => toggleDate(date)}
                                    className="w-full px-5 sm:px-7 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg
                                            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <span className="text-sm font-black text-slate-700 tabular-nums">{date}</span>
                                        <div className="flex items-center gap-1.5">
                                            {hasPending && !allDone && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />
                                            )}
                                            {allDone && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                                        <span className="tabular-nums">{dayOrders.length}건</span>
                                        <span className="text-slate-200">·</span>
                                        <span className="tabular-nums">{dayTotal}개</span>
                                    </div>
                                </button>

                                {/* Orders for this date */}
                                {isExpanded && (
                                    <div className="pb-2">
                                        {dayOrders
                                            .sort((a, b) => a.manufacturer.localeCompare(b.manufacturer))
                                            .map(order => {
                                                const allItems = order.items;
                                                const first = allItems[0];
                                                if (!first) return null;
                                                const totalQty = allItems.reduce((s, i) => s + i.quantity, 0);

                                                return (
                                                    <div
                                                        key={order.id}
                                                        className={`mx-3 sm:mx-5 mb-1.5 rounded-xl border px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${order.status === 'received'
                                                            ? 'bg-emerald-50/30 border-emerald-100'
                                                            : order.status === 'cancelled'
                                                                ? 'bg-slate-50 border-slate-100 opacity-60'
                                                                : 'bg-white border-slate-200'
                                                            }`}
                                                    >
                                                        {/* Type + Manufacturer */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${TYPE_COLOR[order.type]}`}>
                                                                {TYPE_LABEL[order.type]}
                                                            </span>
                                                            <span className="text-xs font-black text-slate-700 w-[80px] truncate">{displayMfr(order.manufacturer)}</span>
                                                        </div>

                                                        {/* Order ID */}
                                                        <span className="font-mono text-[10px] font-bold text-slate-300 shrink-0 hidden sm:inline">{order.id.slice(0, 8)}</span>

                                                        {/* Items */}
                                                        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                                                            {allItems.map((item, idx) => (
                                                                <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                                                    <span className="font-black">{item.brand}</span>
                                                                    <span className="text-slate-400">{item.size}</span>
                                                                    <span className="font-bold text-slate-500">×{item.quantity}</span>
                                                                </span>
                                                            ))}
                                                        </div>

                                                        {/* Right side: qty + status + date */}
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-xs font-black text-slate-700 tabular-nums">{totalQty}개</span>
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${STATUS_COLOR[order.status]}`}>
                                                                {STATUS_LABEL[order.status]}
                                                            </span>
                                                            {order.receivedDate && (
                                                                <span className="text-[10px] font-semibold text-emerald-600 hidden sm:inline">
                                                                    → {order.receivedDate.slice(0, 10)}
                                                                </span>
                                                            )}
                                                            {order.status === 'ordered' && !isReadOnly && onReceiptConfirm && (
                                                                <button
                                                                    onClick={() => onReceiptConfirm(order)}
                                                                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors active:scale-95"
                                                                >
                                                                    입고 확인
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
