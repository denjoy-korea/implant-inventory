import React from 'react';
import { BillingCycle, HospitalPlanState, PLAN_NAMES, PLAN_PRICING, PlanType } from '../../types';

interface UserPlanPickerPanelProps {
  planState?: HospitalPlanState | null;
  pickerCycle: BillingCycle;
  pickerSelectedPlan: PlanType | null;
  onClose: () => void;
  onChangeCycle: (cycle: BillingCycle) => void;
  onSelectPlan: (plan: PlanType | null) => void;
  onRequestPlanChange: () => void;
}

const PLAN_PICKER_ITEMS: {
  plan: PlanType;
  label: string;
  tag?: string;
  features: string[];
}[] = [
  { plan: 'basic', label: 'Basic', features: ['최대 150품목', '1인 사용', '브랜드 분석', '발주 생성·수령'] },
  { plan: 'plus', label: 'Plus', features: ['최대 300품목', '5인 사용', 'FAIL 교환 관리', '발주 최적화'] },
  { plan: 'business', label: 'Business', tag: '추천', features: ['무제한 품목', '최대 10인', 'AI 예측 발주', '감사 로그'] },
];

const UserPlanPickerPanel: React.FC<UserPlanPickerPanelProps> = ({
  planState,
  pickerCycle,
  pickerSelectedPlan,
  onClose,
  onChangeCycle,
  onSelectPlan,
  onRequestPlanChange,
}) => {
  const currentPlanId = planState?.plan ?? 'free';
  const currentItem = PLAN_PICKER_ITEMS.find(i => i.plan === currentPlanId);
  const otherItems = PLAN_PICKER_ITEMS.filter(i => i.plan !== currentPlanId);

  const isCurrentCycle = pickerCycle === (planState?.billingCycle ?? 'monthly');
  const daysLeft = planState?.daysUntilExpiry ?? null;
  const expiresAt = planState?.expiresAt ?? null;

  const expiryLabel = (() => {
    if (!expiresAt) return null;
    if (daysLeft === null) return null;
    if (daysLeft <= 0) return '만료됨';
    if (daysLeft === 0) return 'D-day';
    return `D-${daysLeft}`;
  })();

  const expiryColor = daysLeft !== null && daysLeft <= 7
    ? 'text-red-500'
    : daysLeft !== null && daysLeft <= 30
      ? 'text-amber-500'
      : 'text-indigo-500';

  // 동일 플랜 선택 여부
  const isSamePlanSelected = pickerSelectedPlan === currentPlanId;
  // 갱신: 동일 플랜 + 동일 사이클
  const isRenewalSelected = isSamePlanSelected && isCurrentCycle;
  // 사이클 전환: 동일 플랜 + 다른 사이클 (월간→연간 또는 연간→월간)
  const isCycleSwitch = isSamePlanSelected && !isCurrentCycle;

  // 만료 임박 강조 스타일
  const urgencyStyle = (() => {
    if (daysLeft !== null && daysLeft <= 7)  return { border: 'border-red-400',   bg: 'from-red-50',   badge: 'bg-red-100 text-red-700' };
    if (daysLeft !== null && daysLeft <= 30) return { border: 'border-amber-400', bg: 'from-amber-50', badge: 'bg-amber-100 text-amber-700' };
    return { border: 'border-indigo-400', bg: 'from-indigo-50', badge: 'bg-indigo-100 text-indigo-700' };
  })();

  return (
    <div className="space-y-2.5">
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h4 className="text-xs font-bold text-slate-700">플랜 선택</h4>
      </div>

      {/* 현재 구독 카드 (상단 가로형) */}
      {currentItem && currentPlanId !== 'free' && (
        <button
          onClick={() => onSelectPlan(pickerSelectedPlan === currentPlanId ? null : currentPlanId)}
          className={`w-full text-left rounded-xl border-2 transition-all overflow-hidden ${
            pickerSelectedPlan === currentPlanId
              ? `${urgencyStyle.border} bg-indigo-50/50 shadow-sm`
              : `${urgencyStyle.border} bg-gradient-to-r ${urgencyStyle.bg} to-white hover:shadow-sm`
          }`}
        >
          <div className="flex items-stretch">
            {/* 왼쪽: 플랜 정보 */}
            <div className="flex-1 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-black text-slate-800">{currentItem.label}</span>
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${urgencyStyle.badge}`}>현재 · 갱신</span>
              </div>
              <ul className="space-y-0.5">
                {currentItem.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-1 text-[10px] text-slate-500">
                    <svg className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* 오른쪽: 구독 정보 */}
            <div className="flex flex-col items-center justify-center px-3 border-l border-indigo-100 bg-indigo-50/60 min-w-[72px] gap-0.5">
              <p className="text-[10px] font-bold text-slate-700">
                {(pickerCycle === 'yearly'
                  ? PLAN_PRICING[currentPlanId].yearlyPrice
                  : PLAN_PRICING[currentPlanId].monthlyPrice
                ).toLocaleString('ko-KR')}
                <span className="font-normal text-slate-400">원</span>
              </p>
              <p className="text-[9px] text-slate-400">{planState?.billingCycle === 'yearly' ? '연간' : '월간'}</p>
              {expiryLabel && (
                <p className={`text-[11px] font-black mt-1 ${expiryColor}`}>{expiryLabel}</p>
              )}
              {expiresAt && (
                <p className="text-[9px] text-slate-400 text-center leading-tight">
                  {new Date(expiresAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })} 만료
                </p>
              )}
              {daysLeft !== null && daysLeft <= 30 && daysLeft > 0 && (
                <p className={`text-[9px] font-bold mt-0.5 text-center ${daysLeft <= 7 ? 'text-red-500' : 'text-amber-600'}`}>
                  {daysLeft <= 7 ? '곧 만료!' : '갱신 권장'}
                </p>
              )}
            </div>
          </div>
        </button>
      )}

      {/* 월간 / 연간 토글 */}
      <div className="flex items-center justify-center">
        <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
          <button onClick={() => onChangeCycle('monthly')} className={`px-4 py-1 rounded-lg text-xs font-bold transition-all ${pickerCycle === 'monthly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>월간</button>
          <button onClick={() => onChangeCycle('yearly')} className={`flex items-center gap-1.5 px-4 py-1 rounded-lg text-xs font-bold transition-all ${pickerCycle === 'yearly' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}>
            연간
            <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">-20%</span>
          </button>
        </div>
      </div>

      {/* 다른 플랜 카드들 */}
      <div className={`grid gap-2 ${otherItems.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {otherItems.map(({ plan, label, tag, features }) => {
          const isSelected = pickerSelectedPlan === plan;
          const price = pickerCycle === 'yearly' ? PLAN_PRICING[plan].yearlyPrice : PLAN_PRICING[plan].monthlyPrice;
          return (
            <button
              key={plan}
              onClick={() => onSelectPlan(isSelected ? null : plan)}
              className={`relative text-left p-2.5 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                  : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              {tag && (
                <span className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${tag === '추천' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{tag}</span>
              )}
              <p className="text-xs font-black text-slate-800 mb-0.5">{label}</p>
              <p className="text-[10px] font-bold text-slate-700 mb-1">
                {price.toLocaleString('ko-KR')}
                <span className="font-normal text-slate-400">원/월</span>
              </p>
              <ul className="space-y-0.5">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-1 text-[10px] text-slate-500">
                    <svg className="w-2.5 h-2.5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>

      {/* 신청 버튼 영역 */}
      {pickerSelectedPlan ? (
        <div>
          <button
            onClick={onRequestPlanChange}
            className={`w-full py-2 rounded-xl font-bold text-xs transition-colors ${
              pickerSelectedPlan === 'free'
                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isRenewalSelected
              ? `${PLAN_NAMES[pickerSelectedPlan!]} 플랜 갱신하기`
              : isCycleSwitch
                ? pickerCycle === 'yearly'
                  ? `${PLAN_NAMES[pickerSelectedPlan!]} 플랜 연간으로 전환하기`
                  : `${PLAN_NAMES[pickerSelectedPlan!]} 플랜 월간으로 전환하기`
                : pickerSelectedPlan === 'free'
                  ? '무료 플랜으로 전환하기'
                  : `${PLAN_NAMES[pickerSelectedPlan!]} 플랜으로 변경하기`}
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 text-center">변경할 플랜을 선택해 주세요</p>
      )}

      {/* 무료 플랜 전환 */}
      {currentPlanId !== 'free' && pickerSelectedPlan !== 'free' && (
        <div className="pt-1 border-t border-slate-100">
          <button
            onClick={() => onSelectPlan('free')}
            className="w-full py-1.5 text-[10px] text-slate-400 hover:text-slate-600 transition-colors text-center"
          >
            무료 플랜으로 전환 →
          </button>
        </div>
      )}
    </div>
  );
};

export default UserPlanPickerPanel;
