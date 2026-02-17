import React, { useState, useMemo } from 'react';
import { ExcelSheet } from '../types';
import { extractLengthFromSize } from '../services/excelService';

interface LengthFilterProps {
  sheet: ExcelSheet;
  onToggleLength: (normalizedLength: string, setUnused: boolean) => void;
}

type FilterType = 'all' | 'active' | 'unused';

/** 길이값 정규화: 선행 0 제거, 불필요한 .0 제거 */
export const normalizeLength = (raw: string): string => {
  const num = parseFloat(raw);
  if (isNaN(num)) return '';
  // 정수면 정수로, 소수점이면 소수점 유지
  return num % 1 === 0 ? String(Math.round(num)) : String(num);
};

const MIN_LENGTH = 5; // 5mm 미만은 직경으로 판단

const LengthFilter: React.FC<LengthFilterProps> = ({ sheet, onToggleLength }) => {
  const [filter, setFilter] = useState<FilterType>('active');

  // 활성 제조사+브랜드 조합 판별 (하나라도 사용 중인 행이 있으면 활성)
  const activeCombos = useMemo(() => {
    const combos = new Set<string>();
    if (!sheet) return combos;
    sheet.rows.forEach(r => {
      if (r['사용안함'] === true) return;
      const m = String(r['제조사'] || '');
      const b = String(r['브랜드'] || '');
      combos.add(`${m}|||${b}`);
    });
    return combos;
  }, [sheet]);

  const lengthStats = useMemo(() => {
    const stats: Record<string, { active: number; total: number }> = {};
    if (!sheet) return stats;
    sheet.rows.forEach(r => {
      const m = String(r['제조사'] || '');
      const b = String(r['브랜드'] || '');
      if (!activeCombos.has(`${m}|||${b}`)) return;

      const size = String(r['규격(SIZE)'] || r['규격'] || r['사이즈'] || r['Size'] || r['size'] || '');
      const raw = extractLengthFromSize(size);
      if (!raw) return;
      const normalized = normalizeLength(raw);
      if (!normalized || parseFloat(normalized) < MIN_LENGTH) return;
      if (!stats[normalized]) stats[normalized] = { active: 0, total: 0 };
      stats[normalized].total++;
      if (r['사용안함'] !== true) stats[normalized].active++;
    });
    return stats;
  }, [sheet, activeCombos]);

  const sortedLengths = useMemo(() => {
    return Object.keys(lengthStats).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [lengthStats]);

  const filteredLengths = useMemo(() => {
    return sortedLengths.filter(l => {
      const s = lengthStats[l];
      if (filter === 'active') return s.active > 0;
      if (filter === 'unused') return s.active === 0;
      return true;
    });
  }, [sortedLengths, lengthStats, filter]);

  const counts = useMemo(() => {
    const vals: Array<{ active: number; total: number }> = Object.values(lengthStats);
    return {
      all: vals.length,
      active: vals.filter(v => v.active > 0).length,
      unused: vals.filter(v => v.active === 0).length,
    };
  }, [lengthStats]);

  if (sortedLengths.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-3 gap-3">
        <div className="flex flex-col gap-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
            픽스쳐 길이별 필터
          </h3>
          <div className="inline-flex p-1 bg-slate-100 rounded-lg w-fit">
            <button onClick={() => setFilter('active')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${filter === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>사용 {counts.active}</button>
            <button onClick={() => setFilter('unused')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${filter === 'unused' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>미사용 {counts.unused}</button>
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 text-[10px] font-bold rounded-md transition-all ${filter === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>전체 {counts.all}</button>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredLengths.map(length => {
          const s = lengthStats[length];
          const isActive = s.active > 0;
          return (
            <div
              key={length}
              className="flex items-center justify-between bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-100 transition-all p-3 px-4 min-h-[56px]"
            >
              <div className="flex flex-col pr-2">
                <span className="text-sm font-black text-slate-800">{length}mm</span>
                <span className="text-[10px] font-bold text-slate-400">{s.active}/{s.total}</span>
              </div>
              <div
                onClick={() => onToggleLength(length, isActive)}
                className={`relative w-11 h-6 rounded-full cursor-pointer transition-all duration-300 flex-shrink-0 ${isActive ? 'bg-indigo-600' : 'bg-slate-300'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${isActive ? 'left-6' : 'left-1'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default LengthFilter;
