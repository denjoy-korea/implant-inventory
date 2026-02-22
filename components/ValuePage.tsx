
import React, { useEffect, useState, useRef } from 'react';
import {
  DEFAULT_TRIAL_HIGHLIGHT_TEXT,
  getTrialCopy,
} from '../utils/trialPolicy';

interface ValuePageProps {
  onGetStarted: () => void;
  onContact: () => void;
}

/* ───── Counter Animation Hook ───── */
const useCountUp = (end: number, duration = 2000, suffix = '') => {
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

  return { count, ref, suffix };
};

const ValuePage: React.FC<ValuePageProps> = ({ onGetStarted, onContact }) => {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const stat1 = useCountUp(104, 800);
  const stat2 = useCountUp(14, 600);
  const stat3 = useCountUp(5, 600);
  const stat4 = useCountUp(0, 400);
  const trialCopy = getTrialCopy();
  const ctaTrialBadgeText = trialCopy.badgeText;
  const ctaTrialFootnoteText = trialCopy.footnoteWithPipe;

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans selection:bg-indigo-500 selection:text-white">

      {/* ─── Hero: Loss Aversion + Framing ─── */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-rose-500/10 border border-rose-500/20 mb-8">
            <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse"></span>
            <span className="text-sm font-bold text-rose-300">지금 이 순간에도 시간이 낭비되고 있습니다</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6">
            아직도 엑셀로<br />
            임플란트 재고를 관리하시나요?
          </h1>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-4">
            매주 <span className="text-rose-400 font-black">2시간</span>, 연간{' '}
            <span className="text-rose-400 font-black">104시간</span>을
          </p>
          <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto leading-relaxed mb-12">
            재고 확인과 발주에 쓰고 있다면, <span className="text-white font-bold">이미 늦었습니다.</span>
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="px-8 py-4 bg-white text-slate-900 font-black text-lg rounded-2xl shadow-2xl hover:shadow-white/20 hover:-translate-y-1 transition-all duration-300"
            >
              무료로 체험하기
            </button>
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
      <section className="py-20 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-rose-500 uppercase tracking-widest mb-3">Problem</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              엑셀 재고관리가 만드는 <span className="text-rose-500">숨은 손실</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                title: '주 2시간 낭비',
                desc: '재고 수량 세기, 엑셀 정리, 부족분 계산에 매주 반복되는 비생산적 시간',
                metric: '연 104시간',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                ),
                title: '발주 실수',
                desc: '수동 재고 파악의 부정확성으로 인한 과잉 발주 또는 재고 부족 반복',
                metric: '월 평균 3~5건',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                  </svg>
                ),
                title: '비용 누수',
                desc: '유통기한 만료, 불필요한 사이즈 과잉 보유로 묶이는 재고 비용',
                metric: '연 수백만원',
              },
              {
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 16.318A4.486 4.486 0 0012.016 15a4.486 4.486 0 00-3.198 1.318M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                  </svg>
                ),
                title: '직원 스트레스',
                desc: '수술 직전 재고 부족 발견, 긴급 발주 반복으로 인한 업무 피로 누적',
                metric: '이직 원인 1위',
              },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-2xl p-7 border border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center mb-5">
                  {item.icon}
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-4">{item.desc}</p>
                <div className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1.5 rounded-full inline-block">
                  {item.metric}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Before vs After: Contrast Effect + Aha! Moment ─── */}
      <section className="py-20 bg-white">
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
              <h3 className="text-xl font-bold text-slate-700 mb-6">엑셀 수동 관리</h3>
              <ul className="space-y-4">
                {[
                  '재고 파악에 30분~1시간 소요',
                  '수술 기록과 재고가 따로 관리',
                  '발주 시점을 감으로 판단',
                  '사이즈별 소모량 분석 불가',
                  '직원마다 다른 엑셀 양식',
                  'FAIL 교환 이력 추적 어려움',
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
              <h3 className="text-xl font-bold text-indigo-900 mb-6">DenJOY 자동 관리</h3>
              <ul className="space-y-4">
                {[
                  '클릭 한 번으로 전체 재고 현황 확인',
                  '수술 기록 업로드 시 재고 자동 차감',
                  '데이터 기반 적정 재고량 자동 계산',
                  '브랜드/사이즈별 소모 트렌드 분석',
                  '통합 대시보드로 일관된 관리',
                  'FAIL 접수부터 교환까지 자동 추적',
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

          {/* Aha! Moment - Key Transformation */}
          <div className="mt-12 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 md:p-12 text-center text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
            <div className="relative z-10">
              <p className="text-indigo-200 font-bold text-sm mb-4">핵심 변화</p>
              <div className="flex items-center justify-center gap-4 md:gap-8 mb-4">
                <div>
                  <p className="text-4xl md:text-6xl font-black">2시간</p>
                  <p className="text-indigo-200 text-sm mt-1">엑셀 재고 정리</p>
                </div>
                <svg className="w-8 h-8 md:w-12 md:h-12 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <div>
                  <p className="text-4xl md:text-6xl font-black">5<span className="text-3xl md:text-5xl">분</span></p>
                  <p className="text-indigo-200 text-sm mt-1">DenJOY 대시보드</p>
                </div>
              </div>
              <p className="text-indigo-100 text-lg font-medium">
                도입 첫날부터 체감하는 변화
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Key Metrics: Framing + Social Proof ─── */}
      <section className="py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20"></div>
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
              { ref: stat2.ref, count: stat2.count, suffix: '개', label: '적용 브랜드', sub: '덴트웹 기본셋팅 전 제조사' },
              { ref: stat3.ref, count: stat3.count, suffix: '분', label: '재고 확인 시간', sub: '클릭 한 번이면 끝' },
              { ref: stat4.ref, count: stat4.count, suffix: '원', label: '도입 비용', sub: '무료 플랜으로 바로 시작' },
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
                title: '회원가입 & 병원 등록',
                desc: '1분이면 끝나는 간단한 가입. 병원명과 기본 정보만 입력하면 즉시 대시보드가 열립니다.',
                icon: (
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                  </svg>
                ),
              },
              {
                step: '02',
                title: '덴트웹 데이터 업로드',
                desc: '사용 중인 덴트웹 엑셀을 그대로 업로드. 자동으로 제조사, 브랜드, 사이즈를 분류합니다.',
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
      <section className="py-20 bg-slate-50">
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
                quote: '발주 실수가 확 줄었어요. 예전엔 넉넉히 시켰다가 남거나, 부족해서 급발주하는 일이 잦았는데 이제는 시스템이 적정량을 알려주니까 편합니다.',
                name: '박OO 실장',
                clinic: '경기 · 치과의원',
                metric: '발주 실수 감소',
              },
              {
                quote: '엑셀로 하루 종일 걸리던 월말 재고 정리가 3초면 끝납니다. 직원들이 가장 좋아하는 변화예요.',
                name: '최OO 원장',
                clinic: '부산 · 치과의원',
                metric: '업무 시간 대폭 단축',
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
        </div>
      </section>

      {/* ─── Feature Highlights: Anchoring ─── */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3">Features</p>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900">
              이 모든 기능이 하나의 도구에
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { title: '실시간 재고 현황', desc: '제조사/브랜드/사이즈별 현재고, 사용량, 적정 재고량을 한눈에 파악', tag: '재고' },
              { title: '수술 기록 자동 연동', desc: '덴트웹 수술기록 업로드 시 자동으로 재고 차감 및 소모 이력 기록', tag: '자동화' },
              { title: '브랜드별 소모 분석', desc: '어떤 브랜드의 어떤 사이즈가 많이 쓰이는지 데이터 기반 분석', tag: '분석' },
              { title: '스마트 발주 추천', desc: '소모 패턴 기반 적정 재고 자동 계산, 부족 시 즉시 발주 가능', tag: '발주' },
              { title: 'FAIL 교환 관리', desc: '수술 중 FAIL 발생부터 교환 접수, 입고 확인까지 전 과정 추적', tag: 'FAIL' },
              { title: '역할별 권한 관리', desc: '원장/매니저/스탭 역할에 따라 접근 가능한 메뉴와 기능을 구분', tag: '보안' },
            ].map((item, i) => (
              <div key={i} className="group p-7 rounded-2xl border border-slate-200 hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                  {item.tag}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-4 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA: Scarcity + Peak-End Rule ─── */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800"></div>
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15"></div>
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center text-white">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 mb-8">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
            <span className="text-sm font-bold text-amber-200">{ctaTrialBadgeText}</span>
          </div>
          <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
            지금 시작하면<br />{DEFAULT_TRIAL_HIGHLIGHT_TEXT}
          </h2>
          <p className="text-indigo-200 text-lg mb-4 leading-relaxed">
            엑셀에 쓰는 시간을 환자에게 쓰세요.<br />
            더 이상 재고 걱정에 시간을 낭비하지 마세요.
          </p>
          <p className="text-sm text-indigo-300 mb-10">
            {ctaTrialFootnoteText}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={onGetStarted}
              className="px-10 py-4 bg-white text-indigo-700 font-black text-lg rounded-2xl shadow-2xl hover:shadow-white/30 hover:-translate-y-1 transition-all duration-300"
            >
              무료로 시작하기
            </button>
            <button
              onClick={onContact}
              className="px-10 py-4 bg-transparent text-white font-bold text-lg rounded-2xl border-2 border-white/30 hover:border-white/50 hover:bg-white/5 transition-all duration-300"
            >
              도입 상담 받기
            </button>
          </div>
        </div>
      </section>

      {/* Footer - 기업정보 */}
      <footer className="border-t border-slate-200 bg-slate-50 py-8 px-6">
        <div className="max-w-4xl mx-auto text-xs text-slate-400 leading-relaxed">
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
    </div>
  );
};

export default ValuePage;
