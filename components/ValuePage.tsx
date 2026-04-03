
import React, { useEffect } from 'react';
import {
  DEFAULT_TRIAL_HIGHLIGHT_TEXT,
  getTrialCopy,
} from '../utils/trialPolicy';
import SectionNavigator from './SectionNavigator';
import PublicInfoFooter from './shared/PublicInfoFooter';
import useCountUp from '../hooks/useCountUp';

interface ValuePageProps {
  onGetStarted: () => void;
  onContact: () => void;
}

const ValuePage: React.FC<ValuePageProps> = ({ onGetStarted, onContact }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const stat1 = useCountUp(104, 800);
  const stat2 = useCountUp(14, 600);
  const stat3 = useCountUp(21, 600);
  const stat4 = useCountUp(8, 400);
  const trialCopy = getTrialCopy();
  const ctaTrialBadgeText = trialCopy.badgeText;
  const ctaTrialFootnoteText = trialCopy.footnoteWithPipe;
  const trialPolicyShortText = trialCopy.trialPolicyShort;

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans selection:bg-indigo-500 selection:text-white">

      <SectionNavigator sections={[
        { id: 'vp-hero', label: '소개' },
        { id: 'vp-problem', label: '문제' },
        { id: 'vp-effect', label: '효과' },
        { id: 'vp-stats', label: '수치' },
        { id: 'vp-review', label: '후기' },
      ]} />

      {/* ─── Hero: Loss Aversion + Framing ─── */}
      <section id="vp-hero" className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900"></div>
        <div className="absolute inset-0 noise-bg opacity-20"></div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8">
            <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
            <span className="text-sm font-bold text-indigo-300">병원 데이터가 일하게 하세요</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tight leading-tight mb-6 text-slate-100 animate-fade-in-up animation-delay-200">
            수술 기록이 쌓일수록,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
              병원 운영이 똑똑해집니다
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12 animate-fade-in-up animation-delay-400">
            재고 차감, 발주 추천, 교환 추적, 임상 분석까지 —<br className="hidden md:block" />
            수술 기록 하나가 모든 것을 움직입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up animation-delay-[800ms]">
            <div className="relative group inline-block">
              <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 rounded-2xl blur opacity-40 group-hover:opacity-70 transition duration-1000 animate-pulse-glow"></div>
              <button
                onClick={onGetStarted}
                className="relative w-full px-8 py-4 bg-white text-slate-900 font-black text-lg rounded-2xl shadow-2xl hover:shadow-white/20 hover:-translate-y-1 active:scale-95 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-slate-900/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative z-10">무료로 체험하기</span>
              </button>
            </div>
            <button
              onClick={onContact}
              className="px-8 py-4 bg-transparent text-white font-bold text-lg rounded-2xl border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-300"
            >
              도입 상담 받기
            </button>
          </div>
        </div>
      </section>

      {/* ─── Pain Points: Loss Aversion ─── */}
      <section id="vp-problem" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-3">Problem</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              지금 이 순간, 병원에서 일어나고 있는 일
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.618 5.984A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM12 9v2m0 4h.01" />
                  </svg>
                ),
                title: '"이 브랜드, 왜 계속 교환이 나올까?"',
                desc: '교환이 반복되는데 어떤 제조사, 어떤 규격에서 문제가 나는지 데이터가 없어 패턴을 파악할 수 없는 상황',
                metric: '임상 의사결정 근거 부재',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                  </svg>
                ),
                title: '"실물이랑 시스템이 또 다르네"',
                desc: '수동 관리로 오차가 누적되고, 필요한 건 없고 남는 건 쌓이는 악순환. 실사할 때마다 불일치가 당연해진 상황',
                metric: '재고 정확도 저하',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                ),
                title: '"우리 병원 월 수술 건수가 몇 건이지?"',
                desc: '월별 수술 건수, 브랜드별 점유율, 연도별 추세 — 경영 판단에 필요한 기초 데이터조차 정리되지 않은 상황',
                metric: '데이터 기반 경영 불가',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                  </svg>
                ),
                title: '"이 발주, 내가 또 확인해야 해?"',
                desc: '수술 직전 재고 부족 발견, 긴급 발주 반복으로 인한 업무 피로. 시스템 부재로 모든 책임이 사람에게 쏠리는 구조',
                metric: '업무 부담 집중',
              },
            ].map((item, i) => (
              <div key={i} className={`bg-white rounded-[2rem] p-7 sm:p-8 border border-slate-200 hover:border-rose-200 hover:shadow-xl hover:shadow-rose-100/50 hover:-translate-y-2 transition-all duration-500 animate-fade-in-up group`} style={{ animationDelay: `${(i % 4 + 1) * 200}ms` }}>
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-rose-600 transition-colors">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{item.desc}</p>
                <div className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full inline-block border border-rose-100/50">
                  {item.metric}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Before vs After: Contrast Effect + Aha! Moment ─── */}
      <section id="vp-effect" className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Transformation</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              도입 전후, 이렇게 달라집니다
            </h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Before */}
            <div className="rounded-2xl border-2 border-slate-200 bg-slate-50 p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-slate-400 to-slate-300"></div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-200 text-slate-600 text-xs font-bold mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
                BEFORE
              </div>
              <h3 className="text-xl font-bold text-slate-700 mb-6">데이터 없는 운영</h3>
              <ul className="space-y-4">
                {[
                  '교환 패턴을 제조사별로 파악할 수 없음',
                  '월별 수술 건수와 브랜드 점유율 데이터 없음',
                  '재고 파악에 30분~1시간 소요',
                  '수술 기록과 재고가 따로 관리',
                  '발주 시점을 감으로 판단',
                  '교환 이력 추적 어려움',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span className="text-sm text-slate-500">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            {/* After */}
            <div className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-600 to-purple-600"></div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-bold mb-6">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                AFTER
              </div>
              <h3 className="text-xl font-bold text-indigo-900 mb-6">데이터가 일하는 운영</h3>
              <ul className="space-y-4">
                {[
                  'FAIL 자동 감지 + 제조사별 교환율 실시간 분석',
                  '수술 트렌드, 브랜드 점유율, 임상 히트맵 대시보드',
                  '클릭 한 번으로 전체 재고 현황 확인',
                  '수술 기록 업로드 시 재고 자동 차감',
                  '데이터 기반 적정 재고량 자동 계산',
                  '교환 접수부터 입고까지 자동 추적',
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-slate-700 font-medium">{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Aha! Moment - Intelligence Platform */}
          <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-white relative overflow-hidden">
            <div className="absolute inset-0 noise-bg opacity-10"></div>
            <div className="relative z-10">
              <p className="text-indigo-200 font-bold text-sm mb-8 text-center">DenJOY 임상 인텔리전스</p>
              <div className="grid grid-cols-3 gap-4 md:gap-8 mb-6">
                <div className="text-center">
                  <p className="text-3xl md:text-5xl font-black">FAIL</p>
                  <p className="text-indigo-200 text-sm mt-2">자동 감지</p>
                  <p className="text-indigo-300 text-xs mt-1">교환 발생 시 즉시 등록</p>
                </div>
                <div className="text-center border-x border-white/20">
                  <p className="text-3xl md:text-5xl font-black">21<span className="text-2xl md:text-3xl">개</span></p>
                  <p className="text-indigo-200 text-sm mt-2">임상 분석 차트</p>
                  <p className="text-indigo-300 text-xs mt-1">교환·트렌드·히트맵</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl md:text-5xl font-black">8<span className="text-2xl md:text-3xl">가지</span></p>
                  <p className="text-indigo-200 text-sm mt-2">규격 자동 인식</p>
                  <p className="text-indigo-300 text-xs mt-1">직경·길이·연결 방식</p>
                </div>
              </div>
              <p className="text-indigo-100 text-base md:text-lg font-medium text-center">
                수술 기록이 쌓일수록, 인텔리전스가 깊어집니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Key Metrics: Framing + Social Proof ─── */}
      <section id="vp-stats" className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 noise-bg opacity-20"></div>
        <div className="relative z-10 max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3">Impact</p>
            <h2 className="text-3xl md:text-4xl font-black">
              숫자가 증명합니다
            </h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { ref: stat1.ref, count: stat1.count, suffix: '시간', label: '연간 절약 시간', sub: '주 2시간 x 52주' },
              { ref: stat2.ref, count: stat2.count, suffix: '개', label: '지원 브랜드', sub: '덴트웹 기본셋팅 전 제조사' },
              { ref: stat3.ref, count: stat3.count, suffix: '개', label: '임상 분석 차트', sub: '교환·트렌드·히트맵 통합' },
              { ref: stat4.ref, count: stat4.count, suffix: '가지', label: '규격 자동 인식', sub: '직경·길이·연결 방식 패턴' },
            ].map((item, i) => (
              <div key={i} ref={item.ref} className="text-center p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
                <p className="text-4xl md:text-5xl font-black text-white mb-1">
                  {item.count}<span className="text-2xl md:text-3xl text-indigo-400">{item.suffix}</span>
                </p>
                <p className="text-sm font-bold text-white mb-1">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
            ))}
          </div>
          <p className="mt-7 text-center text-[11px] text-slate-400">
            * 성과 수치는 공개 사례 및 운영 시뮬레이션 기준 예시이며, 병원별 진료량과 운영 프로세스에 따라 달라질 수 있습니다.
          </p>
        </div>
      </section>

      {/* ─── How It Works: Goal Gradient Effect ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">How It Works</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              하루면 충분합니다
            </h2>
            <p className="text-slate-500 mt-3 text-lg">복잡한 설치 없이, 3단계로 바로 시작</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connection Line */}
            <div className="hidden md:block absolute top-16 left-[20%] right-[20%] h-0.5 bg-gradient-to-r from-indigo-200 via-indigo-400 to-indigo-200"></div>

            {[
              {
                step: '01',
                title: '메인홈 가입 및 서비스 연결',
                desc: 'DenJOY 메인 홈에서 서비스 이용을 시작하면 바로 대시보드가 열리고 첫 세팅이 이어집니다.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: '덴트웹 데이터 업로드',
                desc: '덴트웹 수술기록지를 그대로 업로드. 자동으로 제조사, 브랜드, 규격을 분류합니다.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                ),
              },
              {
                step: '03',
                title: '자동 재고관리 시작',
                desc: '수술 기록이 쌓일수록 재고가 자동 차감되고, 부족 시 알림과 발주 추천까지.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
                  </svg>
                ),
              },
            ].map((item, i) => (
              <div key={i} className="relative text-center">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-200 relative z-10">
                  {item.icon}
                </div>
                <div className="text-xs font-black text-indigo-600 mb-2">STEP {item.step}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Social Proof: Testimonials ─── */}
      <section id="vp-review" className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Social Proof</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              베타 테스터의 이야기
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: '재고 파악에 매주 금요일 2시간씩 쓰던 시간이 사라졌습니다. 이제 수술 끝나면 자동으로 재고가 차감되니까, 따로 신경 쓸 일이 없어요.',
                name: '김OO 원장',
                clinic: '서울 · 치과의원',
                metric: '주 2시간 절약',
              },
              {
                quote: '교환 데이터를 제조사별로 분석할 수 있게 되니까 문제 있는 규격이 한눈에 보여요. 임플란트 선택에 데이터 근거가 생겼습니다.',
                name: '박OO 원장',
                clinic: '경기 · 치과의원',
                metric: '임상 의사결정 개선',
              },
              {
                quote: '월별 수술 추세와 브랜드 점유율을 대시보드에서 바로 보니 경영 회의 자료를 따로 만들 필요가 없어졌어요.',
                name: '최OO 원장',
                clinic: '부산 · 치과의원',
                metric: '경영 가시성 확보',
              },
            ].map((t, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 border border-slate-200 hover:shadow-lg transition-shadow flex flex-col">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-slate-600 leading-relaxed mb-6 flex-1">"{t.quote}"</p>
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{t.name}</p>
                      <p className="text-xs text-slate-400">{t.clinic}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                    {t.metric}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-[11px] text-slate-400">
            * 후기는 사용자 공개 동의 기반으로 게재되며, 일부 표현은 이해를 돕기 위한 요약 문구가 포함될 수 있습니다.
          </p>
        </div>
      </section>

      {/* ─── Feature Highlights: Anchoring ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              치과 운영 인텔리전스의 모든 것
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: 'FAIL 자동 감지 & 교환율 분석', desc: '교환 발생 시 자동 FAIL 등록, 제조사·규격별 교환율을 실시간으로 집계. 문제 패턴을 데이터로 파악', tag: '임상' },
              { title: '수술 트렌드 & 임상 히트맵', desc: '월별 수술 건수, 브랜드별 점유율, 치아별 식립 히트맵까지 21개 차트로 임상 패턴을 시각화', tag: '분석' },
              { title: '실시간 재고 현황', desc: '제조사/브랜드/사이즈별 현재고, 사용량, 적정 재고량을 한눈에 파악', tag: '재고' },
              { title: '수술 기록 자동 연동', desc: '덴트웹 수술기록지를 업로드하면 재고 차감 및 소모 이력이 자동 기록됩니다', tag: '자동화' },
              { title: '스마트 발주 추천', desc: '소모 패턴 기반 적정 재고 자동 계산, 부족 시 즉시 발주 가능', tag: '발주' },
              { title: '역할별 권한 관리', desc: '원장/매니저/스탭 역할에 따라 접근 가능한 메뉴와 기능을 구분', tag: '보안' },
            ].map((item, i) => (
              <div key={i} className="group p-7 sm:p-8 bg-white/80 backdrop-blur-md rounded-[2rem] border border-slate-200 hover:border-indigo-200 hover:shadow-2xl hover:shadow-indigo-100/50 hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-[3rem] -mr-10 -mt-10 transition-all duration-500 group-hover:scale-[1.5] group-hover:bg-indigo-100/50 z-0"></div>
                <div className="relative z-10">
                  <span className="text-[10px] sm:text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full uppercase tracking-wider shadow-sm">
                    {item.tag}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-5 mb-3 group-hover:text-indigo-600 transition-colors">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA: Scarcity + Peak-End Rule ─── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800"></div>
        <div className="absolute inset-0 noise-bg opacity-15"></div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center text-white">
          <div className="inline-flex max-w-[min(92vw,640px)] flex-wrap items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 mb-8 shadow-[0_0_15px_rgba(245,158,11,0.2)] justify-center">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            <span className="text-[11px] sm:text-sm font-bold text-amber-200 leading-relaxed text-balance">{ctaTrialBadgeText}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight text-balance">
            지금 시작하면<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">{DEFAULT_TRIAL_HIGHLIGHT_TEXT}</span>
          </h2>
          <p className="text-indigo-200 text-lg mb-4 leading-relaxed font-medium">
            데이터가 일하게 하세요. 원장님은 진료에 집중하세요.
          </p>
          <p className="text-sm text-indigo-300 mb-10 text-balance">
            {ctaTrialFootnoteText}
          </p>
          <p className="text-xs text-indigo-300/90 mb-10 text-balance">
            * {trialPolicyShortText}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <div className="relative group inline-block">
              <div className="absolute -inset-1 bg-gradient-to-r from-white/40 via-purple-300/40 to-indigo-300/40 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-1000"></div>
              <button
                onClick={onGetStarted}
                className="relative w-full sm:w-auto px-10 py-4 bg-white text-indigo-800 font-black text-lg rounded-2xl shadow-2xl hover:shadow-white/40 active:scale-95 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-slate-900/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span className="relative z-10">메인홈에서 회원가입</span>
              </button>
            </div>
            <button
              onClick={onContact}
              className="px-10 py-4 bg-transparent text-white font-bold text-lg rounded-2xl border-2 border-white/30 hover:border-white/50 hover:bg-white/5 transition-all duration-300"
            >
              도입 상담 받기
            </button>
          </div>
        </div>
      </section>

      <PublicInfoFooter showLegalLinks />
    </div>
  );
};

export default ValuePage;
