import React, { useState } from 'react';
import { Toast } from '../../hooks/useToast';
import ConfirmModal from '../ConfirmModal';
import InventoryCompareModal, { CompareItem } from '../InventoryCompareModal';
import PwaUpdateBar from '../shared/PwaUpdateBar';
import { BillingCycle, PlanType, PLAN_PRICING, PLAN_LIMITS } from '../../types/plan';

interface PlanLimitModalState {
  currentCount: number;
  newCount: number;
  maxItems: number;
}

interface ConfirmModalState {
  title: string;
  message: string;
  tip?: string;
  confirmLabel?: string;
  confirmColor?: 'indigo' | 'rose' | 'amber' | 'emerald';
  icon?: React.ReactNode;
  onConfirm: () => void;
}

interface InventoryCompareState {
  duplicates: CompareItem[];
  newItems: CompareItem[];
}

interface PwaUpdateBarState {
  isVisible: boolean;
  isForceUpdate: boolean;
  message: string;
  isApplying: boolean;
  onApply: () => void;
  onLater: () => void;
}

export interface AppGlobalOverlaysProps {
  planLimitModal: PlanLimitModalState | null;
  confirmModal: ConfirmModalState | null;
  inventoryCompare: InventoryCompareState | null;
  pwaUpdateBar: PwaUpdateBarState;
  alertToast: Toast | null;
  showMobileDashboardNav: boolean;
  showMobilePublicNav: boolean;
  onClosePlanLimitModal: () => void;
  onUpgradePlan: (plan: PlanType, billing: BillingCycle) => void;
  onCloseConfirmModal: () => void;
  onConfirmInventoryCompare: () => void;
  onCancelInventoryCompare: () => void;
}

const UPGRADE_PLANS: { plan: PlanType; label: string; color: string }[] = [
  { plan: 'basic',    label: 'Basic',    color: 'indigo' },
  { plan: 'plus',     label: 'Plus',     color: 'violet' },
  { plan: 'business', label: 'Business', color: 'slate'  },
];

function getMinPlanForItems(totalItems: number): PlanType {
  for (const { plan } of UPGRADE_PLANS) {
    if (PLAN_LIMITS[plan].maxItems >= totalItems) return plan;
  }
  return 'business';
}

