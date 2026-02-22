import React from 'react';
import { PlanType, PLAN_NAMES } from '../../types';
import { SIGNUP_PLANS } from './authSignupConfig';

interface WaitlistPlan {
  key: string;
  name: string;
}

interface AuthSignupPlanSelectProps {
  planAvailability: Record<string, boolean>;
  pendingTrialPlan: PlanType | null;
  trialConsented: boolean;
  onSelectPlanWithoutTrial: () => void;
  onSelectTrialPlan: (plan: PlanType) => void;
  onChangeTrialConsented: (next: boolean) => void;
  onContinueAfterTrialConsent: () => void;
  onSwitchToLogin: () => void;
  onRequestWaitlist: (plan: WaitlistPlan) => void;
}

const AuthSignupPlanSelect: React.FC<AuthSignupPlanSelectProps> = ({
  planAvailability,
  pendingTrialPlan,
  trialConsented,
  onSelectPlanWithoutTrial,
  onSelectTrialPlan,
  onChangeTrialConsented,
  onContinueAfterTrialConsent,
  onSwitchToLogin,
  onRequestWaitlist,
}) => {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50/50">
      <div className="w-full max-w-[900px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5">
        {/* Left Panel */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 p-8 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-[-50%] right-[-50%] w-[200%] h-[200%] bg-[radial-gradient(circle,rgba(99,102,241,0.4)_0%,transparent_60%)]" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-9 h-9 rounded-lg bg-indigo-500 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
              </div>
              <span className="text-lg font-bold tracking-tight">DenJOY</span>
            </div>
            <h2 className="text-[22px] font-bold leading-snug mb-3">
              14일 무료 체험으로<br />부담 없이 시작하세요.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed">
              카드 정보 없이도<br />체험 가능합니다.
            </p>
          </div>
          <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
            <p className="text-xs text-slate-500">언제든지 플랜 변경 가능</p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="md:col-span-3 p-8 flex flex-col">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-900">플랜 선택</h2>
            <p className="text-sm text-slate-400 mt-1">원하시는 플랜을 선택해주세요. 언제든 변경할 수 있습니다.</p>
          </div>
          <div className="space-y-2.5 flex-1">
            {SIGNUP_PLANS.map(plan => {
              const isSoldOut = planAvailability[plan.key] === false;
              return isSoldOut ? (
                <div key={plan.key} className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 px-4 py-3.5 flex items-center gap-4 opacity-70">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-bold text-slate-400">{plan.label}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-rose-500 text-white">품절</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      현재 가입 불가 · <button type="button" onClick={(e) => { e.stopPropagation(); onRequestWaitlist({ key: plan.key, name: plan.label }); }} className="text-indigo-400 font-bold hover:underline">대기 신청</button>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-300">{plan.price}</p>
                  </div>
                  <svg className="w-4 h-4 flex-shrink-0 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              ) : (
                <button
                  key={plan.key}
                  onClick={() => {
                    if (!plan.trial) {
                      onSelectPlanWithoutTrial();
                    } else {
                      onSelectTrialPlan(plan.key);
                    }
                  }}
                  className={`w-full text-left rounded-xl border-2 px-4 py-3.5 transition-all flex items-center gap-4 ${
                    pendingTrialPlan === plan.key
                      ? 'border-indigo-500 bg-indigo-50 shadow-md shadow-indigo-100'
                      : 'border-slate-100 hover:border-indigo-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-sm font-bold text-slate-900">{plan.label}</span>
                      {plan.tag && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                          plan.tag === '추천' ? 'bg-indigo-600 text-white'
                            : plan.tag === '팀용' ? 'bg-violet-50 text-violet-600 border border-violet-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>{plan.tag}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">{plan.summary}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-slate-800">{plan.price}</p>
                    <p className="text-[10px] text-indigo-500 font-medium mt-0.5">
                      {plan.trial ? '14일 무료 체험' : '무료로 시작'}
                    </p>
                  </div>
                  <svg className={`w-4 h-4 flex-shrink-0 ${pendingTrialPlan === plan.key ? 'text-indigo-500' : 'text-slate-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
          {pendingTrialPlan && (
            <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <div className="flex items-center gap-1.5 text-amber-700 mb-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="text-xs font-bold">무료 체험 조건 안내</span>
                </div>
                <ul className="text-xs text-amber-700 space-y-0.5 pl-5 list-disc">
                  <li>14일 동안 모든 기능을 제한 없이 사용해볼 수 있습니다.</li>
                  <li>체험 종료 후 구독을 시작하면 데이터는 그대로 유지됩니다.</li>
                  <li>구독을 시작하지 않으면 15일 후 업로드 데이터가 자동 정리됩니다.</li>
                </ul>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={trialConsented} onChange={e => onChangeTrialConsented(e.target.checked)} className="mt-0.5 w-4 h-4 rounded accent-indigo-600 cursor-pointer flex-shrink-0" />
                <span className="text-xs text-slate-600 leading-relaxed">위 내용을 확인하였으며, 미구독 시 데이터 삭제에 동의합니다.</span>
              </label>
              <button
                disabled={!trialConsented}
                onClick={onContinueAfterTrialConsent}
                className={`w-full py-3 rounded-xl text-sm font-bold transition-all ${trialConsented ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                {PLAN_NAMES[pendingTrialPlan]} 14일 무료 체험 시작 →
              </button>
            </div>
          )}
          <div className="mt-4 pt-4 border-t border-slate-100 text-center">
            <button onClick={onSwitchToLogin} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
              이미 계정이 있으신가요? 로그인
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSignupPlanSelect;
