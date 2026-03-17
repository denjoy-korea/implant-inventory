import { useState, useEffect } from 'react';
import { GroupedOrder } from './OrderManager';
import { InventoryItem, OrderItem, type OrderStatus } from '../types';
import { parseSize } from '../services/sizeNormalizer';
import ModalShell from './shared/ModalShell';

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
    /** 중간 단계 처리용 — 모달을 닫지 않고 단일 주문만 처리 */
    onConfirmStep?: (updates: ReceiptUpdate[], orderIdsToReceive: string[]) => Promise<void>;
    onUpdateOrderStatus?: (id: string, status: OrderStatus) => void;
    onDeleteOrder?: (id: string) => void;
    isLoading?: boolean;
}

// ── Helper: inventory에서 manufacturer+brand 조합의 dimension 목록 추출 ──
function extractDimensions(inventory: InventoryItem[], manufacturer: string, brand: string) {
    const items = inventory.filter(
        inv => inv.manufacturer === manufacturer && inv.brand === brand
    );
    const diameters = new Set<string>();
    const lengths = new Set<string>();
    const cuffs = new Set<string>();
    items.forEach(inv => {
        const parsed = parseSize(inv.size, manufacturer);
        if (parsed.diameter != null) diameters.add(String(parsed.diameter));
        if (parsed.length != null) lengths.add(String(parsed.length));
        if (parsed.cuff != null) cuffs.add(parsed.cuff);
    });
    return {
        diameters: [...diameters].sort((a, b) => Number(a) - Number(b)),
        lengths: [...lengths].sort((a, b) => Number(a) - Number(b)),
        cuffs: [...cuffs].sort((a, b) => Number(a) - Number(b)),
    };
}

// ── Helper: 선택한 dimension으로 발주 규격 포맷에 맞는 size 문자열 생성 ──
function buildReceivedSize(
    orderedSize: string,
    _manufacturer: string,
    diameter: string,
    length: string,
    cuff: string
): string {
    if (!diameter || !length) return orderedSize;
    // Φ format (OSSTEM, Dio, Neobiotech, etc.)
    if (/^[Φφ]/.test(orderedSize)) {
        const parts = orderedSize.split(/\s*[×xX]\s*/);
        if ((parts.length >= 3 || /[×xX]/.test(orderedSize.replace(/^[Φφ][\d.]+\s*/, ''))) && cuff) {
            return `Φ${diameter} × ${length} × ${cuff}`;
        }
        return `Φ${diameter} × ${length}`;
    }
    // Ø x mm format (Dentis, Topplan, Warantec)
    if (/^[Øø]/.test(orderedSize)) {
        return `Ø${diameter} x ${length}mm`;
    }
    // IBS / Cuff+Phi format
    if (/^C\s*\d/.test(orderedSize) || /D[:\s]/i.test(orderedSize) || /Cuff/i.test(orderedSize)) {
        if (cuff) return `C${cuff} Φ${diameter} X ${length}`;
        return `Φ${diameter} X ${length}`;
    }
    // Default fallback (Dentium numeric, etc.)
    return `Φ${diameter} × ${length}${cuff ? ` × ${cuff}` : ''}`;
}

interface WrongDeliveryEntry {
    key: string;
    orderId: string;
    manufacturer: string;
    brand: string;
    orderedSize: string;
    deficitQty: number;
}

