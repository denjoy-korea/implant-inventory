import React from 'react';
import { PlanType, BillingCycle, PLAN_NAMES, PLAN_PRICING, PLAN_ORDER, PLAN_LIMITS } from '../types';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  requiredPlan: PlanType;
  triggerMessage: string;
  onSelectPlan: (plan: PlanType, billing: BillingCycle) => void;
}

const formatPrice = (price: number) => price.toLocaleString('ko-KR');

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  requiredPlan,
  triggerMessage,
  onSelectPlan,
}) => {
  if (!isOpen) return null;

  const upgradePlans: PlanType[] = ['basic', 'plus', 'business'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-fade-in-up">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-slate-900">업그레이드가 필요합니다</h3>
          <p className="text-sm text-slate-500 mt-1">{triggerMessage}</p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {upgradePlans.map((plan) => {
            const isRequired = PLAN_ORDER[plan] >= PLAN_ORDER[requiredPlan];
            const isCurrent = plan === currentPlan;
            const isRecommended = plan === 'plus';

            return (
              <div
                key={plan}
                className={`relative rounded-xl p-4 text-center transition-all ${
                  isRecommended
                    ? 'bg-indigo-50 border-2 border-indigo-300 shadow-md'
                    : isRequired
                      ? 'bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-sm'
                      : 'bg-slate-50 border border-slate-100 opacity-50'
                }`}
              >
                {isRecommended && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-amber-400 text-amber-900 text-[10px] font-black px-2.5 py-0.5 rounded-full">
                    추천
                  </span>
                )}
                <p className={`text-sm font-bold mb-1 ${isRecommended ? 'text-indigo-700' : 'text-slate-700'}`}>
                  {PLAN_NAMES[plan]}
                </p>
                <p className={`text-lg font-black mb-0.5 ${isRecommended ? 'text-indigo-600' : 'text-slate-900'}`}>
                  {formatPrice(PLAN_PRICING[plan].monthlyPrice)}
                </p>
                <p className="text-[10px] text-slate-400 mb-3">원/월</p>
                <p className="text-[10px] text-slate-500 mb-3">
                  품목 {PLAN_LIMITS[plan].maxItems === Infinity ? '무제한' : `${PLAN_LIMITS[plan].maxItems}개`}
                  {' / '}
                  {PLAN_LIMITS[plan].maxUsers === Infinity ? '무제한' : `${PLAN_LIMITS[plan].maxUsers}명`}
                </p>
                {isCurrent ? (
                  <span className="inline-block px-3 py-1.5 text-[11px] font-bold text-slate-400 bg-slate-100 rounded-lg">
                    현재 플랜
                  </span>
                ) : isRequired ? (
                  <button
                    onClick={() => onSelectPlan(plan, 'monthly')}
                    className={`w-full px-3 py-1.5 text-[11px] font-bold rounded-lg transition-colors ${
                      isRecommended
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                    }`}
                  >
                    선택
                  </button>
                ) : (
                  <span className="inline-block px-3 py-1.5 text-[11px] font-bold text-slate-300 bg-slate-50 rounded-lg">
                    선택 불가
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            현재 플랜: <span className="font-bold text-slate-600">{PLAN_NAMES[currentPlan]}</span>
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpgradeModal;
