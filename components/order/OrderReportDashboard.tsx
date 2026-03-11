import React from 'react';
import { PlanType } from '../../types/plan';
import type { Order } from '../../types';
import { UnifiedRow } from '../../hooks/useOrderManager';
import { displayMfr } from '../../hooks/useOrderManagerData';
import OrderMobileQrPanel from './OrderMobileQrPanel';

const ORDER_URL = `${window.location.origin}/#/dashboard/orders`;

interface Stats {
  lowStockCount: number;
  lowStockQty: number;
  pendingRepCount: number;
  pendingRepQty: number;
  excRetCount: number;
  receivedCount: number;
  totalCount: number;
}

interface KpiData {
  pendingRepCount: number;
  pendingRepQty: number;
  pendingExcRetCount: number;
  lowStockQty: number;
}

interface Props {
  stats: Stats;
  kpiData: KpiData;
  groupedLowStock: [string, any[]][];
  unifiedRows: UnifiedRow[];
  plan?: PlanType;
  isReadOnly?: boolean;
  setShowBulkOrderModal: (v: boolean) => void;
  setBrandOrderModalMfr: (mfr: string | null) => void;
  setFilterType: (type: Order['type'] | 'all' | 'fail_and_return') => void;
  setShowHistoryPanel: (v: boolean) => void;
}

