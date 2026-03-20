import React from 'react';
import { LowStockEntry, displayMfr } from '../../hooks/useOrderManagerData';
import type { PlanType } from '../../types';

interface Props {
  groupedLowStock: [string, LowStockEntry[]][];
  orderedLowStockGroups: [string, number][];
  lowStockCount: number;
  lowStockQty: number;
  isReadOnly?: boolean;
  plan?: PlanType;
  setBrandOrderModalMfr: (mfr: string) => void;
}

export function OrderLowStockSection({
  groupedLowStock,
  orderedLowStockGroups,
  lowStockCount,
  lowStockQty,
  isReadOnly,
  setBrandOrderModalMfr,
}: Props) {
  if (groupedLowStock.length === 0 && orderedLowStockGroups.length === 0) return null;

  return (
    <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 sm:px-7 pt-5 sm:pt-6 pb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <h3 className="text-base font-black text-slate-800 tracking-tight">발주 권장 품목</h3>
          <span className="text-xs font-black text-rose-500 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-lg">{lowStockCount}종 · {lowStockQty}개 부족</span>
        </div>
        <p className="hidden sm:block text-xs text-slate-400 mt-1.5 ml-5">재고가 권장 수량보다 부족한 품목입니다. 제조사에 발주를 진행하세요.</p>
      </div>
      <div className="px-5 sm:px-7 pb-5 sm:pb-6">
        <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
          {groupedLowStock.map(([mfr, entries]) => {
            const totalDeficit = entries.reduce((s, e) => s + e.remainingDeficit, 0);
            return (
              <button
                key={mfr}
                onClick={() => { if (!isReadOnly) setBrandOrderModalMfr(mfr); }}
                disabled={isReadOnly}
                className="flex flex-col gap-0.5 bg-rose-50 border border-rose-100 rounded-2xl px-3 py-2.5 text-left active:scale-[0.97] transition-transform sm:p-4 sm:border-2 sm:border-rose-200 sm:bg-gradient-to-br sm:from-rose-50/80 sm:to-pink-50/40 sm:hover:shadow-md sm:hover:border-rose-400 sm:active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="text-[11px] font-black text-slate-700 truncate w-full sm:text-xs">{displayMfr(mfr)}</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-xl font-black text-rose-600 tabular-nums leading-none sm:text-2xl">{entries.length}</span>
                  <span className="text-[10px] font-bold text-slate-400 sm:text-xs">종</span>
                </div>
                <span className="text-[10px] font-bold text-rose-400">{totalDeficit}개 부족</span>
              </button>
            );
          })}
          {orderedLowStockGroups.map(([mfr, count]) => (
            <div
              key={`ordered-${mfr}`}
              className="flex flex-col gap-0.5 bg-emerald-50 border border-emerald-100 rounded-2xl px-3 py-2.5 text-left opacity-75 sm:p-4 sm:border-2 sm:border-emerald-200 sm:bg-gradient-to-br sm:from-emerald-50/80 sm:to-teal-50/40"
            >
              <span className="text-[11px] font-black text-slate-600 truncate w-full sm:text-xs">{mfr}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl font-black text-emerald-600 tabular-nums leading-none sm:text-2xl">{count}</span>
                <span className="text-[10px] font-bold text-slate-400 sm:text-xs">종</span>
              </div>
              <span className="text-[10px] font-bold text-emerald-500">발주 진행중</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
