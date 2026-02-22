
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { reviewService, UserReview, ReviewRole, formatReviewDisplayName } from '../services/reviewService';


interface LandingPageProps {
  onGetStarted: () => void;
  onAnalyze?: () => void;
  onGoToValue?: () => void;
  onGoToPricing?: () => void;
  onGoToNotices?: () => void;
  onGoToContact?: () => void;
}

/* ───── Counter Animation Hook (목표 그라데이션: 숫자가 차오르는 모습) ───── */
const useCountUp = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setStarted(true); },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return { count, ref };
};

const LandingPage: React.FC<LandingPageProps> = ({
  onGetStarted,
  onAnalyze,
  onGoToValue,
  onGoToPricing,
  onGoToNotices,
  onGoToContact,
}) => {
  const stat1 = useCountUp(104, 800);
  const stat2 = useCountUp(14, 600);
  const stat3 = useCountUp(5, 600);
  const stat4 = useCountUp(0, 400);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [mobileNotice, setMobileNotice] = useState<string | null>(null);
  const [featuredReviews, setFeaturedReviews] = useState<UserReview[]>([]);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselFading, setCarouselFading] = useState(false);

  useEffect(() => {
    reviewService.getFeaturedReviews().then(setFeaturedReviews).catch(() => {});
  }, []);

  useEffect(() => {
    if (featuredReviews.length <= 3) return;
    const t = setInterval(() => {
      setCarouselFading(true);
      setTimeout(() => {
        setCarouselIndex(i => (i + 1) % featuredReviews.length);
        setCarouselFading(false);
      }, 250);
    }, 4500);
    return () => clearInterval(t);
  }, [featuredReviews.length]);

  const scrollToSection = useCallback((sectionId: string) => {
    const target = document.getElementById(sectionId);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleAnalyzeClick = useCallback(() => {
    if (!onAnalyze) return;
    const isRealMobileDevice = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
    if (isRealMobileDevice) {
      setMobileNotice('무료분석은 PC에서 이용 가능합니다. PC로 접속해 주세요.');
      return;
    }
    onAnalyze();
  }, [onAnalyze]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 1279px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', syncViewport);
      return () => mediaQuery.removeEventListener('change', syncViewport);
    }
    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (!mobileNotice) return;
    const timer = window.setTimeout(() => setMobileNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [mobileNotice]);

  return (
    <div className={`flex flex-col min-h-screen bg-slate-50 font-sans break-keep selection:bg-indigo-500 selection:text-white overflow-x-hidden ${isMobileViewport ? 'pb-24' : ''}`}>

      {/* ═══════════════════════════════════════════
          Hero Section
          심리효과: 프레이밍 + 손실 회피 + 결핍 효과
          - 구체적 숫자로 프레이밍 ("연 104시간 절약")
          - 손실 암시 ("매주 2시간을 낭비")
          - 결핍: 얼리어답터 한정 모집
         ═══════════════════════════════════════════ */}
      <section className="relative flex flex-col justify-center items-center pt-20 pb-12 sm:pt-28 sm:pb-16 lg:pt-44 lg:pb-28 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50/50 via-white to-white"></div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* 결핍 효과: 얼리어답터 한정 모집 */}
          <div className="inline-flex max-w-[min(92vw,680px)] flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/50 backdrop-blur-md border border-white/60 shadow-sm mb-5 sm:mb-8 animate-fade-in-up">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span>
            </span>
            <span className="text-[11px] sm:text-sm font-bold text-slate-800 tracking-tight leading-relaxed text-balance">베타 테스터 10곳 한정 모집 중 &middot; 4주 무료 체험</span>
          </div>

          {/* 프레이밍: 구체적 수치로 가치 제시 */}
          <h1 className="text-[2rem] sm:text-5xl md:text-7xl font-black tracking-tight text-slate-900 mb-4 sm:mb-6 leading-[1.14] sm:leading-tight text-balance animate-fade-in-up animation-delay-200">
            임플란트 재고관리,<br className="sm:hidden" /><br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">
              연 104시간을 돌려드립니다
            </span>
          </h1>

          {/* 손실 회피: 현재 낭비를 암시 */}
          <p className="mt-3 sm:mt-4 text-[15px] sm:text-lg md:text-2xl leading-relaxed text-slate-600 font-medium max-w-3xl mx-auto text-balance animate-fade-in-up animation-delay-400">
            매주 <strong className="text-rose-500">2시간</strong>씩 엑셀 정리에 쓰는 시간,{' '}
            <strong className="text-slate-900">5분</strong>으로 바꾸세요.<br className="hidden md:block" />
            덴트웹 데이터를 업로드하면 나머지는 자동입니다.
          </p>

          {/* 힉스의 법칙: 선택지를 줄여 명확한 행동 유도 */}
          <div className="mt-7 sm:mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5 animate-fade-in-up animation-delay-400">
            <button
              onClick={onGetStarted}
              className="group relative px-7 sm:px-8 py-3.5 sm:py-4 bg-slate-900 text-white text-base sm:text-lg font-bold rounded-2xl shadow-2xl shadow-slate-900/20 hover:shadow-slate-900/40 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
              <span className="relative flex items-center gap-3">
                무료로 시작하기
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            <span className="text-xs sm:text-sm text-slate-400">카드 정보 불필요 &middot; 1분 가입</span>
          </div>

          {/* 피드포워드: 가입 후 얻을 결과 미리보기 */}
          <div className="mt-5 sm:mt-8 flex flex-wrap items-center justify-center gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-2 text-[12px] sm:text-sm text-slate-500 animate-fade-in-up animation-delay-400">
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              실시간 재고 현황
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              자동 재고 차감
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              스마트 발주
            </span>
          </div>
        </div>

        {/* Dashboard Mockup */}
        <div className="mt-10 sm:mt-20 relative z-10 w-full max-w-4xl sm:max-w-6xl mx-auto px-3 sm:px-4 perspective-1000 animate-fade-in-up animation-delay-400">
          <div className="relative rounded-2xl bg-slate-900/5 p-1.5 sm:p-2 backdrop-blur-xl ring-1 ring-slate-900/10 shadow-2xl transform rotate-x-6 sm:rotate-x-12 hover:rotate-x-0 transition-transform duration-700 ease-out-back origin-center">
            <div className="rounded-xl bg-white shadow-inner overflow-hidden border border-slate-200/50 aspect-[16/9] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
              <div className="text-center">
                <div className="w-14 h-14 sm:w-20 sm:h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2 sm:mb-4">
                  <svg className="w-7 h-7 sm:w-10 sm:h-10 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <span className="text-slate-400 text-xs sm:text-sm font-medium">Dashboard Preview</span>
              </div>
            </div>
          </div>
          <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur-2xl opacity-20 -z-10"></div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Trust Bar
          심리효과: 권위 편향 + 프레이밍
          - 연동 가능한 시스템/지원 브랜드로 신뢰 확보
         ═══════════════════════════════════════════ */}
      <section className="py-5 sm:py-8 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <p className="text-center text-[11px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 sm:mb-3">
            덴트웹 기본셋팅 전 제조사 데이터 적용
          </p>
          <p className="text-center text-slate-300 font-black text-sm sm:text-base md:text-lg tracking-tight leading-relaxed max-w-5xl mx-auto">
            OSSTEM · Dentium · Megagen · Neobiotech · DIO · Warantec · Dentis · Straumann · Magicore · 신흥 · 탑플란 · 포인트임플란트 등
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Pain Points
          심리효과: 손실 회피 + 인지적 불일치 + 가용성 휴리스틱
          - 현재 방식의 구체적 손실을 생생하게 묘사
          - 인지적 불일치: "나도 이러고 있나?" 자각 유도
         ═══════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-3">Hidden Costs</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 text-balance">
              혹시 이런 경험, 있으신가요?
            </h2>
            <p className="text-slate-500 mt-3 text-base sm:text-lg text-balance">하나라도 해당된다면, 지금이 바꿀 때입니다</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
            {[
              {
                emoji: '1',
                title: '"이 사이즈 재고 있어?"',
                desc: '수술 직전, 필요한 사이즈가 있는지 확인하려고 창고를 뒤지거나 엑셀을 열어야 했던 적',
                tag: '재고 파악 지연',
              },
              {
                emoji: '2',
                title: '"또 발주를 빠뜨렸네"',
                desc: '재고가 바닥났는데 아무도 몰랐거나, 이미 넉넉한 사이즈를 또 주문해버린 적',
                tag: '발주 실수 반복',
              },
              {
                emoji: '3',
                title: '"이 엑셀 또 정리해야 해?"',
                desc: '매주 반복되는 수동 재고 정리. 직원들은 지치고, 정작 환자 케어에 쓸 시간은 줄어드는 악순환',
                tag: '비생산적 반복 업무',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center font-black text-sm mb-4 sm:mb-5">
                  {item.emoji}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-3 text-balance">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4 text-balance">{item.desc}</p>
                <span className="text-xs font-bold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full">{item.tag}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Aha! Moment + Contrast
          심리효과: 아하! 모먼트 + 대비 효과
          - 제품의 핵심 가치를 한 눈에 인식
          - Before/After 대비로 변화의 크기 체감
         ═══════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Transformation</p>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 text-balance">DenJOY가 바꾸는 일상</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8">
            {[
              {
                before: '재고 파악 30분~1시간',
                after: '클릭 한 번, 5분',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                label: '재고 확인',
              },
              {
                before: '감으로 발주, 잦은 실수',
                after: '데이터 기반 자동 추천',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                  </svg>
                ),
                label: '발주 관리',
              },
              {
                before: '수동 엑셀 정리 매주 반복',
                after: '수술 기록 자동 연동',
                icon: (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                ),
                label: '데이터 관리',
              },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-4 sm:mb-5">
                  {item.icon}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 sm:mb-4">{item.label}</p>
                <div className="bg-slate-100 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 mb-2.5 sm:mb-3">
                  <p className="text-sm text-slate-400 line-through">{item.before}</p>
                </div>
                <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400 mx-auto mb-2.5 sm:mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <div className="bg-indigo-50 rounded-xl px-4 sm:px-5 py-2.5 sm:py-3 border border-indigo-100">
                  <p className="text-sm text-indigo-700 font-bold">{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Features - Bento Grid (6-card)
          심리효과: 앵커링 + 특이성 효과(폰 레스토르프)
          - 가장 인상적인 기능을 먼저 배치 (앵커링)
          - 핵심 기능 카드를 시각적으로 차별화 (폰 레스토르프)
         ═══════════════════════════════════════════ */}
      <section id="features" className="py-16 sm:py-24 bg-slate-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase">Key Features</h2>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">병원 운영의 품격을 높이는 기능</p>
            <p className="mt-3 text-base sm:text-lg text-slate-500 max-w-2xl mx-auto">치과 임플란트 관리의 모든 것을 하나로</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">

            {/* Card 1 — 실시간 재고 & 자동 차감 (Hero, row-span-2) */}
            <div className="group relative p-5 sm:p-8 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-[2rem] shadow-xl shadow-indigo-200 text-white overflow-hidden md:row-span-2 flex flex-col">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-bl-[2rem] -mr-8 -mt-8"></div>
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
              <div className="relative z-10 flex flex-col flex-1">
                <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm mb-4 sm:mb-6">
                  <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-xs font-bold mb-4 w-fit">
                  <span className="w-1.5 h-1.5 bg-amber-300 rounded-full"></span>
                  가장 인기 있는 기능
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-3 text-balance">실시간 재고 & 자동 차감</h3>
                <p className="text-indigo-100 leading-relaxed text-balance flex-1">
                  수술 기록을 업로드하면 재고가 자동으로 차감됩니다. 브랜드/사이즈별 현재고를 한눈에 파악하고,
                  부족 시 즉시 알림을 받으세요.
                </p>
                <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-white/20">
                  {['업로드 후 30초', '14개 브랜드', '실시간 알림'].map(stat => (
                    <span key={stat} className="px-2.5 py-1 rounded-full bg-white/15 text-xs font-semibold text-white/90 backdrop-blur-sm">
                      {stat}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Card 2 — 수술 통계 & 임상 분석 (NEW) */}
            <div className="group relative p-5 sm:p-8 bg-white rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[2rem] -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-emerald-100"></div>
              <div className="relative z-10">
                <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-2xl bg-emerald-50 shadow-sm mb-4 sm:mb-6 text-emerald-600 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold mb-3">
                  NEW
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 text-balance">수술 통계 & 임상 분석</h3>
                <p className="text-slate-500 leading-relaxed text-balance">
                  월별 수술 트렌드, 제조사별 점유율, 식립 위치 분석까지. 데이터로 임상 패턴을 파악하고 발주 계획에 활용하세요.
                </p>
              </div>
            </div>

            {/* Card 3 — FAIL 완전 추적 */}
            <div className="group relative p-5 sm:p-8 bg-white rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-bl-[2rem] -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-rose-100"></div>
              <div className="relative z-10">
                <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-2xl bg-rose-50 shadow-sm mb-4 sm:mb-6 text-rose-600 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 text-balance">FAIL 완전 추적</h3>
                <p className="text-slate-500 leading-relaxed text-balance">
                  수술 중 FAIL → 교환 접수 → 입고 확인까지 단계별 추적. 브랜드별 FAIL률을 자동으로 계산합니다.
                </p>
              </div>
            </div>

            {/* Card 4 — 스마트 발주 추천 */}
            <div className="group relative p-5 sm:p-8 bg-white rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[2rem] -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-amber-100"></div>
              <div className="relative z-10">
                <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-2xl bg-amber-50 shadow-sm mb-4 sm:mb-6 text-amber-600 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 text-balance">스마트 발주 추천</h3>
                <p className="text-slate-500 leading-relaxed text-balance">
                  소모 패턴 기반 적정 재고 자동 계산. 원클릭 발주 생성으로 과주문·품절을 방지하세요.
                </p>
              </div>
            </div>

            {/* Card 5 — 재고 실사 & 불일치 감지 */}
            <div className="group relative p-5 sm:p-8 bg-white rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-sky-50 rounded-bl-[2rem] -mr-8 -mt-8 transition-all group-hover:scale-110 group-hover:bg-sky-100"></div>
              <div className="relative z-10">
                <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-2xl bg-sky-50 shadow-sm mb-4 sm:mb-6 text-sky-600 group-hover:scale-110 transition-transform duration-300">
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-3 text-balance">재고 실사 & 불일치 감지</h3>
                <p className="text-slate-500 leading-relaxed text-balance">
                  실물 재고와 시스템 재고를 비교합니다. 불일치 항목을 즉시 파악하고 실사 이력을 관리하세요.
                </p>
              </div>
            </div>

            {/* Card 6 — 스마트 데이터 정규화 (Wide, col-span-3) */}
            <div className="group relative p-5 sm:p-8 bg-white rounded-[2rem] hover:shadow-xl transition-all duration-300 border border-slate-200 overflow-hidden md:col-span-3">
              <div className="absolute top-0 right-0 w-40 h-40 bg-purple-50 rounded-bl-[3rem] -mr-10 -mt-10 transition-all group-hover:scale-110 group-hover:bg-purple-100"></div>
              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                {/* 좌측: 아이콘 + 텍스트 */}
                <div className="flex items-start gap-4 sm:gap-6 flex-1">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 flex items-center justify-center rounded-2xl bg-purple-50 shadow-sm text-purple-600 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 mb-2 text-balance">스마트 데이터 정규화</h3>
                    <p className="text-slate-500 leading-relaxed text-balance">
                      다양한 제조사와 브랜드의 파편화된 이름을 표준 규격으로 자동 변환합니다. 오타 자동 수정으로 데이터 정확도 99.9%.
                    </p>
                  </div>
                </div>
                {/* 우측: Stat 수치 */}
                <div className="flex sm:flex-col gap-4 sm:gap-4 sm:border-l sm:border-slate-100 sm:pl-10 flex-shrink-0">
                  {[
                    { value: '14개', label: '지원 브랜드' },
                    { value: '99.9%', label: '데이터 정확도' },
                    { value: '자동', label: '오타 수정' },
                  ].map(({ value, label }) => (
                    <div key={label} className="flex sm:flex-row items-center gap-2">
                      <span className="text-xl sm:text-2xl font-extrabold text-purple-600 leading-none">{value}</span>
                      <span className="text-xs text-slate-400 font-medium leading-tight">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Free Analysis CTA
          심리효과: 호혜성 + 인지 편향 활용
          - 무료 가치를 먼저 제공하여 관심 유도
         ═══════════════════════════════════════════ */}
      {onAnalyze && (
        <section className="py-12 sm:py-16 bg-gradient-to-r from-emerald-600 to-teal-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-white/20 backdrop-blur-sm mb-4 sm:mb-6">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span className="text-xs sm:text-sm font-bold text-white">회원가입 없이 무료</span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white mb-4 text-balance">
              먼저 우리 병원 데이터 품질을 확인해보세요
            </h2>
            <p className="text-emerald-100 text-base sm:text-lg mb-8 max-w-2xl mx-auto text-balance">
              픽스쳐 재고 파일과 수술기록지를 업로드하면, FAIL 관리·보험청구 구분·매칭률 등 6가지 항목을 즉시 진단합니다.
            </p>
            <button
              onClick={handleAnalyzeClick}
              className="group px-6 sm:px-8 py-3 sm:py-4 bg-white text-emerald-700 text-base sm:text-lg font-black rounded-2xl shadow-2xl shadow-emerald-900/30 hover:shadow-emerald-900/50 hover:-translate-y-1 transition-all duration-300"
            >
              <span className="flex items-center gap-3">
                무료 분석하기
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </button>
            <p className="text-xs text-emerald-200 mt-3">서버 저장 없음 · 즉시 결과 확인 · 30초 소요</p>
          </div>
        </section>
      )}

      {/* ═══════════════════════════════════════════
          Stats Section
          심리효과: 프레이밍 + 시각 고정(Visual Anchors)
          - 숫자를 시각적으로 고정시켜 기억에 남김
          - 카운트업 애니메이션으로 목표 그라데이션 효과
         ═══════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 text-center">
            <div ref={stat1.ref} className="p-4 sm:p-6">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-1.5 sm:mb-2">
                {stat1.count}<span className="text-xl sm:text-2xl lg:text-3xl">시간</span>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm mb-1">연간 절약 시간</div>
              <div className="text-slate-500 text-xs">주 2시간 x 52주</div>
            </div>
            <div ref={stat2.ref} className="p-4 sm:p-6">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-1.5 sm:mb-2">
                {stat2.count}<span className="text-xl sm:text-2xl lg:text-3xl">개</span>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm mb-1">적용 브랜드</div>
              <div className="text-slate-500 text-xs">덴트웹 기본셋팅 전 제조사</div>
            </div>
            <div ref={stat3.ref} className="p-4 sm:p-6">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-1.5 sm:mb-2">
                {stat3.count}<span className="text-xl sm:text-2xl lg:text-3xl">분</span>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm mb-1">재고 확인 시간</div>
              <div className="text-slate-500 text-xs">클릭 한 번이면 끝</div>
            </div>
            <div ref={stat4.ref} className="p-4 sm:p-6">
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-slate-400 mb-1.5 sm:mb-2">
                {stat4.count}<span className="text-xl sm:text-2xl lg:text-3xl">원</span>
              </div>
              <div className="text-white font-bold text-xs sm:text-sm mb-1">도입 비용</div>
              <div className="text-slate-500 text-xs">무료 플랜으로 바로 시작</div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          How It Works
          심리효과: 목표 그라데이션 + 피드포워드 + 포카요케
          - 3단계 진행으로 "쉽게 할 수 있다" 인식
          - 각 단계 후 결과를 미리 제시 (피드포워드)
          - 실수 방지 설계 (포카요케): 자동 변환/분류
         ═══════════════════════════════════════════ */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase">How It Works</h2>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">3단계로 바로 시작</p>
            <p className="text-slate-500 mt-3 text-balance">복잡한 설치나 교육 없이, 하루면 충분합니다</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-10 relative">
            <div className="hidden md:block absolute top-12 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200"></div>
            {[
              {
                step: '01',
                title: '회원가입',
                desc: '병원명과 기본 정보만 입력하면 즉시 대시보드가 열립니다.',
                result: '→ 1분 안에 완료',
              },
              {
                step: '02',
                title: '데이터 업로드',
                desc: '사용 중인 덴트웹 엑셀을 그대로 업로드. 자동으로 제조사/브랜드/사이즈를 분류합니다.',
                result: '→ 자동 정규화 완료',
              },
              {
                step: '03',
                title: '자동 관리 시작',
                desc: '수술 기록이 쌓일수록 재고가 자동 차감되고, 부족 시 발주 추천까지.',
                result: '→ 매주 2시간 절약',
              },
            ].map((item, i) => (
              <div key={i} className="text-center relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center mx-auto mb-4 sm:mb-5 font-black text-xs sm:text-sm shadow-lg shadow-indigo-200 relative z-10">
                  {item.step}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-2 text-balance">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-3 text-balance">{item.desc}</p>
                <span className="text-xs font-bold text-indigo-600">{item.result}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Testimonials
          심리효과: 사회적 증거 + 유사성의 법칙 + 권위 편향
          - 다양한 역할(원장/실장/매니저)의 후기 → 유사성
          - 구체적 수치 포함 → 가용성 휴리스틱
          - 직함 표시 → 권위 편향
         ═══════════════════════════════════════════ */}
      <section id="testimonials" className="py-16 sm:py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-base font-bold text-indigo-600 tracking-wide uppercase">Early Adopters</h2>
            <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 sm:text-4xl text-balance">베타 테스터 후기</p>
          </div>
          {/* 평균 평점 (featured 후기 2건 이상 시 표시) */}
          {featuredReviews.length >= 2 && (() => {
            const avg = featuredReviews.reduce((s, r) => s + r.rating, 0) / featuredReviews.length;
            return (
              <div className="flex items-center justify-center gap-2 mb-8">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <svg key={s} className={`w-5 h-5 ${s <= Math.round(avg) ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-700">{avg.toFixed(1)}</span>
                <span className="text-sm text-slate-400">({featuredReviews.length}개 후기)</span>
              </div>
            );
          })()}

          {(() => {
            const FALLBACK: UserReview[] = [
              { id: '_1', user_id: '', review_type: 'initial', rating: 5, content: '덴트웹 데이터 정리에 매주 2시간씩 쓰던 시간이 사라졌습니다. 업로드 한 번이면 브랜드별 재고가 한눈에 들어와요.', display_last_name: '김', display_role: '원장' as ReviewRole, display_hospital: '서울 치과의원', is_public: true, is_featured: true, created_at: '', updated_at: '' },
              { id: '_2', user_id: '', review_type: 'initial', rating: 5, content: '수술 기록과 재고가 자동으로 연동되니까, 어떤 사이즈가 부족한지 미리 알 수 있어서 발주 실수가 확 줄었어요.', display_last_name: '박', display_role: '실장' as ReviewRole, display_hospital: '경기 치과의원', is_public: true, is_featured: true, created_at: '', updated_at: '' },
              { id: '_3', user_id: '', review_type: 'initial', rating: 5, content: '엑셀로 하루 종일 걸리던 월말 재고 정리가 5분이면 끝납니다. 직원들이 가장 좋아하는 변화예요.', display_last_name: '이', display_role: '팀장' as ReviewRole, display_hospital: '부산 치과의원', is_public: true, is_featured: true, created_at: '', updated_at: '' },
            ];
            const displayList = featuredReviews.length > 0 ? featuredReviews : FALLBACK;
            const isCarousel = displayList.length > 3;
            const visibleItems = isCarousel
              ? [0, 1, 2].map(offset => displayList[(carouselIndex + offset) % displayList.length])
              : displayList;

            const goTo = (idx: number) => {
              setCarouselFading(true);
              setTimeout(() => { setCarouselIndex(idx); setCarouselFading(false); }, 250);
            };

            return (
              <div>
                <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 transition-opacity duration-200 ${carouselFading ? 'opacity-0' : 'opacity-100'}`}>
                  {visibleItems.map((r, vi) => {
                    const displayName = formatReviewDisplayName(r.display_last_name, r.display_role as ReviewRole | null, r.display_hospital);
                    return (
                      <div key={isCarousel ? `${carouselIndex}-${vi}` : r.id} className="bg-white rounded-2xl p-5 sm:p-8 border border-slate-100 flex flex-col hover:shadow-lg transition-shadow">
                        <div className="flex gap-1 mb-3 sm:mb-4">
                          {[1, 2, 3, 4, 5].map(s => (
                            <svg key={s} className={`w-4 h-4 sm:w-5 sm:h-5 ${s <= r.rating ? 'text-amber-400' : 'text-slate-200'}`} fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        <p className="text-slate-600 text-sm sm:text-base leading-relaxed flex-1 mb-4 sm:mb-6 text-balance">"{r.content}"</p>
                        <div className="flex items-center pt-3 sm:pt-4 border-t border-slate-100 gap-2.5 sm:gap-3 min-w-0">
                          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {(r.display_last_name ?? '익').charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{displayName.line1}</p>
                            {displayName.line2 && <p className="text-[11px] sm:text-xs text-slate-400 truncate">{displayName.line2}</p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 캐러셀 네비게이션 (4개 이상) */}
                {isCarousel && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      onClick={() => goTo((carouselIndex - 1 + displayList.length) % displayList.length)}
                      className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex gap-1.5">
                      {displayList.map((_, i) => (
                        <button
                          key={i}
                          onClick={() => goTo(i)}
                          className={`rounded-full transition-all duration-300 ${i === carouselIndex ? 'w-5 h-2 bg-indigo-500' : 'w-2 h-2 bg-slate-300 hover:bg-slate-400'}`}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => goTo((carouselIndex + 1) % displayList.length)}
                      className="w-8 h-8 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-700 hover:border-slate-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          CTA Section
          심리효과: 결핍 효과 + 피크엔드 규칙 + 시작 편향(앵커링)
          - 결핍: "얼리어답터 한정 혜택"
          - 피크엔드: 페이지의 마지막을 강렬하게
          - 앵커링: "0원"을 먼저 보여주고 가치를 인식
         ═══════════════════════════════════════════ */}
      <section className="py-14 sm:py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex max-w-[min(92vw,640px)] flex-wrap items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-5 sm:mb-8">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            <span className="text-[11px] sm:text-sm font-bold text-amber-300 leading-relaxed text-balance">10곳 한정 · 4주 무료 베타 체험</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-black mb-5 sm:mb-6 leading-tight text-balance">
            지금 시작하면<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">4주 무료</span>
          </h2>
          <p className="text-slate-400 text-[15px] sm:text-lg mb-3 sm:mb-4 text-balance">
            엑셀에 쓰는 시간을 환자에게 쓰세요.
          </p>
          <p className="text-sm text-slate-500 mb-7 sm:mb-10 text-balance">
            베타 테스터 10곳 한정 &middot; 4주 무료 체험 &middot; 카드 불필요
          </p>
          <button
            onClick={onGetStarted}
            className="px-7 sm:px-10 py-3 sm:py-4 bg-white text-slate-900 text-base sm:text-lg font-black rounded-2xl shadow-2xl hover:shadow-white/20 hover:-translate-y-1 transition-all duration-300"
          >
            무료로 시작하기
          </button>
        </div>
      </section>

      {/* Footer - 약관 링크 + 기업정보 */}
      <footer className="border-t border-slate-200 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 pt-6 pb-2 flex justify-end gap-6">
          <button onClick={() => setShowTerms(true)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">이용약관</button>
          <button onClick={() => setShowPrivacy(true)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">개인정보처리방침</button>
        </div>
        <div className="max-w-4xl mx-auto px-6 pb-8 pt-4 text-xs text-slate-400 leading-relaxed">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-500 mb-1">디앤조이(DenJOY)</p>
              <p>대표: 맹준호 | 사업자등록번호: 528-22-01076</p>
              <p>이메일: admin@denjoy.info</p>
            </div>
            <p className="md:text-right text-slate-300">&copy; {new Date().getFullYear()} DenJOY. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* 이용약관 모달 */}
      {showTerms && (
        <div className="fixed inset-0 z-[300] bg-white overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-16">
            <button onClick={() => setShowTerms(false)} className="fixed top-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" /></svg>
              </div>
              <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-2">Terms of Service</p>
              <h1 className="text-3xl font-black text-slate-900">서비스 이용약관</h1>
              <p className="text-sm text-slate-400 mt-2">시행일: 2026년 2월 11일</p>
            </div>
            <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
              <p>본 약관은 디앤조이(이하 "회사")가 운영하는 웹사이트 denjoy.info(이하 "서비스")에서 제공하는 디지털 콘텐츠 서비스 관련 조건 및 절차, 서비스를 이용함에 있어 회사와 회원간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 1 조 (목적)</h3>
              <p>본 약관은 디앤조이(이하 "회사")가 운영하는 웹사이트 denjoy.info(이하 "서비스")에서 제공하는 디지털 콘텐츠 서비스 관련 조건 및 절차, 서비스를 이용함에 있어 회사와 회원간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 2 조 (용어의 정의)</h3>
              <p>"서비스"란 회사가 제작 또는 동의하에 제작된 '상품 등'을 디지털매체를 매개로하여 회원이 이용할 수 있도록 전자적 형태로 전송하는 것을 의미합니다.</p>
              <p>"회원"이란 서비스에 접속하여 본 약관에 따라 회사와 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 자를 의미합니다.</p>
              <p>"콘텐츠"란 이미지, 전자책, 노트 생성물, 디지털콘텐츠, 정보 등 디지털 방식으로 제작된 재화물을 말합니다.</p>
              <p>"아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 정하고 회사가 승인하는 문자와 숫자의 조합으로 이메일 주소 표현을 말합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 3 조 (약관의 게시와 개정)</h3>
              <p>1. 회사는 이 약관의 내용을 회원이 쉽게 알 수 있도록 서비스 초기 화면 또는 연결 화면을 통하여 게시합니다.</p>
              <p>2. 회사는 "전자상거래등에서의 소비자보호에 관한 법률", "약관의 규제에 관한 법률" 등 관련 법령을 위반하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
              <p>3. 회사가 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 서비스 공지사항을 통해 적용일 7일 전부터 적용일 전 일까지 공지합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 4 조 (서비스의 제공 및 변경)</h3>
              <p>회사는 다음과 같은 업무를 수행합니다.</p>
              <p className="pl-4">가. 자료 관련 판매 및 대리판매/제작<br />나. 디지털 콘텐츠(콘텐츠물), 문서 파일 등의 전달<br />다. 커뮤니티 및 게시판 서비스 운영<br />라. 기타 회사가 정하는 서비스</p>
              <p>서비스는 연중무휴, 1일 24시간 제공을 원칙으로 합니다. 다만, 회사의 정보 및 기술상의 필요에 따라 서비스가 일시적 중단될 수 있으며, 이 경우 사전에 공지합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 5 조 (회원가입 및 이용계약 체결)</h3>
              <p>1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의하는 의사표시를 함으로써 회원가입을 신청합니다.</p>
              <p>2. 회사는 다음 각 호에 해당되지 않는 한 회원가입을 승인합니다.</p>
              <p className="pl-4">가. 가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우<br />나. 등록 내용에 허위, 기재누락, 오기가 있는 경우<br />다. 기타 회원으로 등록하는 것이 회사의 기술상 현저히 지장이 있다고 인정되는 경우</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 6 조 (개인정보보호)</h3>
              <p>회사는 "개인정보 보호법" 등 관련 법령이 정하는 바에 따라 회원의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 사용에 대해서는 관련법령 및 회사의 개인정보처리방침이 적용됩니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 7 조 (회원의 아이디 및 비밀번호에 관한 의무)</h3>
              <p>1. 아이디와 비밀번호에 관한 관리책임은 회원에게 있습니다.</p>
              <p>2. 회원은 자신의 아이디 및 비밀번호를 제3자에게 이용하게 해서는 안 됩니다.</p>
              <p>3. 회원이 자신의 아이디 및 비밀번호를 도난당하거나 제3자가 사용하고 있음을 인지한 경우에는 즉시 회사에 통보하고 회사의 안내가 있는 경우에는 그에 따라야 합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 8 조 (상품의 공급 및 이용)</h3>
              <p>1. 디지털 콘텐츠의 제공: 회사는 회원이 구매한 디지털 콘텐츠를 다운로드 또는 온라인 방식으로 제공합니다. 유료 콘텐츠의 경우 결제 확인 후 이용이 가능합니다.</p>
              <p>2. 제공이 불가능한 경우의 조치: 회사는 디지털 콘텐츠의 제공이 불가능한 사실을 확인한 경우 즉시 필요한 조치를 취하며 구매대금을 환불합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 9 조 (청약철회 및 환불 정책)</h3>
              <p><strong>1. 일반 상품:</strong> 배송완료 날짜로부터 7일 이내 청약철회가 가능합니다. 단, 포장 훼손 등으로 상품 가치가 훼손된 경우에는 제한될 수 있습니다.</p>
              <p><strong>2. 디지털 콘텐츠:</strong></p>
              <p className="pl-4">가. 회원이 구매한 상품이 디지털 콘텐츠(스 다운로드, 전자책, 파일 등)인 경우, "전자상거래등에서의 소비자보호에 관한 법률"에 따라 다운로드 또는 스트리밍이 시작된 이후에는 청약철회가 제한됩니다.<br />나. 단, 파일이 손상되거나 내용이 표시된 내용과 다른 경우에는 구매일로부터 7일 이내 환불을 요청할 수 있습니다.<br />다. 회원의 구매건의 콘텐츠 구매일로부터 3개월 이내/콘텐츠 제공일로부터 30일 이내라면 환불이 가능합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 10 조 (저작권의 귀속 및 이용제한)</h3>
              <p>1. 회사가 작성한 저작물에 대한 저작권 및 기타 지적재산권은 회사에 귀속합니다.</p>
              <p>2. 회원은 서비스를 이용함으로써 얻은 정보나 콘텐츠를 회사의 사전 승낙 없이 복제, 송신, 출판, 배포, 방송, 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.</p>
              <p>3. 회원이 구매한 디지털 콘텐츠는 구매자 본인만 이용 가능합니다. 무단 복제/재배포를 금지하며, 회원간 계정 공유를 통한 부정이용도 금지합니다. 위반 시 민사/형사상 책임을 질 수 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 11 조 (회원의 게시물)</h3>
              <p>회원이 작성한 게시물에 대한 책임은 회원에게 있으며, 회사는 회원이 게시하는 내용이 다음 각 호에 해당되면 사전 통보 없이 삭제할 수 있습니다.</p>
              <p className="pl-4">가. 타인의 명예를 훼손하거나 비하하는 내용<br />나. 공서양속에 위반되는 내용<br />다. 저작권 기타 권리를 침해하는 내용<br />라. 회사의 게시판 운영 및 게시규정에 합하지 않는 내용<br />마. 스팸성 홍보글 또는 상업적 광고</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 12 조 (면책조항)</h3>
              <p>1. 회사는 천재지변, 디도스(DDoS) 공격, IDC 장애 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
              <p>2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
              <p>3. 회사는 회원이 서비스를 이용하여 기대하는 수익의 상실에 대하여 책임을 지지 않습니다. 서비스를 통해 획득한 정보에 대한 책임은 회원에게 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 13 조 (분쟁해결 및 관할법원)</h3>
              <p>1. 회사와 회원 간에 발생한 분쟁에 대하여는 상호 원만하게 해결하기 위해 노력합니다.</p>
              <p>2. 서비스 이용과 관련하여 발생한 분쟁에 대한 소송은 대한민국 법을 준거법으로 하며, 민사소송법상의 관할법원에 제기합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">부칙</h3>
              <p>이 약관은 2026년 2월 11일부터 시행합니다.</p>
            </div>
          </div>
        </div>
      )}

      {/* 개인정보처리방침 모달 */}
      {showPrivacy && (
        <div className="fixed inset-0 z-[300] bg-white overflow-y-auto">
          <div className="max-w-3xl mx-auto px-6 py-16">
            <button onClick={() => setShowPrivacy(false)} className="fixed top-6 right-6 z-10 w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 transition-colors">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            <div className="text-center mb-12">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              </div>
              <p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-2">Privacy Policy</p>
              <h1 className="text-3xl font-black text-slate-900">개인정보 처리방침</h1>
              <p className="text-sm text-slate-400 mt-2">시행일: 2026년 2월 11일</p>
            </div>
            <div className="prose prose-slate prose-sm max-w-none text-slate-600 leading-relaxed">
              <p>디앤조이(이하 "회사")는 "개인정보 보호법" 제30조에 따라 정보주체의 개인정보를 보호하고 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 하기 위하여 다음과 같이 개인정보 처리방침을 수립·공개합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 1 조 (개인정보의 처리목적)</h3>
              <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며 이용 목적이 변경되는 등 필요시 동의를 다시 받는 등 필요한 조치를 이행할 것입니다.</p>
              <p className="pl-4"><strong>가. 회원가입 및 관리:</strong> 회원 가입의사 확인, 본인 확인, 회원자격 유지·관리, 서비스 부정이용 방지, 각종 고지·통지 목적<br /><strong>나. 서비스 제공:</strong> 콘텐츠 제공, 구매 및 요금 결제, 물품배송 또는 서비스 제공<br /><strong>다. 교육서비스:</strong> 인재대상 선발 확인, 인재대상 계약 확인, 서비스대상에 관한 안내 통보, 출석 확인, 최종결과 확인 및 기록<br /><strong>라. 마케팅 및 광고:</strong> 신규 서비스 개발 및 알림 서비스 제공, 이벤트 제공 및 광고성 정보 제공 및 이를 관리·운영을 위한 목적으로 개인정보를 처리합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 2 조 (처리하는 개인정보 항목)</h3>
              <p>회사는 다음의 개인정보 항목을 처리하고 있습니다.</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 my-4">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50"><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">구분</th><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">수집 항목</th></tr></thead>
                  <tbody>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700 border-b border-slate-100">필수항목</td><td className="px-4 py-2.5 border-b border-slate-100">이메일 주소, 비밀번호, 이름/닉네임</td></tr>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700 border-b border-slate-100">선택항목</td><td className="px-4 py-2.5 border-b border-slate-100">전화번호, 프로필 이미지, 소속 병원</td></tr>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700">자동수집</td><td className="px-4 py-2.5">접속 IP, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 3 조 (개인정보의 처리 및 보유기간)</h3>
              <p>1. 회사는 법령에 따른 개인정보 보유·이용기간 또는 정보주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.</p>
              <p>2. 각각의 개인정보 처리 및 보유기간은 다음과 같습니다.</p>
              <p className="pl-4">가. 회원정보의 경우: <strong>회원 탈퇴 시까지</strong><br />나. 계약 또는 청약철회에 관한 기록: <strong>5년</strong> (전자상거래법)<br />다. 대금결제 및 재화 등의 공급에 관한 기록: <strong>5년</strong> (전자상거래법)<br />라. 소비자 불만 또는 분쟁처리에 관한 기록: <strong>3년</strong> (전자상거래법)<br />마. 접속에 관한 기록: <strong>3개월</strong> (통신비밀보호법)</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 4 조 (개인정보의 제3자 제공)</h3>
              <p>회사는 정보주체의 개인정보를 제1조(개인정보의 처리목적)에서 명시한 범위 내에서만 처리하며, 정보주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조 및 제18조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 5 조 (개인정보 처리의 위탁)</h3>
              <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.</p>
              <div className="overflow-hidden rounded-xl border border-slate-200 my-4">
                <table className="w-full text-sm">
                  <thead><tr className="bg-slate-50"><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">수탁업체</th><th className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200">위탁 업무</th></tr></thead>
                  <tbody>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700 border-b border-slate-100">결제 대행사</td><td className="px-4 py-2.5 border-b border-slate-100">구매 및 결제 처리</td></tr>
                    <tr><td className="px-4 py-2.5 font-medium text-slate-700">메일 서비스</td><td className="px-4 py-2.5">메일의 사전 배포 이용</td></tr>
                  </tbody>
                </table>
              </div>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 6 조 (개인정보의 파기)</h3>
              <p>1. 회사는 개인정보 처리목적이 달성된 경우 지체 없이 해당 개인정보를 파기합니다. 다만 법정의무기간이 남아있는 경우에는 제3조에 따릅니다.</p>
              <p>2. 파기의 절차 및 방법은 다음과 같습니다.</p>
              <p className="pl-4"><strong>전자적 파일형태:</strong> 복구가 불가능한 방법으로 영구 삭제<br /><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 7 조 (정보주체의 권리·의무 및 행사방법)</h3>
              <p>1. 정보주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.</p>
              <p className="pl-4">가. 개인정보 열람 요구<br />나. 오류 등이 있는 경우 정정 요구<br />다. 삭제 요구<br />라. 처리정지 요구</p>
              <p>2. 권리 행사는 이메일 또는 서비스 내 고객센터를 통해 할 수 있으며, 회사는 이에 대해 즉시 필요한 조치를 취합니다.</p>
              <p>3. 정보주체가 개인정보의 오류 등에 대한 정정 또는 삭제를 요구한 경우에는 회사는 정정 또는 삭제를 완료할 때까지 당해 개인정보를 이용하거나 제공하지 않습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 8 조 (개인정보의 안전성 확보조치)</h3>
              <p>회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.</p>
              <p className="pl-4"><strong>가. 비밀번호의 암호화:</strong> 회원의 비밀번호는 암호화되어 저장 및 관리되고 있습니다.<br /><strong>나. 해킹 등에 대한 대비:</strong> 해킹이나 컴퓨터 바이러스에 의해 개인정보가 유출되는 것을 방지하기 위한 기술적 대책을 마련하고 있습니다.<br /><strong>다. 접근 통제:</strong> 개인정보에 대한 접근권한을 최소화하여 권한있는 자만 접근 가능합니다.<br /><strong>라. 개인정보의 암호화:</strong> 개인정보는 암호화 등을 통해 안전하게 저장 및 관리되고 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 9 조 (쿠키의 사용)</h3>
              <p>1. 회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용정보를 저장하고 수시로 불러오는 '쿠키(Cookie)'를 사용합니다.</p>
              <p>2. 이용자는 웹브라우저의 설정을 통해 쿠키 저장을 거부할 수 있습니다. 다만, 쿠키 저장을 거부할 경우 맞춤형 서비스 이용에 어려움이 있을 수 있습니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 10 조 (개인정보 보호책임자)</h3>
              <p>회사는 개인정보 처리에 관한 업무를 총괄하여 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.</p>
              <div className="bg-slate-50 rounded-xl p-5 my-4 space-y-1">
                <p className="font-bold text-slate-800">개인정보 보호책임자</p>
                <p>성명: 맹준호</p>
                <p>직책/직급: 대표</p>
                <p>이메일: <a href="mailto:denjoy.info@gmail.com" className="text-indigo-600 hover:underline">denjoy.info@gmail.com</a></p>
              </div>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 11 조 (권익침해 구제방법)</h3>
              <p>정보주체는 개인정보침해로 인한 구제를 받기 위하여 다음 기관에 분쟁해결이나 상담 등을 신청할 수 있습니다.</p>
              <p className="pl-4">개인정보분쟁조정위원회: (국번없이) 1833-6972<br />개인정보침해신고센터: (국번없이) 118<br />대검찰청 사이버수사과: (국번없이) 1301<br />경찰청 사이버안전수사국: (국번없이) 182</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">제 12 조 (개인정보 처리방침 변경)</h3>
              <p>이 개인정보 처리방침은 시행일로부터 적용됩니다. 법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 서비스 사이트 공지사항을 통하여 고지할 것입니다.</p>

              <h3 className="text-base font-black text-slate-900 mt-10 mb-3 text-center">부칙</h3>
              <p>이 개인정보 처리방침은 2026년 2월 11일부터 시행합니다.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
