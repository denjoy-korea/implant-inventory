
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ExcelRow } from '../types';
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

interface SurgeryDashboardProps {
  rows: ExcelRow[];
  onUpload: () => void;
  isLoading: boolean;
}

const SurgeryDashboard: React.FC<SurgeryDashboardProps> = ({ rows, onUpload, isLoading }) => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const stats = useSurgeryStats(rows);

  // Date range filter state
  const months = useMemo(() => stats.monthlyData.map(d => d.month), [stats.monthlyData]);
  const [rangeStart, setRangeStart] = useState(0);
  const [rangeEnd, setRangeEnd] = useState(999);

  useEffect(() => {
    setRangeStart(0);
    setRangeEnd(999);
  }, [stats.monthlyData.length]);

  const effectiveStart = Math.max(0, Math.min(rangeStart, stats.monthlyData.length - 1));
  const effectiveEnd = Math.max(effectiveStart, Math.min(rangeEnd, stats.monthlyData.length - 1));

  const handleRangeChange = useCallback((s: number, e: number) => {
    setRangeStart(s);
    setRangeEnd(e);
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

  const filteredStats = useSurgeryStats(filteredRows);

  // Animated KPI values
  const animPlacement = useCountUp(stats.classificationStats['식립']);
  const animClaim = useCountUp(stats.classificationStats['청구']);
  const animMonthlyAvg = useCountUp(Math.round(stats.monthlyAvgPlacement * 10));
  const animFailRate = useCountUp(Math.round(stats.failRate * 10));
  const animDailyAvg = useCountUp(Math.round(stats.dailyAvgPlacement * 10));
  const animRecentDailyAvg = useCountUp(Math.round(stats.recentDailyAvg * 10));

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    const [y, m, d] = iso.split('-');
    return `${y}.${m}.${d}`;
  };

  // =====================================================
  // EMPTY STATE
  // =====================================================
  if (stats.cleanRows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[55vh] text-center">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm ${isLoading ? 'bg-indigo-50 border border-indigo-200' : 'bg-white border border-slate-200'}`}>
          {isLoading ? (
            <svg className="animate-spin w-7 h-7 text-indigo-600" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>
          ) : (
            <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          )}
        </div>
        <div className="space-y-2 mb-8">
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">{isLoading ? '데이터 분석 중\u2026' : '수술기록을 업로드해주세요'}</h3>
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
    <div className="space-y-6" style={{ animationDuration: '0s' }}>
      {/* Sticky header + KPI + Range slider wrapper */}
      <div className="sticky top-[44px] z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50" style={{ boxShadow: '0 4px 12px -4px rgba(0,0,0,0.08)' }}>
        {/* A. Header Strip */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">데이터 기간</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Data Period</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{formatDate(stats.dateRange.min)} <span className="text-slate-300 font-light mx-1">~</span> {formatDate(stats.dateRange.max)}</p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 레코드</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Records</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{stats.dateRange.total.toLocaleString()}<span className="text-xs font-semibold text-slate-400 ml-1">cases</span></p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">다음 다운로드</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Next Download</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{formatDate(stats.nextDownloadDate)}~</p>
              </div>
            </div>
            <button onClick={onUpload} disabled={isLoading} className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 active:scale-[0.98] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-md shadow-slate-200">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
              데이터 업데이트
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
          sparkline={stats.sparkline}
        />

        {/* C. Date Range Slider */}
        {months.length > 1 && (
          <DateRangeSlider
            months={months}
            startIdx={effectiveStart}
            endIdx={effectiveEnd}
            onChange={handleRangeChange}
          />
        )}
      </div>{/* end sticky wrapper */}

      {/* D. Charts 2x2 grid (filtered by range slider) */}
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <MonthlyTrendChart monthlyData={filteredStats.monthlyData} mounted={mounted} />
        <DayOfWeekChart dayOfWeekStats={filteredStats.dayOfWeekStats} dayInsight={filteredStats.dayInsight} mounted={mounted} />
        <PlacementTrendChart monthlyData={filteredStats.monthlyData} monthlyAvgPlacement={filteredStats.monthlyAvgPlacement} trendline={filteredStats.trendline} mounted={mounted} />
        <ClassificationRatios classificationStats={filteredStats.classificationStats} mounted={mounted} />
      </div>

      {/* D. Deep Analysis Divider */}
      <div className="flex items-center gap-4 py-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Deep Analysis</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* F. Manufacturer Analysis (filtered) */}
      <ManufacturerAnalysis
        manufacturerDonut={filteredStats.manufacturerDonut}
        manufacturerFailStats={filteredStats.manufacturerFailStats}
        topSizes={filteredStats.topSizes}
        totalPlacements={filteredStats.classificationStats['식립']}
        mounted={mounted}
      />

      {/* G. Tooth Analysis (filtered) */}
      <ToothAnalysis toothAnalysis={filteredStats.toothAnalysis} toothHeatmap={filteredStats.toothHeatmap} mounted={mounted} />
    </div>
  );
};

export default SurgeryDashboard;
