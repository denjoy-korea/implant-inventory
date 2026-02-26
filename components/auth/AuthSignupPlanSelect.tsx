import React from 'react';
import { PlanType, PLAN_NAMES } from '../../types';
import { SIGNUP_PLANS } from './authSignupConfig';
import {
  SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT,
  TRIAL_CONSENT_LABEL_TEXT,
  TRIAL_DATA_DELETION_POLICY_TEXT,
  TRIAL_OFFER_LABEL,
} from '../../utils/trialPolicy';

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
    <div className="flex-1 flex items-center justify-center px-6 py-12 bg-slate-50/80 backdrop-blur-sm relative">
      <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 left-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-[950px] bg-white rounded-[2rem] shadow-2xl shadow-indigo-900/5 ring-1 ring-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5 relative z-10">
        {/* Left Panel */}
        <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-20 mix-blend-overlay" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)] flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
                </svg>
              </div>
              <span className="text-xl font-bold tracking-tight">DenJOY</span>
            </div>
            <h2 className="text-[28px] font-black leading-snug mb-4 tracking-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-100 to-indigo-200">
                {TRIAL_OFFER_LABEL}으로<br />시작하세요.
              </span>
            </h2>
            <p className="text-indigo-200 text-sm leading-relaxed font-medium">
              카드 정보 없이도<br />핵심 기능을 체험 가능합니다.
            </p>
          </div>
          <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
            <p className="text-xs text-indigo-300/60 font-medium tracking-wide">언제든지 다른 플랜으로 변경 가능</p>
          </div>
        </div>

        {/* Right Panel */}
        <div className="md:col-span-3 p-10 lg:p-12 flex flex-col bg-white">
          <div className="mb-8">
            <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight">플랜 선택</h2>
            <p className="text-sm text-slate-500 mt-2 font-medium">원하시는 플랜을 선택해주세요. 언제든 변경할 수 있습니다.</p>
          </div>
          <div className="space-y-3.5 flex-1">
            {SIGNUP_PLANS.map(plan => {
              const isSoldOut = planAvailability[plan.key] === false;
              return isSoldOut ? (
                <div key={plan.key} className="w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-5 py-4 flex items-center gap-4 opacity-70">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[15px] font-bold text-slate-400">{plan.label}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">품절</span>
                    </div>
                    <p className="text-[13px] text-slate-400 font-medium">
                      현재 가입 불가 · <button type="button" onClick={(e) => { e.stopPropagation(); onRequestWaitlist({ key: plan.key, name: plan.label }); }} className="text-indigo-500 font-bold hover:underline">대기 신청</button>
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[15px] font-bold text-slate-400">{plan.price}</p>
                  </div>
                  <svg className="w-5 h-5 flex-shrink-0 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
              ) : (
                <button
                  key={plan.key}
                  onClick={() => {
                    if (!plan.trial) onSelectPlanWithoutTrial();
                    else onSelectTrialPlan(plan.key);
                  }}
                  className={`relative w-full text-left rounded-2xl px-5 py-4 transition-all flex items-center gap-4 overflow-hidden group outline-none ${pendingTrialPlan === plan.key
                      ? 'bg-indigo-50/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-2 ring-indigo-500'
                      : plan.tag === '추천'
                        ? 'bg-white shadow-md hover:shadow-xl hover:-translate-y-0.5 ring-1 ring-slate-200 hover:ring-indigo-300'
                        : 'bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 ring-1 ring-slate-200 hover:ring-indigo-300'
                    }`}
                >
                  {(pendingTrialPlan === plan.key || plan.tag === '추천') && (
                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  )}
                  {plan.tag === '추천' && pendingTrialPlan !== plan.key && (
                    <div className="absolute inset-0 ring-1 ring-indigo-500/20 rounded-2xl animate-pulse-glow pointer-events-none" />
                  )}

                  <div className="relative z-10 flex flex-1 items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-bold text-slate-900">{plan.label}</span>
                        {plan.tag && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${plan.tag === '추천' ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-sm'
                              : plan.tag === '팀용' ? 'bg-violet-50 text-violet-600 border border-violet-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}>{plan.tag}</span>
                        )}
                      </div>
                      <p className="text-[13px] text-slate-500 font-medium">{plan.summary}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[15px] font-extrabold text-slate-800">{plan.price}</p>
                      <p className="text-[11px] text-indigo-500 font-bold mt-0.5">
                        {plan.trial ? TRIAL_OFFER_LABEL : '무료로 시작'}
                      </p>
                    </div>
                    <svg className={`w-5 h-5 flex-shrink-0 transition-transform ${pendingTrialPlan === plan.key ? 'text-indigo-600 translate-x-1' : 'text-slate-300 group-hover:text-indigo-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              );
            })}
          </div>
          {pendingTrialPlan && (
            <div className="mt-8 space-y-4 border-t border-slate-100/80 pt-6">
              <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl px-4 py-3.5 shadow-sm shadow-amber-100/20">
                <div className="flex items-center gap-2 text-amber-800 mb-1.5">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  <span className="text-[13px] font-bold">무료 체험 조건 안내</span>
                </div>
                <ul className="text-[13px] text-amber-700/80 space-y-1 pl-6 list-disc font-medium">
                  <li>{TRIAL_OFFER_LABEL} 동안 모든 기능을 제한 없이 사용해볼 수 있습니다.</li>
                  <li>{SUBSCRIPTION_DATA_RETENTION_POLICY_TEXT}</li>
                  <li>{TRIAL_DATA_DELETION_POLICY_TEXT}</li>
                </ul>
              </div>
              <label className="flex items-start gap-3 cursor-pointer py-1">
                <input type="checkbox" checked={trialConsented} onChange={e => onChangeTrialConsented(e.target.checked)} className="mt-0.5 w-[18px] h-[18px] rounded border-slate-300 accent-indigo-600 cursor-pointer flex-shrink-0" />
                <span className="text-[13px] font-medium text-slate-600 leading-relaxed">위 내용을 확인하였으며, {TRIAL_CONSENT_LABEL_TEXT}</span>
              </label>
              <button
                disabled={!trialConsented}
                onClick={onContinueAfterTrialConsent}
                className={`relative w-full h-14 rounded-xl text-[15px] font-bold transition-all overflow-hidden group ${trialConsented ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 active:scale-[0.98]' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
              >
                {trialConsented && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {PLAN_NAMES[pendingTrialPlan]} {TRIAL_OFFER_LABEL} 시작하기
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              </button>
            </div>
          )}
          <div className="mt-8 pt-6 border-t border-slate-100/80 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button onClick={onSwitchToLogin} className="text-[13px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
              이미 계정이 있으신가요? <span className="underline underline-offset-4">로그인</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthSignupPlanSelect;
