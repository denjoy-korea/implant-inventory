import React from 'react';
import { PlanType, BillingCycle, PlanFeature, PLAN_NAMES, PLAN_PRICING, PLAN_ORDER, PLAN_LIMITS } from '../types';
import { useEscapeKey } from '../hooks/useEscapeKey';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  requiredPlan: PlanType;
  triggerMessage: string;
  feature?: PlanFeature;
  onSelectPlan: (plan: PlanType, billing: BillingCycle) => void;
}

const formatPrice = (price: number) => price.toLocaleString('ko-KR');

/** 기능별 비용 절감 힌트 */
const FEATURE_SAVINGS: Partial<Record<PlanFeature, { label: string; saving: string }>> = {
  fail_management: {
    label: '교환 실수 1건 방지',
    saving: '임플란트 재주문 비용 30~50만원 절약',
  },
  order_execution: {
    label: '긴급 발주 마진 절감',
    saving: '월 5~10만원 이상 비용 절감',
  },
  inventory_audit: {
    label: '재고 오차 제로화',
    saving: '불필요한 중복 주문 비용 절감',
  },
  brand_analytics: {
    label: '최적 제조사 선택',
    saving: '교환율 낮은 브랜드로 전환 가능',
  },
  monthly_report: {
    label: '월간 경영 인사이트',
    saving: '제조사 협상·원가 관리에 활용',
  },
};

const UpgradeModal: React.FC<UpgradeModalProps> = ({
  isOpen,
  onClose,
  currentPlan,
  requiredPlan,
  triggerMessage,
  feature,
  onSelectPlan,
}) => {
  useEscapeKey(onClose, isOpen);

  if (!isOpen) return null;

  const upgradePlans: PlanType[] = ['basic', 'plus', 'business'];
  const savings = feature ? FEATURE_SAVINGS[feature] : undefined;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="upgrade-modal-title"
        className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-fade-in-up"
      >
        {/* Header */}
        <div className="text-center mb-5">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
          <h3 id="upgrade-modal-title" className="text-lg font-bold text-slate-900">업그레이드가 필요합니다</h3>
          <p className="text-sm text-slate-500 mt-1">{triggerMessage}</p>
        </div>

        {/* 비용 절감 힌트 (R-08) */}
        {savings && (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-5">
            <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xs font-black text-emerald-800">{savings.label}</p>
              <p className="text-[11px] text-emerald-700 font-semibold mt-0.5">{savings.saving}</p>
            </div>
          </div>
        )}

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
