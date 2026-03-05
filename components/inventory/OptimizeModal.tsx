import React, { useState, useEffect } from 'react';
import { InventoryItem, CreateReturnParams } from '../../types';
import { snoozeService } from '../../services/snoozeService';
import ModalShell from '../shared/ModalShell';

interface DeadStockItem extends InventoryItem {
  neverUsed: boolean;
  olderThanYear: boolean;
  lastUsedDate: string | null;
}

interface OptimizeModalProps {
  deadStockItems: DeadStockItem[];
  onDeleteInventoryItem?: (id: string) => void;
  onUpdateInventoryItem?: (item: InventoryItem) => void;
  onCreateReturn?: (params: CreateReturnParams) => Promise<void>;
  managerName?: string;
  hospitalId?: string;
  onClose: () => void;
}

const buildOptimizeMemo = (item: DeadStockItem): string => {
  if (item.olderThanYear) return `품목 최적화 반품 (마지막 사용: ${item.lastUsedDate || '기록 없음'})`;
  if (item.neverUsed) return '품목 최적화 반품 (한 번도 미사용)';
  return '품목 최적화 반품';
};

const SNOOZE_MONTHS = 1;
const SNOOZE_DB_KEY = 'optimize_snooze';

const OptimizeModal: React.FC<OptimizeModalProps> = ({ deadStockItems, onDeleteInventoryItem, onCreateReturn, managerName, hospitalId, onClose }) => {
  const [optimizeFilter, setOptimizeFilter] = useState<'year' | 'never'>('year');
  const [selectedOptimizeIds, setSelectedOptimizeIds] = useState<Set<string>>(new Set());
  const [isDeletingOptimize, setIsDeletingOptimize] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState(0);
  const [deleteTotalCount, setDeleteTotalCount] = useState(0);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBulkReturnConfirm, setShowBulkReturnConfirm] = useState(false);
  const [isBulkReturning, setIsBulkReturning] = useState(false);
  const [bulkReturnProgress, setBulkReturnProgress] = useState(0);
  const [bulkReturnTotal, setBulkReturnTotal] = useState(0);
  const KEEP_QTY = 2; // 유지할 최소 재고 수
  const [neverStockFilter, setNeverStockFilter] = useState<'all' | 'zero' | 'threePlus'>('all');
  const [returningId, setReturningId] = useState<string | null>(null);
  const [returnQtyStr, setReturnQtyStr] = useState('');

  // ── 유지(스누즈) 상태: Supabase DB 기반 (기기 간 공유), localStorage fallback
  // 초기값은 localStorage에서 동기 로드하여 첫 렌더 flash 방지, 이후 Supabase 값으로 업그레이드
  const [snoozedMap, setSnoozedMap] = useState<Record<string, string>>(() => {
    if (!hospitalId) return {};
    try {
      const raw = localStorage.getItem(`${SNOOZE_DB_KEY}_${hospitalId}`);
      if (!raw) return {};
      const parsed = JSON.parse(raw) as Record<string, string>;
      const now = new Date().toISOString();
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (v > now) cleaned[k] = v;
      }
      return cleaned;
    } catch { return {}; }
  });

  useEffect(() => {
    if (!hospitalId) return;
    // Supabase에서 최신 데이터 로드 (기기 간 공유 반영)
    void snoozeService.get(hospitalId, SNOOZE_DB_KEY).then(setSnoozedMap);
  }, [hospitalId]);

  const snoozeItems = (ids: string[]) => {
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + SNOOZE_MONTHS);
    const next = { ...snoozedMap };
    ids.forEach(id => { next[id] = expiry.toISOString(); });
    setSnoozedMap(next);
    if (hospitalId) {
      void snoozeService.set(hospitalId, SNOOZE_DB_KEY, next);
    }
    setSelectedOptimizeIds(prev => { const s = new Set(prev); ids.forEach(id => s.delete(id)); return s; });
  };

  // 호출 시마다 현재 시각 계산 — 모달을 오래 열어둬도 만료된 스누즈가 즉시 해제됨
  const isItemSnoozed = (id: string) => { const e = snoozedMap[id]; return !!e && e > new Date().toISOString(); };

  const yearItems = deadStockItems.filter(i => i.olderThanYear && !isItemSnoozed(i.id));
  const neverItems = deadStockItems.filter(i => i.neverUsed && !isItemSnoozed(i.id));
  const neverZeroItems = neverItems.filter(i => i.currentStock === 0);
  const neverThreePlusItems = neverItems.filter(i => i.currentStock >= 3);
  const displayed = (optimizeFilter === 'year'
    ? yearItems
    : neverStockFilter === 'zero' ? neverZeroItems
    : neverStockFilter === 'threePlus' ? neverThreePlusItems
    : neverItems
  ).filter(i => !isItemSnoozed(i.id));

  // 삭제 가능: 재고 0개만 / 전체 선택: 표시된 모든 항목
  const deletableDisplayed = displayed.filter(i => i.currentStock === 0);
  const allSelected = displayed.length > 0 && displayed.every(i => selectedOptimizeIds.has(i.id));
  const canDeleteSelected = selectedOptimizeIds.size > 0 && Array.from(selectedOptimizeIds).every(id => {
    const item = displayed.find(i => i.id === id);
    return item ? item.currentStock === 0 : false;
  });

  const toggleAll = () => {
    if (allSelected) {
      setSelectedOptimizeIds(prev => { const s = new Set(prev); displayed.forEach(i => s.delete(i.id)); return s; });
    } else {
      setSelectedOptimizeIds(prev => { const s = new Set(prev); displayed.forEach(i => s.add(i.id)); return s; });
    }
  };

  const handleReturnConfirm = async (item: DeadStockItem) => {
    const qty = parseInt(returnQtyStr, 10);
    if (!qty || qty < 1 || qty > item.currentStock) return;
    if (onCreateReturn) {
      await onCreateReturn({
        manufacturer: item.manufacturer,
        reason: 'excess_stock',
        manager: managerName || '품목 최적화',
        memo: buildOptimizeMemo(item),
        items: [{ brand: item.brand, size: item.size, quantity: qty }],
      });
    }
    setReturningId(null);
    setReturnQtyStr('');
  };

  // 2개 유지 일괄 반품: currentStock > KEEP_QTY 인 선택 항목(없으면 전체) 처리
  const bulkReturnEligible = displayed.filter(i =>
    i.currentStock > KEEP_QTY && (selectedOptimizeIds.size === 0 || selectedOptimizeIds.has(i.id))
  );
  const bulkReturnTotalQty = bulkReturnEligible.reduce((s, i) => s + (i.currentStock - KEEP_QTY), 0);

  const handleBulkReturnConfirm = async () => {
    if (bulkReturnEligible.length === 0) return;
    setShowBulkReturnConfirm(false);
    setBulkReturnTotal(bulkReturnEligible.length);
    setBulkReturnProgress(0);
    setIsBulkReturning(true);
    for (const item of bulkReturnEligible) {
      const qty = item.currentStock - KEEP_QTY;
      if (onCreateReturn) {
        await onCreateReturn({
          manufacturer: item.manufacturer,
          reason: 'excess_stock',
          manager: managerName || '품목 최적화',
          memo: buildOptimizeMemo(item),
          items: [{ brand: item.brand, size: item.size, quantity: qty }],
        });
      }
      setBulkReturnProgress(prev => prev + 1);
    }
    setIsBulkReturning(false);
    setBulkReturnProgress(0);
    setBulkReturnTotal(0);
    setSelectedOptimizeIds(new Set());
  };

  const handleDeleteConfirm = async () => {
    if (selectedOptimizeIds.size === 0) return;
    setShowDeleteConfirm(false);
    const ids = Array.from(selectedOptimizeIds);
    setDeleteTotalCount(ids.length);
    setDeleteProgress(0);
    setIsDeletingOptimize(true);
    for (const id of ids) {
      if (onDeleteInventoryItem) await Promise.resolve(onDeleteInventoryItem(id));
      setDeleteProgress(prev => prev + 1);
    }
    const remaining = deadStockItems.filter(i => !selectedOptimizeIds.has(i.id));
    setSelectedOptimizeIds(new Set());
    setIsDeletingOptimize(false);
    setDeleteProgress(0);
    setDeleteTotalCount(0);
    if (remaining.length === 0) {
      onClose();
    }
  };

  // 일괄 반품 진행 중 오버레이
  if (isBulkReturning) {
    const remaining = bulkReturnTotal - bulkReturnProgress;
    return (
      <div role="alertdialog" aria-modal="true" aria-label="반품 처리 중" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <svg className="w-16 h-16 animate-spin text-amber-200" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            </svg>
            <svg className="w-16 h-16 animate-spin text-amber-500 absolute" style={{ animationDuration: '0.7s' }} viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">반품 처리 중</p>
            <p className="text-xs text-slate-400 mt-1">각 품목에 {KEEP_QTY}개를 남기고 반품합니다</p>
          </div>
          <div className="text-center">
            <p className="text-7xl font-black tabular-nums text-slate-800 leading-none transition-all duration-300">{remaining}</p>
            <p className="text-sm font-semibold text-slate-400 mt-2">품목 남음 <span className="text-slate-300">/ {bulkReturnTotal}개</span></p>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-amber-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${bulkReturnTotal > 0 ? (bulkReturnProgress / bulkReturnTotal) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // 삭제 진행 중 오버레이
  if (isDeletingOptimize) {
    const remaining = deleteTotalCount - deleteProgress;
    return (
      <div role="alertdialog" aria-modal="true" aria-label="삭제 처리 중" className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-10 flex flex-col items-center gap-6">
          {/* 스피너 */}
          <div className="relative flex items-center justify-center">
            <svg className="w-16 h-16 animate-spin text-rose-200" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            </svg>
            <svg className="w-16 h-16 animate-spin text-rose-500 absolute" style={{ animationDuration: '0.7s' }} viewBox="0 0 24 24" fill="none">
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>

          {/* 타이틀 */}
          <div className="text-center">
            <p className="text-sm font-bold text-slate-500 tracking-widest uppercase">진행중입니다</p>
            <p className="text-xs text-slate-400 mt-1">잠시만 기다려주세요</p>
          </div>

          {/* 남은 품목 카운터 */}
          <div className="text-center">
            <p className="text-7xl font-black tabular-nums text-slate-800 leading-none transition-all duration-300">
              {remaining}
            </p>
            <p className="text-sm font-semibold text-slate-400 mt-2">
              품목 남음 <span className="text-slate-300">/ {deleteTotalCount}개</span>
            </p>
          </div>

          {/* 진행 바 */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-rose-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${deleteTotalCount > 0 ? (deleteProgress / deleteTotalCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <ModalShell isOpen={true} onClose={onClose} title="품목 최적화" titleId="optimize-modal-title" maxWidth="max-w-2xl" className="flex flex-col max-h-[calc(100dvh-80px)] md:max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 id="optimize-modal-title" className="text-lg font-bold text-slate-900">품목 최적화</h3>
              <p className="text-xs text-slate-500 mt-0.5">장기 미사용 품목을 정리하여 재고 마스터를 슬림하게 유지하세요.</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {/* 요약 배너 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => { setOptimizeFilter('year'); setSelectedOptimizeIds(new Set()); setNeverStockFilter('all'); setReturningId(null); }}
              className={`group relative p-3 rounded-xl border-2 text-left transition-all ${optimizeFilter === 'year' ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs font-bold text-slate-700">1년 이상 미사용</span>
              </div>
              <p className="text-2xl font-black text-amber-600 tabular-nums">{yearItems.length}<span className="text-sm font-semibold text-slate-400 ml-1">품목</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">사용 기록이 1년 이상 없는 규격</p>
              <div className="pointer-events-none absolute top-full left-0 mt-2 z-20 w-60 rounded-lg bg-slate-900 px-3 py-2 text-left text-[11px] font-medium leading-relaxed text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                전체 수술 데이터에서 사용한 이력은 있지만 <strong className="font-bold text-amber-300">1년 이상 미사용</strong>된 품목입니다.
                <span className="absolute -top-1.5 left-4 h-0 w-0 border-x-4 border-b-4 border-x-transparent border-b-slate-900" />
              </div>
            </button>
            <button
              onClick={() => { setOptimizeFilter('never'); setSelectedOptimizeIds(new Set()); setNeverStockFilter('all'); setReturningId(null); }}
              className={`group relative p-3 rounded-xl border-2 text-left transition-all ${optimizeFilter === 'never' ? 'border-rose-400 bg-rose-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span className="text-xs font-bold text-slate-700">한 번도 미사용</span>
              </div>
              <p className="text-2xl font-black text-rose-500 tabular-nums">{neverItems.length}<span className="text-sm font-semibold text-slate-400 ml-1">품목</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">수술기록에 전혀 나타나지 않은 규격</p>
              <div className="pointer-events-none absolute top-full right-0 mt-2 z-20 w-60 rounded-lg bg-slate-900 px-3 py-2 text-left text-[11px] font-medium leading-relaxed text-white shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                전체 수술 데이터에서 <strong className="font-bold text-rose-300">한번도 사용하지 않은</strong> 품목입니다.
                <span className="absolute -top-1.5 right-4 h-0 w-0 border-x-4 border-b-4 border-x-transparent border-b-slate-900" />
              </div>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {optimizeFilter === 'never' && (
            <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50/80 flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" /></svg>
              <span className="text-[11px] text-slate-400 font-medium">필터</span>
              {/* 재고 0개 필터 */}
              {neverZeroItems.length > 0 && <div className="group/zero-tip relative flex items-center gap-1">
                <button
                  onClick={() => { setNeverStockFilter(v => v === 'zero' ? 'all' : 'zero'); setSelectedOptimizeIds(new Set()); setReturningId(null); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    neverStockFilter === 'zero'
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  현재 재고 0개
                  <span className={`text-[10px] tabular-nums ${neverStockFilter === 'zero' ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {neverZeroItems.length}
                  </span>
                </button>
                <svg className="w-3.5 h-3.5 text-slate-400 cursor-help flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="pointer-events-none absolute top-full left-0 mt-2 z-50 w-72 rounded-xl bg-slate-900 px-4 py-3 text-left shadow-xl opacity-0 group-hover/zero-tip:opacity-100 transition-opacity duration-75">
                  <p className="text-[11px] font-bold text-white mb-1.5">재고 0개 미사용 품목 정리 권장</p>
                  <p className="text-[11px] leading-relaxed text-slate-300">한 번도 사용하지 않았으면서 현재 재고가 <span className="text-white font-bold">0개인 품목</span>은 재고 목록에 있을 필요가 없습니다.</p>
                  <p className="text-[11px] leading-relaxed text-slate-300 mt-2">덴트웹에서도 해당 품목을 <span className="text-indigo-300 font-bold">사용하지 않음</span>으로 설정하면 수술기록지 브랜드 선택 시 불필요한 항목이 줄어 피로도가 감소합니다.</p>
                  <span className="absolute -top-1.5 left-6 h-0 w-0 border-x-4 border-b-4 border-x-transparent border-b-slate-900" />
                </div>
              </div>}
              {/* 재고 3개 이상 필터 */}
              <div className="group/three-tip relative flex items-center gap-1">
                <button
                  onClick={() => { setNeverStockFilter(v => v === 'threePlus' ? 'all' : 'threePlus'); setSelectedOptimizeIds(new Set()); setReturningId(null); }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all ${
                    neverStockFilter === 'threePlus'
                      ? 'bg-amber-500 border-amber-500 text-white'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:text-amber-600'
                  }`}
                >
                  현재 재고 3개 이상
                  <span className={`text-[10px] tabular-nums ${neverStockFilter === 'threePlus' ? 'text-amber-100' : 'text-slate-400'}`}>
                    {neverThreePlusItems.length}
                  </span>
                </button>
                <svg className="w-3.5 h-3.5 text-slate-400 cursor-help flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <div className="pointer-events-none absolute top-full left-0 mt-2 z-50 w-72 rounded-xl bg-slate-900 px-4 py-3 text-left shadow-xl opacity-0 group-hover/three-tip:opacity-100 transition-opacity duration-75">
                  <p className="text-[11px] font-bold text-white mb-1.5">재고 과잉 미사용 품목 주의</p>
                  <p className="text-[11px] leading-relaxed text-slate-300">한 번도 사용하지 않았으면서 현재 재고가 <span className="text-amber-300 font-bold">3개 이상</span>인 품목입니다.</p>
                  <p className="text-[11px] leading-relaxed text-slate-300 mt-2">사용 계획이 없다면 반품·이관을 검토하거나, 덴트웹에서 <span className="text-amber-300 font-bold">사용하지 않음</span>으로 설정해 수술기록지 선택 피로도를 줄이세요.</p>
                  <span className="absolute -top-1.5 left-6 h-0 w-0 border-x-4 border-b-4 border-x-transparent border-b-slate-900" />
                </div>
              </div>
            </div>
          )}
          {displayed.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">해당하는 품목이 없습니다.</div>
          ) : (
            <>
              {/* 모바일: 카드 리스트 */}
              <div className="md:hidden divide-y divide-slate-100">
                {/* 전체선택 행 */}
                <div className="px-4 py-2.5 bg-slate-50 flex items-center gap-3">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer" />
                  <span className="text-[11px] font-bold text-slate-500">전체 선택 ({displayed.length})</span>
                </div>
                {displayed.map(item => {
                  const canDelete = item.currentStock === 0;
                  const isReturning = returningId === item.id;
                  const maxQty = item.currentStock;
                  const isSelected = selectedOptimizeIds.has(item.id);

                  if (isReturning) {
                    const qty = parseInt(returnQtyStr, 10);
                    const isValid = !isNaN(qty) && qty >= 1 && qty <= maxQty;
                    return (
                      <div key={item.id} className="px-4 py-3 bg-amber-50/60">
                        <p className="text-xs font-bold text-slate-700 mb-2.5">
                          {item.brand} <span className="font-mono text-slate-500">{item.size}</span>
                          <span className="ml-2 text-slate-400 font-normal">현재 {maxQty}개</span>
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-slate-500 font-medium shrink-0">반품 수량</span>
                          <input
                            type="number"
                            min={1}
                            max={maxQty}
                            value={returnQtyStr}
                            onChange={e => setReturnQtyStr(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && isValid) void handleReturnConfirm(item); if (e.key === 'Escape') { setReturningId(null); setReturnQtyStr(''); } }}
                            className="w-20 px-2 py-1.5 text-sm font-bold border border-slate-300 rounded-lg text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                            placeholder="수량"
                            autoFocus
                          />
                          <span className="text-[11px] text-slate-400 shrink-0">/ {maxQty}개</span>
                          <button onClick={() => void handleReturnConfirm(item)} disabled={!isValid} className="px-3 py-1.5 text-[11px] font-bold text-white bg-amber-500 rounded-lg disabled:opacity-40 transition-colors">확인</button>
                          <button onClick={() => { setReturningId(null); setReturnQtyStr(''); }} className="px-3 py-1.5 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">취소</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      onClick={() => setSelectedOptimizeIds(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; })}
                      className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/60' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => setSelectedOptimizeIds(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; })}
                        onClick={e => e.stopPropagation()}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{item.brand}</p>
                            <p className="text-[11px] text-slate-400">{item.manufacturer}</p>
                          </div>
                          <span className={`text-sm font-black tabular-nums shrink-0 ${item.currentStock > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                            {item.currentStock}개
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{item.size}</span>
                          {item.neverUsed
                            ? <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">미사용</span>
                            : <span className="text-[11px] text-amber-700 font-semibold">{item.lastUsedDate}</span>
                          }
                        </div>
                        <div className="flex items-center gap-2 mt-2" onClick={e => e.stopPropagation()}>
                          {!canDelete && (
                            <button onClick={() => { setReturningId(item.id); setReturnQtyStr(String(item.currentStock)); }} className="px-3 py-1 text-[11px] font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-lg active:bg-amber-100 transition-colors">반품</button>
                          )}
                          <div className="relative group/snooze-tip">
                            <button onClick={() => snoozeItems([item.id])} className="px-3 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-lg active:bg-emerald-100 transition-colors">유지</button>
                            <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[11px] text-white opacity-0 group-hover/snooze-tip:opacity-100 transition-opacity whitespace-nowrap">
                              1개월 동안 목록에서 숨김
                              <span className="absolute top-full left-1/2 -translate-x-1/2 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-slate-900" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 데스크탑: 테이블 */}
              <table className="hidden md:table w-full">
                <thead className="bg-slate-50 border-b border-slate-100 md:sticky md:top-0">
                  <tr>
                    <th className="w-10 px-4 py-3">
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer" />
                    </th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">제조사 / 브랜드</th>
                    <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">규격</th>
                    <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase">현재재고</th>
                    <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase">마지막 사용일</th>
                    <th className="w-20 px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayed.map(item => {
                    const canDelete = item.currentStock === 0;
                    const isReturning = returningId === item.id;
                    const maxQty = item.currentStock;

                    if (isReturning) {
                      const qty = parseInt(returnQtyStr, 10);
                      const isValid = !isNaN(qty) && qty >= 1 && qty <= maxQty;
                      return (
                        <tr key={item.id} className="bg-amber-50/60">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="text-xs font-bold text-slate-700 truncate">{item.brand}</span>
                                <span className="text-slate-300">·</span>
                                <span className="text-xs font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">{item.size}</span>
                                <span className="text-[11px] text-slate-400 flex-shrink-0">현재 <span className="font-bold text-slate-600">{maxQty}개</span></span>
                              </div>
                              <div className="flex items-center gap-2 ml-auto">
                                <span className="text-[11px] text-slate-500 font-medium flex-shrink-0">반품 수량</span>
                                <input
                                  type="number"
                                  min={1}
                                  max={maxQty}
                                  value={returnQtyStr}
                                  onChange={e => setReturnQtyStr(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && isValid) void handleReturnConfirm(item); if (e.key === 'Escape') { setReturningId(null); setReturnQtyStr(''); } }}
                                  className="w-20 px-2 py-1 text-sm font-bold border border-slate-300 rounded-lg text-center focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-200"
                                  placeholder="수량"
                                  autoFocus
                                />
                                <span className="text-[11px] text-slate-400 flex-shrink-0">/ {maxQty}개</span>
                                <button onClick={() => void handleReturnConfirm(item)} disabled={!isValid} className="px-3 py-1 text-[11px] font-bold text-white bg-amber-500 rounded-lg hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">확인</button>
                                <button onClick={() => { setReturningId(null); setReturnQtyStr(''); }} className="px-3 py-1 text-[11px] font-bold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">취소</button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedOptimizeIds(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; })}
                        className={`transition-colors cursor-pointer ${selectedOptimizeIds.has(item.id) ? 'bg-indigo-50/60' : 'hover:bg-slate-50'}`}
                      >
                        <td className="w-10 px-4 py-3" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOptimizeIds.has(item.id)}
                            onChange={() => setSelectedOptimizeIds(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; })}
                            className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer"
                          />
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1.5">
                            {!canDelete && <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                            <div>
                              <div className="text-xs font-bold text-slate-700">{item.brand}</div>
                              <div className="text-[10px] text-slate-400">{item.manufacturer}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3">
                          <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{item.size}</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs font-bold tabular-nums ${item.currentStock > 0 ? 'text-slate-700' : 'text-slate-400'}`}>{item.currentStock}개</span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {item.neverUsed
                            ? <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">미사용</span>
                            : <span className="text-[11px] text-amber-700 font-semibold">{item.lastUsedDate}</span>
                          }
                        </td>
                        <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            {!canDelete && (
                              <button onClick={() => { setReturningId(item.id); setReturnQtyStr(String(item.currentStock)); }} className="px-2 py-1 text-[10px] font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors whitespace-nowrap">반품</button>
                            )}
                            <div className="relative group/snooze-tip">
                              <button onClick={() => snoozeItems([item.id])} className="px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors whitespace-nowrap">유지</button>
                              <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 rounded-lg bg-slate-900 px-2.5 py-1.5 text-center text-[11px] text-white opacity-0 group-hover/snooze-tip:opacity-100 transition-opacity whitespace-nowrap">
                                1개월 동안 목록에서 숨김
                                <span className="absolute top-full left-1/2 -translate-x-1/2 h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-slate-900" />
                              </div>
                            </div>
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

        {/* Footer */}
        {showBulkReturnConfirm ? (
          <div className="px-6 py-4 border-t border-amber-100 bg-amber-50 rounded-b-2xl">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-sm font-bold text-amber-800">일괄 반품 처리하시겠습니까?</p>
                <p className="text-xs text-amber-700 mt-0.5">
                  <span className="font-bold">{bulkReturnEligible.length}개</span> 품목에서 총{' '}
                  <span className="font-bold">{bulkReturnTotalQty}개</span>를 반품하고, 각 품목에{' '}
                  <span className="font-bold">{KEEP_QTY}개</span>씩 남깁니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBulkReturnConfirm(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleBulkReturnConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-amber-500 rounded-xl hover:bg-amber-600 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                확인, 일괄 반품
              </button>
            </div>
          </div>
        ) : showDeleteConfirm ? (
          <div className="px-6 py-4 border-t border-rose-100 bg-rose-50 rounded-b-2xl">
            <div className="flex items-start gap-3 mb-3">
              <svg className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              <div>
                <p className="text-sm font-bold text-rose-800">정말 삭제하시겠습니까?</p>
                <p className="text-xs text-rose-600 mt-0.5">
                  선택한 <span className="font-bold">{selectedOptimizeIds.size}개</span> 품목이 재고 마스터에서 영구 삭제됩니다. 삭제한 데이터는 복구되지 않습니다.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors flex items-center gap-1.5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                확인, 영구 삭제
              </button>
            </div>
          </div>
        ) : (
          <div className="px-4 py-3 border-t border-slate-100">
            {/* 모바일: 세로 스택 */}
            <div className="md:hidden flex flex-col gap-2">
              <button
                onClick={() => setShowBulkReturnConfirm(true)}
                disabled={bulkReturnEligible.length === 0}
                className="w-full h-11 flex items-center justify-center gap-1.5 text-sm font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:bg-amber-100"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-3a4 4 0 00-8 0v3M8 15h8M12 3v4m0 0l-2-2m2 2l2-2" /></svg>
                {KEEP_QTY}개 유지 반품 ({bulkReturnEligible.length})
              </button>
              {onDeleteInventoryItem && (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={!canDeleteSelected || isDeletingOptimize}
                  className="w-full h-11 flex items-center justify-center gap-1.5 text-sm font-bold text-white bg-rose-600 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:bg-rose-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                  선택 품목 삭제 ({deletableDisplayed.filter(i => selectedOptimizeIds.has(i.id)).length})
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => snoozeItems(Array.from(selectedOptimizeIds))}
                  disabled={selectedOptimizeIds.size === 0}
                  className="flex-1 h-10 flex items-center justify-center gap-1 text-sm font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-colors active:bg-emerald-100"
                >
                  유지 ({selectedOptimizeIds.size})
                </button>
                <button onClick={onClose} className="flex-1 h-10 flex items-center justify-center text-sm font-bold text-slate-600 border border-slate-200 rounded-xl active:bg-slate-50 transition-colors">
                  닫기
                </button>
              </div>
            </div>
            {/* 데스크탑: 기존 가로 레이아웃 */}
            <div className="hidden md:flex items-center justify-between gap-3">
              <p className="text-xs text-slate-500 shrink-0">
                {selectedOptimizeIds.size > 0
                  ? <><span className="font-bold text-slate-800">{selectedOptimizeIds.size}개</span> 품목 선택됨</>
                  : '항목을 선택해 유지하거나 삭제하세요'}
              </p>
              <div className="flex gap-2 flex-wrap justify-end">
                <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">닫기</button>
                <button onClick={() => snoozeItems(Array.from(selectedOptimizeIds))} disabled={selectedOptimizeIds.size === 0} className="px-4 py-2 text-sm font-bold text-emerald-700 border border-emerald-300 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  선택 품목 유지 ({selectedOptimizeIds.size})
                </button>
                <button onClick={() => setShowBulkReturnConfirm(true)} disabled={bulkReturnEligible.length === 0} className="px-4 py-2 text-sm font-bold text-amber-700 border border-amber-300 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 15v-3a4 4 0 00-8 0v3M8 15h8M12 3v4m0 0l-2-2m2 2l2-2" /></svg>
                  {KEEP_QTY}개 유지 반품 ({bulkReturnEligible.length})
                </button>
                {onDeleteInventoryItem && (
                  <button onClick={() => setShowDeleteConfirm(true)} disabled={!canDeleteSelected || isDeletingOptimize} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    선택 품목 삭제 ({deletableDisplayed.filter(i => selectedOptimizeIds.has(i.id)).length})
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
    </ModalShell>
  );
};

export default OptimizeModal;
