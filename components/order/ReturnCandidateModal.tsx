import React, { useState, useMemo, useCallback } from 'react';
import { InventoryItem, ReturnRequest, ReturnReason } from '../../types';

export type ReturnCategory = 'olderThanYear' | 'neverUsed' | 'overstock';

interface ReturnCandidateModalProps {
    initialCategory: ReturnCategory;
    inventory: InventoryItem[];
    returnRequests: ReturnRequest[];
    snoozedIds: Record<string, number>;
    onClose: () => void;
    onCreateReturn: (params: {
        manufacturer: string;
        reason: ReturnReason;
        manager: string;
        memo: string;
        items: { brand: string; size: string; quantity: number }[];
    }) => Promise<void>;
    onSnooze: (itemId: string) => void;
    managerName?: string;
    showAlertToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const ReturnCandidateModal: React.FC<ReturnCandidateModalProps> = ({
    inventory,
    returnRequests,
    snoozedIds,
    onClose,
    onCreateReturn,
    onSnooze,
    managerName,
    showAlertToast,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isProcessing, setIsProcessing] = useState(false);
    const [isBulkReturning, setIsBulkReturning] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [bulkTotal, setBulkTotal] = useState(0);
    const [cardIndex, setCardIndex] = useState(0);

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

    const items = useMemo(() =>
        inventory
            .filter(i => !isExcluded(i) && i.currentStock > 0 && !isSnoozed(i.id))
            .filter(i => i.recommendedStock > 0 && i.currentStock > i.recommendedStock)
            .sort((a, b) => (b.currentStock - b.recommendedStock) - (a.currentStock - a.recommendedStock)),
        [inventory, isExcluded, isSnoozed],
    );

    const totalExcess = useMemo(() =>
        items.reduce((s, i) => s + (i.currentStock - i.recommendedStock), 0),
        [items],
    );

    const allSelected = items.length > 0 && items.every(i => selectedIds.has(i.id));
    const someSelected = selectedIds.size > 0;
    const selectedItems = items.filter(i => selectedIds.has(i.id));

    // 브랜드별 집계 (초과량 내림차순)
    // returnQty: 실제로 반품될 수량 — 선택한 항목이 있으면 선택분만, 없으면 전체 초과분
    const brandGroups = useMemo(() => {
        const map = new Map<string, { count: number; excess: number; returnQty: number }>();
        items.forEach(i => {
            const key = i.brand;
            const prev = map.get(key) ?? { count: 0, excess: 0, returnQty: 0 };
            const itemExcess = i.currentStock - i.recommendedStock;
            const willReturn = selectedIds.has(i.id);
            map.set(key, {
                count: prev.count + 1,
                excess: prev.excess + itemExcess,
                returnQty: prev.returnQty + (willReturn ? itemExcess : 0),
            });
        });
        return Array.from(map.entries()).sort((a, b) => b[1].excess - a[1].excess);
    }, [items, selectedIds]);

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    const toggleItem = (id: string) => {
        setSelectedIds(prev => {
            const s = new Set(prev);
            if (s.has(id)) s.delete(id); else s.add(id);
            return s;
        });
    };

    const handleReturn = async (item: InventoryItem, qty: number) => {
        setIsProcessing(true);
        try {
            await onCreateReturn({
                manufacturer: item.manufacturer,
                reason: 'excess_stock' as ReturnReason,
                manager: managerName || '반품 권장',
                memo: `권장량 초과 반품 (권장: ${item.recommendedStock}, 현재: ${item.currentStock})`,
                items: [{ brand: item.brand, size: item.size, quantity: qty }],
            });
            showAlertToast(`${item.brand} ${item.size} ${qty}개 반품이 등록되었습니다.`, 'success');
        } catch {
            showAlertToast('반품 등록에 실패했습니다.', 'error');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleBulkReturn = async () => {
        const targets = someSelected ? selectedItems : items;
        if (targets.length === 0) return;
        setBulkTotal(targets.length);
        setBulkProgress(0);
        setIsBulkReturning(true);
        for (const item of targets) {
            const qty = item.currentStock - item.recommendedStock;
            await onCreateReturn({
                manufacturer: item.manufacturer,
                reason: 'excess_stock' as ReturnReason,
                manager: managerName || '반품 권장',
                memo: `권장량 초과 반품 (권장: ${item.recommendedStock}, 현재: ${item.currentStock})`,
                items: [{ brand: item.brand, size: item.size, quantity: qty }],
            });
            setBulkProgress(prev => prev + 1);
        }
        setIsBulkReturning(false);
        setSelectedIds(new Set());
        showAlertToast(`${targets.length}개 품목 반품이 등록되었습니다.`, 'success');
    };

    const handleSnooze = (item: InventoryItem) => {
        onSnooze(item.id);
        setSelectedIds(prev => { const s = new Set(prev); s.delete(item.id); return s; });
        showAlertToast(`${item.brand} ${item.size}을(를) 1개월간 목록에서 숨깁니다.`, 'info');
    };

    const handleBulkSnooze = () => {
        selectedItems.forEach(i => {
            onSnooze(i.id);
        });
        setSelectedIds(new Set());
        showAlertToast(`${selectedItems.length}개 품목을 1개월간 숨깁니다.`, 'info');
    };

    // 모바일 카드 wizard: 각 액션 후 다음 카드로 이동
    const handleReturnAndAdvance = async (item: InventoryItem, qty: number) => {
        await handleReturn(item, qty);
        setCardIndex(prev => prev + 1);
    };

    const handleSnoozeAndAdvance = (item: InventoryItem) => {
        handleSnooze(item);
        setCardIndex(prev => prev + 1);
    };

    const bulkReturnTarget = someSelected ? selectedItems : items;
    const bulkReturnQty = bulkReturnTarget.reduce((s, i) => s + (i.currentStock - i.recommendedStock), 0);

    // 모바일 wizard 현재 품목
    const mobileItem = items[cardIndex] ?? null;
    const mobileExcess = mobileItem ? mobileItem.currentStock - mobileItem.recommendedStock : 0;
    const mobilePendingQty = mobileItem
        ? returnRequests
            .filter(r => r.manufacturer === mobileItem.manufacturer && (r.status === 'requested' || r.status === 'picked_up'))
            .flatMap(r => r.items)
            .filter(ri => ri.brand === mobileItem.brand && ri.size === mobileItem.size)
            .reduce((s, ri) => s + ri.quantity, 0)
        : 0;
    const mobileAllDone = cardIndex >= items.length && items.length > 0;

    // 일괄 반품 진행 오버레이
    if (isBulkReturning) {
        const remaining = bulkTotal - bulkProgress;
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-10 flex flex-col items-center gap-6">
                    <div className="relative flex items-center justify-center">
                        <svg className="w-16 h-16 animate-spin text-indigo-200" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                        </svg>
                        <svg className="w-16 h-16 animate-spin text-indigo-500 absolute" style={{ animationDuration: '0.7s' }} viewBox="0 0 24 24" fill="none">
                            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">반품 처리 중</p>
                        <p className="text-xs text-slate-400 mt-1">초과 수량을 반품합니다</p>
                    </div>
                    <div className="text-center">
                        <p className="text-7xl font-black tabular-nums text-slate-800 leading-none">{remaining}</p>
                        <p className="text-sm font-semibold text-slate-400 mt-2">품목 남음 <span className="text-slate-300">/ {bulkTotal}개</span></p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                            style={{ width: `${bulkTotal > 0 ? (bulkProgress / bulkTotal) * 100 : 0}%` }} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-3xl shadow-2xl flex flex-col max-h-[92dvh] sm:max-h-[85vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-start justify-between">
                        <div className="min-w-0">
                            <h3 className="text-xl font-black text-slate-900 whitespace-nowrap">권장량 초과 품목</h3>
                            <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">현재 재고가 권장 수량을 초과하는 품목입니다.</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                            {/* 모바일 진행 표시 */}
                            {items.length > 0 && !mobileAllDone && (
                                <span className="sm:hidden text-sm font-black text-slate-400 tabular-nums whitespace-nowrap">
                                    {cardIndex + 1} <span className="text-slate-300 font-bold">/</span> {items.length}
                                </span>
                            )}
                            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                    </div>

                    {/* Summary + 브랜드별 분류 (데스크톱 전용) */}
                    <div className="hidden sm:block mt-4 bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                        {/* 상단 요약 */}
                        <div className="flex items-center gap-3 mb-3">
                            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                            <div>
                                <p className="text-xs font-bold text-indigo-800">권장량 초과</p>
                                <p className="text-xl font-black text-indigo-600 leading-tight tabular-nums">{items.length} <span className="text-sm font-bold">품목</span> <span className="text-xs font-bold text-indigo-400">· 총 +{totalExcess}개 초과</span></p>
                            </div>
                        </div>
                        {/* 브랜드별 그리드 */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {brandGroups.map(([brand, { count, excess, returnQty }]) => (
                                <div key={brand} className="bg-white/70 rounded-lg px-3 py-2.5 flex items-start justify-between gap-2">
                                    <p className="text-xs font-black text-slate-700 truncate pt-0.5">{brand}</p>
                                    <div className="text-right shrink-0">
                                        <div>
                                            <span className="text-xs font-bold text-slate-600 tabular-nums">{count}품목</span>
                                            <span className="text-[10px] text-indigo-400 font-bold ml-1.5 tabular-nums">+{excess}</span>
                                        </div>
                                        <div className={`mt-0.5 text-[11px] font-black tabular-nums ${returnQty > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                                            반품 {returnQty}개
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 모바일 진행 바 */}
                    {items.length > 0 && (
                        <div className="sm:hidden mt-3">
                            <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                                <div
                                    className="bg-indigo-400 h-full rounded-full transition-all duration-300"
                                    style={{ width: `${Math.min((cardIndex / items.length) * 100, 100)}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="py-16 text-center">
                            <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm font-bold text-slate-400">권장량 초과 품목이 없습니다.</p>
                            <p className="text-xs text-slate-300 mt-1">모든 품목이 권장 수량 이하로 관리되고 있습니다.</p>
                        </div>
                    ) : (
                        <>
                            {/* 모바일: 카드 wizard */}
                            <div className="sm:hidden p-4">
                                {mobileAllDone ? (
                                    <div className="py-10 text-center">
                                        <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <p className="text-base font-black text-slate-800">모두 처리 완료</p>
                                        <p className="text-xs text-slate-400 mt-1">모든 초과 품목을 검토했습니다</p>
                                    </div>
                                ) : mobileItem && (
                                    <div>
                                        {/* 카드 */}
                                        <div className="bg-slate-50 rounded-2xl border border-slate-200 px-5 pt-5 pb-5">
                                            {/* 제조사·브랜드 */}
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                <span className="text-[11px] font-semibold text-slate-400 shrink-0 whitespace-nowrap">{mobileItem.manufacturer}</span>
                                                <span className="text-slate-300 shrink-0">·</span>
                                                <span className="text-sm font-black text-slate-800 whitespace-nowrap">{mobileItem.brand}</span>
                                            </div>

                                            {/* 규격 크게 */}
                                            <p className="text-[26px] font-black text-slate-700 mt-2 leading-tight tracking-tight whitespace-nowrap">{mobileItem.size}</p>

                                            {/* 현재재고 · 권장 · 초과 */}
                                            <div className="flex items-stretch gap-0 mt-4">
                                                <div className="flex-1 flex flex-col items-center py-3">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 whitespace-nowrap">현재재고</p>
                                                    <div className="flex items-end gap-0.5">
                                                        <span className="text-[38px] font-black text-slate-900 tabular-nums leading-none">{mobileItem.currentStock}</span>
                                                        <span className="text-sm font-bold text-slate-400 mb-1">개</span>
                                                    </div>
                                                </div>
                                                <div className="w-px bg-slate-200 self-stretch mx-1" />
                                                <div className="flex-1 flex flex-col items-center py-3">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 whitespace-nowrap">권장</p>
                                                    <div className="flex items-end gap-0.5">
                                                        <span className="text-[38px] font-black text-slate-500 tabular-nums leading-none">{mobileItem.recommendedStock}</span>
                                                        <span className="text-sm font-bold text-slate-400 mb-1">개</span>
                                                    </div>
                                                </div>
                                                <div className="w-px bg-slate-200 self-stretch mx-1" />
                                                <div className="flex-1 flex flex-col items-center py-3">
                                                    <p className="text-[10px] font-bold text-slate-400 mb-1.5 whitespace-nowrap">초과</p>
                                                    <div className="flex items-end gap-0.5">
                                                        <span className="text-[38px] font-black text-indigo-500 tabular-nums leading-none">+{mobileExcess}</span>
                                                        <span className="text-sm font-bold text-slate-400 mb-1">개</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {mobilePendingQty > 0 && (
                                                <p className="text-[11px] font-bold text-amber-600 mt-1 whitespace-nowrap">반품예정 {mobilePendingQty}개</p>
                                            )}
                                        </div>

                                        {/* 액션 버튼 3열 */}
                                        <div className="flex gap-2 mt-4">
                                            <button
                                                onClick={() => handleSnoozeAndAdvance(mobileItem)}
                                                className="flex-1 h-14 rounded-2xl border-2 border-teal-200 bg-teal-50 text-teal-700 text-[15px] font-black whitespace-nowrap active:scale-[0.97] transition-transform">
                                                유지
                                            </button>
                                            <button
                                                onClick={() => handleReturnAndAdvance(mobileItem, mobileExcess)}
                                                disabled={isProcessing}
                                                className="flex-1 h-14 rounded-2xl bg-amber-500 text-white text-[15px] font-black whitespace-nowrap disabled:opacity-50 active:scale-[0.97] transition-transform">
                                                반품
                                            </button>
                                            <button
                                                onClick={() => setCardIndex(prev => prev + 1)}
                                                className="flex-1 h-14 rounded-2xl border-2 border-slate-200 bg-white text-slate-400 text-[13px] font-bold whitespace-nowrap active:scale-[0.97] transition-transform">
                                                건너뛰기
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* 데스크톱: 테이블 */}
                            <table className="hidden sm:table w-full text-sm">
                                <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                                    <tr>
                                        <th className="py-3 pl-6 pr-2">
                                            <input
                                                type="checkbox"
                                                checked={allSelected}
                                                onChange={toggleAll}
                                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600"
                                            />
                                        </th>
                                        <th className="py-3 px-3 text-left text-[11px] font-bold text-slate-500 tracking-wide">제조사 / 브랜드</th>
                                        <th className="py-3 px-3 text-left text-[11px] font-bold text-slate-500 tracking-wide">규격</th>
                                        <th className="py-3 px-3 text-right text-[11px] font-bold text-slate-500 tracking-wide">현재재고</th>
                                        <th className="py-3 px-3 text-right text-[11px] font-bold text-slate-500 tracking-wide">초과량</th>
                                        <th className="py-3 pl-3 pr-6 text-right text-[11px] font-bold text-slate-500 tracking-wide">작업</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {items.map(item => {
                                        const excess = item.currentStock - item.recommendedStock;
                                        const isSelected = selectedIds.has(item.id);
                                        const pendingQty = returnRequests
                                            .filter(r => r.manufacturer === item.manufacturer && (r.status === 'requested' || r.status === 'picked_up'))
                                            .flatMap(r => r.items)
                                            .filter(ri => ri.brand === item.brand && ri.size === item.size)
                                            .reduce((s, ri) => s + ri.quantity, 0);

                                        return (
                                            <tr key={item.id} className={`group transition-colors ${isSelected ? 'bg-indigo-50/40' : 'hover:bg-slate-50/60'}`}>
                                                <td className="pl-6 pr-2 py-3.5">
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleItem(item.id)}
                                                        className="w-4 h-4 rounded border-slate-300 text-indigo-600 cursor-pointer accent-indigo-600" />
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <p className="text-xs font-black text-slate-800">{item.brand}</p>
                                                    <p className="text-[11px] text-slate-400">{item.manufacturer}</p>
                                                </td>
                                                <td className="px-3 py-3.5">
                                                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{item.size}</span>
                                                </td>
                                                <td className="px-3 py-3.5 text-right">
                                                    <span className="text-xs font-bold text-slate-700 tabular-nums">{item.currentStock}개</span>
                                                    {pendingQty > 0 && (
                                                        <p className="text-[10px] text-amber-600 font-bold tabular-nums">반품예정 {pendingQty}개</p>
                                                    )}
                                                </td>
                                                <td className="px-3 py-3.5 text-right">
                                                    <span className="text-xs font-bold text-indigo-600 tabular-nums">+{excess}개</span>
                                                </td>
                                                <td className="pl-3 pr-6 py-3.5">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <button
                                                            onClick={() => handleReturn(item, excess)}
                                                            disabled={isProcessing}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-lg hover:bg-amber-100 disabled:opacity-40 transition-colors whitespace-nowrap">
                                                            반품
                                                        </button>
                                                        <button
                                                            onClick={() => handleSnooze(item)}
                                                            className="px-2.5 py-1 text-[11px] font-bold text-teal-700 border border-teal-200 bg-teal-50 rounded-lg hover:bg-teal-100 transition-colors whitespace-nowrap">
                                                            유지
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </>
                    )}
                </div>

                {/* 모바일 푸터 */}
                <div className="sm:hidden px-4 py-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
                    <button onClick={onClose}
                        className="flex-1 h-11 text-sm font-bold text-slate-600 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-colors whitespace-nowrap">
                        닫기
                    </button>
                    <button
                        onClick={handleBulkReturn}
                        disabled={items.length === 0}
                        className="flex-1 h-11 text-sm font-bold text-white bg-indigo-500 rounded-2xl hover:bg-indigo-600 disabled:opacity-40 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                        전체 반품
                    </button>
                </div>

                {/* 데스크톱 푸터 */}
                <div className="hidden sm:flex px-6 py-4 border-t border-slate-100 items-center justify-between shrink-0 gap-3">
                    <p className="text-xs text-slate-400 shrink-0">
                        항목을 선택해 유지하거나 반품하세요
                    </p>
                    <div className="flex items-center gap-2 shrink-0">
                        <button onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                            닫기
                        </button>
                        {someSelected && (
                            <button onClick={handleBulkSnooze}
                                className="px-4 py-2 text-sm font-bold text-teal-700 border border-teal-200 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors whitespace-nowrap">
                                ✓ 선택 품목 유지 ({selectedIds.size})
                            </button>
                        )}
                        <button
                            onClick={handleBulkReturn}
                            disabled={bulkReturnTarget.length === 0}
                            className="px-4 py-2 text-sm font-bold text-white bg-indigo-500 rounded-xl hover:bg-indigo-600 disabled:opacity-40 transition-colors flex items-center gap-1.5 whitespace-nowrap">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                            {someSelected ? `선택 반품 (${bulkReturnQty}개)` : `초과분 반품 (${bulkReturnQty}개)`}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default ReturnCandidateModal;
