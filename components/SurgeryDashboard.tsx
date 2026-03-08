
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ExcelRow, HospitalPlanState, PLAN_LIMITS, PLAN_NAMES, DEFAULT_WORK_DAYS, SurgeryUnregisteredItem, DetectedFail, FailCandidate } from '../types';
import { planService } from '../services/planService';
import { failDetectionService } from '../services/failDetectionService';
import FailDetectionModal from './fail/FailDetectionModal';
import { useCountUp } from './surgery-dashboard/shared';
import { useSurgeryStats } from './surgery-dashboard/useSurgeryStats';
import { holidayService } from '../services/holidayService';
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
import MonthlyReportModal from './MonthlyReportModal';
import { FloatingTOC } from './surgery-dashboard/FloatingTOC';
import SectionLockCard from './surgery-dashboard/SectionLockCard';
import DataViewerModal from './surgery-dashboard/DataViewerModal';

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
  hospitalId?: string;
  isReadOnly?: boolean;
  currentUserName?: string;
  onUpgrade?: () => void;
}

const SurgeryDashboard: React.FC<SurgeryDashboardProps> = ({
  rows,
  onUpload,
  isLoading,
  unregisteredFromSurgery = [],
  onGoInventoryMaster,
  hospitalWorkDays = DEFAULT_WORK_DAYS,
  planState,
  hospitalId,
  isReadOnly,
  currentUserName = '관리자',
  onUpgrade,
}) => {
  const [mounted, setMounted] = useState(false);
  const [showMonthlyReport, setShowMonthlyReport] = useState(false);
  const [showDataViewer, setShowDataViewer] = useState(false);
  const [dataViewerDayFilter, setDataViewerDayFilter] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [detectedFails, setDetectedFails] = useState<DetectedFail[]>([]);
  const [isScanLoading, setIsScanLoading] = useState(false);
  const [scanCandidates, setScanCandidates] = useState<FailCandidate[] | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!hospitalId) return;
    failDetectionService.getDetectedFails(hospitalId).then(setDetectedFails).catch(() => {});
  }, [hospitalId]);

  // workDaysMap 없이 먼저 월 목록 추출을 위해 stats를 한 번 계산 (workDaysMap 미전달 → 25일 폴백)
  const rawStats = useSurgeryStats(rows);

  // Date range filter state
  const months = useMemo(() => rawStats.monthlyData.map(d => d.month), [rawStats.monthlyData]);

  // 공휴일 API 기반 월별 실제 진료일수 맵 (비동기)
  const workDaysMap = useWorkDaysMap(months, hospitalWorkDays);

  // workDaysMap 확정 후 최종 stats 계산
  const stats = useSurgeryStats(rows, workDaysMap);

  // 플랜별 조회 가능 기간(viewMonths) 기반 슬라이더 최솟값 계산
  // - retentionMonths(저장 기간)와 별도로 viewMonths(조회 가능 기간)으로 UI 제한
  const minStartIdx = useMemo(() => {
    if (!planState) return 0;
    const viewMonths = PLAN_LIMITS[planState.plan]?.viewMonths ?? 24;
    if (viewMonths >= 24) return 0; // Plus 이상 — 전체 조회 가능
    const total = stats.monthlyData.length;
    if (total <= viewMonths) return 0; // 데이터 자체가 제한 이내
    return total - viewMonths;
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

  const confirmedReimplantCount = useMemo(() => detectedFails.filter(f => f.status === 'confirmed').length, [detectedFails]);
  const pendingReimplantCount = useMemo(() => detectedFails.filter(f => f.status === 'pending').length, [detectedFails]);

  const handleScanAll = useCallback(async () => {
    if (!hospitalId) return;
    setIsScanLoading(true);
    try {
      const candidates = await failDetectionService.scanAllRecords(hospitalId);
      if (candidates.length > 0) {
        setScanCandidates(candidates);
      } else {
        setIsScanLoading(false);
      }
    } catch {
      setIsScanLoading(false);
    }
  }, [hospitalId]);

  const handleScanModalClose = useCallback(async () => {
    setScanCandidates(null);
    setIsScanLoading(false);
    if (hospitalId) {
      failDetectionService.getDetectedFails(hospitalId).then(setDetectedFails).catch(() => {});
    }
  }, [hospitalId]);

  const handleReimplantStatusUpdate = useCallback(async (id: string, status: 'confirmed' | 'dismissed', confirmedBy?: string) => {
    await failDetectionService.updateStatus(id, status, confirmedBy);
    setDetectedFails(prev => prev.map(f => f.id === id
      ? { ...f, status, confirmed_by: confirmedBy ?? null, confirmed_at: new Date().toISOString() }
      : f,
    ));
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

  // 플랜별 기능 접근 가능 여부
  const currentPlan = planState?.plan ?? 'free';
  const canSurgeryChartBasic = planService.canAccess(currentPlan, 'surgery_chart_basic');
  const canSurgeryChartAdvanced = planService.canAccess(currentPlan, 'surgery_chart_advanced');
  const canAdvanced = planService.canAccess(currentPlan, 'dashboard_advanced');
  const canMonthlyReport = planService.canAccess(currentPlan, 'monthly_report');

  // 진행율 기반 전월 대비 델타 (이번달이 진행중인 경우 공휴일·진료일 반영)
  const [progressAwareDeltas, setProgressAwareDeltas] = useState<{
    placementDelta: number;
    failDelta: number;
    claimDelta: number;
    prevMonthPlacement: number;
    prevMonthFail: number;
    prevMonthClaim: number;
    prevCutoffDay: number;
    progressPct: number;
    isReady: boolean;
    isPartialMonth: boolean;
  }>({ placementDelta: 0, failDelta: 0, claimDelta: 0, prevMonthPlacement: 0, prevMonthFail: 0, prevMonthClaim: 0, prevCutoffDay: 0, progressPct: 0, isReady: false, isPartialMonth: false });

  useEffect(() => {
    const monthlyDataArr = stats.monthlyData;
    if (monthlyDataArr.length < 2 || !workDaysMap) return;

    const lastMonth = monthlyDataArr[monthlyDataArr.length - 1];
    const prevMonth = monthlyDataArr[monthlyDataArr.length - 2];
    const lastMonthKey = lastMonth.month;
    const prevMonthKey = prevMonth.month;

    const lastDataDate = stats.dateRange.max;
    if (!lastDataDate) return;

    const lastDataMonthKey = lastDataDate.substring(0, 7);
    const lastDataDay = parseInt(lastDataDate.substring(8, 10));
    const lastYear = parseInt(lastMonthKey.substring(0, 4));
    const lastMonthNum = parseInt(lastMonthKey.substring(5, 7));
    const daysInLastMonth = new Date(lastYear, lastMonthNum, 0).getDate();

    const isPartialMonth = lastDataMonthKey === lastMonthKey && lastDataDay < daysInLastMonth;

    if (!isPartialMonth) {
      setProgressAwareDeltas({
        placementDelta: lastMonth['식립'] - prevMonth['식립'],
        failDelta: lastMonth['수술중교환'] - prevMonth['수술중교환'],
        claimDelta: lastMonth['청구'] - prevMonth['청구'],
        prevMonthPlacement: prevMonth['식립'],
        prevMonthFail: prevMonth['수술중교환'],
        prevMonthClaim: prevMonth['청구'],
        prevCutoffDay: daysInLastMonth,
        progressPct: 100,
        isReady: true,
        isPartialMonth: false,
      });
      return;
    }

    const prevYear = parseInt(prevMonthKey.substring(0, 4));
    const prevMonthNum = parseInt(prevMonthKey.substring(5, 7));

    Promise.all([
      holidayService.getHolidays(lastYear),
      holidayService.getHolidays(prevYear),
    ]).then(([thisHolidays, prevHolidays]) => {
      const thisHolidaySet = new Set(thisHolidays);
      const prevHolidaySet = new Set(prevHolidays);

      // 이번달 경과 진료일 수 (1..lastDataDay)
      let thisElapsed = 0;
      for (let day = 1; day <= lastDataDay; day++) {
        const dow = new Date(lastYear, lastMonthNum - 1, day).getDay();
        const dateStr = `${lastYear}-${String(lastMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (hospitalWorkDays.includes(dow) && !thisHolidaySet.has(dateStr)) thisElapsed++;
      }

      const thisTotalWorkDays = workDaysMap[lastMonthKey] ?? 25;
      const progressRate = thisTotalWorkDays > 0 ? thisElapsed / thisTotalWorkDays : 0;
      const progressPct = Math.round(progressRate * 100);

      // 전월에서 동일 진행율에 해당하는 컷오프 일자 찾기
      const daysInPrevMonth = new Date(prevYear, prevMonthNum, 0).getDate();
      const targetPrevWorkDays = Math.round(progressRate * (workDaysMap[prevMonthKey] ?? 25));
      let prevElapsed = 0;
      let prevCutoffDay = daysInPrevMonth;
      for (let day = 1; day <= daysInPrevMonth; day++) {
        const dow = new Date(prevYear, prevMonthNum - 1, day).getDay();
        const dateStr = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        if (hospitalWorkDays.includes(dow) && !prevHolidaySet.has(dateStr)) {
          prevElapsed++;
          if (prevElapsed >= targetPrevWorkDays) { prevCutoffDay = day; break; }
        }
      }

      // 전월 컷오프 이전 row 집계
      const prevMonthPrefix = prevMonthKey + '-';
      let prevPlacement = 0, prevFail = 0, prevClaim = 0;
      stats.cleanRows.forEach(row => {
        const dateStr = String(row['날짜'] || '');
        if (!dateStr.startsWith(prevMonthPrefix)) return;
        const day = parseInt(dateStr.substring(8, 10));
        if (isNaN(day) || day > prevCutoffDay) return;
        const cls = String(row['구분'] || '');
        const qty = Number(row['갯수']) || 1;
        if (cls === '식립') prevPlacement += qty;
        else if (cls === '수술중교환') prevFail += qty;
        else if (cls === '청구') prevClaim += qty;
      });

      setProgressAwareDeltas({
        placementDelta: lastMonth['식립'] - prevPlacement,
        failDelta: lastMonth['수술중교환'] - prevFail,
        claimDelta: lastMonth['청구'] - prevClaim,
        prevMonthPlacement: prevPlacement,
        prevMonthFail: prevFail,
        prevMonthClaim: prevClaim,
        prevCutoffDay,
        progressPct,
        isReady: true,
        isPartialMonth: true,
      });
    }).catch(() => {
      setProgressAwareDeltas({
        placementDelta: lastMonth['식립'] - prevMonth['식립'],
        failDelta: lastMonth['수술중교환'] - prevMonth['수술중교환'],
        claimDelta: lastMonth['청구'] - prevMonth['청구'],
        prevMonthPlacement: prevMonth['식립'],
        prevMonthFail: prevMonth['수술중교환'],
        prevMonthClaim: prevMonth['청구'],
        prevCutoffDay: daysInLastMonth,
        progressPct: 100,
        isReady: true,
        isPartialMonth: false,
      });
    });
  }, [stats.monthlyData, stats.dateRange.max, stats.cleanRows, workDaysMap, hospitalWorkDays]);

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
  // HOOKS — must be before any early return
  // =====================================================
  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
  );

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

  return (
    <div className="space-y-6 pb-16 [animation-duration:0s]">
      {/* Free 플랜 업그레이드 유도 배너 */}
      {currentPlan === 'free' && onUpgrade && (
        <div className="flex items-center gap-3 bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-3">
          <div className="w-8 h-8 shrink-0 bg-indigo-100 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black text-indigo-800">수술기록 3개월만 조회 중</p>
            <p className="text-[11px] text-indigo-600 mt-0.5">Basic 업그레이드 시 12개월 + 재고 마스터 + FAIL 관리가 열립니다</p>
          </div>
          <button
            onClick={onUpgrade}
            className="shrink-0 px-3 py-1.5 bg-indigo-600 text-white text-[11px] font-bold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            업그레이드
          </button>
        </div>
      )}

      {/* Header + KPI (non-sticky, scrolls normally) */}
      <div className="space-y-4">
        {/* A. Header Strip */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-wrap items-stretch gap-2.5 sm:gap-3 flex-1 min-w-0">
              {/* 데이터 기간 + 선택 기간 통합 카드 */}
              <div className="min-w-[190px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <h4 className="text-sm font-semibold text-slate-800">데이터 기간</h4>
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
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{kpiStats.dateRange.total.toLocaleString()}<span className="text-xs font-semibold text-slate-400 ml-1">cases</span></p>
              </div>
              <div className="min-w-[160px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                <h4 className="text-sm font-semibold text-slate-800">다음 다운로드</h4>
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
              {canMonthlyReport && (
                <button onClick={() => setShowMonthlyReport(true)} className="px-4 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100 hover:bg-indigo-100 active:scale-[0.98] transition-colors flex items-center gap-2">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  월간 리포트
                </button>
              )}
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
              <p className="text-[10px] font-bold text-slate-400">교환율</p>
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
          progressAwareDeltas={progressAwareDeltas}
        />

        {/* C. Date Range Slider */}
      </div>{/* end non-sticky wrapper */}

      {/* Sticky: 기간 필터만 고정 */}
      {months.length > 1 && (
        <div
          data-sticky-anchor="surgery-dashboard"
          className="sticky z-20 -mt-2 pb-1 bg-slate-50"
          style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.06)' }}
        >
          <DateRangeSlider
            months={months}
            startIdx={effectiveStart}
            endIdx={effectiveEnd}
            onChange={handleRangeChange}
            minStartIdx={minStartIdx}
          />
        </div>
      )}

      {unregisteredFromSurgery.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-slate-800">미등록 품목</span>
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

      {/* D. Charts — surgery_chart_basic (Basic+): 월별추세·요일별, surgery_chart_advanced (Plus+): 나머지 */}
      {canSurgeryChartBasic ? (
        <CollapsibleSection
          id="section-charts"
          title="통계 차트"
          subtitle=""
          accentColor="slate"
          icon={<svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          badge="월별 · 요일별 · 구분별"
          storageKey="surgery-charts"
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <MonthlyTrendChart monthlyData={kpiStats.monthlyData} mounted={mounted} onMonthClick={handleMonthClick} selectedMonth={selectedMonth} />
            </div>
            <DayOfWeekChart dayOfWeekStats={kpiStats.dayOfWeekStats} dayInsight={kpiStats.dayInsight} mounted={mounted} onDayClick={handleDayClick} />
            {canSurgeryChartAdvanced && (
              <>
                <div className="lg:col-span-2">
                  <PlacementTrendChart monthlyData={kpiStats.monthlyData} monthlyAvgPlacement={kpiStats.monthlyAvgPlacement} trendline={kpiStats.trendline} mounted={mounted} onMonthClick={handleMonthClick} selectedMonth={selectedMonth} />
                </div>
                <ClassificationRatios classificationStats={kpiStats.classificationStats} mounted={mounted} />
              </>
            )}
          </div>
          {!canSurgeryChartAdvanced && (
            <SectionLockCard
              title="추가 차트 (식립 추세 · 구분별 비율)"
              desc="식립 추세선과 분류별 비율 차트는 Plus 이상에서 제공됩니다."
              requiredPlan={PLAN_NAMES['plus']}
              onUpgrade={onUpgrade}
            />
          )}
        </CollapsibleSection>
      ) : (
        <SectionLockCard
          title="통계 차트"
          desc="월별 식립 추세, 요일별 패턴, 구분별 비율을 시각화합니다."
          requiredPlan={PLAN_NAMES['basic']}
          onUpgrade={onUpgrade}
        />
      )}

      {/* E. Deep Analysis — surgery_chart_advanced (Plus+) */}
      {canSurgeryChartAdvanced ? (
        <CollapsibleSection
          id="section-deep"
          title="심층 분석"
          subtitle=""
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
      ) : (
        <SectionLockCard
          title="심층 분석"
          desc="제조사별 교환율, 치아 부위별 식립 패턴, 사이즈 랭킹을 분석합니다."
          requiredPlan={PLAN_NAMES['plus']}
          onUpgrade={onUpgrade}
        />
      )}

      {/* F. Clinical Analysis — dashboard_advanced (Plus+) */}
      {canAdvanced ? (
        clinicalStats.hasClinicalData && (
          <CollapsibleSection
            id="section-clinical"
            title="임상 인사이트"
            subtitle=""
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
        )
      ) : (
        <SectionLockCard
          title="임상 인사이트"
          desc="골질·초기고정 분포와 제조사별 실패율 등 심층 임상 데이터를 분석합니다."
          requiredPlan={PLAN_NAMES['plus']}
          onUpgrade={onUpgrade}
        />
      )}

      {/* G. 재식립 감지 현황 — dashboard_advanced (Plus+) */}
      {!canAdvanced ? (
        <SectionLockCard
          title="재식립 감지 현황"
          desc="수술기록에서 재식립 가능성을 자동 감지하고 추적합니다."
          requiredPlan={PLAN_NAMES['plus']}
          onUpgrade={onUpgrade}
        />
      ) : hospitalId && (
        <CollapsibleSection
          id="section-reimplant"
          title="재식립 감지 현황"
          subtitle=""
          accentColor="rose"
          icon={<svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>}
          badge={`확인 ${confirmedReimplantCount}건 · 미확인 ${pendingReimplantCount}건`}
          storageKey="surgery-reimplant"
        >
          <div className="space-y-4">
            {/* KPI + 스캔 버튼 */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-3">
                <div className="rounded-xl bg-rose-50 border border-rose-100 px-4 py-2.5 text-center">
                  <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wide">재식립 확인</p>
                  <p className="text-2xl font-black text-rose-600 tabular-nums mt-0.5">{confirmedReimplantCount}<span className="text-xs font-semibold text-rose-400 ml-0.5">건</span></p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 px-4 py-2.5 text-center">
                  <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wide">미확인</p>
                  <p className="text-2xl font-black text-amber-600 tabular-nums mt-0.5">{pendingReimplantCount}<span className="text-xs font-semibold text-amber-400 ml-0.5">건</span></p>
                </div>
              </div>
              {!isReadOnly && (
                <button
                  onClick={handleScanAll}
                  disabled={isScanLoading}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-xl transition-colors disabled:opacity-50 shadow-sm shadow-rose-100"
                >
                  {isScanLoading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                  )}
                  전체 기록 스캔
                </button>
              )}
            </div>

            {/* 목록 */}
            {detectedFails.filter(f => f.status !== 'dismissed').length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm">
                <svg className="w-8 h-8 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                감지된 재식립이 없습니다
              </div>
            ) : (
              <div className="space-y-2">
                {detectedFails.filter(f => f.status !== 'dismissed').map(fail => (
                  <div key={fail.id} className={`rounded-xl border p-3 ${fail.status === 'confirmed' ? 'border-rose-100 bg-rose-50/50' : 'border-amber-100 bg-amber-50/50'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-800">#{fail.tooth_number} 치아</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${fail.status === 'confirmed' ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'}`}>
                            {fail.status === 'confirmed' ? '재식립 확인' : '미확인'}
                          </span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          <div className="bg-slate-50 rounded-lg px-2.5 py-1.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">원래 식립</p>
                            <p className="text-[11px] font-semibold text-slate-700">{fail.original_date} · {fail.original_manufacturer} {fail.original_brand}{fail.original_size ? ` ${fail.original_size}` : ''}</p>
                          </div>
                          <div className="bg-rose-50 rounded-lg px-2.5 py-1.5">
                            <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wide">재식립</p>
                            <p className="text-[11px] font-semibold text-rose-700">{fail.reimplant_date} · {fail.reimplant_manufacturer} {fail.reimplant_brand}{fail.reimplant_size ? ` ${fail.reimplant_size}` : ''}</p>
                          </div>
                        </div>
                      </div>
                      {!isReadOnly && fail.status === 'pending' && (
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            onClick={() => handleReimplantStatusUpdate(fail.id, 'confirmed', currentUserName)}
                            className="px-2.5 py-1 text-[10px] font-bold text-white bg-rose-500 hover:bg-rose-600 rounded-lg transition-colors"
                          >확인</button>
                          <button
                            onClick={() => handleReimplantStatusUpdate(fail.id, 'dismissed')}
                            className="px-2.5 py-1 text-[10px] font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >무시</button>
                        </div>
                      )}
                    </div>
                    {fail.status === 'confirmed' && fail.confirmed_by && (
                      <p className="text-[9px] text-slate-400 mt-1.5">확인: {fail.confirmed_by} · {fail.confirmed_at ? new Date(fail.confirmed_at).toLocaleDateString('ko-KR') : ''}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </CollapsibleSection>
      )}

      {/* Floating TOC */}
      <FloatingTOC hasClinical={clinicalStats.hasClinicalData} />

      {/* Data Viewer Modal */}
      {showDataViewer && <DataViewerModal rows={filteredRows} initialDayFilter={dataViewerDayFilter} onClose={() => { setShowDataViewer(false); setDataViewerDayFilter(null); }} />}

      {/* Monthly Report Modal */}
      {showMonthlyReport && <MonthlyReportModal rows={rows} onClose={() => setShowMonthlyReport(false)} hospitalId={hospitalId} />}

      {/* Reimplant Detection Modal (scan results) */}
      {scanCandidates && hospitalId && (
        <FailDetectionModal
          candidates={scanCandidates}
          hospitalId={hospitalId}
          currentUserName={currentUserName}
          onClose={handleScanModalClose}
        />
      )}
    </div>
  );
};

export default SurgeryDashboard;
