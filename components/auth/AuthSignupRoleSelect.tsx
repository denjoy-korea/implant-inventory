import React from 'react';

type SignupUserType = 'dentist' | 'staff';

interface AuthSignupRoleSelectProps {
  onSelectRole: (role: SignupUserType) => void;
  onBack: () => void;
  onSwitchToLogin: () => void;
}

const AuthSignupRoleSelect: React.FC<AuthSignupRoleSelectProps> = ({
  onSelectRole,
  onBack,
  onSwitchToLogin,
}) => {
  return (
    <>
      <div className="flex-1 flex items-center justify-center px-6 py-36 bg-slate-50/50">
        <div className="w-full max-w-[900px] min-h-[640px] bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5">
          {/* Left Panel - Branding */}
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
                임플란트 재고관리,<br />이제 스마트하게.
              </h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                역할에 맞는 회원 유형을<br />선택하고 시작하세요.
              </p>
            </div>

            <div className="relative z-10 space-y-2.5 mt-8">
              {[
                { icon: '📊', text: '실시간 재고 현황' },
                { icon: '🔗', text: '덴트웹 자동 연동' },
                { icon: '📦', text: '원클릭 발주 시스템' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-2.5">
                  <span className="text-base">{item.icon}</span>
                  <span className="text-sm text-slate-300">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-8 pt-6 border-t border-white/10">
              <p className="text-xs text-slate-500">14개 제조사 데이터 기본 적용</p>
            </div>
          </div>

          {/* Right Panel - Selection */}
          <div className="md:col-span-3 p-8 lg:p-10 flex flex-col justify-center">
            <div className="mb-7">
              <h2 className="text-2xl font-bold text-slate-900">회원 유형 선택</h2>
              <p className="text-sm text-slate-400 mt-1.5">가입하실 유형을 선택해주세요.</p>
            </div>

            <div className="space-y-4">
              {/* Dentist Card */}
              <button
                onClick={() => onSelectRole('dentist')}
                className="group w-full bg-white rounded-2xl border-2 border-slate-100 hover:border-indigo-500 p-6 text-left transition-all hover:shadow-lg hover:shadow-indigo-500/5 flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900">치과 회원 (관리자)</h3>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">병원 데이터를 생성·관리하고, 스태프에게 권한을 부여합니다.</p>
                </div>
              </button>

              {/* Staff Card */}
              <button
                onClick={() => onSelectRole('staff')}
                className="group w-full bg-white rounded-2xl border-2 border-slate-100 hover:border-emerald-500 p-6 text-left transition-all hover:shadow-lg hover:shadow-emerald-500/5 flex items-start gap-5"
              >
                <div className="w-12 h-12 rounded-xl bg-emerald-50 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <svg className="w-6 h-6 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-base font-bold text-slate-900">개인 회원 (담당자)</h3>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 transition-colors flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <p className="text-sm text-slate-500 leading-relaxed">병원 소속 없이 독립적으로 재고를 관리합니다. <span className="text-slate-400 font-medium">개인 전용 데이터 공간이 생성됩니다.</span></p>
                </div>
              </button>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                onClick={onBack}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                이전으로
              </button>
              <button onClick={onSwitchToLogin} className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
                이미 계정이 있으신가요? 로그인
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthSignupRoleSelect;
