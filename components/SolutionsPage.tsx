import React, { useEffect, ReactNode } from 'react';
import HomepageHeader from './home/HomepageHeader';
import HomepageFooter from './home/HomepageFooter';
import { BrandPageProps } from './ConsultingPage';

interface Solution {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: ReactNode;
  status: "live" | "coming";
  onNavigateAction?: string;
}

const solutions: Solution[] = [
  {
      id: "implant-inventory",
      title: "임플란트 재고관리",
      subtitle: "Implant Inventory Manager",
      description: "엑셀 업로드 한 번으로 재고 현황 파악. 수술 기록 연동, 자동 사용량 분석, 발주 관리까지.",
      icon: (
          <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
      ),
      status: "live",
      onNavigateAction: "landing",
  },
  {
      id: "insurance-claims",
      title: "보험청구 데이터관리",
      subtitle: "Insurance Claims Manager",
      description: "보험청구 데이터를 체계적으로 관리하고, 누락 없는 청구와 데이터 분석을 지원합니다.",
      icon: (
          <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
      ),
      status: "coming",
  },
  {
      id: "revenue",
      title: "매출 관리",
      subtitle: "Revenue Analytics",
      description: "일별, 월별 매출을 한눈에. 진료 항목별 분석과 트렌드 파악으로 경영 의사결정을 돕습니다.",
      icon: (
          <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
      ),
      status: "coming",
  },
  {
      id: "general-inventory",
      title: "일반재료 재고관리",
      subtitle: "General Supplies Manager",
      description: "임플란트 외 일반 진료재료, 소모품의 재고를 추적하고 적정 재고량을 자동으로 관리합니다.",
      icon: (
          <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
      ),
      status: "coming",
  },
  {
      id: "hr",
      title: "인사관리 시스템",
      subtitle: "HR Management",
      description: "직원 정보, 근태, 급여, 교육 이력을 통합 관리. 체계적인 인사관리로 조직을 안정시킵니다.",
      icon: (
          <svg aria-hidden="true" className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
      ),
      status: "coming",
  },
];

const liveSolution = solutions.find((solution) => solution.status === "live");
const comingSolutions = solutions.filter((solution) => solution.status === "coming");

