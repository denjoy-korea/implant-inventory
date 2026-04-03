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
      <div className="flex-1 flex items-center justify-center px-6 py-8 bg-slate-50/80 backdrop-blur-sm relative" style={{ minHeight: 'calc(100vh - 57px)' }}>
        <div className="absolute top-20 right-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 left-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-[950px] min-h-[640px] bg-white rounded-[2rem] shadow-2xl shadow-indigo-900/5 ring-1 ring-slate-100 overflow-hidden grid grid-cols-1 md:grid-cols-5 relative z-10">
          {/* Left Panel - Branding */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-900 p-10 flex flex-col justify-between text-white relative overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] rounded-full bg-violet-500/20 blur-3xl" />
            <div className="absolute bottom-[-10%] right-[-20%] w-[80%] h-[80%] rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute inset-0 noise-bg opacity-20 mix-blend-overlay" />

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
                  치과 운영의<br />새로운 기준.
                </span>
              </h2>
              <p className="text-indigo-200 text-sm leading-relaxed font-medium">
                교육 · 컨설팅 · 솔루션이 하나로<br />DenJOY OS에서 시작하세요.
              </p>
            </div>

            <div className="relative z-10 space-y-3 mt-8">
              {[
                { icon: '📦', text: '임플란트 재고관리' },
                { icon: '🏥', text: '병원 경영 컨설팅' },
                { icon: '🎓', text: '임상 교육 플랫폼' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3.5 bg-white/5 backdrop-blur-sm border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all rounded-xl px-4 py-3 group">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <span className="text-sm">{item.icon}</span>
                  </div>
                  <span className="text-sm text-indigo-100 font-medium">{item.text}</span>
                </div>
              ))}
            </div>

            <div className="relative z-10 mt-10 pt-6 border-t border-white/10">
              <p className="text-xs text-indigo-300/60 font-medium tracking-wide">치과 전문가를 위한 통합 운영 플랫폼</p>
            </div>
          </div>

          {/* Right Panel - Selection */}
          <div className="md:col-span-3 p-10 lg:p-14 flex flex-col justify-center bg-white">
            <div className="mb-10">
              <h2 className="text-[28px] font-extrabold text-slate-900 tracking-tight">계정 유형 선택</h2>
              <p className="text-sm text-slate-500 mt-2 font-medium">어떤 유형으로 DenJOY OS를 사용하실 건가요?</p>
            </div>

            <div className="space-y-4">
              {/* Dentist Card */}
              <button
                onClick={() => onSelectRole('dentist')}
                className="group w-full bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-6 text-left transition-all shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-0.5 flex items-start gap-5 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 w-14 h-14 rounded-[14px] bg-indigo-50/80 group-hover:bg-indigo-100 flex items-center justify-center flex-shrink-0 transition-colors shadow-inner">
                  <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                  </svg>
                </div>
                <div className="relative z-10 flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[17px] font-bold text-slate-900">병원 계정</h3>
                      <span className="text-[11px] font-semibold bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">관리자</span>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <p className="text-[14px] text-slate-500 leading-relaxed font-medium">병원 단위로 솔루션을 구독하고 팀원을 초대합니다. 원장·실장 등 병원 운영 주체에 적합합니다.</p>
                </div>
              </button>

              {/* Staff Card */}
              <button
                onClick={() => onSelectRole('staff')}
                className="group w-full bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 p-6 text-left transition-all shadow-sm hover:shadow-xl hover:shadow-emerald-500/10 hover:-translate-y-0.5 flex items-start gap-5 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10 w-14 h-14 rounded-[14px] bg-emerald-50/80 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0 transition-colors shadow-inner">
                  <svg className="w-7 h-7 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" /></svg>
                </div>
                <div className="relative z-10 flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[17px] font-bold text-slate-900">개인 계정</h3>
                      <span className="text-[11px] font-semibold bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full">담당자</span>
                    </div>
                    <svg className="w-5 h-5 text-slate-300 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <p className="text-[14px] text-slate-500 leading-relaxed font-medium">병원에 소속되어 솔루션을 사용합니다. 관리자의 초대를 받거나 개인 계정으로 시작할 수 있습니다.</p>
                </div>
              </button>
            </div>

            <div className="mt-10 mb-2 border-t border-slate-100/80" />

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onBack}
                className="text-[13px] font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                이전으로
              </button>
              <button onClick={onSwitchToLogin} className="text-[13px] font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
                이미 계정이 있으신가요? <span className="underline underline-offset-4">로그인</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AuthSignupRoleSelect;
