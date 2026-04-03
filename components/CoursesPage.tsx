import React, { useCallback, useEffect, useState } from 'react';
import HomepageHeader from './home/HomepageHeader';
import HomepageFooter from './home/HomepageFooter';
import { View } from '../types';
import { courseCatalogService } from '../services/courseCatalogService';
import { DEFAULT_TOPIC_BY_SLUG } from '../data/courseCatalogContent';
import type { CourseTopicRow } from '../types/courseCatalog';
import CourseDetailExperience from './courses/CourseDetailExperience';

export interface BrandPageProps {
  user?: import('../types').User | null;
  onGoToLogin: () => void;
  onGoToSignup: () => void;
  onGoToContact: () => void;
  onNavigate: (view: string) => void;
  onGoToTerms: () => void;
  onGoToPrivacy: () => void;
  onGoToMyPage?: () => void;
  onGoToAdminPanel?: () => void;
  onLogout?: () => void | Promise<void>;
}

function getCourseSlugFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/courses\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}

/**
 * CoursesPage.tsx
 * Redesigned to match the high-end aesthetic of https://www.denjoy.info/courses
 */
const CoursesPage: React.FC<BrandPageProps> = ({
  user, onGoToLogin, onGoToSignup, onGoToContact, onNavigate, onGoToTerms, onGoToPrivacy, onGoToMyPage, onGoToAdminPanel, onLogout
}) => {
  const [topics, setTopics] = useState<CourseTopicRow[]>([]);
  const [activeCourseSlug, setActiveCourseSlug] = useState<string | null>(() => (
    typeof window !== 'undefined' ? getCourseSlugFromPath(window.location.pathname) : null
  ));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const rows = await courseCatalogService.listPublicTopics();
        if (!cancelled && rows.length > 0) {
          setTopics(rows);
        }
      } catch (error) {
        console.warn('[CoursesPage] course topic fallback:', error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollToFeaturedCourse = useCallback(() => {
    document.getElementById('featured-course-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }, []);

  const navigateToCourse = useCallback((slug: string) => {
    setActiveCourseSlug(slug);
    window.history.pushState(null, '', `/courses/${slug}`);
    onNavigate('courses');
  }, [onNavigate]);

  const goToCourseList = useCallback(() => {
    setActiveCourseSlug(null);
    window.history.pushState(null, '', '/courses');
    onNavigate('courses');
  }, [onNavigate]);

  useEffect(() => {
    const syncSlugFromPath = () => {
      setActiveCourseSlug(getCourseSlugFromPath(window.location.pathname));
    };

    syncSlugFromPath();
    window.addEventListener('popstate', syncSlugFromPath);
    return () => window.removeEventListener('popstate', syncSlugFromPath);
  }, []);

  const courseSlug = activeCourseSlug;
  const featuredTopic = topics[0] ?? DEFAULT_TOPIC_BY_SLUG['implant-inventory'];
  const additionalTopics = topics.slice(1);
  const featuredCategory = featuredTopic?.category || '데이터 엔지니어링';
  const featuredHeadline = featuredTopic?.hero_headline || '덴트웹 임플란트 재고관리:\n입력 구조부터 바꾸는 실전 강의';
  const featuredSummary = featuredTopic?.hero_summary || '데이터 정합성을 해치는 근본적인 원인을 파악하고, 엑셀 없이도 물 흐르듯 관리되는 자동화 프로세스를 구축합니다.';
  const featuredSlug = featuredTopic?.slug || 'implant-inventory';

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [courseSlug]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden flex flex-col font-sans">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="orb orb-purple w-[800px] h-[800px] -top-80 -left-60 animate-pulse-glow" aria-hidden="true" />
        <div className="orb orb-blue w-[600px] h-[600px] top-1/2 -right-40 animate-pulse-glow" aria-hidden="true" style={{ animationDelay: '2s' }} />
      </div>

      <HomepageHeader
        currentView="courses"
        user={user}
        onGoToLogin={onGoToLogin}
        onGoToSignup={onGoToSignup}
        onGoToContact={onGoToContact}
        onNavigate={onNavigate}
        onGoToMyPage={onGoToMyPage}
        onGoToAdminPanel={onGoToAdminPanel}
        onLogout={onLogout}
      />

      <main className="flex-1 relative z-10">
        {courseSlug ? (
          <CourseDetailExperience
            slug={courseSlug}
            onGoToCourseList={goToCourseList}
            onGoToContact={onGoToContact}
          />
        ) : (
          <>
        {/* Hero Section */}
        <section className="pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 text-center lg:text-left space-y-8">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 animate-fade-in-up">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
                  </span>
                  <span className="text-xs font-bold text-indigo-600 tracking-tight">수강생 모집중</span>
                </div>
                
                <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1] text-slate-900">
                    같은 경력, <br className="hidden md:block" />
                    <span className="gradient-text">다른 성장.</span>
                  </h1>
                  <p className="text-lg md:text-xl text-slate-600 font-medium max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                    덴트웹 데이터 전문가가 전하는 실전 노하우.<br />
                    구조를 바꾸면 치과의 미래가 바뀝니다.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 pt-4 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
                  <button type="button" onClick={scrollToFeaturedCourse} className="btn-primary py-4 px-8 text-base">
                    강의 살펴보기
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button type="button" onClick={onGoToContact} className="btn-secondary py-4 px-8 text-base bg-white">
                    1:1 상담 신청
                  </button>
                </div>

                {/* Social Proof Stats */}
                <div className="flex items-center justify-center lg:justify-start gap-8 pt-8 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
                  <div className="text-center lg:text-left">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">1,000+</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">누적 수강생</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center lg:text-left">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">98%</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">강의 만족도</div>
                  </div>
                  <div className="w-px h-8 bg-slate-200" />
                  <div className="text-center lg:text-left">
                    <div className="text-2xl font-black text-slate-900 tracking-tight">19년</div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">실무 경력</div>
                  </div>
                </div>
              </div>

              <div className="flex-1 relative scale-105 lg:scale-110 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                <div className="relative z-10 rounded-[32px] overflow-hidden shadow-2xl shadow-indigo-200/50 border-4 border-white rotate-1 lg:rotate-2 hover:rotate-0 transition-transform duration-700">
                  <img 
                    src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?q=80&w=2670&auto=format&fit=crop" 
                    alt="Clinical Education" 
                    className="w-full h-auto object-cover aspect-[4/3]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />
                  <div className="absolute bottom-6 left-6 right-6 p-4 glass-dark rounded-2xl border border-white/20">
                    <p className="text-white text-sm font-bold leading-relaxed">
                      "단순한 이론이 아닌, 내일 아침 진료실에서 <br/>바로 적용할 수 있는 데이터 구조를 배웁니다."
                    </p>
                  </div>
                </div>
                {/* Decorative floating elements */}
                <div className="absolute -top-10 -right-6 w-32 h-32 bg-indigo-600/10 blur-3xl rounded-full animate-blob" />
                <div className="absolute -bottom-10 -left-6 w-40 h-40 bg-purple-600/10 blur-3xl rounded-full animate-blob" style={{ animationDelay: '2s' }} />
              </div>
            </div>
          </div>
        </section>

        {/* Featured Course Section (Dark Card) */}
        <section id="featured-course-section" className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900">진행 중인 프리미엄 클래스</h2>
                <p className="text-lg text-slate-500 font-medium">가장 추천하는 베스트 마스터리 과정입니다.</p>
              </div>
              <div className="flex gap-2">
                <span className="px-4 py-2 rounded-full bg-slate-100 text-slate-600 text-sm font-bold border border-slate-200">전체보기</span>
                <span className="px-4 py-2 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-lg shadow-indigo-200">진행중</span>
              </div>
            </div>

            {/* The Featured Master Card */}
            <div className="group relative bg-[#0F172A] rounded-[40px] overflow-hidden shadow-2xl shadow-slate-900/20 border border-slate-800 transition-all duration-500 hover:shadow-indigo-500/10">
              <div className="flex flex-col lg:flex-row">
                {/* Left: Content */}
                <div className="flex-[1.2] p-8 md:p-12 lg:p-16 space-y-8">
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-red-500 text-white text-[11px] font-black tracking-tighter uppercase animate-pulse">슈퍼얼리버드 마감 임박</span>
                    <span className="px-3 py-1 rounded-full bg-white/10 text-white text-[11px] font-bold tracking-tight uppercase backdrop-blur-sm">{featuredCategory}</span>
                  </div>

                  <div className="space-y-4">
                    <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">PREMIUM CLASS · 4 HOURS</p>
                    <h3 className="text-2xl md:text-3xl lg:text-4xl font-black text-white leading-tight whitespace-pre-line">
                      {featuredHeadline}
                    </h3>
                    <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                      {featuredSummary}
                    </p>
                  </div>

                  <div className="flex items-center gap-10 pt-4">
                    <div>
                      <div className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">정상가</div>
                      <div className="text-slate-500 text-xl font-medium line-through decoration-slate-600">₩280,000</div>
                    </div>
                    <div>
                      <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-1">입력구조 최적화 프로모션</div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-white text-3xl lg:text-4xl font-black">99,000</span>
                        <span className="text-white text-lg font-bold">원</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6">
                    <button
                      type="button"
                      onClick={() => navigateToCourse(featuredSlug)}
                      className="inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-lg transition-all transform hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/40"
                    >
                      강의 상세 보기
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Right: Before/After Graphic */}
                <div className="flex-1 bg-slate-800/50 relative border-l border-white/5 overflow-hidden min-h-[350px] lg:min-h-auto">
                  <div className="absolute inset-0 flex items-center justify-center p-8">
                    <div className="w-full max-w-md space-y-6">
                      {/* Before State */}
                      <div className="relative group/b1 p-6 rounded-2xl bg-white/5 border border-white/10 opacity-60 scale-95 transition-all duration-700">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">Conventional</span>
                          <span className="text-slate-400 text-sm font-bold">매주 2시간</span>
                        </div>
                        <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full w-full bg-slate-600" />
                        </div>
                        <p className="mt-3 text-slate-400 text-sm font-medium">수기 기록 대조 및 엑셀 중복 입력</p>
                      </div>

                      <div className="flex justify-center -my-2 relative z-10">
                        <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                          </svg>
                        </div>
                      </div>

                      {/* After State */}
                      <div className="relative group/b2 p-6 rounded-2xl bg-indigo-500/10 border border-indigo-400/30 transform transition-all duration-700 hover:scale-[1.02]">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-indigo-400 text-xs font-bold uppercase tracking-widest">DenJOY Mastery</span>
                          <span className="text-indigo-300 text-sm font-black">단 5분</span>
                        </div>
                        <div className="h-2 w-full bg-indigo-900/50 rounded-full overflow-hidden">
                          <div className="h-full w-[5%] bg-indigo-400 animate-pulse" />
                        </div>
                        <p className="mt-3 text-indigo-100 text-sm font-bold">입력 구조 변경을 통한 데이터 자동 동기화</p>
                        
                        {/* Shimmer effect */}
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
                      </div>
                    </div>
                  </div>

                  {/* Background grid for graphic side */}
                  <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {additionalTopics.length > 0 && (
          <section className="pb-12 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-4 mb-8">
                <div>
                  <p className="text-xs font-black tracking-[0.3em] text-slate-400 mb-2">TOPIC LIST</p>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-900">운영 중인 강의 주제</h2>
                </div>
                <p className="text-sm font-medium text-slate-500">주제는 유지하고 시즌만 교체하는 구조입니다.</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {additionalTopics.map((topic) => (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => navigateToCourse(topic.slug)}
                    className="text-left rounded-[28px] border border-slate-200 bg-slate-50 p-6 transition-all hover:-translate-y-1 hover:border-indigo-200 hover:bg-white hover:shadow-lg"
                  >
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-[11px] font-black tracking-tight text-indigo-700">
                        {topic.category || '강의 주제'}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/{topic.slug}</span>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 mb-3">{topic.title}</h3>
                    <p className="text-sm leading-relaxed text-slate-600 mb-5">
                      {topic.short_description || topic.hero_summary || '회차별 일정과 금액만 교체해서 시즌 운영에 맞게 확장할 수 있습니다.'}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-black text-indigo-600">
                      상세 보기
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.4} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Instructor Section */}
        <section className="py-24 bg-slate-50 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-16">
              <div className="lg:w-1/3 relative">
                <div className="aspect-[3/4] rounded-[40px] overflow-hidden shadow-2xl grayscale hover:grayscale-0 transition-all duration-500">
                  <img src="https://images.unsplash.com/photo-1559839734-2b71f1536783?q=80&w=2670&auto=format&fit=crop" alt="Instructor" className="w-full h-full object-cover" />
                </div>
                <div className="absolute -bottom-6 -right-6 p-8 bg-white rounded-3xl shadow-xl border border-slate-100 max-w-[240px]">
                  <p className="text-slate-900 font-black text-xl mb-1">맹준호 <span className="text-slate-400 text-base font-bold ml-1">강사</span></p>
                  <p className="text-indigo-600 text-sm font-bold">DenJOY 데이터 전략 리드</p>
                </div>
              </div>
              
              <div className="lg:w-2/3 space-y-10">
                <div className="space-y-4">
                  <h3 className="text-indigo-600 font-bold uppercase tracking-widest text-sm">Instructor</h3>
                  <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">왜 이 강사에게 <br className="hidden md:block" />배워야 할까요?</h2>
                </div>
                
                <div className="grid md:grid-cols-2 gap-8 text-slate-600 font-medium">
                  <div className="space-y-4 p-6 bg-white rounded-2xl border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <p className="text-slate-900 font-bold">19년 이상의 실전 필드 경험</p>
                    <p className="text-sm leading-relaxed">대형 치과부터 개인 클리닉까지 수많은 현장을 누비며 데이터 구조의 문제점을 현미경처럼 분석해왔습니다.</p>
                  </div>
                  <div className="space-y-4 p-6 bg-white rounded-2xl border border-slate-200">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <p className="text-slate-900 font-bold">국내 유일 덴트웹 연동 설계자</p>
                    <p className="text-sm leading-relaxed">덴트웹의 복잡한 데이터 구조를 완벽히 이해하고 이를 실무 프로세스와 결합하는 유일한 노하우를 공개합니다.</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-6">
                    <div className="flex -space-x-3">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="w-12 h-12 rounded-full border-4 border-white bg-slate-200 overflow-hidden">
                          <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="user" />
                        </div>
                      ))}
                    </div>
                    <p className="text-slate-500 font-bold text-sm">
                      <span className="text-slate-900">324명</span>의 수강생이 이 강사의 강의를 수강 중입니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center space-y-4 mb-16">
              <h3 className="text-indigo-600 font-bold uppercase tracking-widest text-sm">Testimonials</h3>
              <h2 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900">생생한 수강 후기</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                { 
                  text: "매주 퇴근 후에 엑셀과 싸우던 시간이 사라졌습니다. 입력 구조 하나만 바꿨을 뿐인데 모든 데이터가 정렬되는 경험이 신기해요.", 
                  author: "이○진", role: "치과위생사 7년차" 
                },
                { 
                  text: "덴트웹을 5년 넘게 썼지만 이런 기능이 있고 이렇게 활용할 줄은 몰랐습니다. 실장님들과 공유해서 바로 시스템화했습니다.", 
                  author: "김○태", role: "A치과 대표원장" 
                },
                { 
                  text: "신입 선생님들도 금방 적응하는 시스템을 만들 수 있었습니다. 복잡한 교육 시간은 줄고 진료 집중도는 올라갔습니다.", 
                  author: "박○희", role: "총괄실장" 
                }
              ].map((t, i) => (
                <div key={i} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 hover:border-indigo-200 transition-all group scale-100 hover:scale-[1.03]">
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(s => (
                      <svg key={s} className="w-5 h-5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <blockquote className="text-slate-700 text-lg font-medium leading-relaxed mb-8 italic">
                    "{t.text}"
                  </blockquote>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-black">
                      {t.author[0]}
                    </div>
                    <div>
                      <p className="text-slate-900 font-black text-sm">{t.author}</p>
                      <p className="text-slate-500 text-xs font-bold">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="max-w-5xl mx-auto px-4">
            <div className="relative rounded-[40px] bg-indigo-600 p-8 md:p-16 text-center overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '16px 16px' }} />
              <div className="relative z-10 space-y-8">
                <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight">수강 후 바로 시작하는 <br className="hidden md:block" />데이터 혁신</h2>
                <p className="text-indigo-100 text-lg md:text-xl font-medium max-w-2xl mx-auto">지금 신청하시면 70,000원 상당의 데이터 분석 리포트를 무료로 제공해 드립니다.</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => navigateToCourse(featuredSlug)}
                    className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-white text-indigo-600 font-black text-xl shadow-xl hover:shadow-2xl transition-all hover:scale-105 active:scale-95"
                  >
                    지금 강의 보러가기
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      <HomepageFooter onGoToContact={onGoToContact} onGoToTerms={onGoToTerms} onGoToPrivacy={onGoToPrivacy} />
    </div>
  );
};

export default CoursesPage;
