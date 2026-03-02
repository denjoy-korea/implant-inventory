import React, { useState, useMemo, useCallback } from 'react';
import { InventoryItem, Order, ReturnRequest } from '../../types';

export type ReturnCategory = 'olderThanYear' | 'neverUsed' | 'overstock';

interface ReturnCandidateModalProps {
    initialCategory: ReturnCategory;
    inventory: InventoryItem[];
    returnRequests: ReturnRequest[];
    snoozedIds: Record<string, number>; // id → snooze timestamp
    onClose: () => void;
    onReturn: (order: Order) => Promise<void>;
    onSnooze: (itemId: string) => void;
    managerName?: string;
    showAlertToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const CATEGORY_CONFIG = {
    olderThanYear: {
        label: '1년 이상 미사용',
        color: 'amber',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        ),
        description: '사용 이력은 있으나 1년 이상 사용하지 않은 품목입니다.',
    },
    neverUsed: {
        label: '한 번도 미사용',
        color: 'rose',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
        ),
        description: '수술 기록에서 전혀 사용되지 않은 품목입니다.',
    },
    overstock: {
        label: '권장량 초과',
        color: 'indigo',
        icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
        ),
        description: '현재 재고가 권장 수량을 초과하는 품목입니다.',
    },
};

const ReturnCandidateModal: React.FC<ReturnCandidateModalProps> = ({
    initialCategory,
    inventory,
    returnRequests,
    snoozedIds,
    onClose,
    onReturn,
    onSnooze,
    managerName,
    showAlertToast,
}) => {
    const [activeTab, setActiveTab] = useState<ReturnCategory>(initialCategory);
    const [returningItem, setReturningItem] = useState<{ item: InventoryItem; qty: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const now = Date.now();
    const ONE_MONTH = 30 * 24 * 60 * 60 * 1000;

    const isExcluded = useCallback((item: InventoryItem) => {
        const mfr = (item.manufacturer || '').toLowerCase();
        const brand = (item.brand || '').toLowerCase();
        return mfr.includes('fail') || mfr.includes('교환') || mfr === '보험청구' || brand === '보험청구'
            || mfr.includes('보험임플란트') || brand.includes('보험임플란트');
    }, []);

    const isSnoozed = useCallback((id: string) => {
        const ts = snoozedIds[id];
        if (!ts) return false;
        return (now - ts) < ONE_MONTH;
    }, [snoozedIds, now]);

    const oneYearAgoStr = useMemo(() => {
        const d = new Date();
        d.setFullYear(d.getFullYear() - 1);
        return d.toISOString().split('T')[0];
    }, []);

    const categorized = useMemo(() => {
        const eligible = inventory.filter(i => !isExcluded(i) && i.currentStock > 0 && !isSnoozed(i.id));

        const olderThanYear = eligible.filter(i => {
            if (i.usageCount === 0) return false;
            const lastDate = i.lastUsedDate ?? null;
            return lastDate !== null && lastDate < oneYearAgoStr;
        });

        const neverUsed = eligible.filter(i => i.usageCount === 0);

        const overstock = eligible.filter(i => i.recommendedStock > 0 && i.currentStock > i.recommendedStock);

        return { olderThanYear, neverUsed, overstock };
    }, [inventory, isExcluded, isSnoozed, oneYearAgoStr]);

    const activeItems = categorized[activeTab];

    // Group by manufacturer
    const grouped = useMemo(() => {
        const map = new Map<string, InventoryItem[]>();
        activeItems.forEach(item => {
            const list = map.get(item.manufacturer) || [];
            list.push(item);
            map.set(item.manufacturer, list);
        });
        return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
    }, [activeItems]);

    const handleReturn = async (item: InventoryItem, qty: number) => {
        setIsProcessing(true);
        try {
            const memo = activeTab === 'olderThanYear'
                ? `1년 이상 미사용 (마지막 사용: ${item.lastUsedDate || '알 수 없음'})`
                : activeTab === 'neverUsed'
                    ? '한 번도 사용되지 않은 품목'
                    : `권장량 초과 (권장: ${item.recommendedStock}, 현재: ${item.currentStock})`;
            const order: Order = {
                id: `order_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                type: 'return',
                manufacturer: item.manufacturer,
                date: new Date().toISOString().split('T')[0],
                items: [{ brand: item.brand, size: item.size, quantity: qty }],
                manager: managerName || '반품 권장',
                status: 'ordered',
                memo,
            };
            await onReturn(order);
            showAlertToast(`${item.brand} ${item.size} ${qty}개 반품이 주문 내역에 등록되었습니다.`, 'success');
            setReturningItem(null);
        } catch {
            showAlertToast('반품 등록에 실패했습니다.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSnooze = (item: InventoryItem) => {
        onSnooze(item.id);
        showAlertToast(`${item.brand} ${item.size}을(를) 1개월간 목록에서 숨깁니다.`, 'info');
    };

    const tabColors: Record<ReturnCategory, { active: string; inactive: string; icon: string }> = {
        olderThanYear: { active: 'bg-amber-50 border-amber-300 text-amber-700', inactive: 'text-slate-500 hover:bg-slate-50', icon: 'text-amber-500' },
        neverUsed: { active: 'bg-rose-50 border-rose-300 text-rose-700', inactive: 'text-slate-500 hover:bg-slate-50', icon: 'text-rose-500' },
        overstock: { active: 'bg-indigo-50 border-indigo-300 text-indigo-700', inactive: 'text-slate-500 hover:bg-slate-50', icon: 'text-indigo-500' },
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-lg font-bold text-slate-900">반품 권장 품목</h3>
                            <p className="text-xs text-slate-500 mt-0.5">{CATEGORY_CONFIG[activeTab].description}</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Category Tabs */}
                    <div className="mt-4 flex gap-2">
                        {(Object.keys(CATEGORY_CONFIG) as ReturnCategory[]).map(key => {
                            const config = CATEGORY_CONFIG[key];
                            const count = categorized[key].length;
                            const isActive = activeTab === key;
                            const colors = tabColors[key];
                            return (
                                <button
                                    key={key}
                                    onClick={() => { setActiveTab(key); setReturningItem(null); }}
                                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black border-2 transition-all ${isActive ? colors.active : `border-transparent ${colors.inactive}`
                                        }`}
                                >
                                    <span className={isActive ? colors.icon : 'text-slate-400'}>{config.icon}</span>
                                    {config.label}
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/60' : 'bg-slate-100'
                                        }`}>{count}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    {activeItems.length === 0 ? (
                        <div className="py-16 text-center">
                            <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm font-bold text-slate-400">해당 카테고리에 반품 권장 품목이 없습니다.</p>
                            <p className="text-xs text-slate-300 mt-1">모든 품목이 정상 상태이거나 보유 처리되었습니다.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50">
                            {grouped.map(([mfr, items]) => (
                                <div key={mfr} className="px-5 py-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-1 h-4 rounded-full bg-slate-300" />
                                        <span className="text-xs font-black text-slate-700">{mfr}</span>
                                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{items.length}종</span>
                                    </div>
                                    <div className="space-y-2">
                                        {items.map(item => {
                                            const isReturning = returningItem?.item.id === item.id;

                                            if (isReturning) {
                                                const qty = parseInt(returningItem!.qty, 10);
                                                const maxQty = activeTab === 'overstock'
                                                    ? item.currentStock - item.recommendedStock
                                                    : item.currentStock;
                                                const isValid = !isNaN(qty) && qty >= 1 && qty <= maxQty;

                                                return (
                                                    <div key={item.id} className="bg-amber-50/60 rounded-xl p-3 border border-amber-200">
                                                        <div className="flex items-center gap-3 flex-wrap">
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <span className="text-xs font-bold text-slate-700 truncate">{item.brand}</span>
                                                                <span className="text-slate-300">·</span>
                                                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">{item.size}</span>
                                                                <span className="text-[11px] text-slate-400 shrink-0">최대 <span className="font-bold text-slate-600">{maxQty}개</span></span>
                                                            </div>
                                                            <div className="flex items-center gap-2 ml-auto">
                                                                <span className="text-[11px] text-slate-500 font-medium shrink-0">반품 수량</span>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={maxQty}
                                                                    value={returningItem!.qty}
                                                                    onChange={e => setReturningItem({ item, qty: e.target.value })}
                                                                    onKeyDown={e => {
                                                                        if (e.key === 'Enter' && isValid) handleReturn(item, qty);
                                                                        if (e.key === 'Escape') setReturningItem(null);
                                                                    }}
                                                                    className="w-20 px-2 py-1 text-sm font-bold border border-slate-300 rounded-lg text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                                                                    placeholder="수량"
                                                                    autoFocus
                                                                />
                                                                <button
                                                                    onClick={() => handleReturn(item, qty)}
                                                                    disabled={!isValid || isProcessing}
                                                                    className="px-3 py-1 text-[11px] font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                                                >
                                                                    {isProcessing ? '처리 중...' : '확인'}
                                                                </button>
                                                                <button
                                                                    onClick={() => setReturningItem(null)}
                                                                    className="px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                                                >
                                                                    취소
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            }

                                            return (
                                                <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-slate-50 transition-colors group">
                                                    <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                                                        <span className="text-xs font-bold text-slate-700">{item.brand}</span>
                                                        <span className="text-xs font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.size}</span>
                                                        {(() => {
                                                            const pendingReturnQty = returnRequests
                                                                .filter(r =>
                                                                    r.manufacturer === item.manufacturer &&
                                                                    (r.status === 'requested' || r.status === 'picked_up')
                                                                )
                                                                .flatMap(r => r.items)
                                                                .filter(ri => ri.brand === item.brand && ri.size === item.size)
                                                                .reduce((sum, ri) => sum + ri.quantity, 0);
                                                            const netStock = item.currentStock - pendingReturnQty;
                                                            return (
                                                                <span className="text-[10px] font-bold text-slate-400 tabular-nums flex items-center gap-1 flex-wrap">
                                                                    재고 <span className="text-slate-600">{item.currentStock}개</span>
                                                                    {activeTab === 'overstock' && (
                                                                        <span className="text-indigo-500">(+{item.currentStock - item.recommendedStock} 초과)</span>
                                                                    )}
                                                                    {pendingReturnQty > 0 && (
                                                                        <>
                                                                            <span className="text-slate-300">·</span>
                                                                            <span className="text-amber-600 font-black bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                                                                                반품예정 {pendingReturnQty}개
                                                                            </span>
                                                                            <span className="text-slate-400">→ {netStock}개 남음</span>
                                                                        </>
                                                                    )}
                                                                </span>
                                                            );
                                                        })()}
                                                        {activeTab === 'olderThanYear' && item.lastUsedDate && (
                                                            <span className="text-[10px] text-amber-600 font-semibold">마지막: {item.lastUsedDate}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const maxQty = activeTab === 'overstock'
                                                                    ? item.currentStock - item.recommendedStock
                                                                    : item.currentStock;
                                                                setReturningItem({ item, qty: String(maxQty) });
                                                            }}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap"
                                                        >
                                                            반품
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleSnooze(item); }}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-slate-500 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 transition-colors whitespace-nowrap"
                                                        >
                                                            보유
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0">
                    <p className="text-xs text-slate-400">
                        <span className="font-bold text-slate-600">{activeItems.length}</span>개 품목 · '보유' 선택 시 1개월간 숨김
                    </p>
                    <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                        닫기
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReturnCandidateModal;
