import React from 'react';
import ModalShell from '../shared/ModalShell';

interface DataResetRequestModalProps {
  open: boolean;
  onClose: () => void;
  resetReason: string;
  setResetReason: React.Dispatch<React.SetStateAction<string>>;
  isSubmitting: boolean;
  onSubmit: () => void | Promise<void>;
}

const DataResetRequestModal: React.FC<DataResetRequestModalProps> = ({
  open,
  onClose,
  resetReason,
  setResetReason,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <ModalShell
      isOpen={open}
      onClose={onClose}
      title="데이터 초기화 요청"
      role="alertdialog"
      maxWidth="max-w-md"
    >
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">데이터 초기화 요청</h3>
            <p className="text-xs text-slate-500">관리자 승인 후 초기화가 진행됩니다.</p>
          </div>
        </div>

        <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 mb-4">
          <p className="text-xs text-rose-800 font-semibold mb-2">다음 데이터가 모두 삭제됩니다:</p>
          <ul className="text-xs text-rose-700 space-y-1">
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />재고 마스터 (전체 품목)</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />수술 기록 데이터</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />주문 내역</li>
            <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-rose-400" />작업 로그</li>
          </ul>
          <p className="text-[11px] text-rose-600 mt-2 font-bold">* 회원 정보 및 플랜 설정은 유지됩니다.</p>
        </div>

        <div className="mb-4">
          <label className="text-xs font-bold text-slate-700 mb-1.5 block">초기화 사유</label>
          <textarea
            value={resetReason}
            onChange={(event) => setResetReason(event.target.value)}
            placeholder="초기화를 요청하는 이유를 입력해주세요..."
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300"
            rows={3}
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">
            취소
          </button>
          <button
            onClick={() => void onSubmit()}
            disabled={isSubmitting || !resetReason.trim()}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '요청 중...' : '초기화 요청'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
};

export default DataResetRequestModal;
