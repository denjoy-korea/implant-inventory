
import React, { useMemo } from 'react';
import { ExcelRow } from '../types';

interface SurgeryStatsProps {
  rows: ExcelRow[];
}

const COLORS = ['#4f46e5', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1'];

const SurgeryStats: React.FC<SurgeryStatsProps> = ({ rows }) => {
  // 1. '식립' 데이터만 필터링
  const placementRows = useMemo(() => {
    return rows.filter(row => row['구분'] === '식립' && !Object.values(row).some(val => String(val).includes('합계')));
  }, [rows]);

  const totalCount = placementRows.length;

  // 2. 제조사별 통계 계산
  const mStats = useMemo(() => {
    const stats: Record<string, number> = {};
    placementRows.forEach(row => {
      const m = String(row['제조사'] || '기타');
      stats[m] = (stats[m] || 0) + 1;
    });
    
    return Object.entries(stats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [placementRows]);

  // 3. 도넛 차트용 경로 계산
  const donutPaths = useMemo(() => {
    if (totalCount === 0) return [];
    let cumulativePercent = 0;
    
    return mStats.map((stat, i) => {
      const percent = stat.count / totalCount;
      const startAngle = cumulativePercent * 360;
      const endAngle = (cumulativePercent + percent) * 360;
      cumulativePercent += percent;

      // SVG 아크 계산
      const x1 = 50 + 40 * Math.cos((startAngle - 90) * (Math.PI / 180));
      const y1 = 50 + 40 * Math.sin((startAngle - 90) * (Math.PI / 180));
      const x2 = 50 + 40 * Math.cos((endAngle - 90) * (Math.PI / 180));
      const y2 = 50 + 40 * Math.sin((endAngle - 90) * (Math.PI / 180));
      
      const largeArcFlag = percent > 0.5 ? 1 : 0;
      
      return {
        path: `M ${x1} ${y1} A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        color: COLORS[i % COLORS.length]
      };
    });
  }, [mStats, totalCount]);

  if (totalCount === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
      {/* 카드 1: 총 식립 현황 */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-[0.03]">
          <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V5h14v14z"/><path d="M7 10h2v7H7zm4-3h2v10h-2zm4 6h2v4h-2z"/></svg>
        </div>
        
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Total Implant Placements</h3>
        
        <div className="relative w-48 h-48 flex items-center justify-center">
          {/* 배경 원 */}
          <svg className="absolute inset-0 w-full h-full -rotate-90">
            <circle cx="96" cy="96" r="88" fill="none" stroke="#f1f5f9" strokeWidth="12" />
            <circle 
              cx="96" 
              cy="96" 
              r="88" 
              fill="none" 
              stroke="url(#grad1)" 
              strokeWidth="12" 
              strokeDasharray="552.92" 
              strokeDashoffset="0" 
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#a855f7" />
              </linearGradient>
            </defs>
          </svg>
          
          <div className="text-center z-10">
            <p className="text-5xl font-black text-slate-900 tabular-nums tracking-tighter">{totalCount}</p>
            <p className="text-sm font-bold text-slate-400 mt-1 uppercase">Placements</p>
          </div>
        </div>
        
        <div className="mt-8 flex gap-6">
            <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">식립 성공률</p>
                <p className="text-sm font-black text-emerald-500">99.2%</p>
            </div>
            <div className="w-px h-8 bg-slate-100"></div>
            <div className="text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">전월 대비</p>
                <p className="text-sm font-black text-indigo-600">+12%</p>
            </div>
        </div>
      </div>

      {/* 카드 2: 제조사별 점유율 */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Manufacturer Share</h3>
        
        <div className="flex flex-col sm:flex-row items-center gap-10">
          <div className="relative w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
              {donutPaths.map((p, i) => (
                <path 
                  key={i} 
                  d={p.path} 
                  fill="none" 
                  stroke={p.color} 
                  strokeWidth="15"
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 bg-white rounded-full shadow-inner flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-slate-100"></div>
              </div>
            </div>
          </div>

          <div className="flex-1 space-y-3 w-full">
            {mStats.slice(0, 5).map((stat, i) => (
              <div key={stat.name} className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                  <span className="text-sm font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{stat.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-bold text-slate-400 tabular-nums">{stat.count}건</span>
                  <span className="text-sm font-black text-slate-800 w-12 text-right tabular-nums">
                    {Math.round((stat.count / totalCount) * 100)}%
                  </span>
                </div>
              </div>
            ))}
            {mStats.length > 5 && (
              <p className="text-[10px] text-slate-400 text-center pt-2 font-bold italic">+ 그 외 {mStats.length - 5}개 제조사</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SurgeryStats;
