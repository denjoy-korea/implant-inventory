import { useState, useEffect, useRef, useMemo } from 'react';
import { Order, ReturnRequest } from '../../types';

const displayMfr = (name: string) => name === 'IBS' ? 'IBS Implant' : name;

const PAGE_SIZE = 10;

interface OrderHistoryPanelProps {
    orders: Order[];
    returnRequests: ReturnRequest[];
    onClose: () => void;
    onReceiptConfirm?: (order: Order) => void;
    isReadOnly?: boolean;
}

type OrderType = Order['type'];

const ORDER_TYPE_LABEL: Record<OrderType, string> = {
    replenishment: '발주',
    return: '반품',
    fail_exchange: '교환',
};
const ORDER_TYPE_COLOR: Record<OrderType, string> = {
    replenishment: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    return: 'bg-amber-50 text-amber-700 border-amber-200',
    fail_exchange: 'bg-rose-50 text-rose-700 border-rose-200',
};
const ORDER_STATUS_LABEL: Record<string, string> = { ordered: '대기중', received: '완료', cancelled: '취소됨' };
const ORDER_STATUS_COLOR: Record<string, string> = {
    ordered: 'bg-rose-50 text-rose-700 border-rose-100',
    received: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    cancelled: 'bg-slate-100 text-slate-500 border-slate-200',
};
const RETURN_REASON_LABEL: Record<string, string> = { exchange: '교환반품', excess_stock: '과잉반품', defective: '불량반품' };
const RETURN_REASON_COLOR: Record<string, string> = {
    exchange: 'bg-violet-50 text-violet-700 border-violet-200',
    excess_stock: 'bg-amber-50 text-amber-700 border-amber-200',
    defective: 'bg-rose-50 text-rose-700 border-rose-200',
};
const RETURN_STATUS_LABEL: Record<string, string> = { requested: '대기중', picked_up: '수거중', completed: '완료', rejected: '거절' };
const RETURN_STATUS_COLOR: Record<string, string> = {
    requested: 'bg-rose-50 text-rose-700 border-rose-100',
    picked_up: 'bg-amber-50 text-amber-700 border-amber-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-slate-100 text-slate-500 border-slate-200',
};
const DAY_LABELS = ['일', '월', '화', '수', '목', '금', '토'];

type HistoryEntry =
    | { kind: 'order'; data: Order; date: string }
    | { kind: 'return'; data: ReturnRequest; date: string };

