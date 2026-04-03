import React, { useEffect } from 'react';
import HomepageHeader from './home/HomepageHeader';
import HomepageFooter from './home/HomepageFooter';
import { View, User } from '../types';

export interface BrandPageProps {
  user?: User | null;
  onGoToLogin: () => void;
  onGoToSignup: () => void;
  onGoToContact: () => void;
  onNavigate: (view: string) => void;
  onGoToTerms: () => void;
  onGoToPrivacy: () => void;
  onGoToMyPage?: () => void;
}

/** Constants ported from denjoy-homepage/src/lib/course-constants.ts */
const FOUNDED_YEAR = 2007;

const ConsultingPage: React.FC<BrandPageProps> = ({
  user,
  onGoToLogin,
  onGoToSignup,
  onGoToContact,
  onNavigate,
  onGoToTerms,
  onGoToPrivacy,
  onGoToMyPage,
}) => {
  const careerYears = new Date().getFullYear() - FOUNDED_YEAR;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-mesh overflow-x-hidden flex flex-col">
      {/* Decorative Orbs */}
      <div className="orb orb-purple w-[500px] h-[500px] -top-40 -left-40 animate-pulse-glow" aria-hidden="true" />
      <div className="orb orb-blue w-[400px] h-[400px] top-1/4 -right-40 animate-pulse-glow" aria-hidden="true" style={{ animationDelay: '1s' }} />

      <HomepageHeader
        currentView="consulting"
        user={user}
        onGoToLogin={onGoToLogin}
        onGoToSignup={onGoToSignup}
        onGoToContact={onGoToContact}
        onNavigate={onNavigate}
        onGoToMyPage={onGoToMyPage}
      />

      <main className="flex-1 relative z-10 pt-20">
        {/* ===== [1] 히어로 — 호기심의 틈 + 사회적 증거 ===== */}
        <section className="relative pt-12 md:pt-20 pb-20 overflow-hidden bg-gradient-to-b from-white to-transparent">
            <div className="max-w-4xl mx-auto px-6 lg:px-8 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-subtle mb-6 animate-fade-in-up">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <span className="text-sm text-slate-600 font-medium">현재 무료 상담 가능</span>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight animate-fade-in-up animate-delay-100">
                    <span className="text-slate-800">보고서만 주는 컨설팅,</span>
                    <br />
                    <span className="gradient-text glow-text">아직도 받고 계신가요?</span>
                </h1>
                <p className="text-lg md:text-xl text-slate-500 leading-relaxed max-w-2xl mx-auto mb-8 animate-fade-in-up animate-delay-200">
                    DenJOY는 <span className="text-indigo-600 font-semibold">시스템 구축부터 직원 교육까지</span> 직접 실행합니다.
                    <br />
                    치과 현장 {careerYears}년 경력의 컨설턴트가 끝까지 함께합니다.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animate-delay-300">
                    <button onClick={onGoToContact} className="btn-primary text-lg px-8 py-3.5">
                        무료 상담 신청하기
                        <svg aria-hidden="true" className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                    </button>
                    <a
                        href="https://open.kakao.com/o/gvWu6Y1h"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-lg px-8 py-3.5"
                    >
                        카카오톡 문의
                    </a>
                </div>
            </div>
        </section>

        {/* ===== [2] 손실 회피 — 놓치고 있는 것 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">
                        시스템 없이 운영하면 <span className="text-rose-500">매달 잃고 있습니다</span>
                    </h2>
                    <p className="text-slate-500 text-lg">대부분의 치과가 인식하지 못하는 손실들</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                    {[
                        {
                            loss: "보험청구 누락",
                            amount: "월 30~100만원",
                            description: "체계적 관리 없이 매달 빠져나가는 청구 누락금",
                        },
                        {
                            loss: "신입 퇴사 비용",
                            amount: "연 500만원+",
                            description: "매뉴얼 없는 교육 → 이직 반복 → 채용·교육비 낭비",
                        },
                        {
                            loss: "비효율 업무시간",
                            amount: "주 10시간+",
                            description: "수작업 재고 관리, 엑셀 정리, 반복 커뮤니케이션",
                        },
                    ].map((item, i) => (
                        <div key={i} className="p-6 rounded-2xl border border-rose-100 bg-rose-50/50 text-center">
                            <p className="text-sm text-rose-500 font-medium mb-2">{item.loss}</p>
                            <p className="text-3xl font-bold text-rose-600 mb-2">{item.amount}</p>
                            <p className="text-slate-500 text-sm leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>

                <div className="text-center">
                    <p className="text-lg text-slate-600">
                        합산하면 <span className="text-rose-600 font-bold">연간 수천만 원</span>의 보이지 않는 손실.
                        <br />
                        <span className="text-indigo-600 font-semibold">시스템 하나로 막을 수 있습니다.</span>
                    </p>
                </div>
            </div>
        </section>

        {/* ===== [3] 이런 고민이 있다면 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">PAIN POINTS</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        이런 <span className="gradient-text">고민</span>이 있다면
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                        "매출은 나오는데 수익이 남지 않는다",
                        "직원 이직률이 높고 분위기가 불안정하다",
                        "데이터를 모으고 싶은데 방법을 모르겠다",
                        "업무 매뉴얼이 없어서 사람이 바뀌면 혼란이다",
                        "노션, 엑셀 등 도구를 도입하고 싶은데 어디서부터 시작할지 모르겠다",
                        "컨설팅을 받아봤지만 현장에 맞지 않았다",
                    ].map((item, i) => (
                        <div key={i} className="card-premium flex items-start gap-4 p-6">
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0 mt-0.5">
                                <svg aria-hidden="true" className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-slate-600 font-medium pt-1">{item}</p>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-10">
                    <p className="text-slate-500">하나라도 해당되신다면, <span className="text-indigo-600 font-semibold">상담만으로도 방향이 보입니다.</span></p>
                </div>
            </div>
        </section>

        {/* ===== [4] 컨설팅 비교 — 미끼 효과 + 앵커링 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">COMPARISON</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        일반 컨설팅 vs <span className="gradient-text">DenJOY</span>
                    </h2>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] overflow-hidden border border-slate-100">
                        <thead>
                            <tr className="bg-slate-50/50">
                                <th className="p-5 text-slate-500 text-sm font-semibold border-b border-slate-200 w-1/3"></th>
                                <th className="p-5 text-slate-500 text-sm font-semibold border-b border-slate-200 text-center w-1/3">일반 컨설팅</th>
                                <th className="p-5 text-sm font-semibold border-b-2 border-indigo-500 text-center w-1/3 bg-indigo-50/10">
                                    <span className="text-indigo-600 font-bold">DenJOY 컨설팅</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                { item: "컨설턴트 배경", general: "경영학 이론 중심", denjoy: "치과 현장 " + careerYears + "년 실무" },
                                { item: "결과물", general: "보고서 전달", denjoy: "시스템 구축 + 매뉴얼 + 직원교육" },
                                { item: "도구 활용", general: "PPT 보고서", denjoy: "노션·엑셀·자동화 도구 직접 세팅" },
                                { item: "사후 관리", general: "보고서 전달 후 종료", denjoy: "적용 후 효과 측정 + 지속 피드백" },
                                { item: "솔루션 제공", general: "별도 비용", denjoy: "재고관리 등 DenJOY 솔루션 무료 이용" },
                            ].map((row, i) => (
                                <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-5 text-slate-700 font-medium text-sm">{row.item}</td>
                                    <td className="p-5 text-slate-400 text-sm text-center">{row.general}</td>
                                    <td className="p-5 text-indigo-700 text-sm text-center font-bold bg-indigo-50/30">{row.denjoy}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>

        {/* ===== [5] 컨설팅 서비스 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-5xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">SERVICES</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        컨설팅 <span className="gradient-text">서비스</span>
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {[
                        {
                            icon: (
                                <svg aria-hidden="true" className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            ),
                            title: "경영 데이터 분석",
                            description: "매출·환자수·재진율 등 핵심 지표를 분석하고 데이터 기반 의사결정 체계를 구축합니다.",
                        },
                        {
                            icon: (
                                <svg aria-hidden="true" className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            ),
                            title: "업무 시스템 구축",
                            description: "노션·엑셀·자동화 도구를 활용해 매뉴얼과 업무 프로세스를 체계적으로 정리합니다.",
                        },
                        {
                            icon: (
                                <svg aria-hidden="true" className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            ),
                            title: "조직 문화 개선",
                            description: "직원 교육 체계 수립, 소통 구조 개선, 팀 빌딩을 통해 안정적인 조직을 만듭니다.",
                        },
                    ].map((service, i) => (
                        <div key={i} className="card-premium glow-box text-center p-8">
                            <div className="icon-wrapper mx-auto mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl w-14 h-14 flex items-center justify-center">
                                {service.icon}
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-3">{service.title}</h3>
                            <p className="text-slate-500 text-sm leading-relaxed">{service.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* ===== [6] 진행 프로세스 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">PROCESS</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        진행 <span className="gradient-text">프로세스</span>
                    </h2>
                </div>

                <div className="space-y-6 max-w-3xl mx-auto">
                    {[
                        {
                            step: "01",
                            title: "사전 상담 (무료)",
                            description: "현재 상황과 고민을 파악하고, 컨설팅 방향과 범위를 함께 설정합니다. 상담만으로도 힌트를 얻으실 수 있습니다.",
                        },
                        {
                            step: "02",
                            title: "현황 진단",
                            description: "경영 데이터, 업무 프로세스, 조직 구조를 분석하여 핵심 문제를 진단합니다.",
                        },
                        {
                            step: "03",
                            title: "솔루션 설계",
                            description: "병원 상황에 맞는 맞춤형 개선안과 실행 로드맵을 설계합니다.",
                        },
                        {
                            step: "04",
                            title: "현장 적용",
                            description: "시스템 구축, 매뉴얼 제작, 직원 교육 등 실제 현장에 적용합니다.",
                        },
                        {
                            step: "05",
                            title: "사후 관리",
                            description: "적용 후 효과를 측정하고, 지속적인 피드백과 보완을 진행합니다.",
                        },
                    ].map((item, i) => (
                        <div key={i} className="card-premium flex flex-col sm:flex-row items-start gap-4 sm:gap-6 p-6 sm:p-8">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shrink-0 shadow-md">
                                <span className="text-white font-bold text-sm tracking-wider">{item.step}</span>
                            </div>
                            <div className="pt-1">
                                <h3 className="text-xl font-bold text-slate-800 mb-2">{item.title}</h3>
                                <p className="text-slate-500 leading-relaxed">{item.description}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>

        {/* ===== [7] 차별점 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-4xl mx-auto px-6 lg:px-8">
                <div className="text-center mb-16">
                    <p className="text-sm text-indigo-500 font-medium mb-2">WHY DENJOY</p>
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
                        DenJOY 컨설팅이 <span className="gradient-text">다른 이유</span>
                    </h2>
                </div>

                <div className="space-y-6 max-w-3xl mx-auto">
                    <div className="card-premium glow-box p-8 border">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1">
                                <svg aria-hidden="true" className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-3">현장 출신 컨설턴트</h3>
                                <p className="text-slate-500 leading-relaxed text-lg">
                                    외부 경영 전문가가 아닌, 치과 현장에서 {careerYears}년간 직접 일해온 실무자가 컨설팅합니다.
                                    현장의 언어로 소통하고, 현실적인 해결책을 제시합니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium glow-box p-8 border">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1">
                                <svg aria-hidden="true" className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-3">데이터 기반 접근</h3>
                                <p className="text-slate-500 leading-relaxed text-lg">
                                    느낌이 아닌 숫자로 현황을 파악하고, 측정 가능한 목표를 설정합니다.
                                    변화의 효과를 눈으로 확인할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="card-premium glow-box p-8 border">
                        <div className="flex flex-col sm:flex-row items-start gap-6">
                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 mt-1">
                                <svg aria-hidden="true" className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-slate-800 mb-3">실행까지 함께</h3>
                                <p className="text-slate-500 leading-relaxed text-lg">
                                    보고서만 전달하고 끝나는 컨설팅이 아닙니다.
                                    시스템 구축, 매뉴얼 제작, 직원 교육까지 실제 현장에 적용되는 것을 끝까지 함께합니다.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* ===== [8] 결핍 효과 — 한정 슬롯 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
                <div className="card-premium glow-box border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50/80 py-16 px-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-200 rounded-full blur-[60px] opacity-50" />
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-200 rounded-full blur-[60px] opacity-50" />
                    
                    <div className="relative z-10">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-100 border border-orange-200 mb-6">
                            <svg aria-hidden="true" className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-sm text-orange-700 font-bold tracking-wide">월 제한 운영</span>
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-6">
                            매월 <span className="text-orange-600">소수의 병원</span>만 진행합니다
                        </h2>
                        <p className="text-slate-600 leading-relaxed max-w-xl mx-auto text-lg">
                            1:1 밀착 컨설팅이기 때문에 동시에 많은 병원을 받지 않습니다.
                            <br />
                            충분한 시간과 집중을 보장하기 위해 월 진행 수를 제한하고 있습니다.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* ===== [9] CTA — 피크엔드 + 손실 회피 ===== */}
        <section className="py-24 relative">
            <div className="section-divider mb-24" />
            <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
                <div className="card-premium glow-box bg-gradient-to-br from-indigo-50/80 to-white py-16 px-8 border border-indigo-100">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6 text-slate-800 leading-tight">
                        <span className="gradient-text glow-text">6개월 뒤</span>에도
                        <br />
                        같은 고민을 하고 싶지 않다면?
                    </h2>
                    <p className="text-slate-600 mb-4 leading-relaxed text-lg">
                        사전 상담은 <span className="text-indigo-600 font-bold">무료</span>로 진행됩니다. 부담 없이 현재 고민을 나눠주세요.
                    </p>
                    <p className="text-sm text-slate-400 mb-10">
                        상담 후 컨설팅 여부를 결정하셔도 됩니다. 상담만으로도 힌트를 얻으실 수 있습니다.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <button onClick={onGoToContact} className="btn-primary text-base px-8 py-3.5 shadow-md hover:shadow-lg">
                            무료 상담 신청하기
                            <svg aria-hidden="true" className="w-5 h-5 ml-1 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                        </button>
                        <a
                            href="https://open.kakao.com/o/gvWu6Y1h"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary text-base px-8 py-3.5 bg-white"
                        >
                            카카오톡 문의
                        </a>
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

export default ConsultingPage;
