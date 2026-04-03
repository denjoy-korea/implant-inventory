import React, { useEffect } from 'react';
import HomepageHeader from './home/HomepageHeader';
import HomepageFooter from './home/HomepageFooter';
import { BrandPageProps } from './ConsultingPage';

/** Constants ported from denjoy-homepage/src/lib/course-constants.ts */
const FOUNDED_YEAR = 2007;
const careerYears = new Date().getFullYear() - FOUNDED_YEAR;
const CLINICAL_EDUCATION_COUNT = 100;
const TOTAL_STUDENTS = '1,000+';
const RATING = '4.9/5.0';

const AboutPage: React.FC<BrandPageProps> = ({
  user,
  onGoToLogin,
  onGoToSignup,
  onGoToContact,
  onNavigate,
  onGoToTerms,
  onGoToPrivacy,
  onGoToMyPage,
  onGoToAdminPanel,
  onLogout,
}) => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-mesh overflow-x-hidden flex flex-col">
      {/* Decorative Orbs */}
      <div className="orb orb-purple w-[500px] h-[500px] -top-40 -left-40 animate-pulse-glow" aria-hidden="true" />
      <div className="orb orb-blue w-[400px] h-[400px] top-1/4 -right-40 animate-pulse-glow" aria-hidden="true" style={{ animationDelay: '1s' }} />

      <HomepageHeader
        currentView="about"
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
        {/* ===== [1] 히어로 — 로고 + 브랜드 스토리 ===== */}
        <section className="relative pt-12 md:pt-20 pb-20 overflow-hidden bg-gradient-to-b from-white to-transparent">
            <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                <div className="animate-fade-in-up">
                    <img
                        src="/logo.png"
                        alt="DenJOY 로고"
                        className="h-[120px] w-auto mx-auto mb-8 object-contain"
                    />
                </div>

                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in-up animate-delay-100">
                    <span className="text-slate-800">Dental + Enjoy</span>
                    <br />
                    <span className="gradient-text glow-text">치과 일을 즐겁게</span>
                </h1>

                <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto animate-fade-in-up animate-delay-200">
                    D와 J가 만나 <span className="text-indigo-600 font-semibold">UP</span>이 되었습니다.
                    <br />
                    개인과 조직이 함께 성장하고,
                    <br className="hidden md:block" />
                    그 과정 안에서 즐거움을 찾는 것이 우리의 바람입니다.
                </p>
            </div>
        </section>

        {/* ===== [NEW] 숫자로 보는 DenJOY — 후광 효과 + 앵커링 ===== */}
        <section className="py-20 relative">
            <div className="section-divider mb-20" />
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    {[
                        { number: `${careerYears}년+`, label: "현장 경력", sub: "2007년부터" },
                        { number: TOTAL_STUDENTS, label: "누적 수강생", sub: "강의 및 코칭" },
                        { number: `${CLINICAL_EDUCATION_COUNT}회+`, label: "임상교육 횟수", sub: "전국 각지" },
                        { number: RATING, label: "수강생 평점", sub: "실제 후기 기반" },
                    ].map((stat, i) => (
                        <div key={i} className="card-premium text-center p-6">
                            <div className="text-2xl md:text-3xl font-bold bg-gradient-to-br from-teal-600 to-emerald-500 bg-clip-text text-transparent mb-1">{stat.number}</div>
                            <div className="text-sm font-semibold text-slate-700 mb-0.5">{stat.label}</div>
                            <div className="text-xs text-slate-400">{stat.sub}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* ===== [2] 철학 — 왜 DenJOY인가 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">PHILOSOPHY</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        우리가 <span className="gradient-text">믿는 것</span>
                    </h2>
                </div>

                <div className="space-y-8">
                    <div className="card-premium glow-box">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                                <span className="text-2xl">🌱</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">성장은 환경에서 시작됩니다</h3>
                                <p className="text-slate-500 leading-relaxed">
                                    좋은 강의 하나가 1년의 시행착오를 줄여줍니다.
                                    <br />
                                    혼자 고민하던 시간을 함께 배우는 시간으로 바꿀 때,
                                    <br />
                                    비로소 진짜 성장이 시작됩니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium glow-box">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                                <span className="text-2xl">🔗</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">임상과 경영은 연결되어 있습니다</h3>
                                <p className="text-slate-500 leading-relaxed">
                                    뛰어난 임상 실력만으로는 충분하지 않습니다.
                                    <br />
                                    데이터를 다루고, 시스템을 만들고, 도구를 활용하는 능력이
                                    <br />
                                    개인과 조직 모두를 한 단계 끌어올립니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium glow-box">
                        <div className="flex items-start gap-6">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
                                <span className="text-2xl">😊</span>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-slate-800 mb-2">즐거워야 오래 갑니다</h3>
                                <p className="text-slate-500 leading-relaxed">
                                    의무감으로 하는 공부는 오래가지 못합니다.
                                    <br />
                                    성장하는 재미를 느끼고, 동료와 나누는 즐거움이 있을 때
                                    <br />
                                    지속 가능한 변화가 만들어집니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* ===== [3] 핵심 가치 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">CORE VALUES</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        핵심 <span className="gradient-text">가치</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: "🎯",
                            title: "실전 중심",
                            description: "이론이 아닌 현장에서\n바로 쓸 수 있는 지식을 전달합니다.\n배운 다음 날 적용할 수 있어야\n진짜 교육입니다.",
                        },
                        {
                            icon: "📊",
                            title: "데이터 기반",
                            description: "감이 아닌 데이터로 판단합니다.\n엑셀, 노션, 자동화 도구를 활용해\n재현 가능한 성과를 만듭니다.",
                        },
                        {
                            icon: "🤝",
                            title: "함께 성장",
                            description: "혼자가 아닌 동료와 함께 성장합니다.\n커뮤니티와 네트워크를 통해\n서로의 경험을 나눕니다.",
                        },
                    ].map((value, i) => (
                        <div key={i} className="card-premium glow-box text-center p-8">
                            <div className="text-4xl mb-5">{value.icon}</div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">{value.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed whitespace-pre-line">{value.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* ===== [4] 비전 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">VISION</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        우리가 <span className="gradient-text">그리는 미래</span>
                    </h2>
                </div>

                <div className="card-premium glow-box bg-gradient-to-br from-indigo-50 to-purple-50 py-12 px-8 text-center border overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-2xl md:text-3xl font-bold text-slate-800 leading-relaxed mb-6">
                            &ldquo;치과에서 일하는 모든 사람이
                            <br />
                            <span className="gradient-text">자기 일에 자부심을 갖는 세상</span>&rdquo;
                        </p>
                        <p className="text-slate-500 leading-relaxed max-w-2xl mx-auto">
                            임상 실력을 키우고, 도구를 다루는 능력을 갖추고,
                            <br />
                            동료와 함께 성장하는 경험을 통해
                            <br />
                            치과인 한 사람 한 사람이 자신의 가치를 발견하길 바랍니다.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* ===== [5] 연혁 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-3xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">HISTORY</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        걸어온 <span className="gradient-text">길</span>
                    </h2>
                </div>

                <div className="relative">
                    {/* 타임라인 세로선 */}
                    <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-px bg-indigo-100 -translate-x-1/2" />

                    {[
                        { year: "2008", text: "치과위생사로 첫 발을 내딛다" },
                        { year: "2013", text: "덴탈위키컴퍼니 파트너 강사로 교육 시작" },
                        { year: "2017", text: "덴탈위키 강사연구회 최우수 강사 수상" },
                        { year: "2019", text: "한국의료경영교육협회 학술이사 역임" },
                        { year: "2020", text: "DenJOY 설립" },
                        { year: "2024", text: "노션 · 자동화 · 바이브코딩으로 영역 확장" },
                        { year: "2025", text: "DenJOY 교육 플랫폼 런칭" },
                    ].map((item, i) => (
                        <div key={i} className={`relative flex items-center mb-10 last:mb-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                            {/* 점 */}
                            <div className="absolute left-6 md:left-1/2 w-3 h-3 bg-indigo-500 rounded-full -translate-x-1/2 z-10" />

                            {/* 카드 */}
                            <div className={`ml-14 md:ml-0 md:w-[calc(50%-2rem)] ${i % 2 === 0 ? 'md:pr-0 md:mr-auto md:pl-0' : 'md:pl-0 md:ml-auto md:pr-0'}`}>
                                <div className="card-premium p-5">
                                    <span className="text-indigo-500 font-bold text-lg">{item.year}</span>
                                    <p className="text-slate-600 mt-1">{item.text}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* ===== [6] CTA ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
                <div className="card-premium glow-box bg-gradient-to-br from-indigo-50/50 to-white py-16 px-8 border">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-800">
                        함께 <span className="bg-gradient-to-r from-indigo-500 to-purple-500 bg-clip-text text-transparent">성장할 준비</span>가 되셨나요?
                    </h2>
                    <p className="text-slate-500 mb-10 leading-relaxed font-medium">
                        DenJOY와 함께 다음 단계로 나아가세요.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={() => onNavigate('courses')} className="btn-primary text-base px-8 py-3.5">
                            강의 살펴보기
                        </button>
                        <button onClick={onGoToContact} className="btn-secondary text-base px-8 py-3.5">
                            문의하기
                        </button>
                    </div>
                </div>
            </div>
        </section>
      </main>

      <HomepageFooter 
        onGoToContact={onGoToContact} 
        onGoToTerms={onGoToTerms} 
        onGoToPrivacy={onGoToPrivacy} 
      />
    </div>
  );
};

export default AboutPage;
