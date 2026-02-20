
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ExcelRow, HospitalPlanState, PLAN_LIMITS, DEFAULT_WORK_DAYS, SurgeryUnregisteredItem } from '../types';
import { useCountUp } from './surgery-dashboard/shared';
import { useSurgeryStats } from './surgery-dashboard/useSurgeryStats';
import KPIStrip from './surgery-dashboard/KPIStrip';
import DateRangeSlider from './surgery-dashboard/DateRangeSlider';
import MonthlyTrendChart from './surgery-dashboard/MonthlyTrendChart';
import DayOfWeekChart from './surgery-dashboard/DayOfWeekChart';
import PlacementTrendChart from './surgery-dashboard/PlacementTrendChart';
import ClassificationRatios from './surgery-dashboard/ClassificationRatios';
import ManufacturerAnalysis from './surgery-dashboard/ManufacturerAnalysis';
import ToothAnalysis from './surgery-dashboard/ToothAnalysis';
import { useClinicalStats } from './surgery-dashboard/useClinicalStats';
import ClinicalAnalysisSection from './surgery-dashboard/ClinicalAnalysisSection';
import { useWorkDaysMap } from './surgery-dashboard/useWorkDaysMap';
import CollapsibleSection from './surgery-dashboard/CollapsibleSection';
import SurgeryDashboardSkeleton from './surgery-dashboard/SurgeryDashboardSkeleton';