const SolutionsPage: React.FC<BrandPageProps> = ({
  user, onGoToLogin, onGoToSignup, onGoToContact, onNavigate, onGoToTerms, onGoToPrivacy, onGoToMyPage, onGoToAdminPanel, onLogout
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-mesh text-slate-900 overflow-x-hidden flex flex-col">
      <div className="orb orb-purple w-[600px] h-[600px] -top-40 -left-40 animate-pulse-glow" aria-hidden="true" />
      <div className="orb orb-blue w-[500px] h-[500px] top-1/3 -right-40 animate-pulse-glow" aria-hidden="true" style={{ animationDelay: '1s' }} />

      <HomepageHeader
        currentView="solutions"
        user={user}
        onGoToLogin={onGoToLogin}
        onGoToSignup={onGoToSignup}
        onGoToContact={onGoToContact}
        onNavigate={onNavigate}
        onGoToMyPage={onGoToMyPage}
        onGoToAdminPanel={onGoToAdminPanel}
        onLogout={onLogout}
      />

      <main className="flex-1 relative z-10 pt-20">
        
        {/* 히어로 영역 */}
        <section className="pt-12 md:pt-20 pb-16 md:pb-24">
            <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle text-sm text-indigo-600 font-bold tracking-widest uppercase mb-6">
                    Solutions
                </div>

                <h1 className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight text-slate-800 tracking-tight">
                    치과 운영의 모든 것을
                    <span className="block gradient-text glow-text mt-2">
                        하나로
                    </span>
                </h1>

                <p className="mt-8 max-w-2xl mx-auto text-lg md:text-xl leading-relaxed text-slate-500 font-medium">
                    복잡한 병원 업무를 심플하게.<br className="hidden md:block" />
                    DenJOY가 만드는 치과 전용 솔루션입니다.
                </p>
            </div>
        </section>

        {/* 이런 고민 해본적 있으신가요 */}
        <section className="pb-16 sm:pb-20">
            <div className="section-divider mb-20" />
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                        이런 <span className="gradient-text">고민</span>, 해본 적 있으신가요?
                    </h2>
                    <p className="text-slate-500 text-lg font-medium">DenJOY 솔루션은 현장의 실제 불편함에서 출발합니다.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                        { title: "비효율적인 엑셀 수작업", desc: "매달 반복되는 엑셀 복붙과 수기 입력에 너무 많은 시간을 뺏깁니다." },
                        { title: "정확하지 않은 데이터", desc: "누가 어떻게 입력했는지 몰라 데이터 자체를 신뢰하기 어렵습니다." },
                        { title: "시스템 부재로 인한 인수인계", desc: "담당자가 퇴사하면 업무가 멈추고 데이터가 유실됩니다." },
                    ].map((item, index) => (
                        <div key={index} className="card-premium p-8 text-center hover:-translate-y-1 transition-transform">
                            <h3 className="text-xl font-bold text-slate-800 mb-3">{item.title}</h3>
                            <p className="text-slate-500 leading-relaxed text-sm">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* 라이브 솔루션 */}
        {liveSolution && (
            <section className="pb-20 sm:pb-24">
                <div className="section-divider mb-20" />
                <div className="max-w-5xl mx-auto px-6 lg:px-8">
                    <div className="text-center mb-12">
                        <p className="text-sm text-indigo-600 font-bold tracking-widest uppercase lg:mb-2">Currently Running</p>
                        <h2 className="text-3xl font-bold text-slate-800">
                            운영 중인 <span className="gradient-text">솔루션</span>
                        </h2>
                    </div>
                    
                    <div className="card-premium glow-box p-8 md:p-12 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative overflow-hidden flex flex-col md:flex-row items-center gap-10">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-200 blur-[80px] opacity-40 rounded-full" />
                        
                        <div className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-lg relative z-10">
                            {liveSolution.icon}
                        </div>
                        
                        <div className="flex-1 text-center md:text-left relative z-10">
                            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 mb-3">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE
                            </div>
                            <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mb-1">{liveSolution.title}</h3>
                            <p className="text-indigo-500 font-bold uppercase tracking-widest text-sm mb-4">{liveSolution.subtitle}</p>
                            <p className="text-slate-600 leading-relaxed font-medium text-lg">
                                {liveSolution.description}
                            </p>
                            <div className="mt-8 flex flex-col sm:flex-row justify-center md:justify-start gap-4">
                                <button
                                    onClick={() => liveSolution.onNavigateAction && onNavigate(liveSolution.onNavigateAction)}
                                    className="btn-primary text-base px-8 py-3.5"
                                >
                                    솔루션 보기
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        )}

        {/* 커밍 솔루션 */}
        <section className="pb-20 sm:pb-24 bg-slate-50/50 pt-20 border-y border-slate-100">
            <div className="max-w-6xl mx-auto px-6 lg:px-8">
                <div className="text-center max-w-3xl mx-auto mb-16">
                    <p className="text-sm text-indigo-500 font-bold tracking-widest uppercase mb-2">Coming Soon</p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-slate-800">
                        준비 중인 솔루션
                    </h2>
                    <p className="mt-4 text-lg text-slate-500 font-medium">치과 운영에 꼭 필요한 도구들을 계속 만들어가고 있습니다.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {comingSolutions.map((solution) => (
                        <article key={solution.id} className="card-premium p-8 hover:shadow-lg transition-shadow bg-white border border-slate-100">
                            <div className="flex items-start justify-between gap-4 mb-6">
                                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100 text-slate-400 shadow-sm">
                                    {solution.icon}
                                </div>
                                <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                                    Coming
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1">{solution.title}</h3>
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-400 mb-4">{solution.subtitle}</p>
                            <p className="text-sm leading-relaxed text-slate-500 font-medium min-h-[48px]">{solution.description}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>

        {/* CTA */}
        <section className="py-24 relative">
            <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                <div className="card-premium glow-box border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white py-16 px-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-100 rounded-full blur-[80px] opacity-60" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-100 rounded-full blur-[80px] opacity-60" />
                    
                    <div className="relative z-10">
                        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mb-4 leading-snug">
                            <span className="gradient-text">컨설팅 고객</span>은 모든 솔루션을<br className="hidden md:block"/>
                            이용할 수 있습니다
                        </h2>
                        <p className="text-slate-600 leading-relaxed max-w-xl mx-auto text-lg mb-8">
                            병원컨설팅과 함께 DenJOY의 모든 도구를 활용하여<br />
                            데이터 기반의 체계적인 병원 운영을 시작하세요.<br />
                            매달 놓치고 있는 비용, 지금 확인해 보세요.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button onClick={() => onNavigate('consulting')} className="btn-primary text-base px-8 py-3.5 shadow-md">
                                컨설팅 알아보기
                            </button>
                            <button onClick={onGoToContact} className="btn-secondary text-base px-8 py-3.5 bg-white">
                                상담 문의하기
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>

      </main>

      <HomepageFooter onGoToContact={onGoToContact} onGoToTerms={onGoToTerms} onGoToPrivacy={onGoToPrivacy} />
    </div>
  );
};

export default SolutionsPage;
