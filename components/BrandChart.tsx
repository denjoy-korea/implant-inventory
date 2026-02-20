
import React, { useState, useMemo, useEffect } from 'react';
import { ExcelSheet } from '../types';

interface BrandChartProps {
  data: ExcelSheet;
  /** ManufacturerToggle에서 활성화된 제조사 목록 (App.tsx에서 관리) */
  enabledManufacturers: string[];
  onToggleBrand: (manufacturer: string, brand: string, targetUnused: boolean) => void;
  onToggleAllBrands: (manufacturer: string, targetUnused: boolean) => void;
}

const BrandChart: React.FC<BrandChartProps> = ({ data, enabledManufacturers, onToggleBrand, onToggleAllBrands }) => {
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);

  const brandStats = useMemo(() => {
    const stats: Record<string, { active: number; total: number; manufacturer: string; brandName: string }> = {};
    data.rows.forEach(row => {
      // ManufacturerToggle과 동일하게 '기타'로 통일
      const m = String(row['제조사'] || '기타');
      const b = String(row['브랜드'] || '기타');
      const key = `${m}\x00${b}`;
      if (!stats[key]) stats[key] = { active: 0, total: 0, manufacturer: m, brandName: b };
      stats[key].total++;
      if (row['사용안함'] !== true) stats[key].active++;
    });
    return stats;
  }, [data.rows]);

  // 탭에 표시할 제조사 — App.tsx에서 전달받은 enabledManufacturers 기준
  // (ManufacturerToggle에서 해제한 것만 제거됨, BrandChart 전체해제로는 사라지지 않음)
  const tabManufacturers = useMemo(() => {
    const enabledSet = new Set(enabledManufacturers);
    // brandStats에 실제 데이터가 존재하는 제조사만 필터 (수술중FAIL_, 보험청구 제외)
    const dataManufacturers = new Set<string>();
    Object.values(brandStats).forEach(v => {
      if (!v.manufacturer.startsWith('수술중FAIL_') && v.manufacturer !== '보험청구') {
        dataManufacturers.add(v.manufacturer);
      }
    });
    return enabledManufacturers.filter(m => dataManufacturers.has(m)).sort();
  }, [enabledManufacturers, brandStats]);

  // 기본 탭 선택 — 현재 선택이 유효하면 유지, 아니면 첫 번째
  useEffect(() => {
    if (tabManufacturers.length === 0) {
      setSelectedManufacturer(null);
      return;
    }
    setSelectedManufacturer(prev =>
      prev && tabManufacturers.includes(prev) ? prev : tabManufacturers[0]
    );
  }, [tabManufacturers.join(',')]);

  // 선택된 제조사의 브랜드 목록 (수술중FAIL_, 보험청구 제외)
  const brands = useMemo(() => {
    return Object.values(brandStats)
      .filter(v =>
        v.manufacturer === selectedManufacturer &&
        !v.manufacturer.startsWith('수술중FAIL_') &&
        v.manufacturer !== '보험청구'
      )
      .sort((a, b) => a.brandName.localeCompare(b.brandName, 'ko'));
  }, [brandStats, selectedManufacturer]);

  const totalActiveGlobal = useMemo(() => data.rows.filter(r => r['사용안함'] !== true).length, [data.rows]);
  const billableActiveCount = useMemo(() => data.rows.filter(r => {
    if (r['사용안함'] === true) return false;
    const m = String(r['제조사'] || '');
    return !m.startsWith('수술중FAIL_') && m !== '보험청구';
  }).length, [data.rows]);

  // 선택된 제조사 브랜드들의 전체/일부 활성 상태 — IIFE 제거, useMemo로 추출
  const brandSelectionState = useMemo(() => {
    if (selectedManufacturer === null || brands.length === 0) {
      return { allActive: false, anyActive: false };
    }
    const allActive = brands.every(v => (brandStats[`${v.manufacturer}\x00${v.brandName}`]?.active ?? 0) > 0);
    const anyActive = brands.some(v => (brandStats[`${v.manufacturer}\x00${v.brandName}`]?.active ?? 0) > 0);
    return { allActive, anyActive };
  }, [brands, brandStats, selectedManufacturer]);

  const handleBrandClick = (manufacturer: string, brandName: string) => {
    const key = `${manufacturer}\x00${brandName}`;
    const isCurrentlyActive = (brandStats[key]?.active ?? 0) > 0;
    onToggleBrand(manufacturer, brandName, isCurrentlyActive);
  };

  if (tabManufacturers.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm mb-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between mb-5 border-b border-slate-50 pb-4 gap-4">
        <div className="flex-1">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            브랜드별 사용 설정
          </h3>
          {/* 제조사 단일 선택 탭 — enabledManufacturers 기준 */}
          <div className="flex flex-wrap gap-2 mt-3">
            {tabManufacturers.map(m => {
              const isSelected = selectedManufacturer === m;
              // 해당 제조사에 active 브랜드가 하나라도 있는지 (dot 색상용)
              const hasActiveBrand = Object.values(brandStats).some(
                v => v.manufacturer === m && v.active > 0
              );
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setSelectedManufacturer(m)}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                    isSelected ? 'bg-indigo-300' : hasActiveBrand ? 'bg-indigo-400' : 'bg-slate-300'
                  }`} />
                  {m}
                </button>
              );
            })}
          </div>
        </div>
        <div className="text-right flex items-end gap-4 shrink-0">
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

      {/* 브랜드 버튼 — 제조사 선택 시에만 표시 */}
      {selectedManufacturer !== null && brands.length > 0 ? (
        <div className="space-y-3">
          {/* 전체 선택/해제 버튼 — IIFE 제거, brandSelectionState 사용 */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onToggleAllBrands(selectedManufacturer, true)}
              disabled={!brandSelectionState.anyActive}
              title={!brandSelectionState.anyActive ? '모든 브랜드가 이미 해제되어 있습니다' : '선택된 모든 브랜드를 해제합니다'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-150 ${
                brandSelectionState.anyActive
                  ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600'
                  : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              전체 해제
            </button>
            <button
              type="button"
              onClick={() => onToggleAllBrands(selectedManufacturer, false)}
              disabled={brandSelectionState.allActive}
              title={brandSelectionState.allActive ? '모든 브랜드가 이미 선택되어 있습니다' : '모든 브랜드를 선택합니다'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all duration-150 ${
                !brandSelectionState.allActive
                  ? 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600'
                  : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'
              }`}
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
              전체 선택
            </button>
            <span className="text-[10px] text-slate-400 font-medium ml-1">
              {brands.filter(v => (brandStats[`${v.manufacturer}\x00${v.brandName}`]?.active ?? 0) > 0).length}/{brands.length} 사용 중
            </span>
          </div>

          {/* 브랜드 그리드 — flex-wrap으로 버튼 너비 자동 맞춤 */}
          <div className="flex flex-wrap gap-2">
            {brands.map(v => {
              const key = `${v.manufacturer}\x00${v.brandName}`;
              const isActive = (brandStats[key]?.active ?? 0) > 0;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleBrandClick(v.manufacturer, v.brandName)}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm hover:bg-indigo-700 hover:border-indigo-700'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600'
                  }`}
                >
                  <span className={`w-4 h-4 rounded flex-shrink-0 border flex items-center justify-center transition-all ${
                    isActive
                      ? 'bg-white/25 border-white/50'
                      : 'bg-slate-100 border-slate-300'
                  }`}>
                    {isActive && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </span>
                  <span className="whitespace-nowrap">{v.brandName}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : selectedManufacturer !== null ? (
        <div className="py-10 text-center text-slate-400 text-sm italic">
          해당하는 브랜드가 없습니다.
        </div>
      ) : null}
    </div>
  );
};

export default BrandChart;
