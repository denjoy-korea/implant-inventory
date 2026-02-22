import React from 'react';

interface WaitlistPlan {
  key: string;
  name: string;
}

interface PricingWaitlistModalProps {
  plan: WaitlistPlan | null;
  name: string;
  email: string;
  submitting: boolean;
  onClose: () => void;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: () => void;
}

const PricingWaitlistModal: React.FC<PricingWaitlistModalProps> = ({
  plan,
  name,
  email,
  submitting,
  onClose,
  onNameChange,
  onEmailChange,
  onSubmit,
}) => {
  if (!plan) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{plan.name}</span>
                <span className="text-slate-300 text-xs">플랜</span>
              </div>
              <h3 className="text-lg font-bold">대기 신청</h3>
              <p className="text-slate-300 text-sm mt-0.5">자리가 나면 가장 먼저 연락드릴게요</p>
            </div>
            <button onClick={() => !submitting && onClose()} className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">이름 *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              disabled={submitting}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 mb-1.5">이메일 *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="example@clinic.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              disabled={submitting}
            />
          </div>
          <p className="text-[11px] text-slate-400">제공하신 정보는 대기 순번 연락 목적으로만 사용됩니다.</p>
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => !submitting && onClose()}
              disabled={submitting}
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={submitting || !name.trim() || !email.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
            >
              {submitting ? '신청 중...' : '대기 신청하기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingWaitlistModal;
