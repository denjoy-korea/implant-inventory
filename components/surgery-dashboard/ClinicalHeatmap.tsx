import React, { useState } from 'react';
import { ClinicalMatrixCell } from './useClinicalStats';
import { CHART_FOCUS_CLASS } from './shared';

interface Props {
    matrix: ClinicalMatrixCell[];
    mounted: boolean;
}

export default function ClinicalHeatmap({ matrix, mounted }: Props) {
    const [hoveredCell, setHoveredCell] = useState<ClinicalMatrixCell | null>(null);

    const W = 500, H = 300;
    const pad = { l: 80, r: 20, t: 30, b: 40 }; // Increased left for Fixation labels
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const densities = ['D1', 'D2', 'D3', 'D4'];
    const ranges = ['>45N', '30~45N', '15~30N', '<15N']; // Top to Bottom
    // Ranges in Matrix are indexed 0:<15, 1:15-30... so we need to map visual Y to index.
    // Visual Y0 (Top) = >45N (Index 3)
    // Visual Y1 = 30~45 (Index 2)
    // Visual Y2 = 15~30 (Index 1)
    // Visual Y3 = <15 (Index 0)
    const rangeIndices = [3, 2, 1, 0];
    const totalRows = ranges.length;
    const totalCols = densities.length;

    const cellW = plotW / densities.length;
    const cellH = plotH / ranges.length;

    // Color Scale: Slate(0%) -> Rose(Low) -> Rose(High)
    const getColor = (failRate: number, total: number) => {
        if (total === 0) return '#f8fafc'; // Empty - Slate 50
        if (failRate === 0) return '#f1f5f9'; // 0% - Slate 100 (Neutral/Safe)

        // Gradient logic (Rose Scale)
        // Match Manufacturer Analysis 'Rose' theme for failures
        if (failRate < 3) return '#ffe4e6'; // Rose 100
        if (failRate < 7) return '#fda4af'; // Rose 300
        if (failRate < 15) return '#fb7185'; // Rose 400
        return '#f43f5e'; // Rose 500
    };

    const getOpacity = (total: number) => 1;

    const getTextContrast = (failRate: number, total: number) => {
        if (total === 0) return '#cbd5e1';
        if (failRate >= 7) return '#ffffff'; // White text on dark red
        return '#334155'; // Slate 700
    };

    const getCellByIndex = (idx: number): ClinicalMatrixCell | null => {
        const col = Math.floor(idx / totalRows);
        const row = idx % totalRows;
        if (col < 0 || col >= totalCols || row < 0 || row >= totalRows) return null;
        const density = densities[col];
        const rangeIdx = rangeIndices[row];
        return matrix.find(c => c.density === density && c.rangeIndex === rangeIdx) || null;
    };

    const getIndexForCell = (cell: ClinicalMatrixCell): number => {
        const col = densities.indexOf(cell.density);
        const row = rangeIndices.indexOf(cell.rangeIndex);
        if (col < 0 || row < 0) return 0;
        return col * totalRows + row;
    };

    const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
        const maxIndex = totalCols * totalRows - 1;
        let current = hoveredCell ? getIndexForCell(hoveredCell) : 0;
        let next = current;

        if (e.key === 'ArrowRight') next = Math.min(current + totalRows, maxIndex);
        else if (e.key === 'ArrowLeft') next = Math.max(current - totalRows, 0);
        else if (e.key === 'ArrowDown') next = Math.min(current + 1, maxIndex);
        else if (e.key === 'ArrowUp') next = Math.max(current - 1, 0);
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = maxIndex;
        else if (e.key === 'Escape') {
            setHoveredCell(null);
            return;
        } else {
            return;
        }

        e.preventDefault();
        const target = getCellByIndex(next);
        if (target) setHoveredCell(target);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
            <div className="mb-6 flex justify-between items-start shrink-0">
                <div>
                    <h3 className="text-sm font-semibold text-slate-800">골질/초기고정 실패율 히트맵</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Failure Rate Matrix</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200" />
                        <span className="text-[10px] text-slate-400">안정 (0%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-rose-300 border border-rose-400" />
                        <span className="text-[10px] text-slate-400">주의 (3~7%)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded bg-rose-500 border border-rose-600" />
                        <span className="text-[10px] text-slate-400">위험 (7%+)</span>
                    </div>
                </div>
            </div>

            <div className="relative flex-1 flex items-center justify-center min-h-[300px]">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className={CHART_FOCUS_CLASS}
                    style={{ overflow: 'visible', width: '100%', height: 'auto' }}
                    role="img"
                    aria-label="골질과 초기고정 구간별 실패율 히트맵. 방향키로 셀을 이동해 값 확인 가능"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setHoveredCell(null)}
                    onFocus={() => {
                        if (!hoveredCell) {
                            const firstCell = getCellByIndex(0);
                            if (firstCell) setHoveredCell(firstCell);
                        }
                    }}
                >
                    {/* Y Axis Labels */}
                    {ranges.map((label, i) => {
                        const y = pad.t + i * cellH + cellH / 2;
                        return (
                            <text key={i} x={pad.l - 10} y={y + 4} textAnchor="end" fontSize={11} fontWeight={500} fill="#64748b">
                                {label}
                            </text>
                        );
                    })}

                    {/* Cells */}
                    {densities.map((d, dx) => {
                        return ranges.map((_r, ry) => {
                            const rangeIdx = rangeIndices[ry];
                            const cell = matrix.find(c => c.density === d && c.rangeIndex === rangeIdx);
                            const total = cell?.total || 0;
                            const fail = cell?.fail || 0;
                            const rate = cell?.failRate || 0;

                            const x = pad.l + dx * cellW;
                            const y = pad.t + ry * cellH;

                            const color = getColor(rate, total);
                            const isFocused = hoveredCell?.density === d && hoveredCell?.rangeIndex === rangeIdx;

                            return (
                                <g
                                    key={`${d}-${rangeIdx}`}
                                    onPointerEnter={() => cell && setHoveredCell(cell)}
                                    onPointerLeave={() => setHoveredCell(null)}
                                >
                                    <rect
                                        x={x}
                                        y={y}
                                        width={cellW}
                                        height={cellH}
                                        fill={color}
                                        stroke={isFocused ? '#334155' : '#fff'}
                                        strokeWidth={isFocused ? 3 : 2}
                                        className="transition-colors duration-200 hover:opacity-90"
                                    />
                                    {total > 0 && (
                                        <>
                                            <text x={x + cellW / 2} y={y + cellH / 2 - 2} textAnchor="middle" fontSize={12} fontWeight={700} fill={getTextContrast(rate, total)}>
                                                {rate > 0 ? `${rate.toFixed(0)}%` : '-'}
                                            </text>
                                            <text x={x + cellW / 2} y={y + cellH / 2 + 10} textAnchor="middle" fontSize={9} fill={getTextContrast(rate, total)} opacity={0.7}>
                                                {fail}/{total}
                                            </text>
                                        </>
                                    )}
                                </g>
                            );
                        });
                    })}

                    {/* X Axis Labels */}
                    {densities.map((d, i) => {
                        const x = pad.l + i * cellW + cellW / 2;
                        return (
                            <text key={i} x={x} y={H - pad.b + 16} textAnchor="middle" fontSize={11} fontWeight={600} fill="#475569">{d}</text>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {hoveredCell && (() => {
                    const dx = densities.indexOf(hoveredCell.density);
                    const ry = rangeIndices.indexOf(hoveredCell.rangeIndex); // find visual Y index

                    if (dx === -1 || ry === -1) return null;

                    const x = pad.l + dx * cellW + cellW / 2;
                    const y = pad.t + ry * cellH + cellH / 2;

                    // Simple offset tooltip
                    return (
                        <div
                            className="absolute pointer-events-none bg-slate-900 text-white rounded-lg px-3 py-2 shadow-xl z-20 text-center"
                            style={{
                                left: `${(x / W) * 100}%`,
                                top: `${(y / H) * 100}%`,
                                transform: 'translate(-50%, -120%)'
                            }}
                        >
                            <p className="text-xs font-bold text-slate-100">{hoveredCell.density} &middot; {hoveredCell.rangeLabel}</p>
                            <div className="h-px bg-slate-700 my-1.5" />
                            <div className="flex gap-4 text-[10px] text-slate-300 whitespace-nowrap">
                                <span>총 <strong className="text-white">{hoveredCell.total}</strong>건</span>
                                <span>실패 <strong className="text-rose-400">{hoveredCell.fail}</strong>건</span>
                            </div>
                            <p className="text-sm font-black text-rose-400 mt-0.5">{hoveredCell.failRate.toFixed(1)}%</p>
                        </div>
                    );
                })()}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 text-right">* 각 칸의 숫자는 '실패율'과 '실패/전체 건수'를 의미합니다.</p>
        </div>
    );
}
