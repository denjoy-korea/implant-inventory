import React, { useState } from 'react';
import { GroupedOrder } from './OrderManager';
import { Order, OrderItem, InventoryItem } from '../types';

export interface ReceiptUpdate {
    orderId: string;
    item: OrderItem;
    originalQuantity: number;
    newQuantity: number;
    memo?: string;
    autoReorderDeficit?: boolean;
    wrongDeliveryReturn?: {
        receivedSize: string;
        quantity: number;
    };
}

interface ReceiptConfirmationModalProps {
    groupedOrder: GroupedOrder;
    inventory: InventoryItem[];
    onClose: () => void;
    onConfirmReceipt: (updates: ReceiptUpdate[], orderIdsToReceive: string[]) => Promise<void>;
    onUpdateOrderStatus?: (id: string, status: 'ordered' | 'received' | 'cancelled') => void;
    onDeleteOrder?: (id: string) => void;
    isLoading?: boolean;
}

export function ReceiptConfirmationModal({
    groupedOrder,
    inventory,
    onClose,
    onConfirmReceipt,
    onUpdateOrderStatus,
    onDeleteOrder,
    isLoading
}: ReceiptConfirmationModalProps) {
    // item 식별을 위해 orderId와 결합한 고유 키를 사용합니다.
    const [quantities, setQuantities] = useState<Record<string, number>>(() => {
        const init: Record<string, number> = {};
        groupedOrder.orders.forEach(order => {
            order.items.forEach((item, idx) => {
                init[`${order.id}-${idx}`] = item.quantity;
            });
        });
        return init;
    });

    const [memos, setMemos] = useState<Record<string, string>>({});
    const [autoReorders, setAutoReorders] = useState<Record<string, boolean>>({});
    const [returnWrongDelivery, setReturnWrongDelivery] = useState<Record<string, boolean>>({});
    const [wrongDeliveryParts, setWrongDeliveryParts] = useState<Record<string, string[]>>({});
    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const [excludedOrderIds, setExcludedOrderIds] = useState<string[]>([]);

    const handleResetOrder = (orderId: string) => {
        const order = groupedOrder.orders.find(o => o.id === orderId);
        if (!order) return;

        // 입고완료/취소 상태이면 → 미입고 상태로 되돌림
        if (order.status !== 'ordered') {
            if (window.confirm('이 주문을 미입고 상태로 되돌리시겠습니까?')) {
                onUpdateOrderStatus?.(order.id, 'ordered');
            }
            return;
        }

        // 미입고 상태이면 → 편집 내용만 초기화
        setQuantities(prev => {
            const next = { ...prev };
            order.items.forEach((item, idx) => {
                next[`${order.id}-${idx}`] = item.quantity;
            });
            return next;
        });

        const resetKeys = order.items.map((_, idx) => `${order.id}-${idx}`);

        setMemos(prev => {
            const next = { ...prev };
            resetKeys.forEach(k => delete next[k]);
            return next;
        });
        setAutoReorders(prev => {
            const next = { ...prev };
            resetKeys.forEach(k => delete next[k]);
            return next;
        });
        setReturnWrongDelivery(prev => {
            const next = { ...prev };
            resetKeys.forEach(k => delete next[k]);
            return next;
        });
        setWrongDeliveryParts(prev => {
            const next = { ...prev };
            resetKeys.forEach(k => delete next[k]);
            return next;
        });
        // 제외 목록에서도 복원
        setExcludedOrderIds(prev => prev.filter(id => id !== orderId));
    };

    const handleDeleteAction = (orderId: string) => {
        if (window.confirm('정말로 이 주문을 삭제하시겠습니까?')) {
            onDeleteOrder?.(orderId);
        }
    };

    const handleQuantityChange = (key: string, val: string) => {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 0) {
            setQuantities(prev => ({ ...prev, [key]: parsed }));
        } else if (val === '') {
            setQuantities(prev => ({ ...prev, [key]: 0 }));
        }
    };

    const handleConfirm = async () => {
        const updates: ReceiptUpdate[] = [];
        groupedOrder.orders.forEach(order => {
            if (excludedOrderIds.includes(order.id)) return;
            order.items.forEach((item, idx) => {
                const key = `${order.id}-${idx}`;
                const newQty = quantities[key];
                if (newQty !== undefined && newQty !== item.quantity) {
                    updates.push({
                        orderId: order.id,
                        item,
                        originalQuantity: item.quantity,
                        newQuantity: newQty,
                        memo: memos[key],
                        autoReorderDeficit: autoReorders[key],
                        wrongDeliveryReturn: returnWrongDelivery[key] ? (() => {
                            const parts = item.size.split(/([\d.]+)/);
                            const userParts = wrongDeliveryParts[key] || [];
                            let finalSize = '';
                            for (let i = 0; i < parts.length; i++) {
                                if (i % 2 === 0) {
                                    finalSize += parts[i];
                                } else {
                                    finalSize += (userParts[i] !== undefined && userParts[i] !== '') ? userParts[i] : parts[i];
                                }
                            }
                            return { receivedSize: finalSize, quantity: item.quantity - newQty };
                        })() : undefined
                    });
                }
            });
        });

        const orderIdsToReceive = groupedOrder.orders
            .filter(o => o.status === 'ordered' && !excludedOrderIds.includes(o.id))
            .map(o => o.id);
        await onConfirmReceipt(updates, orderIdsToReceive);
    };

    const isChanged = groupedOrder.orders
        .filter(o => !excludedOrderIds.includes(o.id))
        .some(order =>
            order.items.some((item, idx) => quantities[`${order.id}-${idx}`] !== item.quantity)
        );

    const activeOrders = groupedOrder.orders.filter(o => !excludedOrderIds.includes(o.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 tracking-tight">상세 입고 확인</h3>
                        <p className="text-sm font-semibold text-slate-500 mt-1">
                            {groupedOrder.date} · {groupedOrder.manufacturer} · {groupedOrder.type === 'replenishment' ? '발주' : groupedOrder.type === 'return' ? '반품' : '교환'}내역
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                        <div className="text-blue-500 mt-0.5">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-blue-900">입고 수량 확인</h4>
                            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                실제 수령한 품목의 수량을 확인하고 수정해주세요.<br />
                                • <b>초과 입고:</b> 수량을 올리고 사유를 입력합니다.<br />
                                • <b>부족 입고:</b> 수량을 내리고 부족분만큼 재발주할지 선택합니다.
                            </p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {activeOrders.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                모든 주문이 입고 확인 대상에서 제외되었습니다.
                            </div>
                        ) : activeOrders.map(order => (
                            <div key={order.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600">주문 ID: <span className="font-mono text-slate-400">{order.id.slice(0, 8)}</span></span>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${order.status === 'ordered' ? 'bg-rose-100 text-rose-700'
                                            : order.status === 'cancelled' ? 'bg-slate-100 text-slate-500'
                                                : 'bg-emerald-100 text-emerald-700'
                                            }`}>
                                            {order.status === 'ordered' ? '미입고' : order.status === 'cancelled' ? '취소됨' : '입고완료'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            onClick={() => handleResetOrder(order.id)}
                                            title={order.status === 'ordered' ? "입력 초기화" : "미입고 상태로 되돌리기"}
                                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                        </button>
                                        <button
                                            onClick={() => handleDeleteAction(order.id)}
                                            title="주문 삭제"
                                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                        </button>
                                    </div>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {order.items.map((item, idx) => {
                                        const key = `${order.id}-${idx}`;
                                        const currentQty = quantities[key];
                                        const isOver = currentQty > item.quantity;
                                        const isUnder = currentQty < item.quantity;
                                        const diff = currentQty - item.quantity;

                                        return (
                                            <div key={idx} className={`p-4 transition-colors ${isOver ? 'bg-amber-50/30' : isUnder ? 'bg-rose-50/30' : 'bg-white'}`}>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    {/* Item Info */}
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-slate-800">{item.brand}</span>
                                                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{item.size}</span>
                                                        </div>
                                                    </div>

                                                    {/* Qty Control */}
                                                    {order.status === 'ordered' ? (
                                                        <div className="flex items-center gap-6">
                                                            <div className="text-right">
                                                                <span className="block text-[10px] font-bold text-slate-400 mb-1">발주 수량</span>
                                                                <span className="text-sm font-black text-slate-800">{item.quantity}개</span>
                                                            </div>
                                                            <div className="w-[1px] h-8 bg-slate-200" />
                                                            <div className="text-center">
                                                                <span className="block text-[10px] font-bold text-slate-400 mb-1">실제 입고</span>
                                                                <div className="flex items-center gap-1 border border-slate-200 rounded-xl p-1 bg-white shadow-sm">
                                                                    <button
                                                                        onClick={() => handleQuantityChange(key, String(Math.max(0, currentQty - 1)))}
                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        className="w-10 text-center text-sm font-black text-slate-800 focus:outline-none appearance-none"
                                                                        value={currentQty}
                                                                        onChange={(e) => handleQuantityChange(key, e.target.value)}
                                                                    />
                                                                    <button
                                                                        onClick={() => handleQuantityChange(key, String(currentQty + 1))}
                                                                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                                    >
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-right">
                                                            <span className="block text-[10px] font-bold text-emerald-500 mb-1">완료 수량</span>
                                                            <span className="text-sm font-black text-slate-800">{item.quantity}개</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* 예외 처리 옵션 */}
                                                {order.status === 'ordered' && (isOver || isUnder) && (
                                                    <div className={`mt-4 p-3 rounded-xl border ${isOver ? 'bg-amber-50/50 border-amber-200' : 'bg-rose-50/50 border-rose-200'}`}>
                                                        {isOver ? (
                                                            <div className="space-y-2">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                        {diff}개 초과 입고됨
                                                                    </span>
                                                                </div>
                                                                <input
                                                                    type="text"
                                                                    placeholder="초과 입고 사유를 간단히 입력해주세요 (선택)"
                                                                    className="w-full text-xs px-3 py-2 border border-amber-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                                                                    value={memos[key] || ''}
                                                                    onChange={(e) => setMemos(prev => ({ ...prev, [key]: e.target.value }))}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="space-y-4">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                        {Math.abs(diff)}개 부족 입고됨
                                                                    </span>
                                                                </div>
                                                                <div className="flex flex-col gap-3">
                                                                    <div className="text-xs text-rose-600/80 mb-1">어떻게 처리할까요? (선택 사항)</div>

                                                                    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100/50 transition-colors">
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                                                                                checked={autoReorders[key] || false}
                                                                                onChange={(e) => setAutoReorders(prev => ({ ...prev, [key]: e.target.checked }))}
                                                                            />
                                                                            <span className="text-xs font-bold text-rose-800">단순 누락 (수량 부족)</span>
                                                                        </label>
                                                                        <span className="text-[11px] text-rose-600/80 pl-6 leading-tight">
                                                                            거래처에서 물건을 덜 보냈습니다. 누락된 {Math.abs(diff)}개만큼 새 발주서를 자동 생성합니다.
                                                                        </span>
                                                                    </div>

                                                                    <div className="flex flex-col gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100/50 transition-colors">
                                                                        <label className="flex items-center gap-2 cursor-pointer">
                                                                            <input
                                                                                type="checkbox"
                                                                                className="w-4 h-4 rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                                                                                checked={returnWrongDelivery[key] || false}
                                                                                onChange={(e) => setReturnWrongDelivery(prev => ({ ...prev, [key]: e.target.checked }))}
                                                                            />
                                                                            <span className="text-xs font-bold text-rose-800">규격 오배송 (다른 제품 도착)</span>
                                                                        </label>
                                                                        <span className="text-[11px] text-rose-600/80 pl-6 leading-tight">
                                                                            주문한 것과 다른 규격이 도착했습니다. 잘못 온 {Math.abs(diff)}개를 교환(반품) 처리합니다.
                                                                        </span>
                                                                        {returnWrongDelivery[key] && (() => {
                                                                            const parts = item.size.split(/([\d.]+)/);
                                                                            const userParts = wrongDeliveryParts[key] || [];
                                                                            const inventorySizes = inventory
                                                                                .filter(inv => inv.manufacturer === order.manufacturer && inv.brand === item.brand)
                                                                                .map(inv => inv.size.split(/([\d.]+)/));

                                                                            return (
                                                                                <div className="pl-6 mt-1 flex flex-wrap items-center gap-1.5 bg-white border border-rose-200 rounded-lg px-3 py-2 overflow-hidden focus-within:ring-2 focus-within:ring-rose-500/20">
                                                                                    {parts.map((part, i) => {
                                                                                        if (i % 2 === 0) {
                                                                                            if (!part) return null;
                                                                                            return <span key={i} className="text-[12px] text-slate-500 font-bold select-none shrink-0 tracking-wide whitespace-pre">{part}</span>;
                                                                                        } else {
                                                                                            const options = Array.from(new Set(inventorySizes.map(p => p[i]).filter(Boolean)))
                                                                                                .map(Number)
                                                                                                .filter(n => !isNaN(n))
                                                                                                .sort((a, b) => a - b)
                                                                                                .map(String);
                                                                                            const dropdownId = `${key}-${i}`;
                                                                                            const isDropdownOpen = activeDropdown === dropdownId;

                                                                                            return (
                                                                                                <div key={i} className="relative flex items-center shrink-0">
                                                                                                    <input
                                                                                                        type="text"
                                                                                                        placeholder={part}
                                                                                                        className={`text-[12px] py-1 px-1.5 focus:bg-white focus:outline-none font-extrabold text-slate-700 w-14 text-center placeholder:text-slate-300 placeholder:font-normal rounded-md border transition-all ${isDropdownOpen ? 'bg-white border-rose-400 ring-2 ring-rose-500/20' : 'bg-slate-50 border-slate-200 hover:border-slate-300'}`}
                                                                                                        value={userParts[i] !== undefined ? userParts[i] : ''}
                                                                                                        onChange={(e) => {
                                                                                                            setWrongDeliveryParts(prev => {
                                                                                                                const next = { ...prev };
                                                                                                                if (!next[key]) next[key] = [];
                                                                                                                next[key][i] = e.target.value;
                                                                                                                return next;
                                                                                                            });
                                                                                                            setActiveDropdown(dropdownId);
                                                                                                        }}
                                                                                                        onFocus={(e) => {
                                                                                                            e.target.select();
                                                                                                            setActiveDropdown(dropdownId);
                                                                                                        }}
                                                                                                        onBlur={() => {
                                                                                                            setTimeout(() => {
                                                                                                                setActiveDropdown(prev => prev === dropdownId ? null : prev);
                                                                                                            }, 150);
                                                                                                        }}
                                                                                                    />

                                                                                                    {isDropdownOpen && options.length > 0 && (
                                                                                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-20 max-h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl py-1 z-50 overscroll-contain">
                                                                                                            {options.map(num => (
                                                                                                                <button
                                                                                                                    key={num}
                                                                                                                    onMouseDown={(e) => {
                                                                                                                        // onBlur 보다 먼저 동작하도록 preventDefault
                                                                                                                        e.preventDefault();
                                                                                                                    }}
                                                                                                                    onClick={() => {
                                                                                                                        setWrongDeliveryParts(prev => {
                                                                                                                            const next = { ...prev };
                                                                                                                            if (!next[key]) next[key] = [];
                                                                                                                            next[key][i] = num;
                                                                                                                            return next;
                                                                                                                        });
                                                                                                                        setActiveDropdown(null);
                                                                                                                    }}
                                                                                                                    className="w-full px-2 py-1.5 text-center text-[12px] font-bold text-slate-700 hover:bg-slate-50 hover:text-rose-600 transition-colors"
                                                                                                                >
                                                                                                                    {num}
                                                                                                                </button>
                                                                                                            ))}
                                                                                                        </div>
                                                                                                    )}
                                                                                                </div>
                                                                                            );
                                                                                        }
                                                                                    })}
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                    >
                        닫기
                    </button>
                    {groupedOrder.overallStatus !== 'received' && groupedOrder.overallStatus !== 'cancelled' && (
                        <button
                            onClick={handleConfirm}
                            disabled={isLoading}
                            className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center gap-2 ${isChanged
                                ? 'bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 hover:shadow-md'
                                : 'bg-emerald-500 hover:bg-emerald-600 hover:shadow-md'
                                } disabled:opacity-50`}
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    처리 중...
                                </>
                            ) : isChanged ? (
                                '수정사항 적용 및 입고완료'
                            ) : (
                                '전체 일치, 입고완료'
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
