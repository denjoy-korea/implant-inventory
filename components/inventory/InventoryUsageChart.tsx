import React from 'react';
import type { InventoryItem } from '../../types';
import { smoothLine, smoothArea } from '../surgery-dashboard/shared';
import { USAGE_TOP_ITEMS } from './inventoryDashboardConfig';

interface InventoryUsageChartProps {
  chartData: InventoryItem[];
  maxUsage: number;
  selectedManufacturer: string | null;
  monthFactor: number;
  canAiForecast: boolean;
  sparklineSeriesByItemId: Map<string, number[]>;
  supplyCoverageData: {
    needsReplenishmentCount: number;
    immediateReplenishmentCount: number;
    partialReplenishmentCount: number;
    securedCount: number;
    totalShortage: number;
    topNeed: { item: InventoryItem; recommended: number; shortage: number } | null;
  };
}

const InventoryUsageChart: React.FC<InventoryUsageChartProps> = ({
  chartData,
  maxUsage,
  selectedManufacturer,
  monthFactor,
  canAiForecast,
  sparklineSeriesByItemId,
  supplyCoverageData,
}) => (
  <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
    {/* 헤더 */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 pt-5 pb-4 border-b border-slate-50">
      <div>
        <h3 className="text-sm font-black text-slate-800 tracking-tight">규격별 사용량 분석</h3>
      </div>
      <div className="flex items-center gap-2 self-start sm:self-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOP {Math.min(chartData.length, USAGE_TOP_ITEMS)}</span>
        <div className="w-px h-3 bg-slate-200" />
        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
          {selectedManufacturer ?? '전체'}
        </span>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px]">
      {/* ── 좌측: 수평 바 차트 ── */}
      <div className="px-3 sm:px-6 py-4">
        {/* 컬럼 헤더 */}
        {chartData.length > 0 && (
          <div className="hidden lg:flex items-center gap-3 mb-2 pb-2 border-b border-slate-50">
            <span className="w-5 shrink-0" />
            <div className="w-[100px] shrink-0" />
            <div className="flex-1 max-w-[100px] sm:max-w-[160px]" />
            <div className="w-[200px] sm:w-[320px] shrink-0 grid grid-cols-5 gap-0">
              <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">월평균</p>
              <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">일최대</p>
              <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">지난달</p>
              <div className="text-center">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">현재재고</p>
                {canAiForecast && <p className="text-[8px] font-bold text-indigo-400 leading-none mt-0.5">소진예상</p>}
              </div>
              <p className="text-[9px] font-bold text-rose-400 text-center uppercase tracking-wide">부족분</p>
            </div>
            <div className="w-[120px] sm:w-[176px] shrink-0 text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">사용 추이</p>
              <p className="text-[9px] font-semibold text-indigo-400 mt-0.5">값 시작월~종료월</p>
            </div>
            <span className="w-2 shrink-0" />
          </div>
        )}
        <div className="overflow-x-auto pb-1">
          <div className="space-y-2 min-w-0">
            {chartData.length > 0 ? chartData.map((item, idx) => {
              const pct = Math.round((item.usageCount / maxUsage) * 100);
              const isTop = idx === 0;
              const isLow = item.currentStock < Math.ceil((item.recommendedStock ?? 0) * monthFactor);
              const avg = item.monthlyAvgUsage ?? 0;
              const last = item.lastMonthUsage ?? 0;
              const isSurge = avg > 0 && last > avg * 1.5 && last - avg >= 2;
              const isDrop = avg >= 2 && last < avg * 0.5 && avg - last >= 2;
              return (
                <div key={item.id} className="group flex items-center gap-3">
                  {/* 순위 */}
                  <span className={`w-5 text-right text-[10px] font-black shrink-0 ${isTop ? 'text-indigo-500' : 'text-slate-300'}`}>
                    {idx + 1}
                  </span>
                  {/* 라벨 */}
                  <div className="w-[100px] shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter leading-none">{item.brand}</p>
                    <p className="text-[11px] font-black text-slate-700 truncate leading-snug">{item.size}</p>
                  </div>
                  {/* 바 */}
                  <div className="flex-1 max-w-[100px] sm:max-w-[160px] h-1.5 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isTop ? 'bg-gradient-to-r from-indigo-500 to-violet-400' : 'bg-indigo-200 group-hover:bg-indigo-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* 수치 그리드 */}
                  <div className="w-[200px] sm:w-[320px] shrink-0 grid grid-cols-5 gap-0 items-center">
                    <p className={`text-xs font-semibold tabular-nums text-center ${isTop ? 'text-indigo-500' : 'text-slate-500'}`}>
                      {avg.toFixed(1)}
                    </p>
                    <p className={`text-xs font-semibold tabular-nums text-center ${(item.dailyMaxUsage ?? 0) > 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                      {(item.dailyMaxUsage ?? 0) > 0 ? item.dailyMaxUsage : '-'}
                    </p>
                    <div className="flex items-center justify-center gap-0.5">
                      <p className={`text-xs font-semibold tabular-nums ${last > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                        {last}
                      </p>
                      {isSurge && <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-0.5 rounded leading-none">↑</span>}
                      {isDrop && <span className="text-[8px] font-black text-blue-400 bg-blue-50 px-0.5 rounded leading-none">↓</span>}
                    </div>
                    <div className="flex flex-col items-center">
                      <p className={`text-xs font-bold tabular-nums ${item.currentStock <= 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                        {item.currentStock}
                      </p>
                      {canAiForecast && item.predictedDailyUsage != null && item.predictedDailyUsage > 0 && (() => {
                        const days = item.currentStock > 0 ? Math.floor(item.currentStock / item.predictedDailyUsage) : 0;
                        const color = days <= 7 ? 'text-rose-500' : days <= 14 ? 'text-amber-500' : 'text-emerald-600';
                        return <p className={`text-[9px] font-black tabular-nums leading-none mt-0.5 ${color}`}>{days}일</p>;
                      })()}
                    </div>
                    {(() => {
                      const recommended = Math.ceil((item.recommendedStock ?? 0) * monthFactor);
                      const shortage = recommended - item.currentStock;
                      return shortage > 0
                        ? <p className="text-xs font-black tabular-nums text-center text-rose-500">-{shortage}</p>
                        : <p className="text-xs font-bold tabular-nums text-center text-emerald-500">충분</p>;
                    })()}
                  </div>
                  {/* 스파크라인 */}
                  <div className="w-[120px] sm:w-[176px] shrink-0 px-2">
                    {(() => {
                      const series = sparklineSeriesByItemId.get(item.id) ?? [];
                      if (!series.some(v => v > 0)) {
                        return (
                          <div className="h-8 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-center">
                            <span className="text-[9px] font-semibold text-slate-300">데이터 없음</span>
                          </div>
                        );
                      }

                      const width = 152;
                      const height = 28;
                      const minVal = Math.min(...series);
                      const maxVal = Math.max(...series, 0);
                      const range = Math.max(1, maxVal - minVal);
                      const stepX = series.length > 1 ? width / (series.length - 1) : 0;

                      const points = series.map((val, i) => ({
                        x: i * stepX,
                        y: height - ((val - minVal) / range) * height
                      }));
                      const pathLine = smoothLine(points);
                      const pathArea = smoothArea(points, height);

                      const lastPoint = points[points.length - 1] || { x: 0, y: height };
                      const strokeColor = isTop ? '#4f46e5' : '#818cf8';
                      const gradId = `sparkg-${item.id}`;

                      return (
                        <div className="relative h-8 rounded-lg border border-indigo-50 bg-indigo-50/20 px-2 py-1 group-hover:border-indigo-100 transition-colors">
                          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none" aria-label="품목 사용 추이">
                            <defs>
                              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                                <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <path d={pathArea} fill={`url(#${gradId})`} />
                            <path d={pathLine} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
                            <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill="white" stroke={strokeColor} strokeWidth={1.5} className="shadow-sm" />
                          </svg>
                        </div>
                      );
                    })()}
                  </div>
                  {/* 재고 부족 닷 */}
                  <span className={`w-2 h-2 rounded-full shrink-0 ${isLow ? 'bg-rose-400' : 'bg-transparent'}`} title={isLow ? '재고 부족' : ''} />
                </div>
              );
            }) : (
              <div className="py-10 text-center flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                  <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-xs text-slate-400 font-bold italic">사용 데이터가 없습니다.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── 우측: 재고 확보 패널 ── */}
      <div className="lg:border-l border-t lg:border-t-0 border-slate-100 px-5 py-5 flex flex-col sm:flex-row lg:flex-col justify-between gap-4 min-w-[180px]">
        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">우선 확보 품목</p>
          {supplyCoverageData.topNeed ? (
            <div className="rounded-xl px-3 py-2.5 bg-amber-50 border border-amber-100">
              <p className="text-[10px] font-black leading-none text-amber-700">
                {supplyCoverageData.topNeed.item.brand}
              </p>
              <p className="text-[11px] font-bold mt-0.5 text-amber-600">
                {supplyCoverageData.topNeed.item.size}
              </p>
              <div className="flex items-baseline gap-1 mt-1.5">
                <span className="text-xl font-black tabular-nums leading-none text-amber-700">
                  {supplyCoverageData.topNeed.shortage}
                </span>
                <span className="text-[10px] font-bold text-amber-500">
                  개 보충 필요
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-xl px-3 py-2.5 bg-emerald-50 border border-emerald-100">
              <p className="text-[11px] font-black text-emerald-600">전 품목 권장량 충족</p>
              <p className="text-[10px] text-emerald-400 mt-0.5">추가 보충 필요 없음</p>
            </div>
          )}
        </div>

        <div className="h-px w-full bg-slate-50 hidden lg:block" />

        <div className="flex-1">
          <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">재고 확보 현황</p>
          <p className="text-[9px] text-slate-300 font-semibold mb-2">권장량 기준</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500">보충 필요</span>
              </div>
              <span className={`text-[12px] font-black tabular-nums ${supplyCoverageData.needsReplenishmentCount > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                {supplyCoverageData.needsReplenishmentCount}종
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500">총 부족 수량</span>
              </div>
              <span className={`text-[12px] font-black tabular-nums ${supplyCoverageData.totalShortage > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                {supplyCoverageData.totalShortage}개
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500">권장량 충족</span>
              </div>
              <span className="text-[12px] font-black tabular-nums text-emerald-600">
                {supplyCoverageData.securedCount}종
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                <span className="text-[10px] font-bold text-slate-500">즉시 보충</span>
              </div>
              <span className="text-[12px] font-black tabular-nums text-slate-600">
                {supplyCoverageData.immediateReplenishmentCount}종
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* 범례 */}
    <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-2.5 bg-slate-50/60 border-t border-slate-50">
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-indigo-500 to-violet-400" />
        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">1위</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">2위 이하</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
        <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">재고 부족</span>
      </div>
      <div className="ml-auto text-[9px] text-slate-300 font-medium">수술 사용패턴 기반 권장량 기준</div>
    </div>
  </div>
);

export default InventoryUsageChart;
