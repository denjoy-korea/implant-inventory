import React, { useState, useMemo } from 'react';
import { ExcelRow } from '../../types';
import { ManufacturerFailStat, normalizeManufacturer } from './shared';
import { useClinicalStats } from './useClinicalStats';
import ClinicalHeatmap from './ClinicalHeatmap';
import FailureRateChart from './FailureRateChart';
import { ChartErrorBoundary } from './ChartErrorBoundary';
import { TOOTH_REGIONS, parseTeeth, isToothInRegion } from './shared';

interface Props {
    rows: ExcelRow[];
    manufacturers: ManufacturerFailStat[];
    mounted: boolean;
}

export default function ClinicalAnalysisSection({ rows, manufacturers, mounted }: Props) {
    const [filterMfg, setFilterMfg] = useState<string>('all');
    const [filterRegion, setFilterRegion] = useState<string>('all');

    // Filter rows based on selection
    const filteredRows = useMemo(() => {
        return rows.filter(row => {
            // 1. Manufacturer Filter
            if (filterMfg !== 'all') {
                const m = normalizeManufacturer(String(row['제조사'] || '기타'));
                // If filter is specific manufacturer, match exact
                // If '기타', might need special handling but usually specific names are passed
                if (m !== filterMfg) return false;
            }

            // 2. Tooth Region Filter
            if (filterRegion !== 'all') {
                const rawTeeth = String(row['치아번호'] || '');
                const teeth = parseTeeth(rawTeeth);
                if (teeth.length === 0) return false; // No tooth info -> exclude when specific region requested

                // Check if ANY of the teeth in this case belong to the region
                // (Usually one row = one or more implants. If mixed regions, we include if at least one matches?
                //  Or better: "does this case involve this region?")
                const hasMatch = teeth.some(t => isToothInRegion(t, filterRegion));
                if (!hasMatch) return false;
            }

            // 3. Classification Filter (Targeting Clinical Analysis)
            // Should match useClinicalStats logic: only '식립' or '수술중교환'
            // Exclude '골이식만', '상악동거상', etc. as they don't have implant outcomes
            const cls = String(row['구분'] || '');
            if (cls !== '식립' && cls !== '수술중교환') return false;

            return true;
        });
    }, [rows, filterMfg, filterRegion]);

    const clinicalStats = useClinicalStats(filteredRows);
    const manufacturerOptions = useMemo(() => {
        // Top 5 + Others. We can just use the provided list.
        return manufacturers.map(m => m.name);
    }, [manufacturers]);

    if (!clinicalStats.hasClinicalData) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-2xl border border-slate-100 border-dashed">
                <svg className="w-8 h-8 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <p className="text-sm font-medium">해당 조건의 임상 데이터가 없습니다.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filter Controls */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center gap-4 lg:gap-8">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                    </div>
                    <span className="text-sm font-bold text-slate-700">분석 필터</span>
                </div>

                <div className="h-8 w-px bg-slate-100 hidden lg:block" />

                <div className="flex flex-wrap items-center gap-3 flex-1">
                    {/* Manufacturer Select */}
                    <div className="relative">
                        <select
                            value={filterMfg}
                            onChange={(e) => setFilterMfg(e.target.value)}
                            className="appearance-none pl-3 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer hover:bg-slate-100 min-w-[140px]"
                        >
                            <option value="all">모든 제조사</option>
                            {manufacturerOptions.map(m => (
                                <option key={m} value={m}>{m}</option>
                            ))}
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    {/* Region Select (Buttons) */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/50 rounded-lg border border-slate-200/60">
                        {TOOTH_REGIONS.map(r => {
                            const active = filterRegion === r.id;
                            // Simplify label for button: '상악 (Maxilla...)' -> '상악'
                            // or just keep full label? '전체 치아 (All)' is long.
                            // User wants buttons, likely for quick clicking.
                            // Let's shorten labels for better UX:
                            let label: string = r.label;
                            if (r.id === 'all') label = '전체';
                            else if (r.id === 'maxilla') label = '상악';
                            else if (r.id === 'mandible') label = '하악';
                            else if (r.id === 'anterior') label = '전치부';
                            else if (r.id === 'posterior') label = '구치부';

                            return (
                                <button
                                    key={r.id}
                                    onClick={() => setFilterRegion(r.id)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all duration-200 ${active
                                            ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-200'
                                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                        }`}
                                >
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Stat Summary */}
                <div className="text-xs font-medium text-slate-500">
                    분석 대상: <span className="text-indigo-600 font-bold">{filteredRows.length.toLocaleString()}</span> 케이스
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
                <ChartErrorBoundary>
                    <ClinicalHeatmap matrix={clinicalStats.matrix} mounted={mounted} />
                </ChartErrorBoundary>
                <ChartErrorBoundary>
                    <FailureRateChart stats={clinicalStats.densityStats} mounted={mounted} />
                </ChartErrorBoundary>
            </div>
        </div>
    );
}
