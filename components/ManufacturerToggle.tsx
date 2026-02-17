import React, { useState, useMemo } from 'react';
import { ExcelSheet } from '../types';

interface ManufacturerToggleProps {
    sheet: ExcelSheet;
    onToggle: (manufacturer: string, isActive: boolean) => void;
}

type FilterType = 'all' | 'active' | 'unused';

const ManufacturerToggle: React.FC<ManufacturerToggleProps> = ({ sheet, onToggle }) => {
    const [mFilter, setMFilter] = useState<FilterType>('active');

    const manufacturerStats = useMemo(() => {
        const stats: Record<string, { active: number; total: number }> = {};
        if (!sheet) return stats;
        sheet.rows.forEach(r => {
            const m = String(r['제조사'] || '기타');
            if (!stats[m]) stats[m] = { active: 0, total: 0 };
            stats[m].total++;
            if (r['사용안함'] !== true) stats[m].active++;
        });
        return stats;
    }, [sheet]);

    const filteredManufacturers = useMemo(() => {
        const list = Object.keys(manufacturerStats).sort();
        return list.filter(m => {
            const stats = manufacturerStats[m];
            if (mFilter === 'active') return stats.active > 0;
            if (mFilter === 'unused') return stats.active === 0;
            return true;
        });
    }, [manufacturerStats, mFilter]);

    const mCounts = useMemo(() => {
        const values: Array<{ active: number; total: number }> = Object.values(manufacturerStats);
        return {
            all: values.length,
            active: values.filter(v => v.active > 0).length,
            unused: values.filter(v => v.active === 0).length
        };
    }, [manufacturerStats]);

    if (Object.keys(manufacturerStats).length === 0) return null;

    return (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-3 gap-3">
                <div className="flex flex-col gap-2">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011-1v5m-4 0h4" /></svg>
                        제조사별 일괄 처리
                    </h3>
                    <div className="inline-flex p-1 bg-slate-100 rounded-lg w-fit">
                        <button onClick={() => setMFilter('active')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${mFilter === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>사용 {mCounts.active}</button>
                        <button onClick={() => setMFilter('unused')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${mFilter === 'unused' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>미사용 {mCounts.unused}</button>
                        <button onClick={() => setMFilter('all')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${mFilter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>전체 {mCounts.all}</button>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {filteredManufacturers.map(m => {
                    const stats = manufacturerStats[m];
                    const isActive = stats.active > 0;
                    return (
                        <div key={m} className="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-3 px-4 min-h-[64px]">
                            <span className="text-xs font-bold text-slate-800 truncate pr-2">{m}</span>
                            <div className="flex items-center gap-3 border-l border-slate-50 pl-3">
                                <div onClick={() => onToggle(m, isActive)} className={`relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 flex-shrink-0 ${isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-6' : 'left-1'}`}></div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ManufacturerToggle;