const AppGlobalOverlays: React.FC<AppGlobalOverlaysProps> = ({
  planLimitModal,
  confirmModal,
  inventoryCompare,
  pwaUpdateBar,
  alertToast,
  showMobileDashboardNav,
  showMobilePublicNav,
  onClosePlanLimitModal,
  onUpgradePlan,
  onCloseConfirmModal,
  onConfirmInventoryCompare,
  onCancelInventoryCompare,
}) => {
  const [upgradeStep, setUpgradeStep] = useState<'limit' | 'select'>('limit');
  const [selectedPlan, setSelectedPlan] = useState<PlanType>('basic');
  const [isYearly, setIsYearly] = useState(false);

  const handleClosePlanLimit = () => {
    setUpgradeStep('limit');
    setSelectedPlan('basic');
    setIsYearly(false);
    onClosePlanLimitModal();
  };

  const shouldLiftToastForBottomNav = showMobileDashboardNav || showMobilePublicNav;
  const toastBottomOffset = pwaUpdateBar.isVisible
    ? shouldLiftToastForBottomNav
      ? 'calc(10.8rem + env(safe-area-inset-bottom))'
      : 'calc(6.4rem + env(safe-area-inset-bottom))'
    : shouldLiftToastForBottomNav
      ? 'calc(5.5rem + env(safe-area-inset-bottom))'
      : null;

  return (
    <>
      {planLimitModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={handleClosePlanLimit}>
          <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>

            {upgradeStep === 'limit' && (
              <>
                <div className="p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">품목 수 제한 초과</h3>
                  <p className="text-sm text-slate-500 mb-6">현재 플랜의 최대 품목 수를 초과하여<br />재고 마스터에 반영할 수 없습니다.</p>

                  <div className="w-full bg-slate-50 rounded-2xl p-5 space-y-3 mb-6">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">현재 등록</span>
                      <span className="text-sm font-black text-slate-700">{planLimitModal.currentCount}개</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">추가 대상</span>
                      <span className="text-sm font-black text-indigo-600">+{planLimitModal.newCount}개</span>
                    </div>
                    <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400">플랜 최대</span>
                      <span className="text-sm font-black text-rose-500">{planLimitModal.maxItems}개</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mb-6">플랜을 업그레이드하거나, 기존 품목을 정리한 후 다시 시도해주세요.</p>
                </div>
                <div className="px-8 pb-8 flex gap-3">
                  <button
                    onClick={handleClosePlanLimit}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                  >
                    닫기
                  </button>
                  <button
                    onClick={() => {
                      const total = planLimitModal.currentCount + planLimitModal.newCount;
                      setSelectedPlan(getMinPlanForItems(total));
                      setUpgradeStep('select');
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    플랜 업그레이드
                  </button>
                </div>
              </>
            )}

            {upgradeStep === 'select' && (
              <>
                <div className="p-8">
                  <button
                    onClick={() => setUpgradeStep('limit')}
                    className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600 mb-5 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    뒤로
                  </button>
                  <h3 className="text-xl font-black text-slate-900 mb-1">플랜 선택</h3>
                  <p className="text-sm text-slate-500 mb-5">업그레이드할 플랜과 결제 주기를 선택하세요.</p>

                  {/* 월/연간 세그먼트 탭 */}
                  <div className="flex bg-slate-100 rounded-2xl p-1 mb-5">
                    <button
                      onClick={() => setIsYearly(false)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${!isYearly ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      월간
                    </button>
                    <button
                      onClick={() => setIsYearly(true)}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${isYearly ? 'bg-white shadow-sm text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      연간
                      <span className={`text-xs font-black px-1.5 py-0.5 rounded-lg transition-colors ${isYearly ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-200'}`}>-22%</span>
                    </button>
                  </div>

                  {/* 플랜 카드 */}
                  <div className="space-y-3 mb-6">
                    {UPGRADE_PLANS.map(({ plan, label }) => {
                      const pricing = PLAN_PRICING[plan];
                      const monthlyVat = Math.floor((pricing.monthlyPrice + Math.round(pricing.monthlyPrice * 0.1)) / 1000) * 1000;
                      const yearlyVat  = Math.floor((pricing.yearlyPrice  + Math.round(pricing.yearlyPrice  * 0.1)) / 1000) * 1000;
                      const annualTotal   = yearlyVat * 12;
                      const annualSavings = (monthlyVat - yearlyVat) * 12;
                      const displayPrice  = isYearly ? yearlyVat : monthlyVat;
                      const isSelected    = selectedPlan === plan;
                      const maxItems      = PLAN_LIMITS[plan].maxItems;
                      const itemsLabel    = maxItems === Infinity ? '무제한' : `${maxItems.toLocaleString()}개`;
                      return (
                        <button
                          key={plan}
                          onClick={() => setSelectedPlan(plan)}
                          className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all text-left ${
                            isSelected ? 'border-indigo-500 bg-indigo-50' : 'border-slate-200 bg-white hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${isSelected ? 'border-indigo-500' : 'border-slate-300'}`}>
                              {isSelected && <div className="w-2 h-2 bg-indigo-500 rounded-full" />}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-black text-slate-800">{label}</div>
                              <div className="text-xs text-slate-400">품목 최대 {itemsLabel}</div>
                              <div className={`text-xs font-bold text-emerald-600 mt-0.5 ${isYearly ? '' : 'invisible'}`}>
                                월간 대비 연 {annualSavings.toLocaleString()}원 절감
                              </div>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-3">
                            <div className="text-base font-black text-slate-800">{displayPrice.toLocaleString()}원</div>
                            <div className="text-xs text-slate-400">/월 (VAT 포함)</div>
                            <div className={`text-xs text-slate-400 ${isYearly ? '' : 'invisible'}`}>연 {annualTotal.toLocaleString()}원 청구</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="px-8 pb-8 flex gap-3">
                  <button
                    onClick={handleClosePlanLimit}
                    className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
                  >
                    취소
                  </button>
                  <button
                    onClick={() => {
                      handleClosePlanLimit();
                      onUpgradePlan(selectedPlan, isYearly ? 'yearly' : 'monthly');
                    }}
                    className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
                  >
                    결제하기
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          tip={confirmModal.tip}
          confirmLabel={confirmModal.confirmLabel}
          confirmColor={confirmModal.confirmColor}
          icon={confirmModal.icon}
          onConfirm={confirmModal.onConfirm}
          onCancel={onCloseConfirmModal}
        />
      )}

      {inventoryCompare && (
        <InventoryCompareModal
          duplicates={inventoryCompare.duplicates}
          newItems={inventoryCompare.newItems}
          onConfirm={onConfirmInventoryCompare}
          onCancel={onCancelInventoryCompare}
        />
      )}

      {pwaUpdateBar.isVisible && (
        <PwaUpdateBar
          forceUpdate={pwaUpdateBar.isForceUpdate}
          message={pwaUpdateBar.message}
          isApplying={pwaUpdateBar.isApplying}
          liftForBottomNav={shouldLiftToastForBottomNav}
          onApply={pwaUpdateBar.onApply}
          onLater={pwaUpdateBar.onLater}
        />
      )}

      {alertToast && (
        <div
          style={toastBottomOffset ? { bottom: toastBottomOffset } : undefined}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-xl shadow-lg text-sm font-bold flex items-center gap-2 animate-in slide-in-from-bottom-4 duration-300 ${alertToast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'
            }`}
        >
          {alertToast.type === 'success' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          )}
          {alertToast.message}
        </div>
      )}
    </>
  );
};

export default AppGlobalOverlays;
