
import React, { useState, useMemo } from 'react';
import { ExcelSheet } from '../types';

interface BrandChartProps {
  data: ExcelSheet;
  onToggleBrand: (manufacturer: string, brand: string, targetUnused: boolean) => void;
}

const ITEMS_PER_PAGE = 8;
type FilterType = 'all' | 'active' | 'unused';

const BrandChart: React.FC<BrandChartProps> = ({ data, onToggleBrand }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<FilterType>('active');

  const brandStats = useMemo(() => {
    const stats: Record<string, { total: number; active: number; manufacturer: string; brandName: string }> = {};
    data.rows.forEach(row => {
      const m = String(row['제조사'] || 'Unknown');
      const b = String(row['브랜드'] || 'Unknown');
      const key = `${m} ${b}`;
      if (!stats[key]) {
        stats[key] = { total: 0, active: 0, manufacturer: m, brandName: b };
      }
      stats[key].total++;
      if (row['사용안함'] !== true) {
        stats[key].active++;
      }
    });
    return stats;
  }, [data.rows]);

  const totalActiveGlobal = useMemo(() => {
    return data.rows.filter(row => row['사용안함'] !== true).length;
  }, [data.rows]);

  const billableActiveCount = useMemo(() => {
    return data.rows.filter(row => {
      if (row['사용안함'] === true) return false;
      const m = String(row['제조사'] || '');
      return !m.startsWith('수술중FAIL_') && m !== '보험청구';
    }).length;
  }, [data.rows]);

  const filteredBrands = useMemo(() => {
    const entries = Object.entries(brandStats) as [string, { total: number; active: number; manufacturer: string; brandName: string }][];
    
    // Fix: Explicitly cast stats in the filter to handle 'unknown' type issues
    const filtered = entries.filter(([, stats]) => {
      const s = stats as { active: number };
      if (filter === 'active') return s.active > 0;
      if (filter === 'unused') return s.active === 0;
      return true;
    });

    return filtered.sort(([, a], [, b]) => b.active - a.active);
  }, [brandStats, filter]);

  const totalPages = Math.ceil(filteredBrands.length / ITEMS_PER_PAGE);
  const paginatedBrands = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBrands.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBrands, currentPage]);

  const counts = useMemo(() => {
    const entries = Object.values(brandStats) as { active: number }[];
    return {
      all: entries.length,
      active: entries.filter(s => s.active > 0).length,
      unused: entries.filter(s => s.active === 0).length
    };
  }, [brandStats]);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 border-b border-slate-50 pb-4 gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            브랜드별 사용 설정
          </h3>
          
          <div className="inline-flex p-1 bg-slate-100 rounded-lg mt-3">
            <button
              onClick={() => handleFilterChange('active')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${filter === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              사용 {counts.active}
            </button>
            <button
              onClick={() => handleFilterChange('unused')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${filter === 'unused' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              미사용 {counts.unused}
            </button>
            <button
              onClick={() => handleFilterChange('all')}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              전체 {counts.all}
            </button>
          </div>
        </div>
        <div className="text-right flex items-end gap-4">
          <div>
            <div className="text-2xl font-black text-emerald-600 leading-none">{billableActiveCount}</div>
            <div className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">등록 품목</div>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-600 leading-none">{totalActiveGlobal}</div>
            <div className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">사용 중인 총 품목</div>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-6">
        {paginatedBrands.length > 0 ? (
          paginatedBrands.map(([key, stats]) => {
            const isActive = stats.active > 0;
            return (
              <div key={key} className="group py-2 border-b border-slate-50 last:border-0 md:[&:nth-last-child(-n+2)]:border-0">
                <div className="flex justify-between items-center text-xs mb-3">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-400 leading-tight">{stats.manufacturer}</span>
                      <span className="font-bold text-slate-800 text-sm leading-tight">{stats.brandName}</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <div 
                        onClick={() => onToggleBrand(stats.manufacturer, stats.brandName, isActive)}
                        className={`relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 ${isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-6' : 'left-1'}`}></div>
                      </div>
                      <span className={`text-[11px] font-bold tracking-tight ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                        {isActive ? '사용' : '미사용'}
                      </span>
                    </div>
                  </div>
                  
                  <span className="text-[11px] font-bold text-slate-400 tabular-nums">
                    <span className={isActive ? 'text-indigo-600' : ''}>{stats.active}</span> / {stats.total}
                  </span>
                </div>
                <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                  <div 
                    className={`h-full transition-all duration-700 ${isActive ? 'bg-gradient-to-r from-indigo-400 to-indigo-600' : 'bg-slate-200'}`} 
                    style={{ width: `${(stats.active / stats.total) * 100}%` }}
                  ></div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400 text-sm italic">
            해당하는 브랜드가 없습니다.
          </div>
        )}
      </div>
      
      {totalPages > 1 && (
        <div className="mt-8 pt-4 border-t border-slate-50 flex justify-center items-center gap-8">
          <button 
            disabled={currentPage === 1} 
            onClick={() => setCurrentPage(p => p - 1)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors uppercase"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            이전
          </button>
          <span className="text-[11px] font-black text-slate-700 tracking-tighter bg-slate-100 px-4 py-1.5 rounded-full">PAGE {currentPage} OF {totalPages}</span>
          <button 
            disabled={currentPage === totalPages} 
            onClick={() => setCurrentPage(p => p + 1)}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-indigo-600 disabled:opacity-30 transition-colors uppercase"
          >
            다음
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default BrandChart;
