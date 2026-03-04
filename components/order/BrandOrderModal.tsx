import React, { useState } from 'react';
import { InventoryItem } from '../../types';
import { isIbsImplantManufacturer } from '../../services/sizeNormalizer';

export interface BrandOrderEntry {
  item: InventoryItem;
  remainingDeficit: number;
}

interface BrandOrderModalProps {
  mfr: string;
  entries: BrandOrderEntry[];
  onOrder: (item: InventoryItem) => void;
  onClose: () => void;
  isReadOnly?: boolean;
  showAlertToast: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const BrandOrderModal: React.FC<BrandOrderModalProps> = ({
  mfr,
  entries,
  onOrder,
  onClose,
  isReadOnly,
  showAlertToast,
}) => {
  const displayMfr = isIbsImplantManufacturer(mfr) ? 'IBS Implant' : mfr;

  const allIds = entries.map(e => e.item.id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(allIds));
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  const undoneEntries = entries.filter(e => !doneIds.has(e.item.id));
  const allSelected = undoneEntries.length > 0 && undoneEntries.every(e => selectedIds.has(e.item.id));
  const someSelected = undoneEntries.some(e => selectedIds.has(e.item.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(undoneEntries.map(e => e.item.id)));
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

  const handleSingleOrder = (entry: BrandOrderEntry) => {
    if (isReadOnly || doneIds.has(entry.item.id)) return;
    onOrder(entry.item);
    setDoneIds(prev => new Set(prev).add(entry.item.id));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(entry.item.id); return next; });
  };

  const handleBulkOrder = () => {
    if (isReadOnly) return;
    const targets = entries.filter(e => selectedIds.has(e.item.id) && !doneIds.has(e.item.id));
    if (targets.length === 0) return;
    targets.forEach(e => onOrder(e.item));
    const newDone = new Set(doneIds);
    targets.forEach(e => newDone.add(e.item.id));
    setDoneIds(newDone);
    setSelectedIds(new Set());
    showAlertToast(`${targets.length}품목 발주 목록에 추가되었습니다.`, 'success');
  };

  const selectedCount = [...selectedIds].filter(id => !doneIds.has(id)).length;
  const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);

  const checkboxRef = (el: HTMLInputElement | null, indeterminate: boolean) => {
    if (el) el.indeterminate = indeterminate;
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm sm:p-4 pb-[68px] sm:pb-0"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-2xl shadow-2xl flex flex-col h-[calc(100dvh-68px)] sm:h-auto sm:max-h-[85vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="text-lg font-bold text-slate-900">{displayMfr} 발주 신청</h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 ml-6">{entries.length}종 · 총 {totalDeficit}개 부족</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
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
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-slate-500 whitespace-nowrap">재고</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-slate-500 whitespace-nowrap">권장</th>
                <th className="px-2 py-2.5 text-right text-[11px] font-bold text-rose-400 whitespace-nowrap">부족</th>
                <th className="px-2 py-2.5 text-center text-[11px] font-bold text-slate-500 whitespace-nowrap">발주</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.map(entry => {
                const { item, remainingDeficit } = entry;
                const isDone = doneIds.has(item.id);
                const isSelected = selectedIds.has(item.id);
                return (
                  <tr
                    key={item.id}
                    className={`cursor-pointer transition-colors ${isDone ? 'bg-emerald-50/50 opacity-60' : isSelected ? 'bg-rose-50/40 hover:bg-rose-50/60' : 'hover:bg-slate-50/60'}`}
                    onClick={() => { if (!isDone) toggleId(item.id); }}
                  >
                    <td className="pl-4 pr-1 py-2.5">
                      {isDone ? (
                        <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleId(item.id)}
                          onClick={e => e.stopPropagation()}
                          className="w-3.5 h-3.5 rounded border-slate-300 accent-rose-500"
                        />
                      )}
                    </td>
                    <td className="px-2 py-2.5 font-semibold text-slate-700 whitespace-nowrap">
                      {item.brand || item.manufacturer}
                    </td>
                    <td className="px-2 py-2.5 text-slate-500 whitespace-nowrap">
                      {(!item.size || item.size === '기타') ? '-' : item.size}
                    </td>
                    <td className="px-2 py-2.5 text-right font-bold text-slate-700 tabular-nums whitespace-nowrap">
                      {item.currentStock}
                    </td>
                    <td className="px-2 py-2.5 text-right text-slate-400 tabular-nums whitespace-nowrap">
                      {item.recommendedStock}
                    </td>
                    <td className="px-2 py-2.5 text-right font-black text-rose-600 tabular-nums whitespace-nowrap">
                      +{remainingDeficit}
                    </td>
                    <td className="px-2 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                      {isDone ? (
                        <span className="text-[10px] font-bold text-emerald-500">완료</span>
                      ) : (
                        <button
                          onClick={() => handleSingleOrder(entry)}
                          disabled={isReadOnly}
                          className="px-3 py-1 rounded-lg bg-rose-500 text-white text-[10px] font-bold hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                          발주
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            {doneIds.size > 0 && (
              <span className="text-emerald-600 font-bold mr-1.5">{doneIds.size}종 발주 완료 ·</span>
            )}
            {selectedCount > 0 ? (
              <><span className="font-bold text-rose-600">{selectedCount}종</span> 선택됨</>
            ) : (
              doneIds.size === entries.length ? '모두 발주 완료' : '항목을 선택하세요'
            )}
          </p>
          <button
            onClick={handleBulkOrder}
            disabled={isReadOnly || selectedCount === 0}
            className="h-10 px-5 rounded-xl bg-rose-500 text-white text-sm font-bold hover:bg-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm shadow-rose-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            선택 발주
          </button>
        </div>
      </div>
    </div>
  );
};

export default BrandOrderModal;
