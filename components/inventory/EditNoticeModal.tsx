import React from 'react';

interface EditNoticeModalProps {
  onClose: () => void;
  onConfirm: () => void;
  isUnlimited: boolean;
  maxEdits: number;
  editCount: number;
}

const EditNoticeModal: React.FC<EditNoticeModalProps> = ({ onClose, onConfirm, isUnlimited, maxEdits, editCount }) => {
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-8 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
            <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
          </div>
          <h3 className="text-lg font-black text-slate-900 mb-2">기초 재고 편집 안내</h3>
          <div className="w-full mt-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <p className="text-sm font-bold text-amber-700 text-balance">최초 1회만 사용을 권장합니다</p>
            <p className="text-xs text-amber-600 mt-1 leading-relaxed text-balance">시스템 도입 시 기초 재고를 일괄 등록하는 용도입니다.</p>
          </div>
          <p className="w-full mt-4 text-sm text-slate-500 leading-relaxed text-balance">이후 재고는 <span className="font-bold text-slate-700">현재 재고</span>를 기준으로 관리되며, <span className="font-bold text-slate-700">주문(발주 입고)</span>과 <span className="font-bold text-slate-700">재고 실사</span>를 통해 정확한 현재 재고를 유지하세요.</p>
          <div className="mt-4 px-4 py-2 bg-slate-50 rounded-xl">
            <span className="text-xs font-bold text-slate-400">남은 편집 횟수: <span className="text-indigo-600">{isUnlimited ? '무제한' : `${maxEdits - editCount}회`}</span></span>
          </div>
        </div>
        <div className="px-8 pb-8 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
          >
            편집 시작
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditNoticeModal;
