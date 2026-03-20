import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import { isIbsImplantManufacturer } from '../../services/sizeNormalizer';
import ModalShell from '../shared/ModalShell';

export interface BrandOrderEntry {
  item: InventoryItem;
  remainingDeficit: number;
}

interface BrandOrderModalProps {
  mfr: string;
  entries: BrandOrderEntry[];
  onAddToCart: (mfr: string, items: Array<{ item: InventoryItem; qty: number }>) => void;
  onClose: () => void;
  isReadOnly?: boolean;
  showAlertToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const BrandOrderModal: React.FC<BrandOrderModalProps> = ({
  mfr,
  entries,
  onAddToCart,
  onClose,
  isReadOnly,
  showAlertToast,
}) => {
  const displayMfr = isIbsImplantManufacturer(mfr) ? 'IBS Implant' : mfr;

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [quantityOverrides, setQuantityOverrides] = useState<Record<string, number>>({});

  const getQty = (id: string, defaultQty: number) =>
    quantityOverrides[id] !== undefined ? quantityOverrides[id] : defaultQty;

  const setQty = (id: string, value: number) => {
    setQuantityOverrides(prev => ({ ...prev, [id]: Math.max(1, value) }));
    setSelectedIds(prev => { const next = new Set(prev); next.add(id); return next; });
  };

  const allSelected = entries.length > 0 && entries.every(e => selectedIds.has(e.item.id));
  const someSelected = entries.some(e => selectedIds.has(e.item.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(entries.map(e => e.item.id)));
    }
  };

  const toggleId = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkOrder = () => {
    if (isReadOnly) return;
    const targets = entries.filter(e => selectedIds.has(e.item.id));
    if (targets.length === 0) return;
    onAddToCart(mfr, targets.map(e => ({ item: e.item, qty: getQty(e.item.id, e.remainingDeficit) })));
    showAlertToast(`${targets.length}품목이 장바구니에 담겼습니다.`, 'success');
    onClose();
  };

  const selectedCount = selectedIds.size;
  const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);

  const checkboxRef = (el: HTMLInputElement | null, indeterminate: boolean) => {
    if (el) el.indeterminate = indeterminate;
  };

  return (
    <ModalShell
      isOpen={true}
      onClose={onClose}
      title={`${displayMfr} 발주 신청`}
      titleId="brand-order-modal-title"
      backdropClassName="flex items-end sm:items-center justify-center sm:p-4 pb-[68px] sm:pb-0"
      className="rounded-t-2xl sm:rounded-2xl flex flex-col h-[calc(100dvh-68px)] sm:h-auto sm:max-h-[85vh]"
      maxWidth="w-full sm:max-w-2xl"
    >
        {/* Drag indicator (mobile only) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 bg-slate-200 rounded-full" />
        </div>
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 id="brand-order-modal-title" className="text-lg font-bold text-slate-900">{displayMfr} 발주 신청</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 ml-6">{entries.length}종 · 총 {totalDeficit}개 부족</p>
            </div>
            <button
              onClick={onClose}
              aria-label="닫기"
              className="p-3 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
              <tr>
                <th className="pl-4 pr-1 py-2.5 text-left w-8">
                  <input
                    type="checkbox"
                    ref={el => checkboxRef(el, someSelected && !allSelected)}
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-3.5 h-3.5 rounded border-slate-300 accent-rose-500"
                  />
                </th>
                <th className="px-2 py-2.5 text-left text-[11px] font-bold text-slate-500 whitespace-nowrap">브랜드</th>
                <th className="px-2 py-2.5 text-left text-[11px] font-bold text-slate-500 whitespace-nowrap">규격</th>
                <th className="hidden sm:table-cell px-2 py-2.5 text-right text-[11px] font-bold text-slate-500 whitespace-nowrap">재고</th>
                <th className="hidden sm:table-cell px-2 py-2.5 text-right text-[11px] font-bold text-slate-500 whitespace-nowrap">권장</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-rose-400 whitespace-nowrap">부족</th>
                <th className="px-2 py-2.5 text-center text-[11px] font-bold text-indigo-500 whitespace-nowrap">수량</th>
                <th className="px-2 py-2.5 text-center text-[11px] font-bold text-slate-500 whitespace-nowrap">확인</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map(entry => {
                const { item, remainingDeficit } = entry;
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/60'}`}
                    onClick={() => toggleId(item.id)}
                  >
                    <td className="pl-4 pr-1 py-2.5">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleId(item.id)}
                        onClick={e => e.stopPropagation()}
                        className="w-3.5 h-3.5 rounded border-slate-300 accent-rose-500"
                      />
                    </td>
                    <td className="px-2 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                      {item.brand || item.manufacturer}
                    </td>
                    <td className="px-2 py-2.5 text-slate-500 whitespace-nowrap">
                      {(!item.size || item.size === '기타') ? '-' : item.size}
                    </td>
                    <td className="hidden sm:table-cell px-2 py-2.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                      {item.currentStock}
                    </td>
                    <td className="hidden sm:table-cell px-2 py-2.5 text-right text-slate-400 tabular-nums whitespace-nowrap">
                      {item.recommendedStock}
                    </td>
                    <td className="px-2 py-2.5 text-right font-black text-rose-600 tabular-nums whitespace-nowrap">
                      +{remainingDeficit}
                    </td>
                    <td className="px-1 py-2" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-0.5">
                        <button
                          type="button"
                          aria-label="수량 감소"
                          onClick={() => setQty(item.id, getQty(item.id, remainingDeficit) - 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors leading-none"
                        >−</button>
                        <input
                          type="number"
                          min={1}
                          aria-label="발주 수량"
                          value={getQty(item.id, remainingDeficit)}
                          onChange={e => setQty(item.id, parseInt(e.target.value) || 1)}
                          className="w-8 text-center text-xs font-bold text-indigo-700 tabular-nums bg-indigo-50 rounded border border-indigo-100 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        />
                        <button
                          type="button"
                          aria-label="수량 증가"
                          onClick={() => setQty(item.id, getQty(item.id, remainingDeficit) + 1)}
                          className="w-5 h-5 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors leading-none"
                        >+</button>
                      </div>
                    </td>
                    <td className="px-2 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => toggleId(item.id)}
                        disabled={isReadOnly}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${isSelected ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                      >
                        확인
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4"
             style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-xs text-slate-500">
            {selectedCount > 0 ? (
              <><span className="font-bold text-rose-600">{selectedCount}종</span> 선택됨</>
            ) : (
              '항목을 선택하세요'
            )}
          </p>
          <button
            onClick={handleBulkOrder}
            disabled={isReadOnly || selectedCount === 0}
            className="h-11 px-5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm shadow-rose-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            장바구니 담기
          </button>
        </div>
    </ModalShell>
  );
};

export default BrandOrderModal;
