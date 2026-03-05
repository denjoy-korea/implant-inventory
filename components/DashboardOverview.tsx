import React from 'react';
import {
  DashboardTab,
  DEFAULT_WORK_DAYS,
  ExcelRow,
  HospitalPlanState,
  InventoryItem,
  Order,
  SurgeryUnregisteredItem,
} from '../types';
import { buildSparklinePath } from '../utils/chartUtils';
import FailThresholdModal from './dashboard/FailThresholdModal';
import { failThresholdService } from '../services/failThresholdService';
import { useDashboardOverview, PriorityLevel } from '../hooks/useDashboardOverview';

interface DashboardOverviewProps {
  inventory: InventoryItem[];
  orders: Order[];
  surgeryMaster: Record<string, ExcelRow[]>;
  surgeryUnregisteredItems?: SurgeryUnregisteredItem[];
  hospitalId?: string;
  hospitalWorkDays?: number[];
  onNavigate: (tab: DashboardTab) => void;
  planState: HospitalPlanState | null;
  onboardingStep?: number | null;
  onResumeOnboarding?: () => void;
  onSurgeryUploadClick?: () => void;
  onUpgrade?: () => void;
}

const PRIORITY_BADGE: Record<PriorityLevel, { label: string; className: string }> = {
  critical: { label: '긴급', className: 'bg-rose-100 text-rose-700' },
  warning: { label: '주의', className: 'bg-amber-100 text-amber-700' },
  ok: { label: '안정', className: 'bg-emerald-100 text-emerald-700' },
};

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  inventory,
  orders,
  surgeryMaster,
  surgeryUnregisteredItems = [],
  hospitalId,
  hospitalWorkDays = DEFAULT_WORK_DAYS,
  onNavigate,
  planState,
  onboardingStep,
  onResumeOnboarding,
  onSurgeryUploadClick,
  onUpgrade,
}) => {
  const {
    auditHistory,
    isAuditLoading,
    selectedAuditSessionKey,
    setSelectedAuditSessionKey,
    auditDetailShowAll,
    setAuditDetailShowAll,
    failThresholds,
    setFailThresholds,
    showFailThresholdModal,
    setShowFailThresholdModal,
    progressDelta,
    visibleInventory,
    shortageEntries,
    shortageSummary,
    pendingOrderSummary,
    failExchangeEntries,
    failSummary,
    unregisteredSummary,
    monthlyTotals,
    orderProcessing,
    thisMonthSurgery,
    latestSurgeryDate,
    recentMonthKeys,
    manufacturerUsageSummary,
    hasBaseStockSet,
    latestAuditSummary,
    recentAuditSessions,
    isWorkDaysLoading,
    monthlyTrend,
    recentMonthlyTrend,
    trendSeries,
    trendDelta,
    latestTrendMonth,
    surgeryStaleDays,
    auditStaleDays,
    tickerConfig,
    alertCards,
    todayActionItems,
    maxManufacturerRecentQty,
    fomoData,
  } = useDashboardOverview({
    inventory,
    orders,
    surgeryMaster,
    surgeryUnregisteredItems,
    hospitalId,
    hospitalWorkDays,
    planState,
    onboardingStep,
    onResumeOnboarding,
    onSurgeryUploadClick,
  });

  return (
    <>
    <div className="space-y-5 [&_button]:cursor-pointer">

      {/* ── 수술기록 상태 티커 ─────────────────────────────────── */}
      <div className={`flex items-center rounded-2xl overflow-hidden border shadow-sm ${tickerConfig.wrapperClass}`}>
        {/* 상태 태그 */}
        <div className={`shrink-0 ${tickerConfig.tagClass} px-3.5 py-2.5 flex items-center gap-1.5`}>
          <div className={`w-1.5 h-1.5 rounded-full ${tickerConfig.dotClass} animate-pulse`} />
          <span className="text-[10px] font-black text-white tracking-widest">{tickerConfig.tagText}</span>
        </div>
        {/* 구분선 */}
        <div className="w-px self-stretch bg-current opacity-10" />
        {/* 스크롤 영역 */}
        <div className="flex-1 overflow-hidden py-2.5">
          <div className="animate-news-ticker">
            <span className={`text-xs font-medium ${tickerConfig.textClass} pl-5 pr-16`}>{tickerConfig.message}</span>
            <span className={`text-xs ${tickerConfig.textClass} opacity-20 pr-16`}>◆ ◆ ◆</span>
            <span className={`text-xs font-medium ${tickerConfig.textClass} pr-16`}>{tickerConfig.message}</span>
            <span className={`text-xs ${tickerConfig.textClass} opacity-20 pr-16`}>◆ ◆ ◆</span>
          </div>
        </div>
      </div>

      {/* ── Free 플랜 FOMO 배너 ──────────────────────────────────── */}
      {fomoData && (
        <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200 rounded-2xl p-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* 왼쪽: 축적 데이터 수치 */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-black rounded-md tracking-wide">FREE</span>
                <p className="text-xs font-bold text-indigo-800">지금까지 쌓인 데이터로 더 많은 것을 할 수 있어요</p>
              </div>
              {/* 축적 수치 */}
              <div className="flex flex-wrap gap-2 mb-3">
                {fomoData.surgeryCount > 0 && (
                  <span className="px-2.5 py-1 bg-white/80 border border-indigo-100 rounded-lg text-[11px] font-bold text-slate-700">
                    수술기록 <span className="text-indigo-700">{fomoData.surgeryCount.toLocaleString()}건</span>
                  </span>
                )}
                <span className="px-2.5 py-1 bg-white/80 border border-indigo-100 rounded-lg text-[11px] font-bold text-slate-700">
                  재고 <span className="text-indigo-700">{fomoData.inventoryCount}종</span>
                </span>
                {fomoData.failOrderCount > 0 && (
                  <span className="px-2.5 py-1 bg-white/80 border border-rose-100 rounded-lg text-[11px] font-bold text-slate-700">
                    FAIL 미관리 <span className="text-rose-600">{fomoData.failOrderCount}건</span>
                  </span>
                )}
              </div>
              {/* 잠긴 기능 목록 */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: '교환 관리', tab: 'fail_management' as DashboardTab },
                  { label: '발주 관리', tab: 'order_management' as DashboardTab },
                  { label: '수술기록 분석', tab: 'surgery_database' as DashboardTab },
                ].map(({ label }) => (
                  <span key={label} className="flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold text-slate-500">
                    <svg className="w-2.5 h-2.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    {label}
                  </span>
                ))}
                <span className="px-2 py-0.5 text-[10px] font-bold text-indigo-500">Basic부터 해제</span>
              </div>
            </div>
            {/* 오른쪽: CTA */}
            {onUpgrade && (
              <div className="shrink-0">
                <button
                  onClick={onUpgrade}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white text-xs font-black rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-300 whitespace-nowrap"
                >
                  Basic 업그레이드 →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 수술기록 만료 예고 배너 (Free 전환 유저) ──────────────── */}
      {planState?.retentionDaysLeft !== undefined && planState.retentionDaysLeft <= 30 && (
        <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 border ${
          planState.retentionDaysLeft <= 7
            ? 'bg-rose-50 border-rose-200'
            : 'bg-amber-50 border-amber-200'
        }`}>
          <svg className={`w-4 h-4 mt-0.5 shrink-0 ${planState.retentionDaysLeft <= 7 ? 'text-rose-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className={`text-xs font-black ${planState.retentionDaysLeft <= 7 ? 'text-rose-700' : 'text-amber-700'}`}>
              수술기록이 {planState.retentionDaysLeft}일 후 만료됩니다
            </p>
            <p className={`text-[11px] mt-0.5 ${planState.retentionDaysLeft <= 7 ? 'text-rose-600' : 'text-amber-600'}`}>
              Free 플랜 보관 기간(3개월)이 곧 종료됩니다. 플랜을 업그레이드하면 데이터가 영구 보존됩니다.
            </p>
          </div>
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className={`shrink-0 px-3 py-1.5 text-xs font-black rounded-lg text-white transition-colors ${
                planState.retentionDaysLeft <= 7 ? 'bg-rose-600 hover:bg-rose-700' : 'bg-amber-500 hover:bg-amber-600'
              }`}
            >
              업그레이드
            </button>
          )}
        </div>
      )}

      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-slate-900">오늘 할 일 우선순위</h3>
              <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-600">
                {todayActionItems.length}개
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              실시간 지표 기반으로 자동 정렬됩니다.
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">이번달 식립</p>
                <p className="text-sm font-black text-indigo-700 tabular-nums leading-tight">
                  {thisMonthSurgery.placementQty}개{progressDelta.isReady && progressDelta.placementDelta !== 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${progressDelta.placementDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      ({progressDelta.placementDelta > 0 ? '+' : ''}{progressDelta.placementDelta})
                    </span>
                  )}
                </p>
              </div>
              <div className="w-px h-8 bg-slate-200" />
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400">이번달 교환</p>
                <p className={`text-sm font-black tabular-nums leading-tight ${thisMonthSurgery.failQty > 0 ? 'text-rose-700' : 'text-slate-700'}`}>
                  {thisMonthSurgery.failQty}개{progressDelta.isReady && progressDelta.failDelta !== 0 && (
                    <span className={`ml-1 text-[10px] font-bold ${progressDelta.failDelta > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                      ({progressDelta.failDelta > 0 ? '+' : ''}{progressDelta.failDelta})
                    </span>
                  )}
                </p>
              </div>
            </div>
            {progressDelta.isReady && (
              <div className="relative group/pdtip">
                <p className="text-[9px] text-slate-400 font-medium pr-0.5 cursor-help underline decoration-dashed decoration-slate-300 underline-offset-2">
                  전월 1~{progressDelta.prevCutoffDay}일 누계 기준 ⓘ
                </p>
                <div className="absolute top-full right-0 mt-2 w-64 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/pdtip:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                  <p>진행율 {progressDelta.progressPct}% 기준 (이번달 {progressDelta.thisElapsed}일 경과 / 전체 {progressDelta.thisTotalWorkDays}일)</p>
                  <p className="mt-1">전월({progressDelta.prevMonthLabel}) 동일 시점인 {progressDelta.prevCutoffDay}일까지 누계와 비교합니다.</p>
                  <p className="mt-1 text-slate-400">진료요일 설정 및 대한민국 공휴일을 반영합니다.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-2">
          {todayActionItems.map((item, index) => {
            const isOnboarding = item.key === 'action-onboarding';
            return (
            <div
              key={item.key}
              role="button"
              tabIndex={0}
              onClick={() => item.onClick ? item.onClick() : onNavigate(item.tab)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), item.onClick ? item.onClick() : onNavigate(item.tab))}
              className={isOnboarding
                ? 'lg:col-span-2 w-full text-left rounded-xl border-2 border-indigo-400 bg-gradient-to-r from-indigo-50 via-white to-violet-50 hover:border-indigo-500 hover:-translate-y-1 hover:shadow-lg hover:shadow-indigo-500/15 active:translate-y-0 active:scale-[0.99] transition-all duration-200 px-4 py-3 cursor-pointer relative overflow-hidden group'
                : 'w-full text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 hover:border-slate-300 hover:-translate-y-0.5 hover:shadow-sm active:translate-y-0 active:scale-[0.98] transition-all duration-150 px-3 py-2.5 cursor-pointer'
              }
            >
              {isOnboarding && (
                <>
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-transparent to-violet-500/5 group-hover:from-indigo-500/10 group-hover:to-violet-500/10 transition-colors" />
                  <div className="absolute top-0 left-0 h-full w-1 bg-gradient-to-b from-indigo-500 to-violet-500 rounded-l-xl" />
                </>
              )}
              <div className={`flex items-center gap-3 ${isOnboarding ? 'relative z-10' : ''}`}>
                <span className={`mt-0.5 w-6 h-6 rounded-lg text-white text-[11px] font-black inline-flex items-center justify-center shrink-0 ${isOnboarding ? 'bg-indigo-600 animate-pulse' : 'bg-slate-900'}`}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-black truncate ${isOnboarding ? 'text-indigo-900' : 'text-slate-800'}`}>{item.title}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {isOnboarding && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black animate-pulse">
                          시작하기
                        </span>
                      )}
                      {item.key === 'action-fail' && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowFailThresholdModal(true); }}
                          className="w-5 h-5 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                          title="기준량 설정"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </button>
                      )}
                      {item.uploadAction && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); item.uploadAction?.(); }}
                          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-white bg-slate-900 hover:bg-slate-700 transition-colors"
                          title="엑셀 파일 업로드"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          데이터 업데이트
                        </button>
                      )}
                      {item.uploadAction && (
                        <span className="md:hidden flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-slate-400 bg-slate-100">
                          <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                          PC에서 업데이트
                        </span>
                      )}
                      {!isOnboarding && (
                      <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${PRIORITY_BADGE[item.severity].className}`}>
                        {PRIORITY_BADGE[item.severity].label}
                      </span>
                      )}
                    </div>
                  </div>
                  <p className={`text-[11px] mt-0.5 ${isOnboarding ? 'text-indigo-700' : 'text-slate-600'}`}>{item.description}</p>
                  {item.alertNote && (
                    <div className={`flex items-center gap-1.5 mt-1 ${isOnboarding ? '' : ''}`}>
                      {isOnboarding && onboardingStep != null && (
                        <div className="flex-1 max-w-[180px] h-1.5 bg-indigo-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.round(((onboardingStep - 1) / 7) * 100)}%` }}
                          />
                        </div>
                      )}
                      <p className={`text-[10px] font-bold ${isOnboarding ? 'text-indigo-600' : 'text-rose-600'}`}>
                        {isOnboarding ? item.alertNote : `⚠ ${item.alertNote}`}
                      </p>
                    </div>
                  )}
                  {item.meta && <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.meta}</p>}
                  {item.metaItems && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {item.metaItems.map(({ label, count }) => (
                        <span key={label} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 border border-amber-100 text-[9px] font-black text-amber-700 whitespace-nowrap">
                          {label} <span className="text-amber-500">{count}개</span>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <svg className={`w-3.5 h-3.5 shrink-0 ${isOnboarding ? 'text-indigo-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all' : 'text-slate-400'}`} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            );
          })}

          {todayActionItems.length === 0 && (
            <div className="lg:col-span-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4">
              <p className="text-sm font-bold text-emerald-700">오늘 처리할 긴급/주의 항목이 없습니다.</p>
              <p className="text-xs text-emerald-600 mt-1">현재 운영 상태가 안정적입니다.</p>
            </div>
          )}
        </div>
      </section>

      {/* Alert Cards — 모바일: 이슈 있는 카드만 표시 */}
      <section className="md:hidden space-y-2">
        {(() => {
          const actionableCards = alertCards.filter(c => c.severity !== 'ok');
          if (actionableCards.length === 0) {
            return (
              <div className="flex items-center gap-3 px-4 py-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-bold text-emerald-800">모든 항목 정상</p>
                  <p className="text-[11px] text-emerald-600 mt-0.5">실사 · 입고 · 교환 · 미등록 이상 없음</p>
                </div>
              </div>
            );
          }
          return (
            <div className="space-y-2">
              {actionableCards.map((card) => (
                <button
                  key={card.key}
                  onClick={() => onNavigate(card.tab)}
                  className={`w-full text-left bg-white border border-slate-100 border-l-4 ${card.severity === 'critical' ? 'border-l-rose-600' : 'border-l-amber-500'} rounded-2xl px-4 py-3.5 flex items-center justify-between gap-3 shadow-sm active:scale-[0.98] transition-all`}
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700">{card.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{card.hint}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-xl font-black text-slate-900 leading-none tabular-nums">{card.value}</p>
                      <p className="text-[10px] font-semibold text-slate-500 mt-0.5">{card.sub}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${PRIORITY_BADGE[card.severity].className}`}>
                      {PRIORITY_BADGE[card.severity].label}
                    </span>
                    <svg className="w-4 h-4 text-slate-300 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          );
        })()}
      </section>

      {/* Alert Cards — 데스크톱: 전체 5개 표시 */}
      <section className="hidden md:grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
        {alertCards.map((card, index) => (
          <button
            key={card.key}
            onClick={() => onNavigate(card.tab)}
            className={`text-left rounded-2xl border p-4 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-indigo-500 ${card.tone}`}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] opacity-80">{card.title}</p>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${PRIORITY_BADGE[card.severity].className}`}
                title={`우선순위 점수 ${card.score}`}
              >
                {PRIORITY_BADGE[card.severity].label}
              </span>
            </div>
            <p className="mt-2 text-2xl font-black leading-none tabular-nums">{card.value}</p>
            <p className="mt-1 text-xs font-semibold opacity-85">{card.sub}</p>
            <div className="mt-2 flex items-center justify-between gap-1">
              <p className="text-[10px] font-medium opacity-70">
                P{index + 1} · {card.hint}
              </p>
              <svg className="w-3 h-3 opacity-50 shrink-0" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        ))}
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">발주 필요 TOP 5</h3>
            <button
              onClick={() => onNavigate('order_management')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              주문 관리 이동
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="grid grid-rows-5 gap-2 flex-1 min-h-0">
            {Array.from({ length: 5 }).map((_, idx) => {
              const entry = shortageEntries[idx];
              if (!entry) return <div key={idx} />;
              const fmtUsage = (v: number) => Number.isInteger(v) ? String(v) : v.toFixed(1);
              const monthly = entry.item.monthlyAvgUsage != null && entry.item.monthlyAvgUsage > 0
                ? fmtUsage(entry.item.monthlyAvgUsage) : null;
              const dailyMax = entry.item.dailyMaxUsage != null && entry.item.dailyMaxUsage > 0
                ? fmtUsage(entry.item.dailyMaxUsage) : null;
              const isUrgent = entry.item.dailyMaxUsage != null && entry.item.dailyMaxUsage > 0
                && entry.item.currentStock < entry.item.dailyMaxUsage;
              return (
                <div
                  key={entry.item.id}
                  className={`flex items-center justify-between px-3 py-2 rounded-xl border ${isUrgent ? 'bg-red-50 border-red-200' : 'bg-slate-50 border-slate-100'}`}
                >
                  <div className="min-w-0">
                    <p className={`text-xs font-bold truncate ${isUrgent ? 'text-red-800' : 'text-slate-800'}`}>
                      {entry.item.brand} {entry.item.size}
                    </p>
                    <p className={`text-[10px] truncate ${isUrgent ? 'text-red-400' : 'text-slate-500'}`}>{entry.item.manufacturer}</p>
                    {(monthly || dailyMax) && (
                      <div className="flex items-center gap-2 mt-0.5">
                        {monthly && <span className={`text-[10px] font-semibold ${isUrgent ? 'text-red-400' : 'text-indigo-500'}`}>월평균 {monthly}개</span>}
                        {dailyMax && <span className={`text-[10px] font-medium ${isUrgent ? 'text-red-400' : 'text-slate-400'}`}>일최대 {dailyMax}개</span>}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className={`text-[10px] font-semibold ${isUrgent ? 'text-red-500' : 'text-slate-400'}`}>현재 {entry.item.currentStock}개</p>
                    <p className="text-xs font-black text-rose-600">-{entry.remainingDeficit}개</p>
                    {entry.pendingQty > 0 && <p className="text-[10px] font-semibold text-slate-500">주문중 {entry.pendingQty}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">최근 실사 이력</h3>
            <button
              onClick={() => onNavigate('inventory_audit')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              재고 실사 이동
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="grid grid-rows-5 gap-2 flex-1 min-h-0">
            {isAuditLoading
              ? <div className="row-span-5 flex items-center justify-center"><p className="text-xs text-slate-400">불러오는 중...</p></div>
              : Array.from({ length: 5 }).map((_, idx) => {
                  const sess = recentAuditSessions[idx];
                  if (!sess) return <div key={idx} />;
                  const timeStr = sess.createdAt.substring(11, 16);
                  const hasMismatch = sess.mismatchCount > 0;
                  return (
                    <button
                      key={sess.key}
                      onClick={() => { setAuditDetailShowAll(false); setSelectedAuditSessionKey(sess.key); }}
                      className={`flex items-center justify-between px-3 py-2 rounded-xl border text-left w-full transition-colors ${hasMismatch ? 'bg-orange-50 border-orange-100 hover:bg-orange-100/60' : 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-100/60'}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-xs font-bold text-slate-800">{sess.date}</p>
                          <p className="text-[10px] text-slate-400 font-medium">{timeStr}</p>
                        </div>
                        <p className={`text-[10px] font-semibold mt-0.5 ${hasMismatch ? 'text-orange-500' : 'text-emerald-600'}`}>
                          {hasMismatch ? `불일치 ${sess.mismatchCount}건 · ${sess.totalDiff}개` : '전 품목 일치'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 ml-3">
                        <p className="text-[10px] font-semibold text-slate-500">{sess.performedBy || '-'}</p>
                        <svg className="w-3 h-3 text-slate-300" viewBox="0 0 16 16" fill="none">
                          <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    </button>
                  );
                })
            }
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">교환 권장 TOP 5</h3>
            <button
              onClick={() => onNavigate('fail_management')}
              className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
            >
              교환 관리 이동
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
          <div className="grid grid-rows-5 gap-2 flex-1 min-h-0">
            {Array.from({ length: 5 }).map((_, idx) => {
              const entry = failExchangeEntries[idx];
              if (!entry) {
                return <div key={idx} />;
              }
              return (
                <div
                  key={`${entry.manufacturer}|${entry.brand}|${entry.size}`}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 border border-slate-100"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{entry.size === '기타' || entry.size === '-' ? '규격정보없음' : `${entry.brand} ${entry.size}`}</p>
                    <p className="text-[10px] text-slate-500 truncate">{entry.manufacturer}</p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-xs font-black text-amber-600">{entry.remainingToExchange}개</p>
                    {entry.orderedExchange > 0 && (
                      <p className="text-[10px] font-semibold text-slate-500">주문중 {entry.orderedExchange}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black text-slate-900">운영 추이 스냅샷</h3>
            <p className="text-[11px] font-semibold text-slate-500">최근 {Math.max(recentMonthlyTrend.length, 1)}개월</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">식립 / 교환 월평균 추이</p>
              {isWorkDaysLoading ? (
                <p className="text-xs text-slate-500 mt-5">진료요일/공휴일 기준 진료일수를 계산 중입니다...</p>
              ) : recentMonthlyTrend.length >= 2 ? (
                <svg className="w-full h-20 mt-3" viewBox="0 0 240 80" role="img" aria-label="최근 월별 식립 및 교환 추이">
                  <path d={buildSparklinePath(trendSeries.placement, 240, 80)} fill="none" stroke="#4f46e5" strokeWidth="2.4" strokeLinecap="round" />
                  <path d={buildSparklinePath(trendSeries.fail, 240, 80)} fill="none" stroke="#f43f5e" strokeWidth="2.1" strokeLinecap="round" />
                </svg>
              ) : (
                <p className="text-xs text-slate-500 mt-5">추이를 표시할 월별 데이터가 아직 부족합니다.</p>
              )}
              <p className="mt-2 text-[10px] text-slate-500">
                그래프 기준: 월별 평균(설정 진료요일 + 대한민국 공휴일 반영)
              </p>
              {!isWorkDaysLoading && (
                <p className="mt-0.5 text-[10px] text-slate-500">
                  최근 {latestTrendMonth.month} 진료일 {latestTrendMonth.workDays}일
                </p>
              )}
              <div className="mt-1.5 flex items-center justify-between text-[11px]">
                <span className="font-semibold text-indigo-600">
                  실제 식립 {latestTrendMonth.placement}개 (Δ {trendDelta.placementDelta >= 0 ? '+' : ''}{trendDelta.placementDelta})
                </span>
                <span className="font-semibold text-rose-600">
                  실제 교환 {latestTrendMonth.fail}개 (Δ {trendDelta.failDelta >= 0 ? '+' : ''}{trendDelta.failDelta})
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.12em]">주문 처리율</p>
              <p className="mt-4 text-4xl font-black text-slate-800 tabular-nums">{orderProcessing.rate}%</p>
              <p className="mt-1 text-xs text-slate-500">입고완료 {orderProcessing.received}건 / 전체 {orderProcessing.total}건</p>
              <div className="mt-3 h-2 rounded-full bg-slate-200 overflow-hidden">
                <div className="h-full rounded-full bg-indigo-600" style={{ width: `${orderProcessing.rate}%` }} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">입고대기 {orderProcessing.pending}건</p>
            </div>
          </div>
      </section>

      <section className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-black text-slate-900">제조사 사용 추이</h3>
          <button
            onClick={() => onNavigate('surgery_database')}
            className="flex items-center gap-0.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-700"
          >
            수술 데이터 상세 보기
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {manufacturerUsageSummary.rows.length > 0 ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">최근 6개월 사용</p>
                <p className="mt-1 text-xl font-black text-slate-800 tabular-nums">{manufacturerUsageSummary.recentQty}개</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.12em]">사용 제조사</p>
                <p className="mt-1 text-xl font-black text-slate-800 tabular-nums">{manufacturerUsageSummary.rows.length}곳</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.12em]">식립 합계</p>
                <p className="mt-1 text-xl font-black text-indigo-700 tabular-nums">{manufacturerUsageSummary.placementQty}개</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5">
                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-[0.12em]">교환 합계</p>
                <p className="mt-1 text-xl font-black text-rose-700 tabular-nums">{manufacturerUsageSummary.failQty}개</p>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-black text-slate-800">최근 6개월 사용량 TOP 6</h4>
                <div className="mt-3 space-y-2.5">
                  {manufacturerUsageSummary.rows.slice(0, 6).map((row) => {
                    const ratio = row.recentQty / maxManufacturerRecentQty;
                    const width = Math.max(6, Math.round(ratio * 100));
                    return (
                      <div key={row.manufacturer} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <p className="font-bold text-slate-800 truncate">{row.manufacturer}</p>
                          <p className="font-semibold text-slate-500 shrink-0">최근 {row.recentQty}개 · 전체 {row.totalQty}개</p>
                        </div>
                        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${width}%` }} />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500">
                          <span>식립 {row.placementQty}개 / 교환 {row.failQty}개</span>
                          <span>교환율 {row.failRate}%</span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">
                          주요 브랜드: {row.topBrands.map((brand) => `${brand.brand}(${brand.qty})`).join(' · ') || '-'}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <h4 className="text-xs font-black text-slate-800">월별 사용 히트맵 (최근 6개월)</h4>
                <div className="mt-3 overflow-x-auto">
                  <table className="border-separate border-spacing-1" style={{ minWidth: `${116 + recentMonthKeys.length * 68}px` }}>
                    <thead>
                      <tr>
                        <th className="sticky left-0 z-10 bg-white w-[116px] min-w-[116px] text-[10px] font-bold text-slate-400 text-left px-2 py-1 align-middle">제조사</th>
                        {recentMonthKeys.map((month) => (
                          <th key={`head-${month}`} className="min-w-[64px] text-[10px] font-bold text-slate-400 text-center px-1 py-1 align-middle font-normal">
                            {month.slice(5)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {manufacturerUsageSummary.rows.slice(0, 5).map((row) => (
                        <tr key={`${row.manufacturer}-heatmap`}>
                          <td className="sticky left-0 z-10 bg-white w-[116px] min-w-[116px] h-8 align-middle shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
                            <div className="h-8 rounded-md bg-slate-50 px-2 flex items-center text-[11px] font-bold text-slate-700 truncate">
                              {row.manufacturer}
                            </div>
                          </td>
                          {row.monthly.map((monthly) => {
                            const intensity = row.recentQty > 0 ? monthly.qty / row.recentQty : 0;
                            const tone =
                              monthly.qty <= 0
                                ? 'bg-slate-100 text-slate-400'
                                : intensity >= 0.35
                                  ? 'bg-indigo-500 text-white'
                                  : intensity >= 0.2
                                    ? 'bg-indigo-200 text-indigo-700'
                                    : 'bg-indigo-100 text-indigo-600';
                            return (
                              <td key={`${row.manufacturer}|${monthly.month}`} className="h-8 align-middle">
                                <div className={`h-8 rounded-md text-[10px] font-bold flex items-center justify-center ${tone}`}>
                                  {monthly.qty}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[10px] text-slate-500">수술기록지의 식립/수술중교환 수량 기준 집계</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center">
            <p className="text-sm font-semibold text-slate-700">최근 수술 데이터에서 집계할 제조사 사용량이 없습니다.</p>
            <p className="text-xs text-slate-500 mt-1">수술기록지 업로드 후 제조사/브랜드 추이를 확인할 수 있습니다.</p>
            <button
              onClick={() => onNavigate('surgery_database')}
              className="mt-3 px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
            >
              수술 데이터 보기
            </button>
          </div>
        )}
      </section>
    </div>

    {selectedAuditSessionKey !== null && (() => {
      const sessItems = auditHistory.filter(row => {
        const minute = row.createdAt.substring(0, 16);
        const rowKey = `${minute}__${row.performedBy || ''}`;
        return rowKey === selectedAuditSessionKey;
      });
      const sess = recentAuditSessions.find(s => s.key === selectedAuditSessionKey);
      const mismatchItems = sessItems.filter(r => r.difference !== 0);
      const displayItems = auditDetailShowAll ? sessItems : mismatchItems.length > 0 ? mismatchItems : sessItems;
      return (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
          onClick={() => setSelectedAuditSessionKey(null)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[calc(100dvh-80px)] md:max-h-[85vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 border-b border-slate-100 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <h3 className="text-lg font-bold text-slate-900">재고 실사 상세</h3>
                </div>
                <div className="flex items-center gap-2 mt-1 ml-6">
                  <p className="text-xs text-slate-500">{sess?.date} {sess?.createdAt.substring(11, 16)}</p>
                  {sess?.performedBy && (
                    <>
                      <span className="text-slate-200">·</span>
                      <p className="text-xs font-semibold text-slate-600">{sess.performedBy}</p>
                    </>
                  )}
                  <span className="text-slate-200">·</span>
                  {mismatchItems.length > 0
                    ? <p className="text-xs font-semibold text-orange-500">불일치 {mismatchItems.length}건</p>
                    : <p className="text-xs font-semibold text-emerald-600">전 품목 일치</p>
                  }
                </div>
              </div>
              <button
                onClick={() => setSelectedAuditSessionKey(null)}
                className="p-1.5 rounded-full border border-slate-200 hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter toggle */}
            {mismatchItems.length > 0 && mismatchItems.length < sessItems.length && (
              <div className="px-6 py-2 border-b border-slate-50 flex items-center gap-2">
                <button
                  onClick={() => setAuditDetailShowAll(false)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${!auditDetailShowAll ? 'bg-orange-100 text-orange-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  불일치 {mismatchItems.length}건
                </button>
                <button
                  onClick={() => setAuditDetailShowAll(true)}
                  className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors ${auditDetailShowAll ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  전체 {sessItems.length}건
                </button>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">제조사 / 브랜드</th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">규격</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">시스템</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">실재고</th>
                    <th className="px-3 py-2.5 text-right text-[11px] font-bold text-slate-500 uppercase tracking-wide">차이</th>
                    <th className="px-4 py-2.5 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wide">비고</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {displayItems.map(row => {
                    const diff = row.difference;
                    return (
                      <tr key={row.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-800">{row.brand || row.manufacturer}</p>
                          <p className="text-[10px] text-slate-400">{row.manufacturer}</p>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500">{(!row.size || row.size === '기타') ? '-' : row.size}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-600 tabular-nums">{row.systemStock}</td>
                        <td className="px-3 py-2.5 text-right font-semibold text-slate-600 tabular-nums">{row.actualStock}</td>
                        <td className={`px-3 py-2.5 text-right font-black tabular-nums ${diff < 0 ? 'text-rose-500' : diff > 0 ? 'text-blue-500' : 'text-slate-300'}`}>
                          {diff > 0 ? `+${diff}` : diff === 0 ? '—' : diff}
                        </td>
                        <td className="px-4 py-2.5 text-[11px] text-slate-400">{row.reason || ''}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <p className="text-[11px] text-slate-400">총 {sessItems.length}품목 실사</p>
              <button
                onClick={() => setSelectedAuditSessionKey(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      );
    })()}

    {showFailThresholdModal && (
      <FailThresholdModal
        manufacturers={failExchangeEntries.map((e) => e.manufacturer).filter((m, i, arr) => arr.indexOf(m) === i)}
        currentThresholds={failThresholds}
        onSave={async (updated) => {
          if (hospitalId) await failThresholdService.save(hospitalId, updated);
          setFailThresholds(updated);
        }}
        onClose={() => setShowFailThresholdModal(false)}
      />
    )}
    </>
  );
};

export default DashboardOverview;
