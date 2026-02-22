import React, { useEffect, useState } from 'react';

/**
 * ─────────────────────────────────────────────────────────────────
 * DashboardPromoMockup
 * 랜딩 페이지에서 3가지 핵심 기능을 슬라이드(캐러셀) 형태로 자동 전환하며
 * 보여주는 반응형 애니메이션 프레젠테이션 목업입니다.
 * ─────────────────────────────────────────────────────────────────
 */
export const DashboardPromoMockup: React.FC = () => {
    const [currentSlide, setCurrentSlide] = useState(0); // 0: 스마트 발주, 1: 자동 연동, 2: 통계 분석
    const [phase, setPhase] = useState<0 | 1 | 2>(0);
    // 각 슬라이드별 내부 애니메이션 루프 타임라인

    useEffect(() => {
        // 슬라이드 내 애니메이션 (0초 초기화 -> 0.8초 애니1 -> 2.5초 애니2)
        const runSlideAnimation = () => {
            setPhase(0);
            setTimeout(() => setPhase(1), 800);
            setTimeout(() => setPhase(2), 2500);
        };

        runSlideAnimation();

        // 6초마다 다음 슬라이드로 넘어가는 마스터 인터벌
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % 3);
            runSlideAnimation();
        }, 6000);

        return () => clearInterval(interval);
    }, []);

    const slideTitles = [
        "실시간 스마트 발주 시뮬레이션",
        "수술기록 엑셀 업로드 자동 분석",
        "제조사별 임상 통계 분석"
    ];

    return (
        <div className="w-full h-full bg-slate-50/90 flex flex-col font-sans select-none overflow-hidden text-left relative">
            {/* 글로벌 헤더 (고정) */}
            <div className="h-10 sm:h-12 bg-white border-b border-slate-200 flex justify-between items-center px-4 shrink-0 z-20">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
                        <span className="text-[10px] font-black text-white px-1">D</span>
                    </div>
                    <div className="flex gap-1.5 ml-1">
                        <span className={`w-8 h-2 rounded-full transition-colors duration-500 ${currentSlide === 0 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        <span className={`w-8 h-2 rounded-full transition-colors duration-500 ${currentSlide === 1 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                        <span className={`w-8 h-2 rounded-full transition-colors duration-500 ${currentSlide === 2 ? 'bg-indigo-600' : 'bg-slate-200'}`} />
                    </div>
                </div>
                <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 shadow-sm transition-all duration-300">
                    <svg className="w-3.5 h-3.5 text-indigo-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                    <span className="text-[10px] sm:text-xs font-bold text-indigo-700">{slideTitles[currentSlide]}</span>
                </div>
            </div>

            <div className="flex-1 relative overflow-hidden">
                {/* SLIDE 1: 스마트 발주 */}
                <div className={`absolute inset-0 p-3 sm:p-5 flex flex-col gap-3 sm:gap-4 lg:gap-5 transition-opacity duration-700 ease-in-out ${currentSlide === 0 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <SmartOrderSlide phase={phase} isActive={currentSlide === 0} />
                </div>

                {/* SLIDE 2: 자동 연동 (수술 기록 테이블) */}
                <div className={`absolute inset-0 p-3 sm:p-5 flex flex-col transition-opacity duration-700 ease-in-out ${currentSlide === 1 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <AutoSyncSlide phase={phase} isActive={currentSlide === 1} />
                </div>

                {/* SLIDE 3: 통계 분석 (차트) */}
                <div className={`absolute inset-0 p-3 sm:p-5 flex flex-col transition-opacity duration-700 ease-in-out ${currentSlide === 2 ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
                    <AnalyticsSlide phase={phase} isActive={currentSlide === 2} />
                </div>

                {/* 목업 안내 문구 */}
                <div className="absolute bottom-2 right-3 z-30">
                    <span className="text-[9px] sm:text-[10px] text-slate-400 font-medium tracking-tight bg-white/80 backdrop-blur px-2 py-0.5 rounded-md shadow-sm border border-slate-100">
                        * 본 화면은 이해를 돕기 위한 연출된 목업입니다.
                    </span>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────
 * SLIDE 1: 스마트 발주 시뮬레이션 (기존 코드 재배치)
 * ───────────────────────────────────────────────────────────────── */
const SmartOrderSlide = ({ phase, isActive }: { phase: number, isActive: boolean }) => {
    return (
        <>
            <div className="grid grid-cols-3 gap-2 sm:gap-4 shrink-0">
                <StatCard title="처리 완료" baseVal={18} targetVal={24} simulate={phase >= 2 && isActive} color="emerald" icon={
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                } />
                <StatCard title="입고 대기" baseVal={5} targetVal={0} simulate={phase >= 2 && isActive} color="indigo" icon={
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                } />
                <StatCard title="발주 권장" baseVal={42} targetVal={37} simulate={phase >= 2 && isActive} color="rose" alert icon={
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                } />
            </div>

            <div className={`bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm flex-col flex-1 flex transition-all duration-700 ${isActive && phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                <div className="p-3 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                        <span className={`flex h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${phase >= 2 ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}></span>
                        <h3 className="text-[12px] sm:text-sm font-black text-slate-800 tracking-tight">발주 권장 품목</h3>
                    </div>
                </div>

                <div className="p-3 sm:p-5 flex-1 relative bg-slate-50/50">
                    <div className="bg-white rounded-lg sm:rounded-xl p-3 sm:p-4 border border-slate-100 shadow-sm">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-50 pb-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] sm:text-xs font-black text-slate-600 uppercase">IBS Implant</span>
                                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">Magicore</span>
                            </div>
                            <span className="text-[9px] font-bold text-rose-400 bg-rose-50 px-1.5 py-0.5 rounded">긴급 1건</span>
                        </div>

                        <div className="flex flex-wrap gap-1.5 sm:gap-2">
                            <Chip size="Φ4.0 X 11" qty={8} severity="orange" />
                            <Chip size="Φ4.5 X 9" qty={3} severity="white" />
                            <SimulatedClickChip size="Φ5.0 X 11" baseQty={15} isClicked={phase >= 2} severity="rose" animatedHover={phase === 1} />
                            <Chip size="Φ5.5 X 9" qty={5} severity="white" />
                            <Chip size="Φ6.0 X 11" qty={1} severity="white" />
                        </div>
                    </div>
                    <Cursor isSimulatingHover={isActive && phase === 1} isSimulatingClick={isActive && phase === 2} startX="80%" startY="100%" targetX="30%" targetY="60%" />
                </div>
            </div>
        </>
    );
};

/* ─────────────────────────────────────────────────────────────────
 * SLIDE 2: 수술 기록 엑셀 분석 시뮬레이션
 * ───────────────────────────────────────────────────────────────── */
const AutoSyncSlide = ({ phase, isActive }: { phase: number, isActive: boolean }) => {
    return (
        <div className="flex flex-col h-full bg-white rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden relative">
            <div className="p-3 sm:p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="text-[11px] sm:text-sm font-black text-slate-700 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    수술기록 엑셀 데이터 분석
                </h3>
                <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded border border-indigo-100 text-[9px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                    데이터 추출 중
                </span>
            </div>

            <div className="flex-1 p-2 sm:p-4 overflow-hidden relative">
                <div className="space-y-2">
                    {/* 하드코딩된 페이크 테이블 행들 */}
                    {[
                        { id: 1, name: '이*수 (남/42)', code: 'OSSTEM TSIII SA Φ4.0 × 10', date: '오늘 14:20', isNew: false },
                        { id: 2, name: '박*현 (여/55)', code: 'IBS Magicore D:5.0 L:9', date: '오늘 11:45', isNew: false },
                        { id: 3, name: '김*민 (남/61)', code: '디오 UF II Φ5.0 × 8.5', date: '오늘 09:30', isNew: false },
                    ].map((row, i) => (
                        <div key={row.id} className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border border-slate-100 bg-white transition-all duration-500 delay-${i * 100} ${isActive && phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                            <div className="flex flex-col gap-1">
                                <div className="text-[10px] sm:text-xs font-bold text-slate-800">{row.name}</div>
                                <div className="text-[9px] font-medium text-slate-500">{row.code}</div>
                            </div>
                            <div className="text-[9px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded">{row.date}</div>
                        </div>
                    ))}

                    {/* 새롭게 연동되는 행 애니메이션 */}
                    <div className={`flex items-center justify-between p-2 sm:p-3 rounded-lg border border-indigo-200 bg-indigo-50/50 transition-all duration-700 ease-out absolute left-2 sm:left-4 right-2 sm:right-4 top-[170px] sm:top-[200px] shadow-lg
             ${isActive && phase >= 2 ? 'opacity-100 scale-100 -translate-y-[150px] sm:-translate-y-[180px] z-20' : 'opacity-0 scale-95 translate-y-0 -z-10'}
          `}>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className="bg-indigo-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded">NEW</span>
                                <div className="text-[10px] sm:text-xs font-black text-indigo-900">최*영 (여/38)</div>
                            </div>
                            <div className="text-[9px] font-bold text-indigo-600">OSSTEM TSIII SA Φ5.0 × 8.5 <span className="text-rose-500 ml-1">(-1개 차감)</span></div>
                        </div>
                        <div className="text-[9px] text-indigo-500 font-bold bg-white border border-indigo-100 px-2 py-1 rounded shadow-sm">방금 전</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────────
 * SLIDE 3: 임상 통계/분석 파이/바 차트 애니메이션
 * ───────────────────────────────────────────────────────────────── */
const AnalyticsSlide = ({ phase, isActive }: { phase: number, isActive: boolean }) => {
    return (
        <div className="flex flex-col h-full bg-slate-50/50 rounded-xl sm:rounded-2xl border border-slate-100 shadow-sm overflow-hidden p-3 sm:p-5 gap-4">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 flex-1">

                {/* 우측 상단 파이차트 모방 */}
                <div className={`bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col items-center justify-center relative transition-all duration-700 delay-100 ${isActive && phase >= 1 ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
                    <h3 className="absolute top-3 left-4 text-[10px] sm:text-xs font-bold text-slate-500">제조사별 식립 비율</h3>
                    <div className="relative w-20 h-20 sm:w-28 sm:h-28 mt-4 flex items-center justify-center">
                        {/* CSS Conic Gradient를 이용한 파이차트 애니메이션 (부드럽게 차오르는 연출은 clip-path 활용) */}
                        <div className={`absolute inset-0 rounded-full bg-slate-100 overflow-hidden transition-all duration-1000 ease-out ${isActive && phase >= 2 ? 'rotate-0 opacity-100' : '-rotate-90 opacity-0'}`}
                            style={{
                                background: 'conic-gradient(#6366f1 0% 45%, #ec4899 45% 75%, #14b8a6 75% 100%)'
                            }}
                        ></div>
                        <div className="absolute inset-3 sm:inset-4 rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                            <span className="text-xs sm:text-lg font-black text-slate-800">462</span>
                            <span className="text-[8px] text-slate-400">총 사용</span>
                        </div>
                    </div>
                </div>

                {/* 바 차트 모방 */}
                <div className={`bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col justify-end transition-all duration-700 delay-300 ${isActive && phase >= 1 ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                    <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 mb-auto">월별 수술 트렌드</h3>
                    <div className="flex justify-between items-end h-24 sm:h-32 gap-1.5 sm:gap-2 mt-4">
                        {[40, 65, 45, 80, 55, 90].map((h, i) => (
                            <div key={i} className="w-full relative flex justify-center group">
                                <div
                                    className={`w-full bg-indigo-500 rounded-t-sm transition-all duration-1000 ease-elastic ${isActive && phase >= 2 ? 'opacity-100' : 'opacity-0 h-0 !important'}`}
                                    style={{ height: isActive && phase >= 2 ? `${h}%` : '0%' }}
                                ></div>
                                {/* Tooltip 시뮬레이션 */}
                                {i === 3 && isActive && phase >= 2 && (
                                    <div className="absolute -top-6 bg-slate-800 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-lg animate-bounce">
                                        Peak
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[8px] text-slate-400 pt-2 border-t border-slate-100 mt-2">
                        <span>9월</span><span>10월</span><span>11월</span><span>12월</span><span>1월</span><span>2월</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


/* ─────────────────────────────────────────────────────────────────
 * 공통 하위 컴포넌트들
 * ───────────────────────────────────────────────────────────────── */
const StatCard = ({ title, baseVal, targetVal, simulate, color, icon, alert }: any) => {
    const currentVal = simulate ? targetVal : baseVal;
    const isRising = currentVal > baseVal;
    const bgColors: any = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100',
        rose: 'bg-rose-50 text-rose-600 border-rose-100',
    };
    return (
        <div className={`bg-white rounded-lg sm:rounded-xl p-2.5 sm:p-4 border border-slate-100 flex flex-col justify-between transition-transform duration-300 ${simulate && isRising ? '-translate-y-1 shadow-md' : 'shadow-sm'}`}>
            <div className="flex justify-between items-start mb-1 sm:mb-2">
                <span className="text-[9px] sm:text-[11px] font-bold text-slate-500 whitespace-nowrap overflow-hidden text-ellipsis">{title}</span>
                <div className={`w-5 h-5 sm:w-7 sm:h-7 rounded flex items-center justify-center shrink-0 ${bgColors[color]}`}>
                    {icon}
                </div>
            </div>
            <div>
                <div className="flex items-baseline gap-1">
                    <span className={`text-base sm:text-2xl font-black ${alert && !simulate ? 'text-rose-500' : 'text-slate-800'} transition-colors duration-500`}>
                        {currentVal}
                    </span>
                    <span className="text-[8px] sm:text-[10px] font-medium text-slate-400">건</span>
                </div>
            </div>
        </div>
    );
};

const Chip = ({ size, qty, severity }: { size: string; qty: number; severity: 'rose' | 'orange' | 'white' }) => {
    const styles = {
        rose: 'border-rose-200 bg-rose-50/50',
        orange: 'border-orange-200 bg-orange-50/50',
        white: 'border-slate-200 bg-white'
    };
    const badgeStyles = {
        rose: 'bg-rose-500 text-white',
        orange: 'bg-orange-500 text-white',
        white: 'bg-slate-100 text-slate-600'
    };
    return (
        <div className={`px-2 py-1 rounded-md border text-[9px] sm:text-[10px] font-bold text-slate-700 flex items-center gap-1 ${styles[severity]}`}>
            {size}
            <span className={`px-1 py-0.5 rounded text-[8px] font-black ${badgeStyles[severity]}`}>{qty}개</span>
        </div>
    );
};

const SimulatedClickChip = ({ size, baseQty, isClicked, severity, animatedHover }: any) => {
    return (
        <div className={`relative px-2 py-1 rounded-md border text-[9px] sm:text-[10px] font-bold flex items-center gap-1 z-10 transition-all duration-300 
      ${animatedHover ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50 text-indigo-700 -translate-y-0.5 scale-105 shadow-lg' :
                (isClicked ? 'bg-indigo-600 text-white border-indigo-600 scale-95 opacity-50' : 'border-rose-200 bg-rose-50/50 text-slate-700')}
    `}>
            <span className="whitespace-nowrap">{isClicked ? '주문 대기 중' : size}</span>
            {!isClicked && (
                <span className={`px-1 py-0.5 rounded text-[8px] font-black ${animatedHover ? 'bg-indigo-200 text-indigo-700' : 'bg-rose-500 text-white'}`}>
                    {baseQty}개
                </span>
            )}
        </div>
    );
};

const Cursor = ({ isSimulatingHover, isSimulatingClick, startX, startY, targetX, targetY }: any) => {
    return (
        <div className={`absolute pointer-events-none transition-all duration-1000 ease-in-out z-50`}
            style={{
                left: isSimulatingHover || isSimulatingClick ? targetX : startX,
                top: isSimulatingHover || isSimulatingClick ? targetY : startY,
                opacity: isSimulatingHover || isSimulatingClick ? 1 : 0,
                transform: isSimulatingClick ? 'scale(0.8) translate(-6px, -6px)' : 'scale(1)',
                filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.3))'
            }}>
            <svg width="24" height="36" viewBox="0 0 24 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-900 border-white">
                <path d="M1 1L10.3705 32.148C10.655 33.0941 12.0163 33.0456 12.2343 32.0722L14.7351 20.9103C14.8698 20.3093 15.3409 19.8242 15.9392 19.6644L26.7588 16.7903C27.6896 16.5432 27.6698 15.2106 26.7265 15.015L1.87955 0.509745C1.03666 0.228557 0.279761 1.0505 0.635835 1.86532L1 1Z" fill="#1E293B" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            </svg>
            {isSimulatingClick && (
                <span className="absolute -top-2 -left-2 w-8 h-8 border-2 border-indigo-500 rounded-full animate-ping opacity-75"></span>
            )}
        </div>
    );
};
