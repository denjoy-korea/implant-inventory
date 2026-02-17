import React, { useState } from 'react';
import { BoneDensityStat } from './useClinicalStats';
import { CHART_FOCUS_CLASS } from './shared';

interface Props {
    stats: BoneDensityStat[];
    mounted: boolean;
}

export default function FailureRateChart({ stats, mounted }: Props) {
    const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

    const W = 400, H = 300;
    const pad = { l: 40, r: 20, t: 30, b: 40 };
    const plotW = W - pad.l - pad.r;
    const plotH = H - pad.t - pad.b;

    const densities = ['D1', 'D2', 'D3', 'D4'];
    const barW = 40;
    const step = plotW / densities.length;

    const maxRate = Math.max(15, ...stats.map(s => s.failRate)); // Min Y-axis 15%
    const niceMax = Math.ceil(maxRate / 5) * 5;

    const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((niceMax / 4) * i));

    const getColor = (rate: number) => {
        if (rate >= 10) return '#f43f5e'; // Rose 500 (High risk)
        if (rate >= 5) return '#fb7185';  // Rose 400 (Warning)
        return '#fda4af'; // Rose 300 (Low/Good)
    };

    const handleKeyDown = (e: React.KeyboardEvent<SVGSVGElement>) => {
        const maxIdx = densities.length - 1;
        let next = hoveredIdx ?? 0;

        if (e.key === 'ArrowRight') next = Math.min(next + 1, maxIdx);
        else if (e.key === 'ArrowLeft') next = Math.max(next - 1, 0);
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = maxIdx;
        else if (e.key === 'Escape') {
            setHoveredIdx(null);
            return;
        } else {
            return;
        }

        e.preventDefault();
        setHoveredIdx(next);
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow duration-300 h-full flex flex-col">
            <div className="mb-6 shrink-0">
                <h3 className="text-sm font-semibold text-slate-800">골질별 실패율 분석</h3>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Failure Rate by Bone Density</p>
            </div>

            <div className="relative flex-1 flex items-center justify-center min-h-[300px]">
                <svg
                    viewBox={`0 0 ${W} ${H}`}
                    className={CHART_FOCUS_CLASS}
                    style={{ overflow: 'visible', width: '100%', height: 'auto' }}
                    role="img"
                    aria-label="골질별 실패율 막대 차트. 좌우 방향키로 등급 이동 가능"
                    tabIndex={0}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setHoveredIdx(null)}
                    onFocus={() => {
                        if (hoveredIdx === null) setHoveredIdx(0);
                    }}
                    onPointerLeave={() => setHoveredIdx(null)}
                >
                    {/* Grid */}
                    {yTicks.map(tick => {
                        const y = pad.t + plotH - (tick / niceMax) * plotH;
                        return (
                            <g key={tick}>
                                <line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="3 3" />
                                <text x={pad.l - 8} y={y + 3} textAnchor="end" fontSize={10} fill="#94a3b8">{tick}%</text>
                            </g>
                        );
                    })}

                    {/* Bars */}
                    {densities.map((d, i) => {
                        const stat = stats.find(s => s.density === d);
                        const rate = stat ? stat.failRate : 0;
                        const x = pad.l + i * step + step / 2 - barW / 2;
                        const h = (rate / niceMax) * plotH;
                        const y = pad.t + plotH - h;
                        const isHovered = hoveredIdx === i;

                        return (
                            <g key={d} onPointerEnter={() => setHoveredIdx(i)} onPointerLeave={() => setHoveredIdx(null)}>
                                {/* Background column hover effect */}
                                <rect x={pad.l + i * step} y={pad.t} width={step} height={plotH} fill={isHovered ? '#f8fafc' : 'transparent'} />

                                {/* Actual Bar */}
                                <rect
                                    x={x}
                                    y={y}
                                    width={barW}
                                    height={Math.max(0, h)}
                                    rx={4}
                                    fill={getColor(rate)}
                                    opacity={isHovered ? 1 : 0.85}
                                    className="transition-opacity duration-200"
                                    style={{
                                        transformOrigin: `${x + barW / 2}px ${pad.t + plotH}px`,
                                        animation: mounted ? `bar-grow 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${i * 100}ms both` : 'none',
                                    }}
                                />

                                {/* Label on top */}
                                {rate > 0 && (
                                    <text x={x + barW / 2} y={y - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill="#334155">
                                        {rate.toFixed(1)}%
                                    </text>
                                )}

                                {/* X Axis Label */}
                                <text x={x + barW / 2} y={H - pad.b + 16} textAnchor="middle" fontSize={12} fontWeight={600} fill="#1e293b">{d}</text>

                                {/* Count Label */}
                                {stat && (
                                    <text x={x + barW / 2} y={H - pad.b + 30} textAnchor="middle" fontSize={9} fill="#94a3b8">
                                        n={stat.total}
                                    </text>
                                )}
                            </g>
                        );
                    })}
                </svg>

                {/* Tooltip */}
                {hoveredIdx !== null && densities[hoveredIdx] && stats.find(s => s.density === densities[hoveredIdx]) && (() => {
                    const d = densities[hoveredIdx];
                    const stat = stats.find(s => s.density === d)!;
                    const x = pad.l + hoveredIdx * step + step / 2;
                    const y = pad.t + plotH / 2; // Fixed vertical position or dynamic? Dynamic is better but fixed is cleaner for simple bars.

                    return (
                        <div className="absolute pointer-events-none bg-slate-800 text-white rounded-lg px-2.5 py-1.5 shadow-xl text-center z-10 transform -translate-x-1/2 -translate-y-full"
                            style={{ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` }}>
                            <p className="text-[11px] font-bold">{d}등급</p>
                            <p className="text-[10px] text-slate-300">총 {stat.total}건 중 {stat.fail}건 실패</p>
                        </div>
                    );
                })()}
            </div>
        </div>
    );
}
