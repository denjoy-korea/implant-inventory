import React, { useMemo } from 'react';
import { ExcelSheet } from '../types';

interface ManufacturerToggleProps {
    sheet: ExcelSheet;
    onToggle: (manufacturer: string, isActive: boolean) => void;
}

const ManufacturerToggle: React.FC<ManufacturerToggleProps> = ({ sheet, onToggle }) => {
    const manufacturerStats = useMemo(() => {
        const stats: Record<string, { active: number; total: number }> = {};
        if (!sheet) return stats;
        sheet.rows.forEach(r => {
            const m = String(r['제조사'] || '기타'); // '기타': BrandChart와 통일
            if (!stats[m]) stats[m] = { active: 0, total: 0 };
            stats[m].total++;
            if (r['사용안함'] !== true) stats[m].active++;
        });
        return stats;
    }, [sheet]);

    const manufacturers = useMemo(() => {
        return Object.keys(manufacturerStats).sort();
    }, [manufacturerStats]);

    if (manufacturers.length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="border-b border-slate-50 pb-3">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011-1v5m-4 0h4" /></svg>
                    제조사별 일괄 처리
                </h3>
            </div>
            <div className="flex flex-wrap gap-2">
                {manufacturers.map(m => {
                    const stats = manufacturerStats[m];
                    const isActive = stats.active > 0;
                    return (
                        <button
                            key={m}
                            type="button"
                            onClick={() => onToggle(m, isActive)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                                isActive
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:border-indigo-700'
                                    : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                            }`}
                        >
                            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isActive ? 'bg-indigo-300' : 'bg-slate-300'}`} />
                            {m}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ManufacturerToggle;
