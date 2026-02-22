import React, { useEffect, useRef } from 'react';
import { InventoryItem } from '../../types';
import {
  InventoryDetailColumnKey,
  InventoryDetailColumnVisibility,
} from './inventoryTypes';
import { INVENTORY_DETAIL_COLUMNS } from './inventoryDashboardConfig';

interface InventoryDetailSectionProps {
  inventoryDetailRows: InventoryItem[];
  monthFactor: number;
  isReadOnly?: boolean;
  onQuickOrder?: (item: InventoryItem) => void;
  showOnlyOrderNeededRows: boolean;
  onToggleShowOnlyOrderNeededRows: () => void;
  showInventoryDetailColumnFilter: boolean;
  onToggleInventoryDetailColumnFilter: () => void;
  onCloseInventoryDetailColumnFilter: () => void;
  inventoryDetailColumnVisibility: InventoryDetailColumnVisibility;
  onToggleInventoryDetailColumn: (columnKey: InventoryDetailColumnKey) => void;
  inventoryDetailUsageTotal: number;
  inventoryDetailCurrentStockTotal: number;
  inventoryDetailVisibleColumnCount: number;
}

const InventoryDetailSection: React.FC<InventoryDetailSectionProps> = ({
  inventoryDetailRows,
  monthFactor,
  isReadOnly,
  onQuickOrder,
  showOnlyOrderNeededRows,
  onToggleShowOnlyOrderNeededRows,
  showInventoryDetailColumnFilter,
  onToggleInventoryDetailColumnFilter,
  onCloseInventoryDetailColumnFilter,
  inventoryDetailColumnVisibility,
  onToggleInventoryDetailColumn,
  inventoryDetailUsageTotal,
  inventoryDetailCurrentStockTotal,
  inventoryDetailVisibleColumnCount,
}) => {
  const inventoryDetailColumnFilterRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!showInventoryDetailColumnFilter) return;

    const handleOutside = (event: MouseEvent) => {
      if (!inventoryDetailColumnFilterRef.current) return;
      if (!inventoryDetailColumnFilterRef.current.contains(event.target as Node)) {
        onCloseInventoryDetailColumnFilter();
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [showInventoryDetailColumnFilter, onCloseInventoryDetailColumnFilter]);

  return (
    <>
      {/* ================================================= */}
      {/* Deep Analysis Divider                             */}
      {/* ================================================= */}
      <div className="flex items-center gap-4 py-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Inventory Detail</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ================================================= */}
      {/* Table Card                                        */}
      {/* ================================================= */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-2">
            <div className="relative hidden md:block" ref={inventoryDetailColumnFilterRef}>
              <button
                type="button"
                onClick={onToggleInventoryDetailColumnFilter}
                aria-label="재고 상세 컬럼 필터 열기"
                title="컬럼 필터"
                className={`p-2 rounded-lg border transition-all ${showInventoryDetailColumnFilter
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              {showInventoryDetailColumnFilter && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {INVENTORY_DETAIL_COLUMNS.map((column, idx) => {
                    const isVisible = inventoryDetailColumnVisibility[column.key];
                    return (
                      <button
                        key={column.key}
                        type="button"
                        onClick={() => onToggleInventoryDetailColumn(column.key)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-50 transition-colors"
                        aria-label={`${column.label} 컬럼 ${isVisible ? '숨기기' : '보이기'}`}
                        title={isVisible ? `${column.label} 숨기기` : `${column.label} 표시`}
                      >
                        <span className="text-slate-300 px-1 shrink-0" aria-hidden="true">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="9" cy="5" r="1.5" />
                            <circle cx="15" cy="5" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" />
                            <circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="19" r="1.5" />
                            <circle cx="15" cy="19" r="1.5" />
                          </svg>
                        </span>
                        <span className="shrink-0">
                          {isVisible ? (
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          )}
                        </span>
                        <span className={`flex-1 text-left font-medium ${isVisible ? 'text-slate-700' : 'text-slate-400'}`}>{column.label}</span>
                        <span className="text-[9px] text-slate-300 tabular-nums w-4 text-right">{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={onToggleShowOnlyOrderNeededRows}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${showOnlyOrderNeededRows
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              title="권장량 대비 주문이 필요한 항목만 보기"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
              </svg>
              {showOnlyOrderNeededRows ? '전체보기' : '주문 필요'}
            </button>
          </div>
        </div>
        <div className="md:hidden px-3 pb-3 space-y-2.5">
          {inventoryDetailRows.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm font-semibold text-slate-400">
              조건에 맞는 재고 항목이 없습니다.
            </div>
          ) : (
            inventoryDetailRows.map((item) => {
              const recommended = Math.ceil((item.recommendedStock ?? 0) * monthFactor);
              const isLowStock = item.currentStock < recommended;
              const deficit = Math.max(0, recommended - item.currentStock);
              return (
                <article
                  key={`mobile-inventory-${item.id}`}
                  className={`rounded-2xl border px-3.5 py-3.5 shadow-[0_4px_12px_rgba(15,23,42,0.06)] ${
                    isLowStock ? 'border-rose-200 bg-rose-50/60' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-500 truncate">{item.manufacturer}</p>
                      <p className="text-sm font-black text-slate-800 truncate mt-0.5">{item.brand}</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5">{item.size}</p>
                    </div>
                    {isLowStock && (
                      <span className="inline-flex items-center rounded-lg bg-rose-100 px-2 py-1 text-[10px] font-black text-rose-600">
                        부족 {deficit}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                      <p className="text-[10px] font-bold text-slate-400">현재 재고</p>
                      <p className={`text-sm font-black tabular-nums ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>{item.currentStock}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                      <p className="text-[10px] font-bold text-slate-400">권장량</p>
                      <p className="text-sm font-black text-indigo-600 tabular-nums">{recommended}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                      <p className="text-[10px] font-bold text-slate-400">사용량</p>
                      <p className="text-sm font-black text-rose-500 tabular-nums">{item.usageCount > 0 ? `-${item.usageCount}` : '0'}</p>
                    </div>
                    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                      <p className="text-[10px] font-bold text-slate-400">월평균</p>
                      <p className="text-sm font-black text-slate-700 tabular-nums">{item.monthlyAvgUsage ?? 0}</p>
                    </div>
                  </div>

                  {!isReadOnly && onQuickOrder && isLowStock && (
                    <button
                      type="button"
                      onClick={() => onQuickOrder({ ...item, recommendedStock: recommended })}
                      className="mt-3 w-full min-h-11 rounded-xl bg-indigo-600 text-white text-sm font-bold active:scale-[0.98] transition-all"
                    >
                      부족분 바로 발주
                    </button>
                  )}
                </article>
              );
            })
          )}
        </div>
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 shadow-sm" style={{ top: 'var(--dashboard-header-height, 44px)' }}>
              <tr>
                {inventoryDetailColumnVisibility.manufacturer && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="h-4 mb-1" />
                    제조사
                  </th>
                )}
                {inventoryDetailColumnVisibility.brand && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="h-4 mb-1" />
                    브랜드
                  </th>
                )}
                {inventoryDetailColumnVisibility.size && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="h-4 mb-1" />
                    규격
                  </th>
                )}
                {inventoryDetailColumnVisibility.initialStock && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    기초 재고
                  </th>
                )}
                {inventoryDetailColumnVisibility.usageCount && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 text-center tracking-widest">
                    <div className="text-sm font-black text-rose-500 tabular-nums h-4 mb-1 flex items-center justify-center">{inventoryDetailUsageTotal}</div>
                    사용량
                  </th>
                )}
                {inventoryDetailColumnVisibility.monthlyAvgUsage && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-indigo-400 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    월평균사용
                  </th>
                )}
                {inventoryDetailColumnVisibility.dailyMaxUsage && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-indigo-400 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    일최대사용
                  </th>
                )}
                {inventoryDetailColumnVisibility.currentStock && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 text-center tracking-widest">
                    <div className="text-sm font-black text-slate-800 tabular-nums h-4 mb-1 flex items-center justify-center">{inventoryDetailCurrentStockTotal}</div>
                    현재 재고
                  </th>
                )}
                {inventoryDetailColumnVisibility.recommendedStock && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-indigo-600 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    권장량
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryDetailRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, inventoryDetailVisibleColumnCount)}
                    className="px-6 py-8 text-center text-sm font-semibold text-slate-400"
                  >
                    조건에 맞는 재고 항목이 없습니다.
                  </td>
                </tr>
              ) : (
                inventoryDetailRows.map((item, idx) => {
                  const recommended = Math.ceil((item.recommendedStock ?? 0) * monthFactor);
                  const isLowStock = item.currentStock < recommended;
                  const isEven = idx % 2 === 1;

                  return (
                    <tr key={item.id} className={`group transition-all duration-200 hover:bg-indigo-50/60 hover:shadow-[inset_3px_0_0_#818cf8] ${isEven ? 'bg-slate-100/70' : 'bg-white'}`}>
                      {inventoryDetailColumnVisibility.manufacturer && (
                        <td className="px-6 py-2.5 text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors">{item.manufacturer}</td>
                      )}
                      {inventoryDetailColumnVisibility.brand && (
                        <td className="px-6 py-2.5 text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-900 transition-colors">{item.brand}</td>
                      )}
                      {inventoryDetailColumnVisibility.size && (
                        <td className="px-6 py-2.5 text-sm font-semibold text-slate-600">{item.size}</td>
                      )}
                      {inventoryDetailColumnVisibility.initialStock && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-slate-700 tabular-nums">
                          {item.initialStock}
                        </td>
                      )}
                      {inventoryDetailColumnVisibility.usageCount && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-rose-500 tabular-nums">{item.usageCount > 0 ? `-${item.usageCount}` : '0'}</td>
                      )}
                      {inventoryDetailColumnVisibility.monthlyAvgUsage && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-indigo-600 tabular-nums">{item.monthlyAvgUsage ?? 0}</td>
                      )}
                      {inventoryDetailColumnVisibility.dailyMaxUsage && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-indigo-600 tabular-nums">{item.dailyMaxUsage ?? 0}</td>
                      )}
                      {inventoryDetailColumnVisibility.currentStock && (
                        <td className={`px-6 py-2.5 text-center text-sm font-black tabular-nums transition-colors ${isLowStock ? 'text-rose-600 bg-rose-50/60' : 'text-slate-900'}`}>
                          {item.currentStock}
                        </td>
                      )}
                      {inventoryDetailColumnVisibility.recommendedStock && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-indigo-600 tabular-nums">{recommended}</td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default InventoryDetailSection;
