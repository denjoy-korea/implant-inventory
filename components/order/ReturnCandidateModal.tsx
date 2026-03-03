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
    const [returningItem, setReturningItem] = useState<{ item: InventoryItem; qty: string } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isBulkReturning, setIsBulkReturning] = useState(false);
    const [bulkProgress, setBulkProgress] = useState(0);
    const [bulkTotal, setBulkTotal] = useState(0);

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
            setReturningItem(null);
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

    const bulkReturnTarget = someSelected ? selectedItems : items;
    const bulkReturnQty = bulkReturnTarget.reduce((s, i) => s + (i.currentStock - i.recommendedStock), 0);

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
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="px-6 pt-5 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-start justify-between">
                        <div>
                            <h3 className="text-xl font-black text-slate-900">권장량 초과 품목</h3>
                            <p className="text-xs text-slate-500 mt-0.5">현재 재고가 권장 수량을 초과하는 품목입니다.</p>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Summary */}
                    <div className="mt-4 inline-flex items-center gap-3 bg-indigo-50 border-2 border-indigo-200 rounded-xl px-4 py-3">
                        <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                        <div>
                            <p className="text-xs font-bold text-indigo-800">권장량 초과</p>
                            <p className="text-2xl font-black text-indigo-600 leading-tight tabular-nums">{items.length} <span className="text-sm font-bold">품목</span></p>
                            <p className="text-[10px] text-indigo-400 mt-0.5">총 +{totalExcess}개 초과 보유</p>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-y-auto">
                    {items.length === 0 ? (
                        <div className="py-16 text-center">
                            <svg className="w-12 h-12 text-slate-200 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-sm font-bold text-slate-400">권장량 초과 품목이 없습니다.</p>
                            <p className="text-xs text-slate-300 mt-1">모든 품목이 권장 수량 이하로 관리되고 있습니다.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
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
                                    const isReturning = returningItem?.item.id === item.id;
                                    const pendingQty = returnRequests
                                        .filter(r => r.manufacturer === item.manufacturer && (r.status === 'requested' || r.status === 'picked_up'))
                                        .flatMap(r => r.items)
                                        .filter(ri => ri.brand === item.brand && ri.size === item.size)
                                        .reduce((s, ri) => s + ri.quantity, 0);

                                    if (isReturning) {
                                        const qty = parseInt(returningItem!.qty, 10);
                                        const isValid = !isNaN(qty) && qty >= 1 && qty <= excess;
                                        return (
                                            <tr key={item.id} className="bg-indigo-50/60">
                                                <td className="pl-6 pr-2 py-3" />
                                                <td className="px-3 py-3">
                                                    <p className="text-xs font-black text-slate-800">{item.brand}</p>
                                                    <p className="text-[11px] text-slate-400">{item.manufacturer}</p>
                                                </td>
                                                <td className="px-3 py-3">
                                                    <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">{item.size}</span>
                                                </td>
                                                <td colSpan={3} className="px-3 py-3 pr-6">
                                                    <div className="flex items-center justify-end gap-2 flex-wrap">
                                                        <span className="text-[11px] text-slate-500 shrink-0">반품 수량 <span className="font-bold text-slate-700">(최대 {excess}개)</span></span>
                                                        <input
                                                            type="number" min={1} max={excess}
                                                            value={returningItem!.qty}
                                                            onChange={e => setReturningItem({ item, qty: e.target.value })}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && isValid) handleReturn(item, qty);
                                                                if (e.key === 'Escape') setReturningItem(null);
                                                            }}
                                                            className="w-20 px-2 py-1 text-sm font-bold border border-slate-300 rounded-lg text-center focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200"
                                                            autoFocus
                                                        />
                                                        <button onClick={() => handleReturn(item, qty)} disabled={!isValid || isProcessing}
                                                            className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 disabled:opacity-40 transition-colors">
                                                            {isProcessing ? '처리 중...' : '확인'}
                                                        </button>
                                                        <button onClick={() => setReturningItem(null)}
                                                            className="px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
                                                            취소
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    }

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
                                                <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => setReturningItem({ item, qty: String(excess) })}
                                                        className="px-2.5 py-1 text-[11px] font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap">
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
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between shrink-0 gap-3">
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