type WrongDeliverySelection = { diameter: string; length: string; cuff: string; qty: number };

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────
export function ReceiptConfirmationModal({
    groupedOrder,
    inventory,
    onClose,
    onConfirmReceipt,
    onConfirmStep,
    onUpdateOrderStatus,
    onDeleteOrder,
    isLoading
}: ReceiptConfirmationModalProps) {
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
    const [excludedOrderIds, setExcludedOrderIds] = useState<string[]>([]);
    const [confirmAction, setConfirmAction] = useState<{ orderId: string; type: 'delete' | 'reset' } | null>(null);

    // phase: 'orders' = 주문별 입고 확인, 'wrongDelivery' = 규격 오배송 처리 세션
    const [phase, setPhase] = useState<'orders' | 'wrongDelivery'>('orders');
    const [wrongDeliverySelections, setWrongDeliverySelections] = useState<Record<string, WrongDeliverySelection>>({});

    // Stepper state
    const [currentOrderIdx, setCurrentOrderIdx] = useState(0);
    const [cardVisible, setCardVisible] = useState(true);
    const [processedCount, setProcessedCount] = useState(0);

    const activeOrders = groupedOrder.orders.filter(o => !excludedOrderIds.includes(o.id) && o.status === 'ordered');
    // 모달 오픈 시점의 총 주문 수를 고정 (처리되면서 activeOrders가 줄어도 분모는 유지)
    const [initialTotal] = useState(() => activeOrders.length);
    const safeIdx = Math.min(currentOrderIdx, Math.max(0, activeOrders.length - 1));
    const currentOrder = activeOrders[safeIdx];
    const isLastStep = activeOrders.length <= 1;
    const hasMultipleOrders = initialTotal > 1;

    useEffect(() => {
        if (currentOrderIdx >= activeOrders.length && activeOrders.length > 0) {
            setCurrentOrderIdx(activeOrders.length - 1);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOrders.length]);

    const goToStep = (newIdx: number) => {
        setCardVisible(false);
        setTimeout(() => {
            setCurrentOrderIdx(newIdx);
            setCardVisible(true);
        }, 120);
    };

    // 규격 오배송 항목 목록 (체크된 항목 중 부족 수량 > 0)
    const wrongDeliveryItemList: WrongDeliveryEntry[] = [];
    groupedOrder.orders.forEach(order => {
        if (excludedOrderIds.includes(order.id) || order.status !== 'ordered') return;
        order.items.forEach((item, idx) => {
            const key = `${order.id}-${idx}`;
            if (!returnWrongDelivery[key]) return;
            const currentQty = quantities[key] ?? item.quantity;
            const deficit = item.quantity - currentQty;
            if (deficit > 0) {
                wrongDeliveryItemList.push({
                    key,
                    orderId: order.id,
                    manufacturer: order.manufacturer,
                    brand: item.brand,
                    orderedSize: item.size,
                    deficitQty: deficit,
                });
            }
        });
    });

    const handleResetOrder = (orderId: string) => {
        const order = groupedOrder.orders.find(o => o.id === orderId);
        if (!order) return;
        if (order.status !== 'ordered') {
            setConfirmAction({ orderId, type: 'reset' });
            return;
        }
        setQuantities(prev => {
            const next = { ...prev };
            order.items.forEach((item, idx) => { next[`${order.id}-${idx}`] = item.quantity; });
            return next;
        });
        const resetKeys = order.items.map((_, idx) => `${order.id}-${idx}`);
        setMemos(prev => { const next = { ...prev }; resetKeys.forEach(k => delete next[k]); return next; });
        setAutoReorders(prev => { const next = { ...prev }; resetKeys.forEach(k => delete next[k]); return next; });
        setReturnWrongDelivery(prev => { const next = { ...prev }; resetKeys.forEach(k => delete next[k]); return next; });
        setExcludedOrderIds(prev => prev.filter(id => id !== orderId));
    };

    const handleDeleteAction = (orderId: string) => setConfirmAction({ orderId, type: 'delete' });

    const confirmPendingAction = () => {
        if (!confirmAction) return;
        if (confirmAction.type === 'delete') onDeleteOrder?.(confirmAction.orderId);
        else onUpdateOrderStatus?.(confirmAction.orderId, 'ordered');
        setConfirmAction(null);
    };

    const handleQuantityChange = (key: string, val: string) => {
        const parsed = parseInt(val, 10);
        if (!isNaN(parsed) && parsed >= 0) setQuantities(prev => ({ ...prev, [key]: parsed }));
        else if (val === '') setQuantities(prev => ({ ...prev, [key]: 0 }));
    };

    // 단일 주문에 대한 ReceiptUpdate 목록 생성
    const buildUpdatesForOrder = (order: typeof activeOrders[number]): ReceiptUpdate[] => {
        const updates: ReceiptUpdate[] = [];
        order.items.forEach((item, idx) => {
            const key = `${order.id}-${idx}`;
            const newQty = quantities[key];
            if (newQty !== undefined && newQty !== item.quantity) {
                const wdSel = wrongDeliverySelections[key];
                updates.push({
                    orderId: order.id,
                    item,
                    originalQuantity: item.quantity,
                    newQuantity: newQty,
                    memo: memos[key],
                    autoReorderDeficit: autoReorders[key],
                    wrongDeliveryReturn:
                        returnWrongDelivery[key] && wdSel?.diameter && wdSel?.length
                            ? {
                                receivedSize: buildReceivedSize(
                                    item.size,
                                    order.manufacturer,
                                    wdSel.diameter,
                                    wdSel.length,
                                    wdSel.cuff
                                ),
                                quantity: wdSel.qty,
                            }
                            : undefined,
                });
            }
        });
        return updates;
    };

    const handleConfirm = async () => {
        // 마지막 남은 주문 처리 (activeOrders에서 excluded 제외한 것들)
        const updates: ReceiptUpdate[] = [];
        const orderIdsToReceive: string[] = [];
        activeOrders.forEach(order => {
            if (excludedOrderIds.includes(order.id)) return;
            updates.push(...buildUpdatesForOrder(order));
            orderIdsToReceive.push(order.id);
        });
        if (updates.length > 0 || orderIdsToReceive.length > 0) {
            await onConfirmReceipt(updates, orderIdsToReceive);
        }
    };

    const handleStepConfirm = async () => {
        if (!isLastStep) {
            // 현재 주문 즉시 처리 후 다음으로 이동 (모달 닫지 않음)
            // 처리된 주문은 status→'received'로 변경되어 activeOrders에서 자동으로 제거됨
            // → goToStep(safeIdx) 로 같은 인덱스 유지하면 다음 주문이 올라옴
            if (currentOrder && !excludedOrderIds.includes(currentOrder.id)) {
                const updates = buildUpdatesForOrder(currentOrder);
                const confirmFn = onConfirmStep ?? onConfirmReceipt;
                await confirmFn(updates, [currentOrder.id]);
                setProcessedCount(prev => prev + 1);
            }
            goToStep(safeIdx);
        } else if (wrongDeliveryItemList.length > 0 && phase === 'orders') {
            // 마지막 주문 확인 완료 → 규격 오배송 처리 세션으로 전환
            const initialSelections: Record<string, WrongDeliverySelection> = {};
            wrongDeliveryItemList.forEach(wdi => {
                const dims = extractDimensions(inventory, wdi.manufacturer, wdi.brand);
                initialSelections[wdi.key] = {
                    diameter: dims.diameters[0] || '',
                    length: dims.lengths[0] || '',
                    cuff: dims.cuffs[0] || '',
                    qty: wdi.deficitQty,
                };
            });
            setWrongDeliverySelections(initialSelections);
            setPhase('wrongDelivery');
        } else {
            await handleConfirm();
        }
    };

    const progressPct = isLoading ? 100 : (processedCount / Math.max(initialTotal, 1)) * 100;
    const isCurrentChanged = currentOrder?.status === 'ordered' && currentOrder.items.some(
        (item, idx) => quantities[`${currentOrder.id}-${idx}`] !== item.quantity
    );

    const isReturn = groupedOrder.type === 'return';
    const isExchange = groupedOrder.type === 'fail_exchange';
    const modalTitle = isReturn ? '반품 확인' : isExchange ? '상세 교환 확인' : '상세 입고 확인';

    const [visible, setVisible] = useState(false);
    useEffect(() => { const t = requestAnimationFrame(() => setVisible(true)); return () => cancelAnimationFrame(t); }, []);

    // ─── 규격 오배송 처리 세션 UI ─────────────────────────────────────────────
    if (phase === 'wrongDelivery') {
        const allSelectionsValid = wrongDeliveryItemList.every(wdi => {
            const sel = wrongDeliverySelections[wdi.key];
            return sel && sel.diameter && sel.length;
        });

        return (
            <ModalShell isOpen={true} onClose={() => !isLoading && onClose()} title="규격 오배송 처리" titleId="wrong-delivery-title" zIndex={300} closeable={!isLoading} backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0 backdrop-blur-sm" maxWidth="w-full sm:max-w-4xl" className={`sm:rounded-3xl flex flex-col max-h-[calc(100dvh-5.5rem)] sm:max-h-[90vh] transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-3 sm:scale-95 sm:translate-y-0'}`}>
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-rose-50/50 shrink-0">
                        <div>
                            <div className="flex items-center gap-2.5">
                                <h3 id="wrong-delivery-title" className="text-xl font-black text-slate-800 tracking-tight">규격 오배송 처리</h3>
                                <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-full border border-rose-200 tabular-nums">
                                    {wrongDeliveryItemList.length}건
                                </span>
                            </div>
                            <p className="text-sm font-semibold text-slate-500 mt-1">
                                {groupedOrder.date} · {groupedOrder.manufacturer} · 실제 도착 규격 선택 후 반품처리
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>

                    {/* Progress bar — full (마지막 단계) */}
                    <div className="h-1 bg-slate-100 shrink-0">
                        <div className="h-full w-full bg-rose-400 transition-all duration-500 ease-out" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {/* Info */}
                        <div className="rounded-2xl p-4 flex gap-3 bg-rose-50/70 border border-rose-100">
                            <div className="shrink-0 mt-0.5 text-rose-500">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-rose-900">오배송 규격 선택</h4>
                                <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                                    실제로 도착한 잘못된 규격을 선택해주세요.<br />
                                    • <b>직경 · 길이 · 커프</b>를 목록에서 선택하고 반품 수량을 확인합니다.<br />
                                    • 완료하면 해당 규격으로 반품처리됩니다.
                                </p>
                            </div>
                        </div>

                        {/* Wrong delivery items */}
                        <div className="space-y-4">
                            {wrongDeliveryItemList.map((wdi, wdIdx) => {
                                const dims = extractDimensions(inventory, wdi.manufacturer, wdi.brand);
                                const sel: WrongDeliverySelection = wrongDeliverySelections[wdi.key] ?? {
                                    diameter: dims.diameters[0] || '',
                                    length: dims.lengths[0] || '',
                                    cuff: dims.cuffs[0] || '',
                                    qty: wdi.deficitQty,
                                };
                                const hasCuff = dims.cuffs.length > 0;

                                const updateSel = (field: keyof WrongDeliverySelection, value: string | number) =>
                                    setWrongDeliverySelections(prev => ({
                                        ...prev,
                                        [wdi.key]: { ...sel, [field]: value },
                                    }));

                                const preview = sel.diameter && sel.length
                                    ? buildReceivedSize(wdi.orderedSize, wdi.manufacturer, sel.diameter, sel.length, sel.cuff)
                                    : '—';

                                return (
                                    <div key={wdi.key} className="border border-rose-200 rounded-2xl overflow-hidden shadow-sm">
                                        {/* Item header */}
                                        <div className="bg-rose-50 px-4 py-3 border-b border-rose-100 flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[11px] font-black text-rose-500 bg-white px-2 py-0.5 rounded-lg border border-rose-200 tabular-nums">#{wdIdx + 1}</span>
                                                <span className="text-sm font-black text-slate-800">{wdi.brand}</span>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] font-bold text-slate-400">발주:</span>
                                                    <span className="text-[11px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded-md border border-slate-200">{wdi.orderedSize}</span>
                                                </div>
                                            </div>
                                            <span className="text-[11px] font-black text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg">오배송 {wdi.deficitQty}개</span>
                                        </div>

                                        <div className="p-4 space-y-4">
                                            {/* Dimension selects */}
                                            <div>
                                                <p className="text-xs font-bold text-slate-600 mb-3">실제 도착한 규격 선택</p>
                                                <div className={`grid gap-3 ${hasCuff ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                                    {/* 직경 */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">직경 (Φ)</label>
                                                        {dims.diameters.length > 0 ? (
                                                            <select
                                                                value={sel.diameter}
                                                                onChange={(e) => updateSel('diameter', e.target.value)}
                                                                className="w-full h-10 px-3 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 appearance-none cursor-pointer"
                                                            >
                                                                {dims.diameters.map(d => (
                                                                    <option key={d} value={d}>{d}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={sel.diameter}
                                                                onChange={(e) => updateSel('diameter', e.target.value)}
                                                                placeholder="예: 3.5"
                                                                className="w-full h-10 px-3 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* 길이 */}
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">길이</label>
                                                        {dims.lengths.length > 0 ? (
                                                            <select
                                                                value={sel.length}
                                                                onChange={(e) => updateSel('length', e.target.value)}
                                                                className="w-full h-10 px-3 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 appearance-none cursor-pointer"
                                                            >
                                                                {dims.lengths.map(l => (
                                                                    <option key={l} value={l}>{l}</option>
                                                                ))}
                                                            </select>
                                                        ) : (
                                                            <input
                                                                type="text"
                                                                value={sel.length}
                                                                onChange={(e) => updateSel('length', e.target.value)}
                                                                placeholder="예: 11.5"
                                                                className="w-full h-10 px-3 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
                                                            />
                                                        )}
                                                    </div>

                                                    {/* 커프 (optional) */}
                                                    {hasCuff && (
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">커프</label>
                                                            <select
                                                                value={sel.cuff}
                                                                onChange={(e) => updateSel('cuff', e.target.value)}
                                                                className="w-full h-10 px-3 text-sm font-bold text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 appearance-none cursor-pointer"
                                                            >
                                                                {dims.cuffs.map(c => (
                                                                    <option key={c} value={c}>{c}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Preview + 수량 */}
                                            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                                                <div>
                                                    <span className="block text-[10px] font-bold text-slate-400 mb-1">반품 규격 미리보기</span>
                                                    <span className={`text-sm font-black ${preview === '—' ? 'text-slate-300' : 'text-rose-600'}`}>
                                                        {preview}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className="block text-[10px] font-bold text-slate-400 mb-1">반품 수량</span>
                                                    <div className="flex items-center gap-1 border border-rose-200 rounded-xl p-1 bg-white shadow-sm">
                                                        <button
                                                            onClick={() => updateSel('qty', Math.max(1, sel.qty - 1))}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" /></svg>
                                                        </button>
                                                        <input
                                                            type="number"
                                                            className="w-10 text-center text-sm font-black text-slate-800 focus:outline-none appearance-none"
                                                            value={sel.qty}
                                                            onChange={(e) => {
                                                                const v = parseInt(e.target.value, 10);
                                                                if (!isNaN(v) && v >= 1) updateSel('qty', v);
                                                            }}
                                                        />
                                                        <button
                                                            onClick={() => updateSel('qty', sel.qty + 1)}
                                                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-3 shrink-0">
                        <button
                            onClick={() => setPhase('orders')}
                            disabled={isLoading}
                            className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50 flex items-center gap-1.5"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            이전
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isLoading || !allSelectionsValid}
                            className="px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 hover:shadow-md transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    처리 중...
                                </>
                            ) : (
                                <>
                                    반품처리 완료
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                </>
                            )}
                        </button>
                    </div>
            </ModalShell>
        );
    }

    // ─── 주문별 입고 확인 단계 UI ─────────────────────────────────────────────
    return (
        <ModalShell isOpen={true} onClose={() => !isLoading && onClose()} title={modalTitle} titleId="receipt-confirm-title" zIndex={300} closeable={!isLoading} backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0 backdrop-blur-sm" maxWidth="w-full sm:max-w-4xl" className={`sm:rounded-3xl flex flex-col max-h-[calc(100dvh-5.5rem)] sm:max-h-[90vh] transition-all duration-300 ease-out ${visible ? 'opacity-100 translate-y-0 sm:scale-100' : 'opacity-0 translate-y-3 sm:scale-95 sm:translate-y-0'}`}>
                {/* Header */}
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <div className="flex items-center gap-2">
                            <h3 id="receipt-confirm-title" className="text-base font-black text-slate-800">{modalTitle}</h3>
                            {hasMultipleOrders && (
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 tabular-nums">
                                    {processedCount + 1} / {initialTotal}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
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

                {/* Progress bar */}
                <div className="h-1 bg-slate-100 shrink-0">
                    <div
                        className={`h-full transition-all duration-500 ease-out ${isLoading ? 'bg-emerald-400' : isCurrentChanged ? 'bg-indigo-400' : 'bg-emerald-400'}`}
                        style={{ width: `${progressPct}%` }}
                    />
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                    {/* Info box */}
                    <div className={`rounded-2xl p-4 flex gap-3 ${isReturn ? 'bg-amber-50/50 border border-amber-100' : isExchange ? 'bg-violet-50/50 border border-violet-100' : 'bg-blue-50/50 border border-blue-100'}`}>
                        <div className={`shrink-0 mt-0.5 ${isReturn ? 'text-amber-500' : isExchange ? 'text-violet-500' : 'text-blue-500'}`}>
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        </div>
                        <div>
                            <h4 className={`text-sm font-bold ${isReturn ? 'text-amber-900' : isExchange ? 'text-violet-900' : 'text-blue-900'}`}>{isReturn ? '반품 수량 확인' : isExchange ? '교환 수량 확인' : '입고 수량 확인'}</h4>
                            {isReturn ? (
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    실제 반품 처리할 수량을 확인해주세요.<br />
                                    • 반품 수량을 조정하여 일부만 반품할 수 있습니다.
                                </p>
                            ) : isExchange ? (
                                <p className="text-xs text-violet-700 mt-1 leading-relaxed">
                                    교환 처리된 수량을 확인해주세요.<br />
                                    • 실제 교환된 수량이 다를 경우 수정할 수 있습니다.
                                </p>
                            ) : (
                                <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                                    실제 수령한 품목의 수량을 확인하고 수정해주세요.<br />
                                    • <b>초과 입고:</b> 수량을 올리고 사유를 입력합니다.<br />
                                    • <b>부족 입고:</b> 수량을 내리고 부족분만큼 재발주할지 선택합니다.
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Current order card */}
                    <div className={`transition-all duration-150 ${cardVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                        {activeOrders.length === 0 ? (
                            <div className="py-12 text-center text-slate-500 font-semibold bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                모든 주문이 입고 확인 대상에서 제외되었습니다.
                            </div>
                        ) : currentOrder && (
                            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                                <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-600">주문 ID: <span className="font-mono text-slate-400">{currentOrder.id.slice(0, 8)}</span></span>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isReturn ? 'bg-amber-100 text-amber-700' : isExchange ? 'bg-violet-100 text-violet-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {isReturn ? '반품 대기' : isExchange ? '미교환' : '미입고'}
                                        </span>
                                    </div>
                                    {confirmAction?.orderId === currentOrder.id ? (
                                        <div className="flex items-center gap-2 animate-[fadeIn_0.15s_ease-out]">
                                            <span className="text-[11px] font-bold text-slate-500">
                                                {confirmAction.type === 'delete' ? '삭제할까요?' : '미입고로 되돌릴까요?'}
                                            </span>
                                            <button
                                                onClick={confirmPendingAction}
                                                className={`px-2.5 py-1 rounded-lg text-[11px] font-black text-white transition-all active:scale-95 ${confirmAction.type === 'delete' ? 'bg-rose-500 hover:bg-rose-600' : 'bg-indigo-500 hover:bg-indigo-600'}`}
                                            >확인</button>
                                            <button
                                                onClick={() => setConfirmAction(null)}
                                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-all active:scale-95"
                                            >취소</button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={() => handleResetOrder(currentOrder.id)}
                                                title={currentOrder.status === 'ordered' ? "입력 초기화" : "미입고 상태로 되돌리기"}
                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            </button>
                                            <button
                                                onClick={() => handleDeleteAction(currentOrder.id)}
                                                title="주문 삭제"
                                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="divide-y divide-slate-100">
                                    {currentOrder.items.map((item, idx) => {
                                        const key = `${currentOrder.id}-${idx}`;
                                        const currentQty = quantities[key];
                                        const isOver = currentQty > item.quantity;
                                        const isUnder = currentQty < item.quantity;
                                        const diff = currentQty - item.quantity;

                                        return (
                                            <div key={idx} className={`p-4 transition-colors ${isOver ? 'bg-amber-50/30' : isUnder ? 'bg-rose-50/30' : 'bg-white'}`}>
                                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-black text-slate-800">{item.brand}</span>
                                                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{item.size}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 sm:gap-6">
                                                        <div className="text-right">
                                                            <span className="block text-[10px] font-bold text-slate-400 mb-1">{isReturn ? '반품 수량' : isExchange ? '교환 수량' : '발주 수량'}</span>
                                                            <span className="text-xl font-black tabular-nums text-slate-800">{item.quantity}<span className="text-sm font-bold text-slate-400 ml-0.5">개</span></span>
                                                        </div>
                                                        <div className="w-[1px] h-10 bg-slate-200" />
                                                        <div className="text-center">
                                                            <span className="block text-[10px] font-bold text-slate-400 mb-1">{isReturn ? '실제 반품' : isExchange ? '실제 교환' : '실제 입고'}</span>
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    type="button"
                                                                    aria-label="수량 감소"
                                                                    onClick={() => handleQuantityChange(key, String(Math.max(0, currentQty - 1)))}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 shadow-sm"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 12H4" /></svg>
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    className="w-12 text-center text-xl font-black tabular-nums text-slate-800 focus:outline-none appearance-none bg-transparent"
                                                                    value={currentQty}
                                                                    onChange={(e) => handleQuantityChange(key, e.target.value)}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    aria-label="수량 증가"
                                                                    onClick={() => handleQuantityChange(key, String(currentQty + 1))}
                                                                    className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors active:scale-95 shadow-sm"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>


                                                {currentOrder.status === 'ordered' && (isOver || isUnder) && (
                                                    <div className={`mt-4 p-3 rounded-xl border ${isOver ? 'bg-amber-50/50 border-amber-200' : 'bg-rose-50/50 border-rose-200'}`}>
                                                        {isOver ? (
                                                            <div className="space-y-2">
                                                                <span className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                                    {diff}개 초과 입고됨
                                                                </span>
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
                                                                <span className="text-xs font-bold text-rose-800 flex items-center gap-1.5">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                                    {Math.abs(diff)}개 부족 입고됨
                                                                </span>
                                                                <div className="flex flex-col gap-3">
                                                                    <p className="text-xs text-rose-600/80">어떻게 처리할까요? (선택 사항)</p>

                                                                    {/* 단순 누락 */}
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

                                                                    {/* 규격 오배송 (체크만 — 세부 규격은 마지막 단계에서) */}
                                                                    <div className="flex flex-col gap-1 p-2.5 rounded-lg bg-rose-50 border border-rose-100 hover:bg-rose-100/50 transition-colors">
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
                                                                            주문한 것과 다른 규격이 도착했습니다. 잘못 온 {Math.abs(diff)}개를 반품처리합니다.
                                                                        </span>
                                                                        {returnWrongDelivery[key] && (
                                                                            <div className="pl-6 mt-1 flex items-center gap-1.5">
                                                                                <svg className="w-3.5 h-3.5 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                                                                </svg>
                                                                                <span className="text-[11px] font-bold text-rose-600">
                                                                                    입고 확인 완료 후 도착 규격을 선택합니다
                                                                                </span>
                                                                            </div>
                                                                        )}
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
                        )}
                    </div>

                    {/* 규격 오배송 건 있을 때 안내 (마지막 스텝) */}
                    {isLastStep && wrongDeliveryItemList.length > 0 && (
                        <div className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 border border-rose-200 rounded-xl">
                            <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <p className="text-xs font-bold text-rose-700">
                                규격 오배송 {wrongDeliveryItemList.length}건이 있습니다. 다음 단계에서 도착 규격을 선택합니다.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between gap-2 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        닫기
                    </button>

                    <div className="flex items-center gap-2 flex-[2]">
                        {hasMultipleOrders && safeIdx > 0 && (
                            <button
                                onClick={() => goToStep(safeIdx - 1)}
                                disabled={isLoading}
                                className="py-2.5 px-3 rounded-xl text-sm font-bold text-slate-600 border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50 flex items-center gap-1"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                                이전
                            </button>
                        )}

                        {(activeOrders.length === 0 || groupedOrder.overallStatus === 'received' || groupedOrder.overallStatus === 'cancelled') ? null : (
                            <button
                                onClick={handleStepConfirm}
                                disabled={isLoading}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all shadow-sm flex items-center justify-center gap-2 ${
                                    isLoading ? 'bg-slate-400 cursor-not-allowed' :
                                    !isLastStep ? 'bg-indigo-500 hover:bg-indigo-600' :
                                    isLastStep && wrongDeliveryItemList.length > 0 ? 'bg-rose-500 hover:bg-rose-600' :
                                    isCurrentChanged
                                        ? 'bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700'
                                        : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600'
                                } disabled:opacity-50`}
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        처리 중...
                                    </>
                                ) : !isLastStep ? (
                                    <>다음 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                                ) : wrongDeliveryItemList.length > 0 ? (
                                    <>규격 오배송 처리 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></>
                                ) : isCurrentChanged ? (
                                    isReturn ? '수정사항 적용 및 반품완료' : isExchange ? '수정사항 적용 및 교환완료' : '수정사항 적용 및 입고완료'
                                ) : (
                                    isReturn ? '전체 일치, 반품완료' : isExchange ? '전체 일치, 교환완료' : '전체 일치, 입고완료'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </ModalShell>
    );
}
