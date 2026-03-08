import React from 'react';
import type { InventoryItem } from '../../types';

interface InventoryDashboardCardsProps {
  filteredInventoryCount: number;
  visibleInventory: InventoryItem[];
  hiddenCategoryCount: number;
  monthFactor: number;
  setMonthFactor: (v: number) => void;
  saveMonthFactorForAll: (v: number) => Promise<void>;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isReadOnly?: boolean;
  hospitalId?: string;
  isEditExhausted: boolean;
  isUnlimited: boolean;
  maxEdits: number;
  editCount: number;
  deadStockCount: number;
  kpiData: {
    totalUsage: number;
    totalStock: number;
    totalItems: number;
    shortageCount: number;
    shortageDeficit: number;
  };
  surgeryBreakdown: { placement: number; fail: number };
  onShowOptimizeModal?: () => void;
  onShowBaseStockModal: () => void;
  onOpenAddItemModal: () => void;
}

const InventoryDashboardCards: React.FC<InventoryDashboardCardsProps> = ({
  filteredInventoryCount,
  visibleInventory,
  hiddenCategoryCount,
  monthFactor,
  setMonthFactor,
  saveMonthFactorForAll,
  saveStatus,
  isReadOnly,
  hospitalId,
  isEditExhausted,
  isUnlimited,
  maxEdits,
  editCount,
  deadStockCount,
  kpiData,
  surgeryBreakdown,
  onShowOptimizeModal,
  onShowBaseStockModal,
  onOpenAddItemModal,
}) => (
  <div className="hidden md:flex flex-col gap-4">
    {/* Tier 1: Action and Context Header */}
    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-wrap items-stretch gap-2 flex-1 min-w-0">
          <div className="min-w-[150px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 flex flex-col justify-center">
            <h4 className="text-sm font-semibold text-slate-800">총 품목</h4>
            <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{filteredInventoryCount}<span className="text-xs font-semibold text-slate-400 ml-1">종</span></p>
            {hiddenCategoryCount > 0 && (() => {
              const isNormal = hiddenCategoryCount === visibleInventory.length + 1;
              return (
                <div className="flex items-center gap-1 mt-1.5 w-fit">
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNormal ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                  <p className={`text-[10px] font-bold tracking-tight ${isNormal ? 'text-slate-500' : 'text-rose-500'}`}>
                    교환/청구 {hiddenCategoryCount}개 별도{!isNormal && ' · 품목오류'}
                  </p>
                </div>
              );
            })()}
          </div>
          <div className="min-w-[190px] flex-1 sm:flex-none rounded-xl border border-slate-100 bg-slate-50 px-4 py-2 flex flex-col justify-center">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">권장 기간</h4>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm w-fit">
                <div className="relative group/tip-1m">
                  <button onClick={() => setMonthFactor(1)} className={`px-4 py-1 text-[11px] font-black rounded-lg transition-all ${monthFactor === 1 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>1개월분 비축</button>
                  <div className="absolute top-full left-0 mt-2 w-64 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/tip-1m:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                    <p>사용량 기반 1개월 재고를 권장량으로 제안합니다.</p>
                    <p className="mt-1">재고수량이 최적화되는만큼 수술기록지 업데이트를 자주 해서 변동성 확인이 필요합니다.</p>
                  </div>
                </div>
                <div className="relative group/tip-2m">
                  <button onClick={() => setMonthFactor(2)} className={`px-4 py-1 text-[11px] font-black rounded-lg transition-all ${monthFactor === 2 ? 'bg-indigo-50 text-indigo-700' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}>2개월분 비축</button>
                  <div className="absolute top-full left-0 mt-2 w-72 bg-slate-800 text-white text-[10px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/tip-2m:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                    <p>사용량 기반 2개월 재고를 권장량으로 제안합니다.</p>
                    <p className="mt-1 text-slate-300">재고수량이 많아져 재고실사와 관리가 1개월 기준에 비해 비효율적입니다.</p>
                    <p className="mt-1">현장의 재고량을 파악하면서 주문이 필요한 시점에 수술기록지를 업로드해서 최적의 주문수량 발주를 하시면 됩니다.</p>
                  </div>
                </div>
              </div>
              {!isReadOnly && hospitalId && (
                <button
                  onClick={() => void saveMonthFactorForAll(monthFactor)}
                  disabled={saveStatus === 'saving'}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-all ${
                    saveStatus === 'saved'
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : saveStatus === 'error'
                      ? 'bg-rose-50 text-rose-500 border-rose-200'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  {saveStatus === 'saved' ? '저장됨 ✓' : saveStatus === 'error' ? '실패' : saveStatus === 'saving' ? '저장 중...' : '모두에게 저장'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right: action buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto sm:ml-auto">
          {!isReadOnly && deadStockCount > 0 && onShowOptimizeModal && (
            <button
              onClick={onShowOptimizeModal}
              className="relative px-3.5 py-2 text-xs font-bold rounded-xl border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 active:scale-[0.98] transition-all flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12l-3-3m0 0l-3 3m3-3v6" /></svg>
              품목 최적화
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                {deadStockCount}
              </span>
            </button>
          )}
          {!isReadOnly && (
            <button
              onClick={() => !isEditExhausted && onShowBaseStockModal()}
              disabled={isEditExhausted}
              className={`px-4 py-2 text-xs font-bold rounded-xl border transition-all flex items-center gap-1.5 ${isEditExhausted ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-700 bg-white border-slate-200 hover:bg-slate-50 active:scale-[0.98] shadow-sm'}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              기초재고 편집{isUnlimited ? '' : isEditExhausted ? '' : ` (${maxEdits - editCount}회)`}
            </button>
          )}
          <button
            onClick={() => { if (!isReadOnly) onOpenAddItemModal(); }}
            disabled={isReadOnly}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-slate-900 text-white hover:bg-slate-800 active:scale-[0.98]'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
            품목 추가
          </button>
        </div>
      </div>
    </div>

    {/* Tier 2: 메인 KPI 스트립 */}
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm flex overflow-hidden">
      {/* 총 사용량 */}
      <div className="flex-1 p-5 lg:p-6 transition-colors hover:bg-slate-50/50">
        <h4 className="text-sm font-semibold text-slate-800">총 사용량</h4>
        <div className="flex items-baseline gap-1 mt-3">
          <p className="text-2xl font-black text-slate-800 tabular-nums tracking-tighter leading-none">{kpiData.totalUsage.toLocaleString()}</p>
          <span className="text-sm font-bold text-slate-400">개</span>
        </div>
        {(surgeryBreakdown.placement > 0 || surgeryBreakdown.fail > 0) ? (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs font-bold text-indigo-600">식립 {surgeryBreakdown.placement}</span>
            {surgeryBreakdown.fail > 0 && <span className="text-xs font-bold text-rose-500">교환 {surgeryBreakdown.fail}</span>}
          </div>
        ) : null}
      </div>

      <div className="w-px bg-slate-100 shrink-0" />

      {/* 현재 재고 */}
      <div className="flex-1 p-5 lg:p-6 transition-colors hover:bg-slate-50/50">
        <h4 className="text-sm font-semibold text-slate-800">현재 재고</h4>
        <div className="flex items-baseline gap-1 mt-3">
          <p className={`text-2xl font-black tabular-nums tracking-tighter leading-none ${kpiData.totalStock < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {kpiData.totalStock.toLocaleString()}
          </p>
          <span className="text-sm font-bold text-slate-400">개</span>
        </div>
        {kpiData.totalStock < 0 ? (
          <p className="text-xs font-bold text-rose-500 mt-2">⚠ 입력 필요</p>
        ) : (() => {
          const itemsWithDemand = visibleInventory.filter(i => (i.usageCount ?? 0) > 0 || (i.monthlyAvgUsage ?? 0) > 0 || (i.dailyMaxUsage ?? 0) > 0);
          const healthy = itemsWithDemand.filter(i => i.currentStock >= Math.max(1, Math.ceil((i.recommendedStock ?? 0) * monthFactor))).length;
          const normal = itemsWithDemand.filter(i => {
            const recommended = Math.max(1, Math.ceil((i.recommendedStock ?? 0) * monthFactor));
            const threshold = Math.ceil(recommended * 0.7);
            return i.currentStock < recommended && i.currentStock >= threshold;
          }).length;
          const caution = itemsWithDemand.filter(i => {
            const recommended = Math.max(1, Math.ceil((i.recommendedStock ?? 0) * monthFactor));
            const threshold = Math.ceil(recommended * 0.7);
            return i.currentStock < threshold;
          }).length;
          if (itemsWithDemand.length === 0) return null;
          return (
            <div className="mt-2 flex items-center gap-2">
              <p className="text-[10px] text-slate-400 font-bold shrink-0">권장량 기준</p>
              {healthy > 0 && <span className="text-[11px] font-black text-emerald-600">건강 {healthy}</span>}
              {normal > 0 && <span className="text-[11px] font-black text-amber-500">보통 {normal}</span>}
              {caution > 0 && <span className="text-[11px] font-black text-rose-500">주의 {caution}</span>}
            </div>
          );
        })()}
      </div>

      <div className="w-px bg-slate-100 shrink-0" />

      {/* 부족 품목 */}
      <div
        onClick={() => { window.location.hash = '#/dashboard/orders'; }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.location.hash = '#/dashboard/orders'; } }}
        className="flex-1 p-5 lg:p-6 transition-all duration-300 hover:bg-indigo-50/40 cursor-pointer active:bg-indigo-100/50 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500 group/shortage relative overflow-hidden"
      >
        <div className="absolute top-5 right-5 opacity-0 translate-x-2 group-hover/shortage:opacity-100 group-hover/shortage:translate-x-0 transition-all duration-300 pointer-events-none">
          <div className="flex items-center gap-1 text-indigo-600 bg-white shadow-sm border border-indigo-100 px-2.5 py-1 rounded-full">
            <span className="text-[10px] font-black tracking-tight">주문 관리</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </div>
        </div>

        <h4 className="text-sm font-semibold text-slate-800 group-hover/shortage:text-indigo-700 transition-colors">부족 품목</h4>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-black mt-0.5 group-hover/shortage:text-indigo-400/80 transition-colors">{monthFactor}개월 기준</p>
        <div className="flex items-baseline gap-1 mt-3">
          <p className={`text-2xl font-black tabular-nums tracking-tighter leading-none transition-colors duration-300 ${kpiData.shortageCount > 0 ? 'text-rose-600 group-hover/shortage:text-indigo-600' : 'text-slate-800 group-hover/shortage:text-indigo-600'}`}>{kpiData.shortageCount}</p>
          <span className="text-sm font-bold text-slate-400 group-hover/shortage:text-indigo-400 transition-colors">종</span>
        </div>
        {kpiData.shortageCount > 0 ? (
          <p className="text-xs font-bold text-slate-500 mt-2 transition-colors group-hover/shortage:text-indigo-500/80">
            총 <span className="text-rose-600 group-hover/shortage:text-indigo-600 transition-colors">-{kpiData.shortageDeficit}개</span> 부족
          </p>
        ) : (
          <p className="text-xs font-bold text-slate-400 mt-2 transition-colors group-hover/shortage:text-indigo-400/80">부족 품목 없음</p>
        )}
      </div>

      <div className="w-px bg-slate-100 shrink-0" />

      {/* 재고 건강도 */}
      {(() => {
        const totalItems = Math.max(kpiData.totalItems, 1);
        const healthyCount = kpiData.totalItems - kpiData.shortageCount;
        const rate = Math.round(Math.max(0, healthyCount) / totalItems * 100);
        const isHealthy = rate >= 90;
        const isMid = rate >= 75;
        const color = isHealthy ? 'text-emerald-600' : isMid ? 'text-amber-500' : 'text-rose-600';
        const label = isHealthy ? '건강' : isMid ? '보통' : '주의';
        const bgColor = isHealthy ? 'bg-emerald-50' : isMid ? 'bg-amber-50' : 'bg-rose-50';
        return (
          <div className="flex-1 p-5 lg:p-6 transition-colors hover:bg-slate-50/50">
            <h4 className="text-sm font-semibold text-slate-800">재고 건강도</h4>
            <div className="flex flex-wrap items-baseline gap-1 mt-3">
              <p className={`text-2xl font-black tabular-nums tracking-tighter leading-none ${color}`}>{rate}</p>
              <span className={`text-sm font-bold ${color}`}>%</span>
              <span className={`ml-2 text-[10px] font-black px-2 py-0.5 rounded-md border border-current ${color} ${bgColor}`}>{label}</span>
            </div>
            <p className="text-[10px] font-bold text-slate-400 mt-2">부족 {kpiData.shortageCount}개 제외</p>
          </div>
        );
      })()}
    </div>
  </div>
);

export default InventoryDashboardCards;
