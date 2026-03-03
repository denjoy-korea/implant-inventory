import { useState, useEffect } from 'react';
import { GroupedOrder } from '../OrderManager';

const displayMfr = (name: string) => name === 'IBS' ? 'IBS Implant' : name;

interface OrderDetailCardProps {
    group: GroupedOrder;
    onClose: () => void;
    onReceiptConfirm: () => void;
    isReadOnly?: boolean;
}

export function OrderDetailCard({ group, onClose, onReceiptConfirm, isReadOnly }: OrderDetailCardProps) {
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    const isReturn = group.type === 'return';
    const isExchange = group.type === 'fail_exchange';

    const typeLabel = isReturn ? '반품' : isExchange ? '교환' : '발주';
    const typeColor = isReturn
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : isExchange
            ? 'bg-rose-50 text-rose-700 border-rose-200'
            : 'bg-indigo-50 text-indigo-700 border-indigo-200';

    const overallStatusMap = {
        received: { label: '완료', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
        ordered: { label: '대기중', color: 'bg-rose-100 text-rose-700 border-rose-200' },
        cancelled: { label: '취소됨', color: 'bg-slate-100 text-slate-500 border-slate-200' },
        mixed: { label: '부분완료', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    } as const;
    const overallStatus = overallStatusMap[group.overallStatus as keyof typeof overallStatusMap] ?? overallStatusMap.ordered;

    const hasPending = group.orders.some(o => o.status === 'ordered');
    const receivedCount = group.orders.filter(o => o.status === 'received').length;
    const cancelledCount = group.orders.filter(o => o.status === 'cancelled').length;

    return (
        <div className={`transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
            <div className="bg-white rounded-[28px] border border-slate-200 shadow-md ring-1 ring-slate-100/50 overflow-hidden">

                {/* Header */}
                <div className="px-5 sm:px-7 py-4 border-b border-slate-100 bg-slate-50/40 flex items-start sm:items-center justify-between gap-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-black text-slate-800 tracking-tight">주문 상세 내역</h3>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg border ${overallStatus.color}`}>
                                {overallStatus.label}
                            </span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] text-slate-500 font-semibold">
                            <span className="font-bold text-slate-700">{group.date}</span>
                            <span className="text-slate-300">·</span>
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${typeColor}`}>{typeLabel}</span>
                            <span className="text-slate-300">·</span>
                            <span className="font-black text-slate-700">{displayMfr(group.manufacturer)}</span>
                            <span className="text-slate-300">·</span>
                            <span>{group.managers.join(', ')}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        {hasPending && !isReadOnly && (
                            <button
                                onClick={onReceiptConfirm}
                                className="px-3 py-1.5 rounded-xl text-[11px] font-black bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm active:scale-95 flex items-center gap-1.5"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                입고 확인
                            </button>
                        )}
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

                {/* Orders list */}
                <div className="divide-y divide-slate-50/80">
                    {group.orders.map((order, orderIdx) => {
                        const statusLabel = order.status === 'ordered'
                            ? (isReturn ? '반품 대기' : isExchange ? '미교환' : '미입고')
                            : order.status === 'cancelled' ? '취소됨'
                                : (isReturn ? '반품완료' : isExchange ? '교환완료' : '입고완료');

                        const statusColor = order.status === 'ordered'
                            ? 'bg-rose-50 text-rose-700 border-rose-100'
                            : order.status === 'cancelled'
                                ? 'bg-slate-100 text-slate-500 border-slate-200'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-100';

                        const rowBg = order.status === 'received'
                            ? 'bg-emerald-50/20'
                            : order.status === 'cancelled'
                                ? 'bg-slate-50/50'
                                : '';

                        return (
                            <div key={order.id} className={`px-5 sm:px-7 py-4 ${rowBg}`}>
                                {/* Order meta row */}
                                <div className="flex items-center gap-2 mb-3 flex-wrap">
                                    <span className="text-[10px] font-bold text-slate-400 tabular-nums">#{orderIdx + 1}</span>
                                    <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{order.id.slice(0, 8)}</span>
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${statusColor}`}>
                                        {statusLabel}
                                    </span>
                                    {order.receivedDate && (
                                        <span className="text-[10px] font-semibold text-emerald-600 flex items-center gap-1">
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                            {order.receivedDate.slice(0, 10)}
                                        </span>
                                    )}
                                    {order.cancelledReason && (
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md">
                                            취소 사유: {order.cancelledReason}
                                        </span>
                                    )}
                                    {order.memo && (
                                        <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-md max-w-[200px] truncate">
                                            메모: {order.memo}
                                        </span>
                                    )}
                                </div>

                                {/* Items grid */}
                                <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                                    {order.items.map((item, itemIdx) => (
                                        <div
                                            key={itemIdx}
                                            className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${order.status === 'received'
                                                ? 'bg-white border-emerald-100'
                                                : order.status === 'cancelled'
                                                    ? 'bg-white border-slate-100 opacity-50'
                                                    : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-xs font-black text-slate-800 truncate">{item.brand}</span>
                                                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md shrink-0">{item.size}</span>
                                            </div>
                                            <span className={`text-xs font-black tabular-nums shrink-0 ml-2 ${order.status === 'received'
                                                ? 'text-emerald-700'
                                                : order.status === 'cancelled'
                                                    ? 'text-slate-400 line-through'
                                                    : 'text-slate-800'
                                                }`}>
                                                {item.quantity}개
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer summary */}
                <div className="px-5 sm:px-7 py-3 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-semibold flex-wrap">
                        <span>총 <b className="text-slate-700 font-black">{group.totalQuantity}</b>개</span>
                        <span className="text-slate-200">·</span>
                        <span><b className="text-slate-700 font-black">{group.totalItems}</b>품목</span>
                        <span className="text-slate-200">·</span>
                        <span><b className="text-slate-700 font-black">{group.orders.length}</b>건</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-bold flex-wrap justify-end">
                        {receivedCount > 0 && (
                            <span className="text-emerald-600 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                완료 {receivedCount}건
                            </span>
                        )}
                        {hasPending && (
                            <span className="text-rose-500 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                대기 {group.orders.filter(o => o.status === 'ordered').length}건
                            </span>
                        )}
                        {cancelledCount > 0 && (
                            <span className="text-slate-400">취소 {cancelledCount}건</span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
