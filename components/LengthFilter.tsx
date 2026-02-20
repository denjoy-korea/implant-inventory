import React, { useMemo } from 'react';
import { ExcelSheet } from '../types';
import { extractLengthFromSize } from '../services/sizeUtils';
import { MIN_FIXTURE_LENGTH } from '../constants';

interface LengthFilterProps {
  sheet: ExcelSheet;
  onToggleLength: (normalizedLength: string, setUnused: boolean) => void;
}

/** 길이값 정규화: 선행 0 제거, 불필요한 .0 제거 */
export const normalizeLength = (raw: string): string => {
  const num = parseFloat(raw);
  if (isNaN(num)) return '';
  return num % 1 === 0 ? String(Math.round(num)) : String(num);
};

const LengthFilter: React.FC<LengthFilterProps> = ({ sheet, onToggleLength }) => {
  // 활성 제조사+브랜드 조합 판별
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
      if (!normalized || parseFloat(normalized) < MIN_FIXTURE_LENGTH) return;
      if (!stats[normalized]) stats[normalized] = { active: 0, total: 0 };
      stats[normalized].total++;
      if (r['사용안함'] !== true) stats[normalized].active++;
    });
    return stats;
  }, [sheet, activeCombos]);

  const sortedLengths = useMemo(() => {
    return Object.keys(lengthStats).sort((a, b) => parseFloat(a) - parseFloat(b));
  }, [lengthStats]);

  if (sortedLengths.length === 0) return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
        <span className="font-bold">픽스쳐 길이별 필터</span>
        <span className="text-xs ml-2">— 활성 품목에서 길이 정보를 찾을 수 없습니다.</span>
      </div>
    </div>
  );

  const activeCount = sortedLengths.filter(l => lengthStats[l].active > 0).length;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-50 pb-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
          <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /></svg>
          픽스쳐 길이별 필터
        </h3>
        <div>
          <div className="text-2xl font-black text-indigo-600 leading-none text-right">{activeCount}</div>
          <div className="text-[10px] text-slate-400 font-bold tracking-widest mt-1">사용 중인 길이</div>
        </div>
      </div>

      {/* 길이 버튼 그리드 */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(90px,1fr))] gap-2">
        {sortedLengths.map(length => {
          const s = lengthStats[length];
          const isActive = s.active > 0;
          return (
            <button
              key={length}
              type="button"
              onClick={() => onToggleLength(length, isActive)}
              className={`flex items-center justify-start gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:border-indigo-700'
                  : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
              }`}
            >
              <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all ${
                isActive ? 'bg-white/25 border-white/50' : 'bg-slate-100 border-slate-300'
              }`}>
                {isActive && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className="whitespace-nowrap">{length}mm</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default LengthFilter;
