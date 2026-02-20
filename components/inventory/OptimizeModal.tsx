import React, { useState } from 'react';
import { InventoryItem } from '../../types';

interface DeadStockItem extends InventoryItem {
  neverUsed: boolean;
  olderThanYear: boolean;
  lastUsedDate: string | null;
}

interface OptimizeModalProps {
  deadStockItems: DeadStockItem[];
  onDeleteInventoryItem: (id: string) => void;
  onClose: () => void;
}

const OptimizeModal: React.FC<OptimizeModalProps> = ({ deadStockItems, onDeleteInventoryItem, onClose }) => {
  const [optimizeFilter, setOptimizeFilter] = useState<'year' | 'never'>('year');
  const [selectedOptimizeIds, setSelectedOptimizeIds] = useState<Set<string>>(new Set());
  const [isDeletingOptimize, setIsDeletingOptimize] = useState(false);

  const yearItems = deadStockItems.filter(i => i.olderThanYear);
  const neverItems = deadStockItems.filter(i => i.neverUsed);
  const displayed = optimizeFilter === 'year' ? yearItems : neverItems;
  const allSelected = displayed.length > 0 && displayed.every(i => selectedOptimizeIds.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedOptimizeIds(prev => { const s = new Set(prev); displayed.forEach(i => s.delete(i.id)); return s; });
    } else {
      setSelectedOptimizeIds(prev => { const s = new Set(prev); displayed.forEach(i => s.add(i.id)); return s; });
    }
  };

  const handleDelete = async () => {
    if (selectedOptimizeIds.size === 0) return;
    setIsDeletingOptimize(true);
    for (const id of selectedOptimizeIds) {
      await Promise.resolve(onDeleteInventoryItem(id));
    }
    const remaining = deadStockItems.filter(i => !selectedOptimizeIds.has(i.id));
    setSelectedOptimizeIds(new Set());
    setIsDeletingOptimize(false);
    if (remaining.length === 0) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">품목 최적화</h3>
              <p className="text-xs text-slate-500 mt-0.5">장기 미사용 품목을 정리하여 재고 마스터를 슬림하게 유지하세요.</p>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {/* 요약 배너 */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => { setOptimizeFilter('year'); setSelectedOptimizeIds(new Set()); }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${optimizeFilter === 'year' ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span className="text-xs font-bold text-slate-700">1년 이상 미사용</span>
              </div>
              <p className="text-2xl font-black text-amber-600 tabular-nums">{yearItems.length}<span className="text-sm font-semibold text-slate-400 ml-1">품목</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">사용 기록이 1년 이상 없는 규격</p>
            </button>
            <button
              onClick={() => { setOptimizeFilter('never'); setSelectedOptimizeIds(new Set()); }}
              className={`p-3 rounded-xl border-2 text-left transition-all ${optimizeFilter === 'never' ? 'border-rose-400 bg-rose-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
            >
              <div className="flex items-center gap-2 mb-1">
                <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                <span className="text-xs font-bold text-slate-700">한 번도 미사용</span>
              </div>
              <p className="text-2xl font-black text-rose-500 tabular-nums">{neverItems.length}<span className="text-sm font-semibold text-slate-400 ml-1">품목</span></p>
              <p className="text-[10px] text-slate-400 mt-0.5">수술기록에 전혀 나타나지 않은 규격</p>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-y-auto">
          {displayed.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">해당하는 품목이 없습니다.</div>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer" />
                  </th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">제조사 / 브랜드</th>
                  <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">규격</th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase">현재재고</th>
                  <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase">마지막 사용일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map(item => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedOptimizeIds(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; })}
                    className={`cursor-pointer transition-colors ${selectedOptimizeIds.has(item.id) ? 'bg-rose-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="w-10 px-4 py-3">
                      <input type="checkbox" checked={selectedOptimizeIds.has(item.id)} onChange={() => {}} className="w-4 h-4 rounded border-slate-300 accent-indigo-600 pointer-events-none" />
                    </td>
                    <td className="px-3 py-3">
                      <div className="text-xs font-bold text-slate-700">{item.brand}</div>
                      <div className="text-[10px] text-slate-400">{item.manufacturer}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{item.size}</span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      <span className={`text-xs font-bold tabular-nums ${item.currentStock > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                        {item.currentStock}개
                      </span>
                    </td>
                    <td className="px-3 py-3 text-center">
                      {item.neverUsed ? (
                        <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">미사용</span>
                      ) : (
                        <span className="text-[11px] text-amber-700 font-semibold">{item.lastUsedDate}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {selectedOptimizeIds.size > 0
              ? <><span className="font-bold text-slate-800">{selectedOptimizeIds.size}개</span> 품목 선택됨</>
              : '삭제할 품목을 선택하세요'}
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
              닫기
            </button>
            <button
              onClick={handleDelete}
              disabled={selectedOptimizeIds.size === 0 || isDeletingOptimize}
              className="px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              {isDeletingOptimize ? '삭제 중...' : `선택 품목 삭제 (${selectedOptimizeIds.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizeModal;
