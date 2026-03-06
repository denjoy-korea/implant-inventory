import React from 'react';
import ModalShell from '../shared/ModalShell';

interface AuditSummaryItem {
  id: string;
  result: {
    actualCount?: number;
    reason?: string;
  };
  item: {
    manufacturer: string;
    brand: string;
    size: string;
    currentStock: number;
  };
}

interface AuditSummaryModalProps {
  show: boolean;
  summaryCloseButtonRef: React.RefObject<HTMLButtonElement | null>;
  auditedCount: number;
  mismatchItems: AuditSummaryItem[];
  isApplying: boolean;
  onClose: () => void;
  onApply: () => void;
}

const AuditSummaryModal: React.FC<AuditSummaryModalProps> = ({
  show,
  summaryCloseButtonRef,
  auditedCount,
  mismatchItems,
  isApplying,
  onClose,
  onApply,
}) => {
  return (
    <ModalShell
      isOpen={show}
      onClose={onClose}
      title="재고실사 결과"
      titleId="audit-summary-title"
      describedBy="audit-summary-desc"
      maxWidth="max-w-lg"
      className="max-h-[85vh] flex flex-col"
      initialFocusRef={summaryCloseButtonRef as React.RefObject<HTMLElement>}
    >
      <div className="p-8 bg-indigo-600 text-white flex justify-between items-center flex-shrink-0">
        <div>
          <h3 id="audit-summary-title" className="text-xl font-black">재고실사 결과</h3>
          <p id="audit-summary-desc" className="text-indigo-200 text-xs mt-1">{new Date().toLocaleDateString('ko-KR')} 실사</p>
        </div>
        <button ref={summaryCloseButtonRef} onClick={onClose} aria-label="닫기" className="p-2 hover:bg-white/10 rounded-full transition-all">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="p-4 sm:p-8 space-y-6 overflow-y-auto modal-scroll flex-1">
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="bg-slate-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-slate-800">{auditedCount}</p>
            <p className="text-[10px] font-bold text-slate-400 mt-1">전체 실사</p>
          </div>
          <div className="bg-emerald-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-600">{auditedCount - mismatchItems.length}</p>
            <p className="text-[10px] font-bold text-emerald-500 mt-1">일치</p>
          </div>
          <div className="bg-rose-50 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-rose-600">{mismatchItems.length}</p>
            <p className="text-[10px] font-bold text-rose-500 mt-1">불일치</p>
          </div>
        </div>

        {mismatchItems.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              불일치 내역
            </h4>
            <div className="space-y-2">
              {mismatchItems.map(({ id, result, item }) => {
                const diff = (result.actualCount ?? 0) - item.currentStock;
                return (
                  <div key={id} className="flex items-center justify-between bg-rose-50/50 border border-rose-100 rounded-xl px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{item.brand} {item.size}</p>
                      <p className="text-[10px] text-slate-400 truncate">{item.manufacturer}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">시스템</span>
                        <p className="text-xs font-black text-slate-600">{item.currentStock}</p>
                      </div>
                      <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400">실제</span>
                        <p className="text-xs font-black text-rose-600">{result.actualCount}</p>
                      </div>
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${diff < 0 ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>
                        {diff > 0 ? '+' : ''}{diff}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">{result.reason}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {mismatchItems.length === 0 && (
          <div className="text-center py-4">
            <p className="text-sm text-emerald-600 font-bold">모든 품목이 일치합니다.</p>
          </div>
        )}
      </div>
      <div className="px-8 pb-8 flex-shrink-0 flex gap-3">
        <button
          onClick={onClose}
          className="flex-1 py-3 bg-white text-slate-600 text-sm font-bold rounded-2xl border border-slate-200 hover:bg-slate-50 transition-all"
        >
          취소
        </button>
        <button
          onClick={onApply}
          disabled={isApplying}
          className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isApplying ? '적용 중...' : mismatchItems.length > 0 ? `불일치 ${mismatchItems.length}건 적용` : '확인'}
        </button>
      </div>
    </ModalShell>
  );
};

export default AuditSummaryModal;
