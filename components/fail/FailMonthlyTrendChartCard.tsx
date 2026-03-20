import React from 'react';
import { DONUT_COLORS } from '../surgery-dashboard/shared';
import { CHART_PAD, CHART_AREA_H } from '../../hooks/useFailManager';

type MonthlyFailData = {
  month: string;
  byManufacturer: Record<string, number>;
};

interface FailMonthlyTrendChartCardProps {
  manufacturers: string[];
  allMonthlyFailData: MonthlyFailData[];
  allMonths: string[];
  periodStartIdx: number;
  periodEndIdx: number;
  visibleMonthlyData: MonthlyFailData[];
  filteredMonthlyMap: Record<string, Record<string, number>>;
  hoveredChartIdx: number | null;
  setHoveredChartIdx: React.Dispatch<React.SetStateAction<number | null>>;
  chartTouchStartX: React.MutableRefObject<number>;
  chartTouchStartY: React.MutableRefObject<number>;
  setChartMonthOffset: React.Dispatch<React.SetStateAction<number>>;
  maxOffset: number;
  chartYMax: number;
  chartTicks: number[];
}

const FailMonthlyTrendChartCard: React.FC<FailMonthlyTrendChartCardProps> = ({
  manufacturers,
  allMonthlyFailData,
  allMonths,
  periodStartIdx,
  periodEndIdx,
  visibleMonthlyData,
  filteredMonthlyMap,
  hoveredChartIdx,
  setHoveredChartIdx,
  chartTouchStartX,
  chartTouchStartY,
  setChartMonthOffset,
  maxOffset,
  chartYMax,
  chartTicks,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-sm font-black text-slate-800 tracking-tight">월별 교환 추세</h3>
        </div>
        <div className="flex items-center gap-3">
          {manufacturers.map((manufacturer, index) => (
            <div key={manufacturer} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: DONUT_COLORS[index % DONUT_COLORS.length] }} />
              <span className="text-[10px] font-bold text-slate-400">{manufacturer}</span>
            </div>
          ))}
        </div>
      </div>
      {allMonthlyFailData.length > 0 ? (
        (() => {
          const filterStart = allMonths[periodStartIdx] || allMonths[0] || '';
          const filterEnd = allMonths[periodEndIdx] || allMonths[allMonths.length - 1] || '';
          const inRange = (month: string) => month >= filterStart && month <= filterEnd;
          const manufacturerCount = manufacturers.length || 1;
          const monthWidth = Math.max(48, Math.min(68, Math.floor(680 / visibleMonthlyData.length)));
          const groupWidth = monthWidth - 10;
          const barGap = 2;
          const barWidth = Math.max(6, Math.floor((groupWidth - barGap * (manufacturerCount - 1)) / manufacturerCount));
          const svgWidth = CHART_PAD.l + visibleMonthlyData.length * monthWidth + CHART_PAD.r;
          const svgHeight = CHART_PAD.t + CHART_AREA_H + CHART_PAD.b;
          // 툴팁 크기
          const tooltipWidth = 148;
          const tooltipRowHeight = 20;
          const tooltipPadding = 10;
          const tooltipHeight = tooltipPadding + 14 + manufacturerCount * tooltipRowHeight + tooltipPadding;

          return (
            <div
              className="overflow-x-auto -mx-1 px-1"
              onTouchStart={(event) => {
                chartTouchStartX.current = event.touches[0].clientX;
                chartTouchStartY.current = event.touches[0].clientY;
              }}
              onTouchMove={(event) => {
                const deltaX = chartTouchStartX.current - event.touches[0].clientX;
                const deltaY = chartTouchStartY.current - event.touches[0].clientY;
                if (Math.abs(deltaX) > Math.abs(deltaY)) {
                  event.preventDefault();
                }
              }}
              onTouchEnd={(event) => {
                const deltaX = chartTouchStartX.current - event.changedTouches[0].clientX;
                const deltaY = chartTouchStartY.current - event.changedTouches[0].clientY;
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
                  if (deltaX > 0) {
                    // swipe left: shift forward (show later months)
                    setChartMonthOffset((prev) => Math.min(prev + 1, maxOffset));
                  } else {
                    // swipe right: shift backward (show earlier months)
                    setChartMonthOffset((prev) => Math.max(prev - 1, 0));
                  }
                }
                setHoveredChartIdx(null);
              }}
            >
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                height={svgHeight}
                className="w-full"
                style={{ minWidth: Math.max(320, svgWidth) }}
                preserveAspectRatio="xMinYMid meet"
                onMouseLeave={() => setHoveredChartIdx(null)}
              >
                {/* Horizontal grid lines + Y labels */}
                {chartTicks.map((tick) => {
                  const y = CHART_PAD.t + CHART_AREA_H - (tick / chartYMax) * CHART_AREA_H;
                  return (
                    <g key={tick}>
                      <line x1={CHART_PAD.l} y1={y} x2={svgWidth - CHART_PAD.r} y2={y} stroke="#f1f5f9" strokeWidth="1" />
                      <text x={CHART_PAD.l - 4} y={y + 3} textAnchor="end" fontSize="9" fill="#94a3b8" fontWeight="600">
                        {tick}
                      </text>
                    </g>
                  );
                })}
                {/* Baseline */}
                <line x1={CHART_PAD.l} y1={CHART_PAD.t + CHART_AREA_H} x2={svgWidth - CHART_PAD.r} y2={CHART_PAD.t + CHART_AREA_H} stroke="#e2e8f0" strokeWidth="1.5" />

                {/* Grouped bars per month */}
                {visibleMonthlyData.map((monthly, index) => {
                  const barGroupWidth = barWidth * manufacturerCount + barGap * (manufacturerCount - 1);
                  const groupX = CHART_PAD.l + index * monthWidth + (monthWidth - barGroupWidth) / 2;
                  const groupCenterX = CHART_PAD.l + index * monthWidth + monthWidth / 2;
                  const isHovered = hoveredChartIdx === index;
                  return (
                    <g key={monthly.month}>
                      {/* Hover background */}
                      {isHovered && <rect x={CHART_PAD.l + index * monthWidth + 1} y={CHART_PAD.t} width={monthWidth - 2} height={CHART_AREA_H} rx="4" fill="#f1f5f9" />}
                      {/* Bars */}
                      {manufacturers.map((manufacturer, manufacturerIndex) => {
                        const value = filteredMonthlyMap[monthly.month]?.[manufacturer] ?? 0;
                        const barHeight = chartYMax > 0 ? (value / chartYMax) * CHART_AREA_H : 0;
                        const x = groupX + manufacturerIndex * (barWidth + barGap);
                        const y = CHART_PAD.t + CHART_AREA_H - barHeight;
                        return (
                          <rect
                            key={manufacturer}
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(0, barHeight)}
                            rx="3"
                            fill={DONUT_COLORS[manufacturerIndex % DONUT_COLORS.length]}
                            opacity={isHovered ? 1 : 0.82}
                          />
                        );
                      })}
                      {/* X-axis label */}
                      <text
                        x={groupCenterX}
                        y={CHART_PAD.t + CHART_AREA_H + 14}
                        textAnchor="middle"
                        fontSize="8"
                        fill={isHovered ? '#1e293b' : inRange(monthly.month) ? '#94a3b8' : '#e2e8f0'}
                        fontWeight={isHovered ? '800' : '600'}
                      >
                        {monthly.month.slice(2)}
                      </text>
                      {/* Invisible hover capture rect */}
                      <rect
                        x={CHART_PAD.l + index * monthWidth}
                        y={CHART_PAD.t}
                        width={monthWidth}
                        height={CHART_AREA_H + CHART_PAD.b}
                        fill="transparent"
                        onMouseEnter={() => setHoveredChartIdx(index)}
                        onTouchStart={(event) => {
                          event.preventDefault();
                          setHoveredChartIdx(index);
                        }}
                        className="cursor-crosshair"
                      />
                    </g>
                  );
                })}

                {/* Tooltip overlay */}
                {hoveredChartIdx !== null &&
                  (() => {
                    const monthly = visibleMonthlyData[hoveredChartIdx];
                    const groupCenterX = CHART_PAD.l + hoveredChartIdx * monthWidth + monthWidth / 2;
                    let tooltipX = groupCenterX - tooltipWidth / 2;
                    tooltipX = Math.max(CHART_PAD.l, Math.min(svgWidth - CHART_PAD.r - tooltipWidth, tooltipX));
                    const tooltipY = CHART_PAD.t + 8;
                    return (
                      <g className="pointer-events-none">
                        {/* Dashed center line */}
                        <line
                          x1={groupCenterX}
                          y1={CHART_PAD.t}
                          x2={groupCenterX}
                          y2={CHART_PAD.t + CHART_AREA_H}
                          stroke="#94a3b8"
                          strokeWidth="1"
                          strokeDasharray="3,3"
                        />
                        {/* Tooltip box shadow (fake) */}
                        <rect x={tooltipX + 2} y={tooltipY + 3} width={tooltipWidth} height={tooltipHeight} rx="8" fill="#0f172a" opacity="0.15" />
                        {/* Tooltip box */}
                        <rect x={tooltipX} y={tooltipY} width={tooltipWidth} height={tooltipHeight} rx="8" fill="#1e293b" />
                        {/* Month header */}
                        <text x={tooltipX + tooltipWidth / 2} y={tooltipY + tooltipPadding + 8} textAnchor="middle" fontSize="9" fill="#94a3b8" fontWeight="700">
                          {monthly.month}
                        </text>
                        {/* Data rows */}
                        {manufacturers.map((manufacturer, manufacturerIndex) => {
                          const value = filteredMonthlyMap[monthly.month]?.[manufacturer] ?? 0;
                          const rowY = tooltipY + tooltipPadding + 16 + manufacturerIndex * tooltipRowHeight;
                          return (
                            <g key={manufacturer}>
                              <rect x={tooltipX + tooltipPadding} y={rowY + 2} width="8" height="8" rx="2" fill={DONUT_COLORS[manufacturerIndex % DONUT_COLORS.length]} />
                              <text x={tooltipX + tooltipPadding + 13} y={rowY + 9} fontSize="10" fill="#e2e8f0" fontWeight="600">
                                {manufacturer}
                              </text>
                              <text x={tooltipX + tooltipWidth - tooltipPadding} y={rowY + 9} textAnchor="end" fontSize="10" fill="white" fontWeight="800">
                                {value}건
                              </text>
                            </g>
                          );
                        })}
                      </g>
                    );
                  })()}
              </svg>
            </div>
          );
        })()
      ) : (
        <div className="py-16 text-center">
          <p className="text-sm text-slate-400 font-medium">차트 데이터 없음</p>
        </div>
      )}
    </div>
  );
};

export default FailMonthlyTrendChartCard;
