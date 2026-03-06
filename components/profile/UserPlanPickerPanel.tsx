import React from 'react';
import { BillingCycle, HospitalPlanState, PLAN_NAMES, PlanType } from '../../types';

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
  monthlyPrice: number;
  yearlyPrice: number;
  tag?: string;
  features: string[];
}[] = [
  { plan: 'basic', label: 'Basic', monthlyPrice: 29000, yearlyPrice: 23000, features: ['최대 200품목', '1인 사용', 'FAIL 교환 관리', '발주 생성·수령'] },
  { plan: 'plus', label: 'Plus', monthlyPrice: 69000, yearlyPrice: 55000, features: ['최대 500품목', '5인 사용', '브랜드 분석', '발주 최적화'] },
  { plan: 'business', label: 'Business', monthlyPrice: 129000, yearlyPrice: 103000, tag: '추천', features: ['무제한 품목', '무제한 인원', 'AI 예측 발주', '우선 지원'] },
  { plan: 'ultimate', label: 'Ultimate', monthlyPrice: 0, yearlyPrice: 0, tag: '별도 문의', features: ['Business 전체', '감사 로그', '장기 보관', '전담 담당자'] },
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

      {/* 플랜 카드 2x2 */}
      <div className="grid grid-cols-2 gap-2">
        {PLAN_PICKER_ITEMS.map(({ plan, label, monthlyPrice, yearlyPrice, tag, features }) => {
          const isCurrent = planState?.plan === plan;
          const isSelected = pickerSelectedPlan === plan;
          const price = pickerCycle === 'yearly' ? yearlyPrice : monthlyPrice;
          const isUltimateItem = plan === 'ultimate';
          return (
            <button
              key={plan}
              onClick={() => !isCurrent && onSelectPlan(isSelected ? null : plan)}
              disabled={isCurrent}
              className={`relative text-left p-2.5 rounded-xl border-2 transition-all ${
                isCurrent
                  ? 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
                  : isSelected
                    ? 'border-indigo-500 bg-indigo-50/50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-indigo-300'
              }`}
            >
              {tag && !isCurrent && (
                <span className={`absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full ${tag === '추천' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'}`}>{tag}</span>
              )}
              {isCurrent && (
                <span className="absolute top-1.5 right-1.5 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-500">현재</span>
              )}
              <p className="text-xs font-black text-slate-800 mb-0.5">{label}</p>
              {isUltimateItem ? (
                <p className="text-[10px] text-slate-400 font-medium mb-1">별도 문의</p>
              ) : (
                <p className="text-[10px] font-bold text-slate-700 mb-1">
                  {price.toLocaleString('ko-KR')}
                  <span className="font-normal text-slate-400">원/월</span>
                </p>
              )}
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
            className="w-full py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors"
          >
            {`${PLAN_NAMES[pickerSelectedPlan]} 플랜 결제하기`}
          </button>
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 text-center">변경할 플랜을 선택해 주세요</p>
      )}
    </div>
  );
};

export default UserPlanPickerPanel;
