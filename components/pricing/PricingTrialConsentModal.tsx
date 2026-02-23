import React, { useEffect, useRef } from 'react';
import { PlanType } from '../../types';
import {
  SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT,
  TRIAL_CONSENT_HELP_TEXT,
  TRIAL_CONSENT_LABEL_TEXT,
  TRIAL_DATA_DELETION_POLICY_TEXT,
  TRIAL_NO_CARD_REQUIRED_TEXT,
  TRIAL_START_BUTTON_TEXT,
  TRIAL_START_TITLE_TEXT,
} from '../../utils/trialPolicy';
import LegalModal from '../shared/LegalModal';

interface TrialConsentPlan {
  key: PlanType;
  name: string;
}

interface PricingTrialConsentModalProps {
  plan: TrialConsentPlan | null;
  consented: boolean;
  onToggleConsented: (next: boolean) => void;
  onClose: () => void;
  onConfirm: (planKey: PlanType) => void;
}

const PricingTrialConsentModal: React.FC<PricingTrialConsentModalProps> = ({
  plan,
  consented,
  onToggleConsented,
  onClose,
  onConfirm,
}) => {
  const [showTerms, setShowTerms] = React.useState(false);
  const [showPrivacy, setShowPrivacy] = React.useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

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

    window.setTimeout(() => {
      getFocusable()[0]?.focus();
    }, 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (showTerms || showPrivacy) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
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
  }, [onClose, plan, showPrivacy, showTerms]);

  if (!plan) return null;

  return (
    <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-consent-title"
        aria-describedby="trial-consent-desc"
        className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">{plan.name}</span>
                <span className="text-indigo-200 text-xs">플랜</span>
              </div>
              <h3 id="trial-consent-title" className="text-lg font-bold">{TRIAL_START_TITLE_TEXT}</h3>
              <p id="trial-consent-desc" className="text-indigo-200 text-sm mt-0.5">{TRIAL_NO_CARD_REQUIRED_TEXT}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="무료 체험 동의 모달 닫기"
              className="text-indigo-200 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { icon: '💳', text: '카드 등록\n불필요' },
              { icon: '🔓', text: '약정·위약금\n없음' },
              { icon: '💾', text: '구독 시\n데이터 유지' },
            ].map((item, i) => (
              <div key={i} className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                <div className="text-lg mb-1">{item.icon}</div>
                <p className="text-xs font-bold text-emerald-700 whitespace-pre-line leading-snug">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-xs text-amber-700 leading-relaxed">
              {TRIAL_DATA_DELETION_POLICY_TEXT}
            </p>
          </div>
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 leading-relaxed">
            {SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT}
          </p>

          <div className="px-3">
            <label className="flex items-center gap-3 cursor-pointer group py-2 rounded-xl hover:bg-slate-50 transition-colors">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => onToggleConsented(e.target.checked)}
                className="w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0"
              />
              <span className="text-sm text-slate-700">{TRIAL_CONSENT_LABEL_TEXT}</span>
            </label>
            {!consented && (
              <p className="text-xs text-rose-500 mt-1 ml-7">{TRIAL_CONSENT_HELP_TEXT}</p>
            )}
            <div className="mt-1.5 ml-7 flex items-center gap-2 text-[11px] text-slate-400">
              <span>제공하신 정보는 서비스 운영 목적으로만 사용됩니다.</span>
              <button type="button" onClick={() => setShowTerms(true)} className="text-indigo-600 hover:underline">약관</button>
              <span className="text-slate-300">·</span>
              <button type="button" onClick={() => setShowPrivacy(true)} className="text-indigo-600 hover:underline">개인정보</button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
            <button
              disabled={!consented}
              onClick={() => {
                if (!consented) return;
                onConfirm(plan.key);
              }}
              className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all ${
                consented
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              {TRIAL_START_BUTTON_TEXT} →
            </button>
          </div>
        </div>
      </div>
      {showTerms && <LegalModal type="terms" onClose={() => setShowTerms(false)} />}
      {showPrivacy && <LegalModal type="privacy" onClose={() => setShowPrivacy(false)} />}
    </div>
  );
};

export default PricingTrialConsentModal;
