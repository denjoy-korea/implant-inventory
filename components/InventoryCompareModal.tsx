
import React, { useState, useEffect } from 'react';

export interface CompareItem {
  manufacturer: string;
  brand: string;
  size: string;
}

interface InventoryCompareModalProps {
  duplicates: CompareItem[];
  newItems: CompareItem[];
  onConfirm: () => void;
  onCancel: () => void;
}

const InventoryCompareModal: React.FC<InventoryCompareModalProps> = ({
  duplicates,
  newItems,
  onConfirm,
  onCancel,
}) => {
  const [tab, setTab] = useState<'new' | 'dup'>(newItems.length > 0 ? 'new' : 'dup');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-800">재고 마스터 비교 결과</h3>
              <p className="text-xs text-slate-400 mt-0.5">기존 재고 마스터와 비교하여 중복 여부를 확인합니다.</p>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`rounded-xl p-3 border-2 transition-all cursor-pointer ${tab === 'new' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`} onClick={() => newItems.length > 0 && setTab('new')}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md bg-emerald-500 text-white flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v12m6-6H6" /></svg>
                </div>
                <span className="text-xs font-bold text-slate-500">신규 품목</span>
              </div>
              <p className="text-2xl font-black text-emerald-600">{newItems.length}<span className="text-sm font-bold text-slate-400 ml-1">개</span></p>
            </div>
            <div className={`rounded-xl p-3 border-2 transition-all cursor-pointer ${tab === 'dup' ? 'border-amber-300 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`} onClick={() => duplicates.length > 0 && setTab('dup')}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-md bg-amber-500 text-white flex items-center justify-center">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                </div>
                <span className="text-xs font-bold text-slate-500">중복 (이미 등록됨)</span>
              </div>
              <p className="text-2xl font-black text-amber-600">{duplicates.length}<span className="text-sm font-bold text-slate-400 ml-1">개</span></p>
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
          {tab === 'new' && newItems.length > 0 && (
            <div className="space-y-1">
              <div className="md:sticky md:top-0 bg-white py-2 border-b border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                  <span>제조사</span>
                  <span>브랜드</span>
                  <span>사이즈</span>
                </div>
              </div>
              {newItems.map((item, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 px-3 py-2 rounded-lg text-xs text-slate-700 hover:bg-emerald-50/50 transition-colors">
                  <span className="font-medium truncate">{item.manufacturer}</span>
                  <span className="truncate">{item.brand}</span>
                  <span className="text-slate-500 truncate">{item.size}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'new' && newItems.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
              </div>
              <p className="text-sm font-bold text-slate-400">신규 등록할 품목이 없습니다</p>
              <p className="text-xs text-slate-300 mt-1">모든 품목이 이미 재고 마스터에 등록되어 있습니다.</p>
            </div>
          )}
          {tab === 'dup' && duplicates.length > 0 && (
            <div className="space-y-1">
              <div className="md:sticky md:top-0 bg-white py-2 border-b border-slate-100">
                <div className="grid grid-cols-3 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3">
                  <span>제조사</span>
                  <span>브랜드</span>
                  <span>사이즈</span>
                </div>
              </div>
              {duplicates.map((item, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 px-3 py-2 rounded-lg text-xs text-slate-400 hover:bg-amber-50/50 transition-colors">
                  <span className="font-medium truncate">{item.manufacturer}</span>
                  <span className="truncate">{item.brand}</span>
                  <span className="truncate">{item.size}</span>
                </div>
              ))}
            </div>
          )}
          {tab === 'dup' && duplicates.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <p className="text-sm font-bold text-slate-400">중복 품목 없음</p>
              <p className="text-xs text-slate-300 mt-1">모든 품목이 신규 등록됩니다.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-5 border-t border-slate-100 bg-slate-50/50">
          {newItems.length > 0 ? (
            <div className="space-y-3">
              {duplicates.length > 0 && (
                <p className="text-xs text-center text-slate-400">
                  중복 <span className="font-bold text-amber-600">{duplicates.length}</span>개를 제외한 <span className="font-bold text-emerald-600">{newItems.length}</span>개 품목을 재고 마스터에 등록합니다.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onCancel}
                  className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-[0.98]"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={onConfirm}
                  className="flex-1 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md shadow-indigo-200 transition-all active:scale-[0.98]"
                >
                  {newItems.length}개 등록하기
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="w-full py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all active:scale-[0.98]"
            >
              닫기
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryCompareModal;