// ── 상태 뱃지 ────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const config: Record<string, { label: string; cls: string }> = {
    ordered:   { label: '발주중',   cls: 'bg-amber-100 text-amber-700' },
    received:  { label: '입고완료', cls: 'bg-emerald-100 text-emerald-700' },
    cancelled: { label: '취소됨',   cls: 'bg-slate-100 text-slate-500' },
    mixed:     { label: '혼합',     cls: 'bg-indigo-100 text-indigo-600' },
    requested: { label: '반품신청', cls: 'bg-orange-100 text-orange-600' },
    picked_up: { label: '수거중',   cls: 'bg-blue-100 text-blue-600' },
    completed: { label: '완료',     cls: 'bg-emerald-100 text-emerald-700' },
  };
  const c = config[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${c.cls}`}>
      {c.label}
    </span>
  );
};

// ── 유형 라벨 ────────────────────────────────────────────────────
const typeLabel = (type: string) => {
  const map: Record<string, string> = {
    replenishment: '발주',
    fail_exchange: '교환',
    return:        '반품',
  };
  return map[type] ?? type;
};

const OrderReportDashboard: React.FC<Props> = ({
  stats,
  kpiData,
  groupedLowStock,
  unifiedRows,
  isReadOnly: _isReadOnly,
  setShowBulkOrderModal,
  setBrandOrderModalMfr,
  setFilterType,
  setShowHistoryPanel,
}) => {
  const recentRows = unifiedRows.slice(0, 10);

  const colorMap = {
    rose:    { card: 'border-rose-200 bg-rose-50/60',     val: 'text-rose-600',    sub: 'text-rose-400' },
    amber:   { card: 'border-amber-200 bg-amber-50/60',   val: 'text-amber-600',   sub: 'text-amber-400' },
    yellow:  { card: 'border-yellow-200 bg-yellow-50/60', val: 'text-yellow-600',  sub: 'text-yellow-500' },
    emerald: { card: 'border-emerald-200 bg-emerald-50/60', val: 'text-emerald-700', sub: 'text-emerald-500' },
    slate:   { card: 'border-slate-200 bg-slate-50',      val: 'text-slate-700',   sub: 'text-slate-400' },
  } as const;

  // ── KPI strip 아이템 ─────────────────────────────────────────
  const kpiItems: {
    label: string;
    value: number;
    sub: string;
    color: keyof typeof colorMap;
    onClick: () => void;
  }[] = [
    {
      label: '긴급 부족 품목',
      value: stats.lowStockCount,
      sub: `${stats.lowStockQty}개 부족`,
      color: stats.lowStockCount > 0 ? 'rose' : 'slate',
      onClick: () => setShowBulkOrderModal(true),
    },
    {
      label: '진행 중 발주',
      value: stats.pendingRepCount,
      sub: `미입고 ${kpiData.pendingRepQty}개`,
      color: stats.pendingRepCount > 0 ? 'amber' : 'slate',
      onClick: () => setFilterType('replenishment'),
    },
    {
      label: '교환/반품 대기',
      value: stats.excRetCount,
      sub: stats.excRetCount > 0 ? '빠른 조치 필요' : '대기 중인 건 없음',
      color: stats.excRetCount > 0 ? 'yellow' : 'slate',
      onClick: () => setFilterType('fail_and_return'),
    },
    {
      label: '입고 완료',
      value: stats.receivedCount,
      sub: '전체 입고 완료 건',
      color: 'emerald',
      onClick: () => setShowHistoryPanel(true),
    },
  ];

  return (
    <div className="flex flex-col gap-5 pb-10">

      {/* ── 상단 2컬럼: QR 패널 + 긴급 부족 개요 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* QR 패널 */}
        <OrderMobileQrPanel orderUrl={ORDER_URL} />

        {/* 긴급 부족 개요 */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
          <div>
            <p className="text-sm font-black text-slate-900">발주 현황 요약</p>
            <p className="text-[11px] text-slate-400 mt-0.5">현재 재고 부족 및 진행 중인 주문 현황입니다.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-1">
            <div className="rounded-xl bg-rose-50 border border-rose-100 px-3 py-2.5">
              <p className="text-[10px] font-bold text-rose-500 mb-1">긴급 부족 품목</p>
              <p className="text-2xl font-black tabular-nums text-rose-600 leading-none">{stats.lowStockCount}</p>
              <p className="text-[10px] text-rose-400 font-semibold mt-1">총 {stats.lowStockQty}개 부족</p>
            </div>
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2.5">
              <p className="text-[10px] font-bold text-amber-600 mb-1">진행 중 발주</p>
              <p className="text-2xl font-black tabular-nums text-amber-600 leading-none">{stats.pendingRepCount}</p>
              <p className="text-[10px] text-amber-400 font-semibold mt-1">미입고 {kpiData.pendingRepQty}개</p>
            </div>
            <div className="rounded-xl bg-yellow-50 border border-yellow-100 px-3 py-2.5">
              <p className="text-[10px] font-bold text-yellow-600 mb-1">교환/반품 대기</p>
              <p className="text-2xl font-black tabular-nums text-yellow-600 leading-none">{stats.excRetCount}</p>
              <p className="text-[10px] text-yellow-500 font-semibold mt-1">{stats.excRetCount > 0 ? '빠른 조치 필요' : '없음'}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-100 px-3 py-2.5">
              <p className="text-[10px] font-bold text-emerald-600 mb-1">입고 완료</p>
              <p className="text-2xl font-black tabular-nums text-emerald-700 leading-none">{stats.receivedCount}</p>
              <p className="text-[10px] text-emerald-500 font-semibold mt-1">총 {stats.totalCount}건 중</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {kpiItems.map((item) => {
          const c = colorMap[item.color];
          return (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`text-left rounded-2xl border px-4 py-4 shadow-sm transition-all hover:opacity-80 active:scale-[0.98] ${c.card}`}
            >
              <p className="text-[11px] font-bold text-slate-500 mb-1">{item.label}</p>
              <p className={`text-2xl font-black tabular-nums leading-none ${c.val}`}>{item.value}</p>
              <p className={`text-[10px] font-semibold mt-1.5 ${c.sub}`}>{item.sub}</p>
            </button>
          );
        })}
      </div>

      {/* ── 발주 권장 품목 섹션 ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">발주 권장 품목</p>
            <p className="text-[11px] text-slate-400 mt-0.5">재고 부족으로 발주가 필요한 제조사별 목록입니다.</p>
          </div>
          {groupedLowStock.length > 0 && (
            <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2.5 py-1 rounded-full">
              {groupedLowStock.length}개 제조사
            </span>
          )}
        </div>

        {groupedLowStock.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-700">발주 필요 품목 없음</p>
            <p className="text-[11px] text-slate-400">모든 재고가 적정 수준을 유지하고 있습니다.</p>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {groupedLowStock.map(([mfr, entries]) => {
              const totalDeficit = entries.reduce(
                (acc: number, e: any) => acc + (e.remainingDeficit ?? 0),
                0
              );
              return (
                <button
                  key={mfr}
                  onClick={() => setBrandOrderModalMfr(mfr)}
                  className="text-left bg-rose-50/60 border border-rose-100 hover:border-rose-300 hover:bg-rose-50 rounded-xl px-4 py-3.5 transition-all active:scale-[0.98] group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-black text-slate-800 truncate group-hover:text-rose-700 transition-colors">
                        {displayMfr(mfr)}
                      </p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{entries.length}개 품목</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-black text-rose-600 tabular-nums">−{totalDeficit}개</p>
                      <p className="text-[9px] text-rose-400 font-semibold">부족 수량</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center gap-1 text-[10px] font-bold text-indigo-500 group-hover:text-indigo-700 transition-colors">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    발주 신청 →
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 최근 주문 내역 ── */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-sm font-black text-slate-900">최근 주문 내역</p>
            <p className="text-[11px] text-slate-400 mt-0.5">최근 발주 및 반품 신청 내역입니다.</p>
          </div>
          <button
            onClick={() => setShowHistoryPanel(true)}
            className="text-[11px] font-bold text-indigo-500 hover:text-indigo-700 transition-colors"
          >
            히스토리 →
          </button>
        </div>

        {recentRows.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm font-bold text-slate-500">주문 내역이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">날짜</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">유형</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">제조사</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">주문자</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">수량</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentRows.map((row, idx) => {
                  if (row.kind === 'order') {
                    const g = row.data;
                    return (
                      <tr key={g.id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-600 tabular-nums">{g.date}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-600">
                            {typeLabel(g.type)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-700 truncate max-w-[120px]">{displayMfr(g.manufacturer)}</td>
                        <td className="px-4 py-2.5 text-slate-500 truncate max-w-[100px]">
                          {g.managers.length > 0 ? g.managers[0] : '—'}
                          {g.confirmers.length > 0 && (
                            <span className="ml-1 text-[9px] text-emerald-500 font-bold">
                              수령:{g.confirmers[0]}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums">{g.totalQuantity}개</td>
                        <td className="px-4 py-2.5 text-center">
                          <StatusBadge status={g.overallStatus} />
                        </td>
                      </tr>
                    );
                  } else {
                    const g = row.data;
                    return (
                      <tr key={g.id ?? idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-slate-600 tabular-nums">{g.date}</td>
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600">
                            반품신청
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-medium text-slate-700 truncate max-w-[120px]">{displayMfr(g.manufacturer)}</td>
                        <td className="px-4 py-2.5 text-slate-500 truncate max-w-[100px]">
                          {g.managers.length > 0 ? g.managers[0] : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-bold text-slate-700 tabular-nums">{g.totalQty}개</td>
                        <td className="px-4 py-2.5 text-center">
                          <StatusBadge status={g.overallStatus} />
                        </td>
                      </tr>
                    );
                  }
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderReportDashboard;