// =====================================================
// Floating TOC Navigator
// =====================================================
const TOC_ICONS = {
  'section-charts': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'section-deep': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'section-clinical': (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
} as const;

const TOC_SECTIONS = [
  { id: 'section-charts', label: '차트' },
  { id: 'section-deep', label: '심층' },
  { id: 'section-clinical', label: '임상' },
] as const;

function FloatingTOC({ hasClinical }: { hasClinical: boolean }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  // Dynamically compute the bottom of the sticky header area
  const getStickyOffset = () => {
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      return 84;
    }

    const stickyEl = document.querySelector<HTMLElement>('[data-sticky-anchor="surgery-dashboard"]');
    if (stickyEl) {
      return stickyEl.getBoundingClientRect().bottom + 12; // 12px breathing room
    }
    return 300; // fallback
  };

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const sync = () => setIsMobileViewport(mediaQuery.matches);

    sync();
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', sync);
      return () => mediaQuery.removeEventListener('change', sync);
    }
    mediaQuery.addListener(sync);
    return () => mediaQuery.removeListener(sync);
  }, []);

  useEffect(() => {
    const filteredIds = TOC_SECTIONS
      .filter(s => hasClinical || s.id !== 'section-clinical')
      .map(s => s.id);

    const handleScroll = () => {
      setIsVisible(window.scrollY > 400);

      const offset = getStickyOffset();
      // Determine which section is currently in view
      // Pick the last section whose top is above the detection line
      let current: string | null = null;
      for (const id of filteredIds) {
        const el = document.getElementById(id);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // Section is "active" if its top has scrolled past the sticky area
        if (rect.top <= offset + 20) {
          current = id;
        }
      }
      setActiveId(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // run once on mount
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasClinical]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    setActiveId(id); // instant feedback
    const offset = getStickyOffset();
    const y = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
  };

  const filteredSections = TOC_SECTIONS.filter(s => hasClinical || s.id !== 'section-clinical');
  if (isMobileViewport) return null;

  return (
    <div
      className="fixed right-6 bottom-8 z-30 transition-all duration-300"
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(20px)',
        pointerEvents: isVisible ? 'auto' : 'none',
      }}
    >
      <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/80 py-2 px-1.5 flex flex-col gap-1">
        {filteredSections.map(s => {
          const isActive = activeId === s.id;
          return (
            <button
              key={s.id}
              onClick={() => scrollTo(s.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 whitespace-nowrap ${isActive
                ? 'bg-indigo-50 text-indigo-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                }`}
              title={s.label}
            >
              <span className={isActive ? 'text-indigo-500' : 'text-slate-400'}>{TOC_ICONS[s.id]}</span>
              <span>{s.label}</span>
              {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ml-1 animate-pulse" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SurgeryDashboardProps {
  rows: ExcelRow[];
  onUpload: () => void;
  isLoading: boolean;
  unregisteredFromSurgery?: SurgeryUnregisteredItem[];
  onGoInventoryMaster?: () => void;
  /** 병원 진료 요일 설정 (기본: 월~금 [1,2,3,4,5]) */
  hospitalWorkDays?: number[];
  /** 플랜 상태 — 날짜 범위 슬라이더 잠금 기준 */
  planState?: HospitalPlanState | null;
}

const SurgeryDashboard: React.FC<SurgeryDashboardProps> = ({
  rows,
  onUpload,
  isLoading,
  unregisteredFromSurgery = [],
  onGoInventoryMaster,
  hospitalWorkDays = DEFAULT_WORK_DAYS,
  planState,
}) => {
  const [mounted, setMounted] = useState(false);
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [dataViewerDayFilter, setDataViewerDayFilter] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  // workDaysMap 없이 먼저 월 목록 추출을 위해 stats를 한 번 계산 (workDaysMap 미전달 → 25일 폴백)
  const rawStats = useSurgeryStats(rows);

  // Date range filter state
  const months = useMemo(() => rawStats.monthlyData.map(d => d.month), [rawStats.monthlyData]);

  // 공휴일 API 기반 월별 실제 진료일수 맵 (비동기)
  const workDaysMap = useWorkDaysMap(months, hospitalWorkDays);

  // workDaysMap 확정 후 최종 stats 계산
  const stats = useSurgeryStats(rows, workDaysMap);

  // 플랜별 보관 기간(retentionMonths) 기반 슬라이더 최솟값 계산
  // - DB에는 최대 24개월만 존재하므로 실제 months 배열 기준으로 잠금 인덱스 결정
  const minStartIdx = useMemo(() => {
    if (!planState) return 0;
    const retentionMonths = PLAN_LIMITS[planState.plan]?.retentionMonths ?? 24;
    if (retentionMonths >= 24) return 0; // business/ultimate — 전체 조회 가능
    const total = stats.monthlyData.length;
    if (total <= retentionMonths) return 0; // 데이터 자체가 제한 이내
    return total - retentionMonths;
  }, [planState, stats.monthlyData.length]);

  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(999);

  useEffect(() => {
    // 데이터 변경 또는 플랜 변경 시 시작점을 minStartIdx로 초기화
    setRangeStart(minStartIdx);
    setRangeEnd(999);
  }, [stats.monthlyData.length, minStartIdx]);

  const effectiveStart = Math.max(minStartIdx, Math.min(rangeStart, stats.monthlyData.length - 1));
  const effectiveEnd = Math.max(effectiveStart, Math.min(rangeEnd, stats.monthlyData.length - 1));

  const handleRangeChange = useCallback((s: number, e: number) => {
    setRangeStart(s);
    setRangeEnd(e);
    setSelectedMonth(null); // Clear selection when range changes
  }, []);

  const handleMonthClick = useCallback((monthStr: string) => {
    setSelectedMonth(prev => prev === monthStr ? null : monthStr);
  }, []);

  const handleDayClick = useCallback((dayName: string) => {
    setDataViewerDayFilter(dayName);
    setShowDataViewer(true);
  }, []);

  // Filtered rows for charts below the slider
  const filteredRows = useMemo(() => {
    if (stats.monthlyData.length <= 1) return rows;
    if (effectiveStart === 0 && effectiveEnd >= stats.monthlyData.length - 1) return rows;
    const startMonth = stats.monthlyData[effectiveStart]?.month;
    const endMonth = stats.monthlyData[effectiveEnd]?.month;
    if (!startMonth || !endMonth) return rows;
    return rows.filter(row => {
      const d = String(row['날짜'] || '');
      if (!d || d.length < 7) return false;
      const month = d.substring(0, 7);
      return month >= startMonth && month <= endMonth;
    });
  }, [rows, stats.monthlyData, effectiveStart, effectiveEnd]);

  const filteredStats = useSurgeryStats(filteredRows, workDaysMap);
  const clinicalStats = useClinicalStats(filteredRows);
  const isRangeFiltered = stats.monthlyData.length > 1 && !(effectiveStart === 0 && effectiveEnd >= stats.monthlyData.length - 1);

  // KPIStrip 표시용 월 평균 진료일수 (공휴일 반영 후)
  const avgWorkDaysPerMonth = useMemo(() => {
    if (!workDaysMap) return 25;
    const vals = Object.values(workDaysMap);
    if (vals.length === 0) return 25;
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
  }, [workDaysMap]);

  // If a specific month is selected via chart highlight, compute stats ONLY for that month for the KPI strip.
  const selectedMonthRows = useMemo(() => {
    if (!selectedMonth) return null;
    return filteredRows.filter(r => String(r['날짜']).startsWith(selectedMonth));
  }, [filteredRows, selectedMonth]);

  const selectedMonthStats = useSurgeryStats(selectedMonthRows || [], workDaysMap);

  const kpiStats = selectedMonth ? selectedMonthStats : (isRangeFiltered ? filteredStats : stats);

  // Animated KPI values
  const animPlacement = useCountUp(kpiStats.classificationStats['식립']);
  const animClaim = useCountUp(kpiStats.classificationStats['청구']);
  const animMonthlyAvg = useCountUp(Math.round(kpiStats.monthlyAvgPlacement * 10));
  const animFailRate = useCountUp(Math.round(kpiStats.failRate * 10));
  const animDailyAvg = useCountUp(Math.round(kpiStats.dailyAvgPlacement * 10));
  const animRecentDailyAvg = useCountUp(Math.round(kpiStats.recentDailyAvg * 10));

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${y}.${m}.${d}`;
  };

  // =====================================================
  // EMPTY STATE / SKELETON
  // =====================================================
  if (stats.cleanRows.length === 0) {
    if (isLoading) {
      return <SurgeryDashboardSkeleton />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm bg-white border border-slate-200">
          <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
        </div>
        <div className="space-y-2 mb-8">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">수술기록을 업로드해주세요</h3>
          <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">덴트웹에서 다운로드한 <span className="font-semibold text-slate-700">.xlsx 파일</span>을<br />드래그하거나 아래 버튼을 눌러 업로드하세요.</p>
        </div>
        <button onClick={onUpload} disabled={isLoading} className="px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
          수술기록 업로드
        </button>
      </div>
    );
  }

  // =====================================================
  // RENDER
  // =====================================================
  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
  );

  return (
    <div className="space-y-6 pb-16" style={{ animationDuration: '0s' }}>
      {/* Sticky header + KPI + Range slider wrapper */}
      <div
        data-sticky-anchor="surgery-dashboard"
        className="sticky z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50"
        style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.08)' }}
      >
        {/* A. Header Strip */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-stretch gap-2.5 sm:gap-3 flex-1 min-w-0">
              {/* 데이터 기간 + 선택 기간 통합 카드 */}
              <div className="min-w-[190px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <h4 className="text-sm font-semibold text-slate-800">데이터 기간</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Data Period</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">
                  {formatDate(stats.dateRange.min)} <span className="text-slate-300 font-light mx-1">~</span> {formatDate(stats.dateRange.max)}
                </p>
                {(isRangeFiltered || selectedMonth) && (
                  <div className="mt-1 flex items-center gap-1">
                    <svg className="w-2.5 h-2.5 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    <span className="text-[10px] font-bold text-indigo-500">
                      {selectedMonth ? `${selectedMonth} 선택됨` : `${formatDate(kpiStats.dateRange.min)} ~ ${formatDate(kpiStats.dateRange.max)}`}
                    </span>
                  </div>
                )}
              </div>
              <div className="min-w-[150px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <h4 className="text-sm font-semibold text-slate-800">총 레코드</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Records</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{kpiStats.dateRange.total.toLocaleString()}<span className="text-xs font-semibold text-slate-400 ml-1">cases</span></p>
              </div>
              <div className="min-w-[160px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <h4 className="text-sm font-semibold text-slate-800">다음 다운로드</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Next Download</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{formatDate(stats.nextDownloadDate)}~</p>
                <p className="text-[10px] text-slate-400 mt-1 leading-tight">마지막 레코드 다음 날부터<br />덴트웹 재다운로드 필요</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
              <button onClick={onUpload} disabled={isLoading} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-slate-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                데이터 업데이트
              </button>
              <button onClick={() => { setDataViewerDayFilter(null); setShowDataViewer(true); }} className="px-4 py-2 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 active:scale-[0.98] transition-colors flex items-center gap-2 shadow-sm">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                데이터 조회
              </button>
            </div>
          </div>
        </div>

        <div className="md:hidden bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">식립</p>
              <p className="text-base font-black text-slate-800 tabular-nums">{kpiStats.classificationStats['식립']}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">FAIL율</p>
              <p className={`text-base font-black tabular-nums ${kpiStats.failRate > 15 ? 'text-rose-600' : 'text-slate-800'}`}>
                {kpiStats.failRate.toFixed(1)}%
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 col-span-2">
              <p className="text-[10px] font-bold text-slate-400">데이터 기간</p>
              <p className="text-[12px] font-black text-slate-700 truncate">
                {formatDate(kpiStats.dateRange.min)} ~ {formatDate(kpiStats.dateRange.max)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onUpload}
              disabled={isLoading}
              className="flex-1 min-h-11 rounded-xl bg-slate-900 text-white text-xs font-black"
            >
              데이터 업데이트
            </button>
            <button
              onClick={() => { setDataViewerDayFilter(null); setShowDataViewer(true); }}
              className="flex-1 min-h-11 rounded-xl bg-white border border-slate-200 text-slate-700 text-xs font-black"
            >
              데이터 조회
            </button>
          </div>
        </div>

        {/* B. KPI Metrics */}
        <KPIStrip
          animPlacement={animPlacement}
          animMonthlyAvg={animMonthlyAvg}
          animFailRate={animFailRate}
          animClaim={animClaim}
          animDailyAvg={animDailyAvg}
          animRecentDailyAvg={animRecentDailyAvg}
          sparkline={kpiStats.sparkline}
          avgWorkDaysPerMonth={avgWorkDaysPerMonth}
        />

        {/* C. Date Range Slider */}
        {months.length > 1 && (
          <DateRangeSlider
            months={months}
            startIdx={effectiveStart}
            endIdx={effectiveEnd}
            onChange={handleRangeChange}
            minStartIdx={minStartIdx}
          />
        )}
      </div>{/* end sticky wrapper */}

      {unregisteredFromSurgery.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">미등록 품목</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Unregistered</span>
                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black">{unregisteredFromSurgery.length}종 · {unregisteredUsageTotal.toLocaleString()}개</span>
              </div>
              <div className="flex flex-wrap gap-1.5 ml-2">
                {unregisteredFromSurgery.slice(0, 4).map((item) => {
                  const label = `${item.manufacturer} / ${item.brand} ${item.size}`;
                  return (
                    <span key={label} className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-600" title={label}>
                      {item.brand} {item.size}
                    </span>
                  );
                })}
                {unregisteredFromSurgery.length > 4 && (
                  <span className="px-2 py-0.5 rounded bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-400">+{unregisteredFromSurgery.length - 4}</span>
                )}
              </div>
            </div>
            {onGoInventoryMaster && (
              <button onClick={onGoInventoryMaster} className="px-3 py-1.5 rounded-lg bg-slate-800 text-white text-[10px] font-bold hover:bg-slate-700 transition-colors shrink-0">
                재고 마스터에서 확인
              </button>
            )}
          </div>
        </div>
      )}

      {/* D. Charts 2x2 grid (filtered by range slider) */}
      <CollapsibleSection
        id="section-charts"
        title="통계 차트"
        subtitle="Statistical Charts"
        accentColor="slate"
        icon={<svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
        badge="월별 · 요일별 · 구분별"
        storageKey="surgery-charts"
      >
        <div className="grid grid-cols-1 xl:grid-cols-[2.5fr_1fr] gap-6">
          <MonthlyTrendChart monthlyData={kpiStats.monthlyData} mounted={mounted} onMonthClick={handleMonthClick} selectedMonth={selectedMonth} />
          <DayOfWeekChart dayOfWeekStats={kpiStats.dayOfWeekStats} dayInsight={kpiStats.dayInsight} mounted={mounted} onDayClick={handleDayClick} />
          <PlacementTrendChart monthlyData={kpiStats.monthlyData} monthlyAvgPlacement={kpiStats.monthlyAvgPlacement} trendline={kpiStats.trendline} mounted={mounted} onMonthClick={handleMonthClick} selectedMonth={selectedMonth} />
          <ClassificationRatios classificationStats={kpiStats.classificationStats} mounted={mounted} />
        </div>
      </CollapsibleSection>

      {/* E. Deep Analysis Section */}
      <CollapsibleSection
        id="section-deep"
        title="심층 분석"
        subtitle="Deep Analysis"
        accentColor="indigo"
        icon={<svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
        badge="제조사 · 치아 부위 · 사이즈"
        storageKey="surgery-deep"
      >
        <ManufacturerAnalysis
          manufacturerDonut={kpiStats.manufacturerDonut}
          manufacturerFailStats={kpiStats.manufacturerFailStats}
          topSizes={kpiStats.topSizes}
          totalPlacements={kpiStats.classificationStats['식립']}
          mounted={mounted}
        />
        <ToothAnalysis toothAnalysis={kpiStats.toothAnalysis} toothHeatmap={kpiStats.toothHeatmap} mounted={mounted} />
      </CollapsibleSection>

      {/* F. Clinical Analysis (filtered) */}
      {clinicalStats.hasClinicalData && (
        <CollapsibleSection
          id="section-clinical"
          title="임상 인사이트"
          subtitle="Clinical Insight"
          accentColor="rose"
          icon={<svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>}
          badge="골질 · 초기고정 · 실패율"
          storageKey="surgery-clinical"
        >
          <ClinicalAnalysisSection
            rows={selectedMonth ? selectedMonthRows || [] : filteredRows}
            manufacturers={kpiStats.manufacturerFailStats}
            mounted={mounted}
          />
        </CollapsibleSection>
      )}

      {/* Floating TOC */}
      <FloatingTOC hasClinical={clinicalStats.hasClinicalData} />

      {/* Data Viewer Modal */}
      {showDataViewer && <DataViewerModal rows={filteredRows} initialDayFilter={dataViewerDayFilter} onClose={() => { setShowDataViewer(false); setDataViewerDayFilter(null); }} />}
    </div>
  );
};

// =====================================================
// Data Viewer Modal
// =====================================================
const COLUMNS = ['날짜', '환자정보', '치아번호', '갯수', '수술기록', '구분', '제조사', '브랜드', '규격(SIZE)', '골질', '초기고정'] as const;
const COL_WIDTHS: Record<string, number> = { '날짜': 100, '환자정보': 100, '치아번호': 65, '갯수': 45, '수술기록': 320, '구분': 80, '제조사': 100, '브랜드': 100, '규격(SIZE)': 100, '골질': 60, '초기고정': 60 };
const PAGE_SIZE = 50;

function getKoreanWeekday(dateValue: unknown): string | null {
  const raw = String(dateValue || '').trim();
  if (!raw) return null;

  // Prefer date-only parsing to avoid timezone day shifts from Date string parsing.
  const datePart = raw.slice(0, 10);
  const match = datePart.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  let parsed: Date | null = null;

  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const localDate = new Date(year, month - 1, day);
    if (!Number.isNaN(localDate.getTime())) parsed = localDate;
  } else {
    const fallback = new Date(raw);
    if (!Number.isNaN(fallback.getTime())) parsed = fallback;
  }

  if (!parsed) return null;
  const days = ['일', '월', '화', '수', '목', '금', '토'] as const;
  return days[parsed.getDay()];
}

const DataViewerModal: React.FC<{ rows: ExcelRow[]; initialDayFilter: string | null; onClose: () => void }> = ({ rows, initialDayFilter, onClose }) => {
  const [search, setSearch] = useState('');
  const [filterCol, setFilterCol] = useState<string>('전체');
  const [filterCls, setFilterCls] = useState<string | null>(null);
  const [dayFilter, setDayFilter] = useState<string | null>(initialDayFilter);
  const [page, setPage] = useState(0);
  const COL_SETTINGS_KEY = 'dentweb_data_viewer_col_settings';
  const [visibleCols, setVisibleCols] = useState<Set<string>>(() => {
    try { const s = JSON.parse(localStorage.getItem(COL_SETTINGS_KEY) || ''); return new Set(s.visible as string[]); } catch { return new Set(COLUMNS); }
  });
  const [colOrder, setColOrder] = useState<string[]>(() => {
    try { const s = JSON.parse(localStorage.getItem(COL_SETTINGS_KEY) || ''); return s.order as string[]; } catch { return [...COLUMNS]; }
  });
  const [showColFilter, setShowColFilter] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const saveColSettings = () => {
    localStorage.setItem(COL_SETTINGS_KEY, JSON.stringify({ visible: [...visibleCols], order: colOrder }));
    setShowSaveConfirm(false);
  };

  const toggleCol = (col: string) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(col)) { if (next.size > 1) next.delete(col); }
      else next.add(col);
      return next;
    });
  };

  const handleDragStart = (idx: number) => { setDragIdx(idx); };
  const handleDragOver = (e: React.DragEvent, idx: number) => { e.preventDefault(); setDragOverIdx(idx); };
  const handleDragEnd = () => {
    if (dragIdx !== null && dragOverIdx !== null && dragIdx !== dragOverIdx) {
      setColOrder(prev => {
        const next = [...prev];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(dragOverIdx, 0, moved);
        return next;
      });
    }
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(col);
      setSortDir('desc');
    }
  };

  const displayCols = colOrder.filter(c => visibleCols.has(c));

  const filtered = useMemo(() => {
    let result = rows;
    if (dayFilter) {
      result = result.filter(row => {
        const weekday = getKoreanWeekday(row['날짜']);
        return weekday === dayFilter;
      });
    }
    if (filterCls) {
      result = result.filter(row => String(row['구분'] || '') === filterCls);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(row => {
        if (filterCol === '전체') {
          return COLUMNS.some(col => String(row[col] || '').toLowerCase().includes(q));
        }
        return String(row[filterCol] || '').toLowerCase().includes(q);
      });
    }
    if (sortCol) {
      result = [...result].sort((a, b) => {
        const av = String(a[sortCol] ?? '');
        const bv = String(b[sortCol] ?? '');
        const an = Number(av);
        const bn = Number(bv);
        const cmp = (!isNaN(an) && !isNaN(bn)) ? an - bn : av.localeCompare(bv, 'ko');
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return result;
  }, [rows, search, filterCol, filterCls, dayFilter, sortCol, sortDir]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, filterCol, filterCls, dayFilter, sortCol, sortDir]);
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key !== 'Tab') return;

      const container = modalRef.current;
      if (!container) return;

      const focusable = Array.from(
        container.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
      ) as HTMLElement[];
      const enabledFocusable = focusable.filter((el) => !el.hasAttribute('disabled'));

      if (enabledFocusable.length === 0) return;

      const first = enabledFocusable[0];
      const last = enabledFocusable[enabledFocusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // 구분별 집계 (청구·골이식만은 갯수 0으로 처리)
  const summary = useMemo(() => {
    const noUsageTypes = new Set(['청구', '골이식만']);
    const counts = new Map<string, { rows: number; qty: number }>();
    rows.forEach(row => {
      const cls = String(row['구분'] || '기타');
      const qty = noUsageTypes.has(cls) ? 0 : (Number(row['갯수']) || 0);
      const prev = counts.get(cls) || { rows: 0, qty: 0 };
      counts.set(cls, { rows: prev.rows + 1, qty: prev.qty + qty });
    });
    return Array.from(counts.entries()).sort(([a], [b]) => a.localeCompare(b, 'ko'));
  }, [rows]);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div
        ref={modalRef}
        className="bg-white w-full max-w-6xl h-[85vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="surgery-data-viewer-title"
        aria-describedby="surgery-data-viewer-desc"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 id="surgery-data-viewer-title" className="text-lg font-black text-slate-900">수술기록 데이터 조회</h3>
              {dayFilter && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-xs font-bold rounded-md border border-indigo-200 flex items-center gap-1.5">
                  {dayFilter}요일
                  <button onClick={() => setDayFilter(null)} className="hover:text-indigo-900 focus:outline-none">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </span>
              )}
            </div>
            <p id="surgery-data-viewer-desc" className="text-xs text-slate-400 mt-0.5">{filtered.length}건의 레코드 (총 {rows.length}건)</p>
          </div>
          <button ref={closeButtonRef} onClick={onClose} aria-label="데이터 조회 모달 닫기" className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Summary Strip + Classification Filter */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center justify-between shrink-0 gap-4">
          <div className="flex flex-wrap gap-3">
            {summary.map(([cls, { rows: cnt, qty }]) => {
              const noUsage = cls === '청구' || cls === '골이식만';
              return (
                <div key={cls} className="px-3 py-1.5 bg-slate-50 rounded-lg border border-slate-100 text-xs whitespace-nowrap">
                  <span className="font-bold text-slate-700">{cls}</span>
                  <span className="text-slate-400 mx-1.5">|</span>
                  {noUsage ? (
                    <span className="text-slate-500">{cnt}건</span>
                  ) : (
                    <span className="font-bold text-indigo-600">갯수합계 {qty}</span>
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex flex-nowrap shrink-0 overflow-x-auto gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
            {([null, '식립', '수술중 FAIL', '청구', '골이식만'] as const).map(cls => {
              const active = filterCls === cls;
              const colors: Record<string, string> = { '식립': 'bg-indigo-600 text-white', '수술중 FAIL': 'bg-rose-500 text-white', '청구': 'bg-teal-500 text-white', '골이식만': 'bg-amber-500 text-white' };
              const label = cls === null ? '전체' : cls === '수술중 FAIL' ? 'FAIL' : cls;
              return (
                <button key={label} onClick={() => setFilterCls(cls)} className={`whitespace-nowrap px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${active ? (cls === null ? 'bg-slate-800 text-white' : colors[cls]) : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filter */}
        <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-3 shrink-0">
          <select
            value={filterCol}
            onChange={e => setFilterCol(e.target.value)}
            className="px-3 py-2 text-xs font-bold bg-white border border-slate-200 rounded-lg text-slate-600 outline-none focus:border-indigo-400"
          >
            <option value="전체">전체 컬럼</option>
            {COLUMNS.map(col => <option key={col} value={col}>{col}</option>)}
          </select>
          <div className="flex-1 relative">
            <svg className="w-4 h-4 text-slate-300 absolute left-3 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="검색어 입력..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-lg outline-none focus:border-indigo-400 text-slate-700"
            />
          </div>
          <span className="text-xs text-slate-400 font-medium whitespace-nowrap">검색결과 {filtered.length}건</span>
          {/* Column visibility toggle + Save */}
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                onClick={() => setShowColFilter(p => !p)}
                aria-label="컬럼 설정 열기"
                className={`p-2 rounded-lg border transition-all ${showColFilter ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                title="컬럼 설정"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
              </button>
              {showColFilter && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {colOrder.map((col, idx) => (
                    <div
                      key={col}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-1 px-2 py-1.5 text-xs transition-colors ${dragOverIdx === idx ? 'bg-indigo-50 border-t-2 border-indigo-300' : 'hover:bg-slate-50'} ${dragIdx === idx ? 'opacity-40' : ''}`}
                    >
                      <span className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 px-1 shrink-0">
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="9" cy="5" r="1.5" /><circle cx="15" cy="5" r="1.5" /><circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" /><circle cx="9" cy="19" r="1.5" /><circle cx="15" cy="19" r="1.5" /></svg>
                      </span>
                      <button
                        onClick={() => toggleCol(col)}
                        className="shrink-0 p-0.5"
                        aria-label={`${col} 컬럼 ${visibleCols.has(col) ? '숨기기' : '보이기'}`}
                      >
                        {visibleCols.has(col) ? (
                          <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        ) : (
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                        )}
                      </button>
                      <span className={`font-medium flex-1 ${visibleCols.has(col) ? 'text-slate-700' : 'text-slate-400'}`}>{col}</span>
                      <span className="text-[9px] text-slate-300 tabular-nums w-4 text-right">{idx + 1}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowSaveConfirm(true)}
              aria-label="컬럼 설정 저장 열기"
              className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all"
              title="컬럼 설정 저장"
            >
              <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto" onClick={() => showColFilter && setShowColFilter(false)}>
          <table className="w-full text-left border-collapse table-fixed">
            <colgroup>
              <col style={{ width: 40 }} />
              {displayCols.map(col => (
                <col key={col} style={{ width: COL_WIDTHS[col] || 100 }} />
              ))}
            </colgroup>
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-3 py-2.5 text-[10px] font-bold text-slate-400 text-center border-b border-slate-200">#</th>
                {displayCols.map(col => (
                  <th
                    key={col}
                    onClick={() => handleSort(col)}
                    className="px-3 py-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors select-none"
                  >
                    <span className="inline-flex items-center gap-1">
                      {col}
                      {sortCol === col ? (
                        <svg className="w-3 h-3 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          {sortDir === 'asc'
                            ? <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                            : <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />}
                        </svg>
                      ) : (
                        <svg className="w-3 h-3 text-slate-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" /></svg>
                      )}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.map((row, i) => (
                <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                  <td className="px-3 py-2 text-[10px] text-slate-300 text-center tabular-nums">{page * PAGE_SIZE + i + 1}</td>
                  {displayCols.map(col => {
                    const rowCls = String(row['구분'] || '');
                    const noUsage = rowCls === '청구' || rowCls === '골이식만';
                    const isQty = col === '갯수';
                    const isCls = col === '구분';
                    let displayVal = isQty && noUsage ? '0' : String(row[col] ?? '');
                    if (col === '환자정보' && displayVal) {
                      displayVal = displayVal
                        .replace(/^(.)(.+?)(?=\()/, (_m, first, rest) => first + '*'.repeat(rest.length))
                        .replace(/\((\d+)\)/, (_m, nums) => '(' + '*'.repeat(nums.length) + ')');
                    }
                    return (
                      <td key={col} className={`px-3 py-2 text-xs overflow-hidden text-ellipsis whitespace-nowrap ${isQty ? 'text-center font-black tabular-nums' : ''} ${isCls ? 'font-bold' : 'text-slate-600'} ${isCls && rowCls === '식립' ? 'text-indigo-600' : ''} ${isCls && rowCls === '수술중 FAIL' ? 'text-rose-500' : ''} ${isCls && rowCls === '청구' ? 'text-teal-600' : ''} ${isCls && rowCls === '골이식만' ? 'text-amber-600' : ''} ${isQty && !noUsage && Number(displayVal) > 1 ? 'text-rose-600 bg-rose-50/50' : ''}`} title={displayVal}>
                        {displayVal}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              이전
            </button>
            <span className="text-xs text-slate-400 font-medium tabular-nums">{page + 1} / {totalPages}</span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              다음
            </button>
          </div>
        )}

        {/* Save Confirm Modal */}
        {showSaveConfirm && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm rounded-[24px]" onClick={() => setShowSaveConfirm(false)}>
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
              onClick={e => e.stopPropagation()}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="save-col-settings-title"
              aria-describedby="save-col-settings-desc"
            >
              <div className="p-6 flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                </div>
                <h4 id="save-col-settings-title" className="text-base font-black text-slate-900 mb-1">컬럼 설정 저장</h4>
                <p id="save-col-settings-desc" className="text-sm text-slate-500">현재 컬럼 표시/순서 설정을 저장합니다.<br />다음에 다시 열어도 이 설정이 유지됩니다.</p>
              </div>
              <div className="px-6 pb-6 flex gap-3">
                <button onClick={() => setShowSaveConfirm(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all">취소</button>
                <button onClick={saveColSettings} className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl shadow-lg shadow-indigo-100 transition-all">저장</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SurgeryDashboard;
