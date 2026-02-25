import React, { useEffect, useRef, useState } from 'react';
import LegalModal from '../shared/LegalModal';

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
  const [agreedToContactPolicy, setAgreedToContactPolicy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAgreedToContactPolicy(false);
  }, [plan?.key]);

  useEffect(() => {
    if (!plan) return;
    const previousFocused = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const getFocusable = (): HTMLElement[] =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    window.setTimeout(() => getFocusable()[0]?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (showTerms || showPrivacy) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!submitting) onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocused?.focus();
    };
  }, [onClose, plan, showPrivacy, showTerms, submitting]);

  if (!plan) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={() => !submitting && onClose()}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pricing-waitlist-title"
        aria-describedby="pricing-waitlist-desc"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-5 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{plan.name}</span>
                <span className="text-slate-300 text-xs">플랜</span>
              </div>
              <h3 id="pricing-waitlist-title" className="text-lg font-bold">대기 신청</h3>
              <p id="pricing-waitlist-desc" className="text-slate-300 text-sm mt-0.5">자리가 나면 가장 먼저 연락드릴게요</p>
            </div>
            <button type="button" onClick={() => !submitting && onClose()} aria-label="대기 신청 모달 닫기" className="text-slate-400 hover:text-white transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label htmlFor="pricing-waitlist-name" className="block text-xs font-bold text-slate-500 mb-1.5">이름 *</label>
            <input
              id="pricing-waitlist-name"
              type="text"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="홍길동"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              disabled={submitting}
            />
          </div>
          <div>
            <label htmlFor="pricing-waitlist-email" className="block text-xs font-bold text-slate-500 mb-1.5">이메일 *</label>
            <input
              id="pricing-waitlist-email"
              type="email"
              value={email}
              onChange={(e) => onEmailChange(e.target.value)}
              placeholder="example@clinic.com"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              disabled={submitting}
            />
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedToContactPolicy}
                onChange={(event) => setAgreedToContactPolicy(event.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-slate-900 flex-shrink-0"
              />
              <span className="text-[11px] text-slate-500 leading-relaxed">
                제공하신 정보는 대기 순번 안내 연락 목적으로만 사용됩니다.
              </span>
            </label>
            <div className="mt-1.5 ml-6 flex items-center gap-2 text-[11px]">
              <button type="button" onClick={() => setShowTerms(true)} className="text-indigo-600 hover:underline">이용약관</button>
              <span className="text-slate-300">·</span>
              <button type="button" onClick={() => setShowPrivacy(true)} className="text-indigo-600 hover:underline">개인정보처리방침</button>
            </div>
            <p className="mt-1 ml-6 text-[11px] text-slate-500 leading-relaxed">
              서비스 안정성 및 보안 패치를 위한 앱 업데이트 고지가 포함될 수 있습니다.
            </p>
          </div>
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
              disabled={submitting || !name.trim() || !email.trim() || !agreedToContactPolicy}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all bg-slate-900 text-white hover:bg-slate-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
            >
              {submitting ? '신청 중...' : '대기 신청하기'}
            </button>
          </div>
        </div>
      </div>
      {showTerms && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
      {showPrivacy && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};

export default PricingWaitlistModal;
