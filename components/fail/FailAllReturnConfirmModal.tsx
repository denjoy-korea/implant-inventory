import React from 'react';
import ModalShell from '../shared/ModalShell';

interface FailAllReturnConfirmModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  manufacturers: string[];
  pendingByManufacturerMap: Record<string, number>;
  returnPendingByMfr: Record<string, number>;
  globalPendingFails: number;
  pendingFailCount: number;
  onClose: () => void;
  onSubmit: () => void;
}

const FailAllReturnConfirmModal: React.FC<FailAllReturnConfirmModalProps> = ({
  isOpen,
  isSubmitting,
  manufacturers,
  pendingByManufacturerMap,
  returnPendingByMfr,
  globalPendingFails,
  pendingFailCount,
  onClose,
  onSubmit,
}) => {
  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="일괄 반품 처리"
      titleId="all-return-modal-title"
      maxWidth="max-w-md"
      closeable={!isSubmitting}
      closeOnBackdrop={!isSubmitting}
    >
      <div className="p-6 space-y-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="all-return-modal-title" className="text-base font-black text-slate-800">일괄 반품 처리</h2>
            <p className="text-xs text-slate-500 mt-0.5">미처리 잔여 항목 전체를 제조사별로 반품 주문 등록합니다.</p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-800 font-semibold">
          반품 처리 후 전자장부에서 주문 금액 변동을 확인하세요.
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">반품 처리 대상</p>
          {manufacturers.map((manufacturer) => {
            const count = Math.max(0, (pendingByManufacturerMap[manufacturer] || 0) - (returnPendingByMfr[manufacturer] || 0));
            if (count === 0) return null;
            return (
              <div key={manufacturer} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                <span className="text-sm font-bold text-slate-700">{manufacturer}</span>
                <span className="text-sm font-black text-rose-600 tabular-nums">{count}건</span>
              </div>
            );
          })}
          <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
            <span className="text-sm font-black text-indigo-700">합계</span>
            <span className="text-sm font-black text-indigo-700 tabular-nums">{globalPendingFails}건</span>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-3 text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all"
          >
            취소
          </button>
          <button
            onClick={onSubmit}
            disabled={isSubmitting || pendingFailCount === 0}
            className="flex-1 py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-2xl transition-all active:scale-[0.98]"
          >
            {isSubmitting ? '처리 중...' : '반품 신청하기'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default FailAllReturnConfirmModal;
