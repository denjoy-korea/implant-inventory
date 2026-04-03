import React from 'react';

interface HeroSectionProps {
  onGoToContact: () => void;
  onOpenInventorySolution: () => void;
  onGoToAbout?: () => void;
}

const HeroSection: React.FC<HeroSectionProps> = ({
  onGoToContact,
  onOpenInventorySolution,
  onGoToAbout,
}) => {
  return (
    <section className="relative pt-32 pb-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 lg:px-8">
        <div className="text-center max-w-5xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm animate-fade-in-up">
              <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              치과 의료진을 위한 교육 · 컨설팅 · 경영 솔루션
            </div>

            <div className="mt-8 animate-fade-in-up animate-delay-100">
              <img
                src="/denjoy_logo.png"
                alt="DenJOY 로고"
                width={160}
                height={160}
                className="mx-auto w-28 md:w-36 h-auto"
              />
            </div>

            <h1 className="mt-6 font-black tracking-tight leading-[0.92] animate-fade-in-up animate-delay-100">
              <span className="block text-4xl sm:text-6xl md:text-7xl text-gray-800">교육이 있고, 컨설팅이 있고,</span>
              <span className="block text-4xl sm:text-6xl md:text-7xl gradient-text glow-text">
                솔루션이 있는 DenJOY
              </span>
            </h1>

            <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-gray-500 leading-relaxed animate-fade-in-up animate-delay-200">
              DenJOY는 치과 의료진의 성장을 돕는 브랜드입니다.
              실전 교육, 병원 컨설팅, 그리고 운영을 바꾸는 디지털 솔루션까지 —
              필요한 것을 필요한 순서로 제공합니다.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
              <button onClick={onOpenInventorySolution} className="btn-primary text-lg">
                솔루션 보기
              </button>
              <button
                onClick={onGoToAbout ?? onGoToContact}
                className="btn-secondary text-lg"
              >
                DenJOY 소개
              </button>
            </div>

            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up animate-delay-300">
              {[
                { label: "교육", value: "강의 · 매뉴얼 · 임상 노하우" },
                { label: "컨설팅", value: "병원 운영 진단 · 시스템 설계" },
                { label: "솔루션", value: "재고관리 · HR · 보험청구" },
              ].map((item) => (
                <div key={item.label} className="card-premium glow-box text-center py-5 px-4 h-full flex flex-col justify-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                  <p className="mt-2 text-sm sm:text-base font-semibold text-gray-800">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Brand service category visual */}
            <div className="mt-16 relative animate-fade-in-up animate-delay-400">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    icon: (
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                    ),
                    title: '실전 교육',
                    desc: '임상 지식 · 데이터 활용',
                    color: 'text-indigo-500 bg-indigo-50',
                  },
                  {
                    icon: (
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    ),
                    title: '병원 컨설팅',
                    desc: '운영 진단 · 전략 수립',
                    color: 'text-emerald-500 bg-emerald-50',
                  },
                  {
                    icon: (
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    ),
                    title: '디지털 솔루션',
                    desc: '재고 · HR · 보험청구',
                    color: 'text-violet-500 bg-violet-50',
                  },
                  {
                    icon: (
                      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    ),
                    title: '성장 커뮤니티',
                    desc: '동료 네트워크 · 경험 공유',
                    color: 'text-amber-500 bg-amber-50',
                  },
                ].map((item) => (
                  <div key={item.title} className="card-premium glow-box flex flex-col items-center text-center py-6 px-4 gap-3">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${item.color}`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-violet-600 rounded-[2rem] blur-2xl opacity-5 -z-10" aria-hidden="true" />
            </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
