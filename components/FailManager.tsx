
import React, { useState } from 'react';
import type { ExcelRow, InventoryItem, Order as FailOrder, ReturnRequest, ReturnReason } from '../types';
import FailBulkSetupModal from './FailBulkSetupModal';
import DateRangeSlider from './surgery-dashboard/DateRangeSlider';
import FailKpiStrip from './fail/FailKpiStrip';
import FailReturnModal from './fail/FailReturnModal';
import { Z } from '../utils/zIndex';
import { DONUT_COLORS } from './surgery-dashboard/shared';
import { useFailManager, CHART_PAD, CHART_AREA_H } from '../hooks/useFailManager';
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
                    <p className="mt-1 text-slate-300">임플란트 재고관리 Pro 도입 시점에 수술 중 교환한 품목의 실제 보유량을 조사하여 입력하면 됩니다.</p>
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
                  <p className="mt-1 text-slate-400">임플란트 재고관리 Pro 도입 시점에 수술 중 교환한 품목의 실제 보유량을 조사하여 입력하면 됩니다.</p>
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
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-sm font-black text-slate-800 tracking-tight">월별 교환 추세</h3>
                </div>
                <div className="flex items-center gap-3">
                  {manufacturers.map((m, i) => (
                    <div key={m} className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-400">{m}</span>
                    </div>
                  ))}
                </div>
              </div>
              {allMonthlyFailData.length > 0 ? (() => {
                const filterStart = allMonths[periodStartIdx] || allMonths[0] || '';
                const filterEnd = allMonths[periodEndIdx] || allMonths[allMonths.length - 1] || '';
                const inRange = (month: string) => month >= filterStart && month <= filterEnd;
                const nMfr = manufacturers.length || 1;
                const MONTH_W = Math.max(48, Math.min(68, Math.floor(680 / visibleMonthlyData.length)));
                const GROUP_W = MONTH_W - 10;
                const BAR_GAP = 2;
                const BAR_W = Math.max(6, Math.floor((GROUP_W - BAR_GAP * (nMfr - 1)) / nMfr));
                const SVG_W = CHART_PAD.l + visibleMonthlyData.length * MONTH_W + CHART_PAD.r;
                const SVG_H = CHART_PAD.t + CHART_AREA_H + CHART_PAD.b;
                // 툴팁 크기
                const TW = 148;
                const T_ROW_H = 20;
                const T_PAD = 10;
                const TH = T_PAD + 14 + nMfr * T_ROW_H + T_PAD;

                return (
                  <div
                    className="overflow-x-auto -mx-1 px-1"
                    onTouchStart={(e) => {
                      chartTouchStartX.current = e.touches[0].clientX;
                      chartTouchStartY.current = e.touches[0].clientY;
                    }}
                    onTouchMove={(e) => {
                      const deltaX = chartTouchStartX.current - e.touches[0].clientX;
                      const deltaY = chartTouchStartY.current - e.touches[0].clientY;
                      if (Math.abs(deltaX) > Math.abs(deltaY)) {
                        e.preventDefault();
                      }
                    }}
                    onTouchEnd={(e) => {
                      const deltaX = chartTouchStartX.current - e.changedTouches[0].clientX;
                      const deltaY = chartTouchStartY.current - e.changedTouches[0].clientY;
                      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
                        if (deltaX > 0) {
                          // swipe left: shift forward (show later months)
                          setChartMonthOffset(prev => Math.min(prev + 1, maxOffset));
                        } else {
                          // swipe right: shift backward (show earlier months)
                          setChartMonthOffset(prev => Math.max(prev - 1, 0));
                        }
                      }
                      setHoveredChartIdx(null);
                    }}
                  >
                    <svg
                      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                      className="w-full"
                      style={{ minWidth: Math.max(320, SVG_W) }}
                      preserveAspectRatio="xMinYMid meet"
                      onMouseLeave={() => setHoveredChartIdx(null)}
                    >
                      {/* Horizontal grid lines + Y labels */}
                      {chartTicks.map(tick => {
                        const y = CHART_PAD.t + CHART_AREA_H - (tick / chartYMax) * CHART_AREA_H;
                        return (
                          <g key={tick}>
                            <line x1={CHART_PAD.l} y1={y} x2={SVG_W - CHART_PAD.r} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                            <text x={CHART_PAD.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">{tick}</text>
                          </g>
                        );
                      })}
                      {/* Baseline */}
                      <line x1={CHART_PAD.l} y1={CHART_PAD.t + CHART_AREA_H} x2={SVG_W - CHART_PAD.r} y2={CHART_PAD.t + CHART_AREA_H} stroke="#e2e8f0" strokeWidth="1.5" />

                      {/* Grouped bars per month */}
                      {visibleMonthlyData.map((d, i) => {
                        const barGroupW = BAR_W * nMfr + BAR_GAP * (nMfr - 1);
                        const groupX = CHART_PAD.l + i * MONTH_W + (MONTH_W - barGroupW) / 2;
                        const groupCenterX = CHART_PAD.l + i * MONTH_W + MONTH_W / 2;
                        const isHov = hoveredChartIdx === i;
                        return (
                          <g key={d.month}>
                            {/* Hover background */}
                            {isHov && (
                              <rect
                                x={CHART_PAD.l + i * MONTH_W + 1}
                                y={CHART_PAD.t}
                                width={MONTH_W - 2}
                                height={CHART_AREA_H}
                                rx="4"
                                fill="#f1f5f9"
                              />
                            )}
                            {/* Bars */}
                            {manufacturers.map((m, mi) => {
                              const val = filteredMonthlyMap[d.month]?.[m] ?? 0;
                              const barH = chartYMax > 0 ? (val / chartYMax) * CHART_AREA_H : 0;
                              const bx = groupX + mi * (BAR_W + BAR_GAP);
                              const by = CHART_PAD.t + CHART_AREA_H - barH;
                              return (
                                <rect
                                  key={m}
                                  x={bx} y={by}
                                  width={BAR_W} height={Math.max(0, barH)}
                                  rx="3"
                                  fill={DONUT_COLORS[mi % DONUT_COLORS.length]}
                                  opacity={isHov ? 1 : 0.82}
                                />
                              );
                            })}
                            {/* X-axis label */}
                            <text
                              x={groupCenterX}
                              y={CHART_PAD.t + CHART_AREA_H + 14}
                              textAnchor="middle"
                              fontSize="8"
                              fill={isHov ? '#1e293b' : inRange(d.month) ? '#94a3b8' : '#e2e8f0'}
                              fontWeight={isHov ? '800' : '600'}
                            >
                              {d.month.slice(2)}
                            </text>
                            {/* Invisible hover capture rect */}
                            <rect
                              x={CHART_PAD.l + i * MONTH_W}
                              y={CHART_PAD.t}
                              width={MONTH_W}
                              height={CHART_AREA_H + CHART_PAD.b}
                              fill="transparent"
                              onMouseEnter={() => setHoveredChartIdx(i)}
                              onTouchStart={(e) => { e.preventDefault(); setHoveredChartIdx(i); }}
                              style={{ cursor: 'crosshair' }}
                            />
                          </g>
                        );
                      })}

                      {/* Tooltip overlay */}
                      {hoveredChartIdx !== null && (() => {
                        const d = visibleMonthlyData[hoveredChartIdx];
                        const groupCenterX = CHART_PAD.l + hoveredChartIdx * MONTH_W + MONTH_W / 2;
                        let TX = groupCenterX - TW / 2;
                        TX = Math.max(CHART_PAD.l, Math.min(SVG_W - CHART_PAD.r - TW, TX));
                        const TY = CHART_PAD.t + 8;
                        return (
                          <g style={{ pointerEvents: 'none' }}>
                            {/* Dashed center line */}
                            <line
                              x1={groupCenterX} y1={CHART_PAD.t}
                              x2={groupCenterX} y2={CHART_PAD.t + CHART_AREA_H}
                              stroke="#94a3b8" strokeWidth="1" strokeDasharray="3,3"
                            />
                            {/* Tooltip box shadow (fake) */}
                            <rect x={TX + 2} y={TY + 3} width={TW} height={TH} rx="8" fill="#0f172a" opacity="0.15" />
                            {/* Tooltip box */}
                            <rect x={TX} y={TY} width={TW} height={TH} rx="8" fill="#1e293b" />
                            {/* Month header */}
                            <text
                              x={TX + TW / 2} y={TY + T_PAD + 8}
                              textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700"
                            >
                              {d.month}
                            </text>
                            {/* Data rows */}
                            {manufacturers.map((m, mi) => {
                              const val = filteredMonthlyMap[d.month]?.[m] ?? 0;
                              const ry = TY + T_PAD + 16 + mi * T_ROW_H;
                              return (
                                <g key={m}>
                                  <rect x={TX + T_PAD} y={ry + 2} width="8" height="8" rx="2" fill={DONUT_COLORS[mi % DONUT_COLORS.length]} />
                                  <text x={TX + T_PAD + 13} y={ry + 9} fontSize="10" fill="#e2e8f0" fontWeight="600">{m}</text>
                                  <text x={TX + TW - T_PAD} y={ry + 9} textAnchor="end" fontSize="10" fill="white" fontWeight="800">{val}건</text>
                                </g>
                              );
                            })}
                          </g>
                        );
                      })()}
                    </svg>
                  </div>
                );
              })() : (
                <div className="py-16 text-center">
                  <p className="text-sm text-slate-400 font-medium">차트 데이터 없음</p>
                </div>
              )}
            </div>

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

          {/* ========================================= */}
          {/* ROW 3: 교환 주문 이력                       */}
          {/* ========================================= */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  교환 주문 이력
                </h3>
              </div>
              <span className="text-[10px] font-bold text-slate-500">{activeOrders.length}건</span>
            </div>
            {activeOrders.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {activeOrders.map(order => (
                  <div key={order.id} className="p-4 rounded-xl border border-slate-100 shadow-sm space-y-3 hover:border-indigo-100 transition-all">
                    <div className="flex justify-between items-start">
                      <p className="text-xs font-black text-slate-800">{order.date} 주문</p>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-tighter ${order.status === 'ordered' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {order.status === 'ordered' ? '발주중' : '입고완료'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-[11px] font-bold">
                          <span className="text-slate-500">{item.brand} {item.size === '기타' || item.size === '-' ? '규격정보없음' : item.size}</span>
                          <span className="text-slate-800 tabular-nums">{item.quantity}개</span>
                        </div>
                      ))}
                    </div>
                    <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500">담당: {order.manager}</span>
                      {!isReadOnly && onDeleteOrder && (
                        <button
                          onClick={() => setConfirmDeleteOrderId(order.id)}
                          className="text-[10px] font-bold text-slate-400 hover:text-rose-500 px-2 py-0.5 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <svg className="w-12 h-12 text-slate-100 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p className="text-sm text-slate-500 font-medium">아직 교환 주문 이력이 없습니다.</p>
                <p className="text-[11px] text-slate-300 mt-1">'반품 신청' 버튼으로 첫 반품을 등록하세요.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="py-40 text-center bg-white rounded-[32px] border border-slate-200 shadow-sm">
          <svg className="w-16 h-16 text-slate-100 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
          <p className="text-slate-500 font-medium italic">데이터가 로드되면 제조사를 선택하여 관리를 시작하세요.</p>
        </div>
      )}

      {/* ========================================= */}
      {/* ALL RETURN CONFIRM MODAL                  */}
      {/* ========================================= */}
      {isAllReturnConfirmOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          style={{ zIndex: Z.MODAL }}
          onClick={() => !isAllReturnSubmitting && setIsAllReturnConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-5"
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="all-return-modal-title"
          >
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 id="all-return-modal-title" className="text-base font-black text-slate-800">일괄 반품 처리</h2>
                <p className="text-xs text-slate-500 mt-0.5">미처리 잔여 항목 전체를 제조사별로 반품 주문 등록합니다.</p>
              </div>
              <button
                onClick={() => setIsAllReturnConfirmOpen(false)}
                disabled={isAllReturnSubmitting}
                className="p-1.5 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            {/* 전자장부 안내 */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[11px] text-amber-800 font-semibold">
              반품 처리 후 전자장부에서 주문 금액 변동을 확인하세요.
            </div>

            {/* 제조사별 미처리 목록 */}
            <div className="space-y-2">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">반품 처리 대상</p>
              {manufacturers.map(mfr => {
                const cnt = Math.max(0, (pendingByManufacturerMap[mfr] || 0) - (returnPendingByMfr[mfr] || 0));
                if (cnt === 0) return null;
                return (
                  <div key={mfr} className="flex items-center justify-between px-4 py-2.5 bg-slate-50 rounded-xl">
                    <span className="text-sm font-bold text-slate-700">{mfr}</span>
                    <span className="text-sm font-black text-rose-600 tabular-nums">{cnt}건</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-4 py-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                <span className="text-sm font-black text-indigo-700">합계</span>
                <span className="text-sm font-black text-indigo-700 tabular-nums">{globalPendingFails}건</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setIsAllReturnConfirmOpen(false)}
                disabled={isAllReturnSubmitting}
                className="flex-1 py-3 text-sm font-bold text-slate-500 border border-slate-200 hover:bg-slate-50 rounded-2xl transition-all"
              >
                취소
              </button>
              <button
                onClick={() => void handleAllReturnSubmit()}
                disabled={isAllReturnSubmitting || pendingFailList.length === 0}
                className="flex-1 py-3 text-sm font-black text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-2xl transition-all active:scale-[0.98]"
              >
                {isAllReturnSubmitting ? '처리 중...' : '반품 신청하기'}
              </button>
            </div>
          </div>
        </div>
      )}

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
