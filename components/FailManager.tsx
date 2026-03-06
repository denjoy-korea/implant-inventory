
import React, { useState } from 'react';
import type { ExcelRow, InventoryItem, Order as FailOrder, ReturnRequest, ReturnReason } from '../types';
import FailBulkSetupModal from './FailBulkSetupModal';
import DateRangeSlider from './surgery-dashboard/DateRangeSlider';
import FailKpiStrip from './fail/FailKpiStrip';
import FailMonthlyTrendChartCard from './fail/FailMonthlyTrendChartCard';
import FailReturnModal from './fail/FailReturnModal';
import FailAllReturnConfirmModal from './fail/FailAllReturnConfirmModal';
import FailOrderHistorySection from './fail/FailOrderHistorySection';
import { useFailManager } from '../hooks/useFailManager';
import ConfirmModal from './ConfirmModal';

// ============================================================
// TYPES
// ============================================================
interface FailManagerProps {
  surgeryMaster: Record<string, ExcelRow[]>;
  inventory: InventoryItem[];
  failOrders: FailOrder[];
  returnRequests?: ReturnRequest[];
  onCreateReturn: (params: {
    manufacturer: string;
    reason: ReturnReason;
    manager: string;
    memo: string;
    items: { brand: string; size: string; quantity: number }[];
  }) => Promise<void>;
  currentUserName: string;
  isReadOnly?: boolean;
  hospitalId?: string;
  onBulkSetupComplete?: () => Promise<void>;
  initialShowBulkModal?: boolean;
  onInitialModalOpened?: () => void;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

// ============================================================
// COMPONENT
// ============================================================
const FailManager: React.FC<FailManagerProps> = ({ surgeryMaster, inventory, failOrders, returnRequests = [], onCreateReturn, currentUserName, isReadOnly, hospitalId, onBulkSetupComplete, initialShowBulkModal, onInitialModalOpened, onDeleteOrder }) => {
  const {
    toast,
    // period filter
    allMonths, periodStartIdx, periodEndIdx, handlePeriodChange,
    // fail data
    filteredHistoryFailList, pendingFailList, manufacturers, availableManufacturers,
    pendingByManufacturer, pendingByManufacturerMap,
    // UI state
    activeM, setActiveM,
    isModalOpen, setIsModalOpen, isOrderSubmitting,
    isBulkModalOpen, setIsBulkModalOpen,
    showBulkInfo, setShowBulkInfo,
    isAllReturnConfirmOpen, setIsAllReturnConfirmOpen, isAllReturnSubmitting,
    hoveredChartIdx, setHoveredChartIdx,
    isMobileViewport,
    chartMonthOffset, setChartMonthOffset,
    chartTouchStartX, chartTouchStartY,
    recommendedScrollRef,
    recommendedScrollPct, setRecommendedScrollPct,
    // stats
    mStats, currentStats, currentRemainingFails,
    returnPendingByMfr, totalReturnPending, returnPendingCount, actualPendingFails, globalPendingFails,
    mPendingList,
    // chart data
    monthlyFailData, allMonthlyFailData, filteredMonthlyMap,
    failSparkline, exchangeSparkline, totalPlacements, failRate, monthlyAvgFail,
    manufacturerDonut, topFailSizes,
    // animated KPIs
    animTotal, animProcessed, animPending, animFailRate, animMonthlyAvg,
    // modal data
    recommendedExchangeItems,
    // handlers
    handleOpenOrderModal, handleBulkInitialize, handleBulkReconcile,
    handleReturnSubmit, handleAllReturnSubmit,
    // donut chart
    donutPaths,
    // chart render
    visibleMonthlyData, maxOffset, chartYMax, chartTicks,
    activeOrders,
  } = useFailManager({
    surgeryMaster, inventory, failOrders,
    returnRequests, onCreateReturn, currentUserName,
    hospitalId, onBulkSetupComplete,
    initialShowBulkModal, onInitialModalOpened,
  });

  const [confirmDeleteOrderId, setConfirmDeleteOrderId] = useState<string | null>(null);

  const simpleNormalize = (str: string) => String(str || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

  return (
    <div className="space-y-6">

      {/* ========================================= */}
      {/* STICKY HEADER + KPI + FILTER              */}
      {/* ========================================= */}
      <div
        className="md:sticky z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50"
        style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.08)' }}
      >

        {/* A. Header Strip */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6 min-w-0">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">데이터 기간</h4>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">
                  {allMonths.length > 0
                    ? `${allMonths[periodStartIdx] || allMonths[0]} ~ ${allMonths[periodEndIdx] || allMonths[allMonths.length - 1]}`
                    : '-'
                  }
                </p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 교환 레코드</h4>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{filteredHistoryFailList.length}<span className="text-xs font-semibold text-slate-400 ml-1">건</span></p>
              </div>
              <div className="h-10 w-px bg-slate-100" />
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 식립 대비</h4>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{totalPlacements}<span className="text-xs font-semibold text-slate-400 ml-1">건</span></p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hospitalId && (
                <div className="relative group/exchange-cleanup">
                  <button
                    onClick={() => setIsBulkModalOpen(true)}
                    disabled={isReadOnly}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-[0.98]'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                    교환 재고 정리
                  </button>
                  <div className="absolute top-full right-0 mt-2 w-72 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/exchange-cleanup:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                    <p className="font-bold mb-1">교환 재고 일괄 정리</p>
                    <p>1회만 적용할 수 있는 기능입니다.</p>
                    <p className="mt-1 text-slate-300">임플란트 재고관리 도입 시점에 수술 중 교환한 품목의 실제 보유량을 조사하여 입력하면 됩니다.</p>
                  </div>
                </div>
              )}
              {(() => {
                const allDisabled = isReadOnly || (activeM === 'all' ? globalPendingFails <= 0 : currentRemainingFails <= 0);
                return (
                  <button
                    onClick={activeM === 'all' ? () => setIsAllReturnConfirmOpen(true) : handleOpenOrderModal}
                    disabled={allDisabled}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center gap-2 shadow-md ${allDisabled ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                    {activeM === 'all' ? '전체 일괄 반품' : '반품 신청'}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Period Filter Slider */}
        {allMonths.length > 1 && (
          <div className="hidden md:block">
            <DateRangeSlider
              months={allMonths}
              startIdx={periodStartIdx}
              endIdx={periodEndIdx}
              onChange={handlePeriodChange}
            />
          </div>
        )}

        {/* B. Manufacturer Filter Strip (Pill style) */}
        <div className="hidden md:block bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm">
          <div className="flex gap-1.5 bg-indigo-50/40 p-1 rounded-xl border border-slate-200 overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveM('all')}
              aria-pressed={activeM === 'all'}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeM === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              전체
              {globalPendingFails > 0 && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeM === 'all' ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-500'}`}>{globalPendingFails}</span>
              )}
            </button>
            {manufacturers.map(m => {
              const stats = mStats[m];
              return (
                <button
                  key={m}
                  onClick={() => setActiveM(m)}
                  aria-pressed={activeM === m}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${activeM === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  {m}
                  {Math.max(0, stats.pending - (returnPendingByMfr[m] || 0)) > 0 && (
                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeM === m ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-500'}`}>{Math.max(0, stats.pending - (returnPendingByMfr[m] || 0))}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="md:hidden bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-800">모바일 교환 관리</h3>
          {/* M-02: 분석 기간 표시 */}
          {allMonths.length > 0 && (
            <div className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-1.5">
              <span className="text-[10px] font-bold text-slate-400">분석 기간</span>
              <span className="text-[10px] font-bold text-slate-600">
                {allMonths[periodStartIdx] || allMonths[0]} ~ {allMonths[periodEndIdx] || allMonths[allMonths.length - 1]}
              </span>
            </div>
          )}
          {/* M-09: KPI 5개 모두 표시 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">총 교환</p>
              <p className="text-base font-black text-slate-800 tabular-nums">{filteredHistoryFailList.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">반품완료</p>
              <p className="text-base font-black text-emerald-600 tabular-nums">{filteredHistoryFailList.filter(f => f['구분'] === '교환완료').length}</p>
            </div>
            <div className={`rounded-xl border border-slate-100 px-3 py-2.5 ${globalPendingFails > 0 ? 'bg-rose-50/60' : 'bg-slate-50/80'}`}>
              <p className="text-[10px] font-bold text-slate-400">미처리</p>
              <p className={`text-base font-black tabular-nums ${globalPendingFails > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{globalPendingFails}</p>
              {totalReturnPending > 0 && <p className="text-[9px] font-bold text-amber-500">반품대기 {totalReturnPending}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">교환율</p>
              <p className={`text-base font-black tabular-nums ${failRate > 20 ? 'text-rose-600' : failRate > 10 ? 'text-amber-500' : 'text-slate-800'}`}>{(animFailRate / 10).toFixed(1)}<span className="text-[10px] text-slate-400">%</span></p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">월 평균</p>
              <p className="text-base font-black text-slate-800 tabular-nums">{(animMonthlyAvg / 10).toFixed(1)}<span className="text-[10px] text-slate-400">건</span></p>
            </div>
          </div>

          <div>
            <label htmlFor="mobile-fail-manufacturer" className="text-xs font-bold text-slate-500 uppercase tracking-widest">제조사 선택</label>
            <select
              id="mobile-fail-manufacturer"
              value={activeM}
              onChange={(e) => setActiveM(e.target.value)}
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="all">전체</option>
              {manufacturers.map((m) => (
                <option key={`mobile-fail-${m}`} value={m}>
                  {m} (미처리 {Math.max(0, (mStats[m]?.pending ?? 0) - (returnPendingByMfr[m] || 0))})
                </option>
              ))}
            </select>
          </div>

          {(() => {
            const mobileDisabled = isReadOnly || (activeM === 'all' ? globalPendingFails <= 0 : currentRemainingFails <= 0);
            return (
              <button
                onClick={activeM === 'all' ? () => setIsAllReturnConfirmOpen(true) : handleOpenOrderModal}
                disabled={mobileDisabled}
                className={`w-full min-h-11 rounded-xl text-sm font-black transition-all ${mobileDisabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white active:scale-[0.98]'}`}
              >
                {activeM === 'all' ? '전체 일괄 반품' : '반품 신청'}
              </button>
            );
          })()}
          {hospitalId && (
            <div>
              <div className="relative">
                <button
                  onClick={() => setIsBulkModalOpen(true)}
                  disabled={isReadOnly}
                  className={`w-full min-h-11 rounded-xl text-sm font-black transition-all ${isReadOnly
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-slate-700 text-white active:scale-[0.98]'
                    }`}
                >
                  교환 재고 정리
                </button>
                <button
                  onClick={() => setShowBulkInfo(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[13px] text-white/60 hover:text-white/90 transition-colors"
                  aria-label="설명 보기"
                >
                  ⓘ
                </button>
              </div>
              {showBulkInfo && (
                <div className="mt-1.5 text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 leading-relaxed">
                  <p className="font-bold text-slate-700 mb-0.5">교환 재고 일괄 정리</p>
                  <p>1회만 적용할 수 있는 기능입니다.</p>
                  <p className="mt-1 text-slate-400">임플란트 재고관리 도입 시점에 수술 중 교환한 품목의 실제 보유량을 조사하여 입력하면 됩니다.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>{/* end sticky wrapper */}

      {/* KPI Metrics Strip */}
      <FailKpiStrip
        animTotal={animTotal}
        animProcessed={animProcessed}
        animPending={animPending}
        animFailRate={animFailRate}
        animMonthlyAvg={animMonthlyAvg}
        failRate={failRate}
        monthlyFailDataLength={monthlyFailData.length}
        totalReturnPending={totalReturnPending}
        failSparkline={failSparkline}
        exchangeSparkline={exchangeSparkline}
      />

      {activeM ? (
        <div className="space-y-6">
          {/* ========================================= */}
          {/* ROW 1: 제조사별 현황 + 브랜드/규격 분포      */}
          {/* ========================================= */}

          {/* ROW 1 — Mobile */}
          <div className="md:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">
              {activeM === 'all' ? '전체' : activeM} 교환 현황
            </h3>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-slate-50 rounded-xl p-3 text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">총 발생</p>
                <p className="text-xl font-black text-slate-800 tabular-nums mt-1">{currentStats.total}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-[9px] font-bold text-emerald-500 uppercase tracking-widest">교환 완료</p>
                <p className="text-xl font-black text-emerald-700 tabular-nums mt-1">{currentStats.processed}</p>
              </div>
              <div className={`rounded-xl p-3 text-center ${actualPendingFails > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${actualPendingFails > 0 ? 'text-rose-400' : 'text-slate-400'}`}>미처리</p>
                <p className={`text-xl font-black tabular-nums mt-1 ${actualPendingFails > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{actualPendingFails}</p>
              </div>
            </div>
            {currentStats.total > 0 && (
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-bold text-slate-400">교환 처리율</span>
                  <span className="text-[10px] font-black text-indigo-600">{Math.round((currentStats.processed / currentStats.total) * 100)}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700"
                    style={{ width: `${(currentStats.processed / currentStats.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
            {manufacturerDonut.length > 0 && (
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">제조사 분포</h4>
                <div className="space-y-2">
                  {manufacturerDonut.map((seg) => (
                    <div key={seg.name} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color }} />
                      <span className="text-xs font-bold text-slate-700 flex-1 min-w-0 truncate">{seg.name}</span>
                      <span className="text-xs font-black text-slate-800 tabular-nums">{seg.count}건</span>
                      <span className="text-[10px] font-bold text-slate-400 w-8 text-right">{seg.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ROW 1 — Desktop */}
          <div className="hidden md:grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            {/* LEFT: 선택된 제조사 현황 카드 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-800 tracking-tight">{activeM === 'all' ? '전체' : activeM} 교환 현황</h3>
              </div>
              {/* 3-column stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">총 발생</p>
                  <p className="text-2xl font-black text-slate-800 tabular-nums">{currentStats.total}</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-4 text-center">
                  <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1">교환 완료</p>
                  <p className="text-2xl font-black text-emerald-600 tabular-nums">{currentStats.processed}</p>
                </div>
                <div className={`rounded-xl p-4 text-center ${actualPendingFails > 0 ? 'bg-rose-50' : 'bg-slate-50'}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${actualPendingFails > 0 ? 'text-rose-400' : 'text-slate-400'}`}>미처리 잔여</p>
                  <p className={`text-2xl font-black tabular-nums ${actualPendingFails > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{actualPendingFails}</p>
                  {returnPendingCount > 0 && (
                    <p className="text-[9px] font-bold text-amber-500 mt-1">반품 대기중 {returnPendingCount}건</p>
                  )}
                </div>
              </div>
              {/* FAIL 진행률 바 */}
              {currentStats.total > 0 && (
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-slate-400">교환 처리율</span>
                    <span className="text-[10px] font-black text-indigo-600">{Math.round((currentStats.processed / currentStats.total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-400 rounded-full transition-all duration-700"
                      style={{ width: `${(currentStats.processed / currentStats.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: 제조사별 교환 분포 (도넛 차트) */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">제조사 분석</h3>
              <div className="flex items-center gap-4 mt-4">
                {/* Donut */}
                <svg viewBox="0 0 120 120" className="w-28 h-28 shrink-0">
                  {donutPaths.map((seg) => (
                    <path key={seg.name} d={seg.path} fill={seg.color} stroke="white" strokeWidth="2" className="transition-opacity hover:opacity-80" />
                  ))}
                  <circle cx="60" cy="60" r="30" fill="white" />
                  <text x="60" y="57" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1e293b">{filteredHistoryFailList.length}</text>
                  <text x="60" y="72" textAnchor="middle" fontSize="7" fontWeight="600" fill="#94a3b8" letterSpacing="0.1em">총 교환</text>
                </svg>
                {/* Legend */}
                <div className="flex-1 space-y-2">
                  {manufacturerDonut.map((seg, i) => (
                    <div key={seg.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.color }} />
                        <span className="text-xs font-bold text-slate-600">{seg.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-800 tabular-nums">{seg.count}</span>
                        <span className="text-[10px] font-bold text-slate-400">{seg.percent}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ========================================= */}
          {/* ROW 2: 월별 교환 추세 + TOP FAIL 규격       */}
          {/* ========================================= */}

          {/* ROW 2 — Mobile */}
          <div className="md:hidden grid grid-cols-1 gap-3">
            {/* TOP FAIL 규격 */}
            {topFailSizes.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">교환 다빈도 규격 TOP {Math.min(5, topFailSizes.length)}</h3>
                <div className="space-y-2.5">
                  {topFailSizes.slice(0, 5).map((item, idx) => (
                    <div key={`${item.brand}-${item.size}`} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.brand}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{item.size}</p>
                      </div>
                      <span className="text-sm font-black text-slate-800 tabular-nums">{item.count}<span className="text-[10px] font-semibold text-slate-400 ml-0.5">건</span></span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* 월별 추세 — 미니 막대 */}
            {visibleMonthlyData.length > 0 && (() => {
              const recent = visibleMonthlyData.slice(-6);
              const totals = recent.map(d => manufacturers.reduce((s, m) => s + (d.byManufacturer[m] ?? 0), 0));
              const maxTotal = Math.max(...totals, 1);
              return (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">월별 교환 추세</h3>
                  <div className="space-y-2">
                    {recent.map((d, i) => (
                      <div key={d.month} className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-400 w-12 shrink-0">{d.month.slice(2)}</span>
                        <div className="flex-1 bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-500"
                            style={{ width: `${(totals[i] / maxTotal) * 100}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-black text-slate-700 w-5 text-right tabular-nums">{totals[i]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* ROW 2 — Desktop */}
          <div className="hidden md:grid grid-cols-1 xl:grid-cols-[2fr_1fr] gap-6">
            {/* LEFT: 월별 추세 차트 */}
            <FailMonthlyTrendChartCard
              manufacturers={manufacturers}
              allMonthlyFailData={allMonthlyFailData}
              allMonths={allMonths}
              periodStartIdx={periodStartIdx}
              periodEndIdx={periodEndIdx}
              visibleMonthlyData={visibleMonthlyData}
              filteredMonthlyMap={filteredMonthlyMap}
              hoveredChartIdx={hoveredChartIdx}
              setHoveredChartIdx={setHoveredChartIdx}
              chartTouchStartX={chartTouchStartX}
              chartTouchStartY={chartTouchStartY}
              setChartMonthOffset={setChartMonthOffset}
              maxOffset={maxOffset}
              chartYMax={chartYMax}
              chartTicks={chartTicks}
            />

            {/* RIGHT: TOP FAIL 규격 랭킹 */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h3 className="text-sm font-black text-slate-800 tracking-tight">교환 다빈도 규격</h3>
              {topFailSizes.length > 0 ? (
                <div className="space-y-3">
                  {topFailSizes.map((item, idx) => (
                    <div key={`${item.brand}-${item.size}`} className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center shrink-0 ${idx === 0 ? 'bg-rose-500 text-white' : idx === 1 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 truncate">{item.brand}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{item.size}</p>
                      </div>
                      <span className="text-sm font-black text-slate-800 tabular-nums">{item.count}<span className="text-[10px] font-semibold text-slate-400 ml-0.5">건</span></span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">데이터 없음</p>
              )}

              {/* 교환율 by manufacturer */}
              {manufacturers.length > 0 && (
                <div className="mt-6 pt-4 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-3">교환율</h4>
                  <div className="space-y-2.5">
                    {manufacturers.map((m, i) => {
                      const failCount = mStats[m]?.total || 0;
                      const allRows = surgeryMaster['수술기록지'] || [];
                      const normalizedM = simpleNormalize(m);
                      const mPlacement = allRows.filter(r => {
                        const rowM = simpleNormalize(String(r['제조사'] || ''));
                        return (rowM.includes(normalizedM) || normalizedM.includes(rowM)) && r['구분'] === '식립';
                      }).length;
                      const rate = mPlacement > 0 ? (failCount / mPlacement * 100) : 0;
                      return (
                        <div key={m} className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-600">{m}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-500 tabular-nums">{failCount}건 / {mPlacement}건</span>
                            <span className={`text-xs font-black tabular-nums ${rate > 30 ? 'text-rose-500' : rate > 20 ? 'text-amber-500' : 'text-slate-700'}`}>{rate.toFixed(1)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <FailOrderHistorySection
            activeOrders={activeOrders}
            isReadOnly={isReadOnly}
            onDeleteOrder={onDeleteOrder}
            onRequestDelete={setConfirmDeleteOrderId}
          />
        </div>
      ) : (
        <div className="py-40 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm">
          <svg className="w-16 h-16 text-slate-100 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-slate-500 font-medium italic">데이터가 로드되면 제조사를 선택하여 관리를 시작하세요.</p>
        </div>
      )}

      <FailAllReturnConfirmModal
        isOpen={isAllReturnConfirmOpen}
        isSubmitting={isAllReturnSubmitting}
        manufacturers={manufacturers}
        pendingByManufacturerMap={pendingByManufacturerMap}
        returnPendingByMfr={returnPendingByMfr}
        globalPendingFails={globalPendingFails}
        pendingFailCount={pendingFailList.length}
        onClose={() => setIsAllReturnConfirmOpen(false)}
        onSubmit={() => void handleAllReturnSubmit()}
      />

      {/* ========================================= */}
      {/* ORDER MODAL                               */}
      {/* ========================================= */}
      {isModalOpen && (
        <FailReturnModal
          activeM={activeM}
          currentRemainingFails={currentRemainingFails}
          currentUserName={currentUserName}
          isOrderSubmitting={isOrderSubmitting}
          recommendedExchangeItems={recommendedExchangeItems}
          recommendedScrollPct={recommendedScrollPct}
          setRecommendedScrollPct={setRecommendedScrollPct}
          recommendedScrollRef={recommendedScrollRef}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleReturnSubmit}
        />
      )}

      {isBulkModalOpen && (
        <FailBulkSetupModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
          availableManufacturers={availableManufacturers}
          pendingByManufacturer={pendingByManufacturer}
          onInitialize={handleBulkInitialize}
          onReconcile={handleBulkReconcile}
        />
      )}

      {toast && (
        <div
          style={isMobileViewport ? { bottom: 'calc(5.5rem + env(safe-area-inset-bottom))' } : undefined}
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl text-sm font-semibold ${toast.type === 'error' ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'}`}
        >
          {toast.message}
        </div>
      )}
      {confirmDeleteOrderId && onDeleteOrder && (
        <ConfirmModal
          title="주문 삭제"
          message="이 주문을 삭제하시겠습니까?"
          confirmLabel="삭제"
          confirmColor="rose"
          onConfirm={() => { void onDeleteOrder(confirmDeleteOrderId); setConfirmDeleteOrderId(null); }}
          onCancel={() => setConfirmDeleteOrderId(null)}
        />
      )}
    </div>
  );
};

export default FailManager;
