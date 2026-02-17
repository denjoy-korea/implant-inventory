import React, { useState } from 'react';
import { PlanType, PlanFeature, PLAN_NAMES } from '../types';
import { planService } from '../services/planService';
import UpgradeModal from './UpgradeModal';

interface FeatureGateProps {
  feature: PlanFeature;
  plan: PlanType;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const FeatureGate: React.FC<FeatureGateProps> = ({ feature, plan, children, fallback }) => {
  const [showModal, setShowModal] = useState(false);

  if (planService.canAccess(plan, feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const requiredPlan = planService.getRequiredPlan(feature);

  return (
    <>
      <div className="relative">
        <div className="pointer-events-none opacity-30 blur-[2px] select-none">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/60 backdrop-blur-sm rounded-2xl">
          <div className="text-center space-y-3 p-6">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-700">
              이 기능은 {PLAN_NAMES[requiredPlan]} 이상에서 사용할 수 있습니다
            </p>
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              플랜 업그레이드
            </button>
          </div>
        </div>
      </div>
      <UpgradeModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        currentPlan={plan}
        requiredPlan={requiredPlan}
        triggerMessage={`이 기능은 ${PLAN_NAMES[requiredPlan]} 이상에서 사용 가능합니다`}
        onSelectPlan={() => setShowModal(false)}
      />
    </>
  );
};

export default FeatureGate;