export function OrderHistoryPanel({ orders, returnRequests, onClose, onReceiptConfirm, isReadOnly }: OrderHistoryPanelProps) {
    const [visible, setVisible] = useState(false);
    const [searchDate, setSearchDate] = useState('');
    const [showCalendar, setShowCalendar] = useState(false);
    const [calYear, setCalYear] = useState(() => new Date().getFullYear());
    const [calMonth, setCalMonth] = useState(() => new Date().getMonth());
    const [currentPage, setCurrentPage] = useState(0);
    // 기본값: 모두 닫힘
    const [expandedDates, setExpandedDates] = useState<Set<string>>(() => new Set());

    const calendarRef = useRef<HTMLDivElement>(null);
    const searchWrapRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const t = requestAnimationFrame(() => setVisible(true));
        return () => cancelAnimationFrame(t);
    }, []);

    // 달력 외부 클릭 닫기
    useEffect(() => {
        if (!showCalendar) return;
        const handler = (e: MouseEvent) => {
            if (
                calendarRef.current && !calendarRef.current.contains(e.target as Node) &&
                searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)
            ) setShowCalendar(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showCalendar]);

    // 검색어 바뀌면 첫 페이지로
    useEffect(() => { setCurrentPage(0); }, [searchDate]);

    // 통합 히스토리 엔트리
    const allEntries: HistoryEntry[] = [
        ...orders.map(o => ({ kind: 'order' as const, data: o, date: o.date })),
        ...returnRequests.map(r => ({ kind: 'return' as const, data: r, date: r.requestedDate.slice(0, 10) })),
    ];

    const byDate = allEntries.reduce<Record<string, HistoryEntry[]>>((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = [];
        acc[entry.date].push(entry);
        return acc;
    }, {});

    const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));
    const datesSet = useMemo(() => new Set(sortedDates), [sortedDates]);

    const filteredDates = useMemo(() => {
        const q = searchDate.trim();
        return q ? sortedDates.filter(d => d.includes(q)) : sortedDates;
    }, [searchDate, sortedDates]);

    const totalPages = Math.ceil(filteredDates.length / PAGE_SIZE);
    const paginatedDates = filteredDates.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

    // 페이지 슬라이딩 윈도우 (최대 10개 버튼)
    const WINDOW = 10;
    const winStart = Math.max(0, Math.min(currentPage - Math.floor(WINDOW / 2), totalPages - WINDOW));
    const winEnd = Math.min(totalPages - 1, winStart + WINDOW - 1);
    const pageWindow = Array.from({ length: Math.max(0, winEnd - winStart + 1) }, (_, i) => winStart + i);

    const totalCount = allEntries.length;
    const totalItems = allEntries.reduce((s, e) => s + e.data.items.reduce((is: number, i: { quantity: number }) => is + i.quantity, 0), 0);

    const toggleDate = (date: string) => {
        setExpandedDates(prev => {
            const next = new Set(prev);
            next.has(date) ? next.delete(date) : next.add(date);
            return next;
        });
    };

    // 달력 열기
    const handleOpenCalendar = () => {
        if (sortedDates.length > 0) {
            const latest = sortedDates[0];
            setCalYear(parseInt(latest.slice(0, 4)));
            setCalMonth(parseInt(latest.slice(5, 7)) - 1);
        }
        setShowCalendar(v => !v);
    };

    // 달력 날짜 클릭
    const handleCalendarDayClick = (day: number) => {
        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSearchDate(dateStr);
        setShowCalendar(false);
        setExpandedDates(prev => new Set([...prev, dateStr]));
        setCurrentPage(0);
        requestAnimationFrame(() => listRef.current?.scrollTo({ top: 0 }));
    };

    const prevMonth = () => {
        if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
        else setCalMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
        else setCalMonth(m => m + 1);
    };

    const { firstDay, daysInMonth } = useMemo(() => ({
        firstDay: new Date(calYear, calMonth, 1).getDay(),
        daysInMonth: new Date(calYear, calMonth + 1, 0).getDate(),
    }), [calYear, calMonth]);

    const selectedDateStr = searchDate.trim().length === 10 ? searchDate.trim() : null;

    const goToPage = (p: number) => {
        setCurrentPage(p);
        setExpandedDates(new Set());
        listRef.current?.scrollTo({ top: 0 });
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div
                className={`bg-white rounded-[28px] shadow-2xl w-full max-w-4xl flex flex-col max-h-[85vh] transition-all duration-300 ease-out ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-5 sm:px-7 py-4 border-b border-slate-100 bg-slate-50/40 rounded-t-[28px] flex items-center justify-between gap-2 shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2 whitespace-nowrap shrink-0">
                            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                            </svg>
                            주문·반품 히스토리
                        </h3>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-semibold whitespace-nowrap">
                            <span className="bg-slate-100 px-2 py-0.5 rounded-lg font-black text-slate-600">{totalCount}건</span>
                            <span className="text-slate-300">·</span>
                            <span className="hidden sm:inline">총 {totalItems}개</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                        <button
                            onClick={() => setExpandedDates(new Set(paginatedDates))}
                            className="hidden sm:block text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                            전체 펼치기
                        </button>
                        <button
                            onClick={() => setExpandedDates(new Set())}
                            className="hidden sm:block text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors whitespace-nowrap"
                        >
                            전체 접기
                        </button>
                        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 날짜 검색 바 */}
                <div className="px-5 sm:px-7 py-2.5 border-b border-slate-100 bg-white shrink-0">
                    <div ref={searchWrapRef} className="relative flex items-center gap-2">
                        <div className="flex-1 relative flex items-center">
                            <svg className="absolute left-3 w-3.5 h-3.5 text-slate-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z" />
                            </svg>
                            <input
                                type="text"
                                value={searchDate}
                                onChange={e => setSearchDate(e.target.value)}
                                placeholder="날짜 검색 · 예) 2026-03"
                                className="w-full pl-8 pr-8 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 placeholder:text-slate-300 transition"
                            />
                            {searchDate && (
                                <button onClick={() => setSearchDate('')} className="absolute right-2.5 text-slate-300 hover:text-slate-500 transition-colors" aria-label="초기화">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            )}
                        </div>

                        {/* 달력 토글 */}
                        <button
                            onClick={handleOpenCalendar}
                            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${
                                showCalendar ? 'bg-indigo-500 text-white border-indigo-500' : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="hidden sm:inline">달력</span>
                        </button>

                        {searchDate && (
                            <span className="text-[11px] font-bold text-indigo-500 whitespace-nowrap">{filteredDates.length}일</span>
                        )}

                        {/* 미니 달력 */}
                        {showCalendar && (
                            <div
                                ref={calendarRef}
                                className="absolute top-full right-0 mt-2 z-50 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 w-[280px]"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <button onClick={prevMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                    </button>
                                    <span className="text-sm font-black text-slate-800">{calYear}년 {calMonth + 1}월</span>
                                    <button onClick={nextMonth} className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                    </button>
                                </div>
                                <div className="grid grid-cols-7 mb-1">
                                    {DAY_LABELS.map(d => (
                                        <div key={d} className={`text-center text-[10px] font-black pb-1 ${d === '일' ? 'text-rose-400' : d === '토' ? 'text-indigo-400' : 'text-slate-400'}`}>{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-y-0.5">
                                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                                    {Array.from({ length: daysInMonth }).map((_, i) => {
                                        const day = i + 1;
                                        const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const hasData = datesSet.has(dateStr);
                                        const isSelected = selectedDateStr === dateStr;
                                        const dow = (firstDay + i) % 7;
                                        const isToday = dateStr === new Date().toISOString().slice(0, 10);
                                        return (
                                            <button
                                                key={day}
                                                onClick={() => hasData && handleCalendarDayClick(day)}
                                                disabled={!hasData}
                                                className={`relative flex flex-col items-center justify-center h-8 w-full rounded-lg text-xs font-bold transition-all
                                                    ${isSelected ? 'bg-indigo-500 text-white shadow-sm' : hasData ? 'hover:bg-indigo-50 cursor-pointer' : 'opacity-25 cursor-default'}
                                                    ${!isSelected && dow === 0 ? 'text-rose-500' : ''}
                                                    ${!isSelected && dow === 6 ? 'text-indigo-500' : ''}
                                                    ${!isSelected && dow !== 0 && dow !== 6 ? 'text-slate-700' : ''}
                                                    ${isToday && !isSelected ? 'ring-1 ring-indigo-300' : ''}
                                                `}
                                            >
                                                <span>{day}</span>
                                                {hasData && !isSelected && <span className="absolute bottom-1 w-1 h-1 rounded-full bg-indigo-400" />}
                                            </button>
                                        );
                                    })}
                                </div>
                                <p className="mt-3 text-[10px] text-slate-400 text-center font-semibold">• 표시 날짜: 데이터 있음</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 날짜별 목록 */}
                <div ref={listRef} className="flex-1 overflow-y-auto overscroll-contain divide-y divide-slate-50 min-h-0">
                    {paginatedDates.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-slate-400 font-semibold text-sm">
                                {searchDate ? `'${searchDate}' 에 해당하는 내역이 없습니다.` : '내역이 없습니다.'}
                            </p>
                            {searchDate && (
                                <button onClick={() => setSearchDate('')} className="mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700 transition-colors">
                                    검색 초기화
                                </button>
                            )}
                        </div>
                    ) : paginatedDates.map(date => {
                        const dayEntries = byDate[date];
                        const isExpanded = expandedDates.has(date);
                        const dayTotal = dayEntries.reduce((s: number, e) => s + e.data.items.reduce((is: number, i: { quantity: number }) => is + i.quantity, 0), 0);
                        const hasPending = dayEntries.some(e =>
                            (e.kind === 'order' && e.data.status === 'ordered') ||
                            (e.kind === 'return' && (e.data.status === 'requested' || e.data.status === 'picked_up'))
                        );
                        const allDone = dayEntries.every(e =>
                            (e.kind === 'order' && e.data.status === 'received') ||
                            (e.kind === 'return' && e.data.status === 'completed')
                        );

                        return (
                            <div key={date}>
                                <button
                                    onClick={() => toggleDate(date)}
                                    className="w-full px-5 sm:px-7 py-3 flex items-center justify-between hover:bg-slate-50/60 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                        </svg>
                                        <span className="text-sm font-black text-slate-700 tabular-nums">{date}</span>
                                        {hasPending && !allDone && <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block" />}
                                        {allDone && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />}
                                    </div>
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                                        <span className="tabular-nums">{dayEntries.length}건</span>
                                        <span className="text-slate-200">·</span>
                                        <span className="tabular-nums">{dayTotal}개</span>
                                    </div>
                                </button>

                                {isExpanded && (
                                    <div className="pb-2">
                                        {dayEntries
                                            .sort((a, b) => a.data.manufacturer.localeCompare(b.data.manufacturer))
                                            .map(entry => {
                                                const totalQty = entry.data.items.reduce((s: number, i: { quantity: number }) => s + i.quantity, 0);

                                                if (entry.kind === 'order') {
                                                    const order = entry.data;
                                                    if (!order.items[0]) return null;
                                                    return (
                                                        <div key={`order-${order.id}`} className={`mx-3 sm:mx-5 mb-1.5 rounded-xl border px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${
                                                            order.status === 'received' ? 'bg-emerald-50/30 border-emerald-100'
                                                            : (order.status as string) === 'cancelled' ? 'bg-slate-50 border-slate-100 opacity-60'
                                                            : 'bg-white border-slate-200'
                                                        }`}>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${ORDER_TYPE_COLOR[order.type]}`}>{ORDER_TYPE_LABEL[order.type]}</span>
                                                                <span className="text-xs font-black text-slate-700 w-[80px] truncate">{displayMfr(order.manufacturer)}</span>
                                                            </div>
                                                            <span className="font-mono text-[10px] font-bold text-slate-300 shrink-0 hidden sm:inline">{order.id.slice(0, 8)}</span>
                                                            <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                                                                {order.items.map((item, idx) => (
                                                                    <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                                                        <span className="font-black">{item.brand}</span>
                                                                        <span className="text-slate-400">{item.size}</span>
                                                                        <span className="font-bold text-slate-500">×{item.quantity}</span>
                                                                    </span>
                                                                ))}
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <span className="text-xs font-black text-slate-700 tabular-nums">{totalQty}개</span>
                                                                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${ORDER_STATUS_COLOR[order.status] || ''}`}>{ORDER_STATUS_LABEL[order.status] || order.status}</span>
                                                                {order.receivedDate && <span className="text-[10px] font-semibold text-emerald-600 hidden sm:inline">→ {order.receivedDate.slice(0, 10)}</span>}
                                                                {order.status === 'ordered' && !isReadOnly && onReceiptConfirm && (
                                                                    <button onClick={() => onReceiptConfirm(order)} className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-colors active:scale-95">
                                                                        입고 확인
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                }

                                                const rr = entry.data;
                                                return (
                                                    <div key={`return-${rr.id}`} className={`mx-3 sm:mx-5 mb-1.5 rounded-xl border px-3 sm:px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${
                                                        rr.status === 'completed' ? 'bg-emerald-50/30 border-emerald-100'
                                                        : rr.status === 'rejected' ? 'bg-slate-50 border-slate-100 opacity-60'
                                                        : 'bg-white border-slate-200'
                                                    }`}>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${RETURN_REASON_COLOR[rr.reason] || 'bg-slate-50 text-slate-600 border-slate-200'}`}>{RETURN_REASON_LABEL[rr.reason] || '반품'}</span>
                                                            <span className="text-xs font-black text-slate-700 w-[80px] truncate">{displayMfr(rr.manufacturer)}</span>
                                                        </div>
                                                        <span className="font-mono text-[10px] font-bold text-slate-300 shrink-0 hidden sm:inline">{rr.id.slice(0, 8)}</span>
                                                        <div className="flex-1 flex flex-wrap items-center gap-1.5 min-w-0">
                                                            {rr.items.map((item: { brand: string; size: string; quantity: number }, idx: number) => (
                                                                <span key={idx} className="inline-flex items-center gap-1 text-[11px] text-slate-600 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                                                                    <span className="font-black">{item.brand}</span>
                                                                    <span className="text-slate-400">{(!item.size || item.size === '기타') ? '-' : item.size}</span>
                                                                    <span className="font-bold text-slate-500">×{item.quantity}</span>
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <span className="text-xs font-black text-slate-700 tabular-nums">{totalQty}개</span>
                                                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md border ${RETURN_STATUS_COLOR[rr.status] || ''}`}>{RETURN_STATUS_LABEL[rr.status] || rr.status}</span>
                                                            {rr.completedDate && <span className="text-[10px] font-semibold text-emerald-600 hidden sm:inline">→ {rr.completedDate.slice(0, 10)}</span>}
                                                            {rr.memo && <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[120px]" title={rr.memo}>{rr.memo}</span>}
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

                {/* 페이지네이션 */}
                {totalPages > 1 && (
                    <div className="px-5 sm:px-7 py-3 border-t border-slate-100 bg-slate-50/40 rounded-b-[28px] flex items-center justify-center gap-1.5 shrink-0">
                        {/* 이전 버튼 — currentPage > 0 일 때만 */}
                        {currentPage > 0 && (
                            <button
                                onClick={() => goToPage(currentPage - 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                                aria-label="이전 페이지"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        )}

                        {/* 페이지 번호 */}
                        {pageWindow.map(p => (
                            <button
                                key={p}
                                onClick={() => goToPage(p)}
                                className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                                    p === currentPage
                                        ? 'bg-indigo-500 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200'
                                }`}
                            >
                                {p + 1}
                            </button>
                        ))}

                        {/* 다음 버튼 */}
                        {currentPage < totalPages - 1 && (
                            <button
                                onClick={() => goToPage(currentPage + 1)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                                aria-label="다음 페이지"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        )}

                        {/* 전체 페이지 수 표시 */}
                        <span className="text-[11px] font-semibold text-slate-400 ml-1">/ {totalPages}p</span>
                    </div>
                )}
            </div>
        </div>
    );
}
