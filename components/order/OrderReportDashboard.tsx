import React, { useState } from 'react';
import { PlanType } from '../../types/plan';
import type { Order } from '../../types';
import { UnifiedRow, GroupedOrder, GroupedReturnRequest } from '../../hooks/useOrderManager';
import { displayMfr } from '../../hooks/useOrderManagerData';
import OrderMobileQrPanel from './OrderMobileQrPanel';
import { RETURN_REASON_LABELS } from '../../types/return';

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
  onCompleteReturn?: (returnId: string, actualQties?: Record<string, number>) => Promise<void>;
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

// ── 상세보기 모달 ─────────────────────────────────────────────────
const OrderDetailModal: React.FC<{
  row: UnifiedRow;
  onClose: () => void;
  onCompleteReturn?: (group: GroupedReturnRequest, approvedTotal: number) => Promise<void>;
}> = ({ row, onClose, onCompleteReturn }) => {
  const isOrder = row.kind === 'order';
  const g = row.data as (GroupedOrder & GroupedReturnRequest);

  const totalRequested = !isOrder
    ? (g as GroupedReturnRequest).requests.flatMap(r => r.items).reduce((s, i) => s + i.quantity, 0)
    : 0;
  const [approvedCount, setApprovedCount] = useState(totalRequested);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const typeLabelFull = (type: string) => {
    const map: Record<string, string> = {
      replenishment: '발주',
      fail_exchange: '교환',
      return: '반품',
    };
    return map[type] ?? type;
  };

  const statusLabel = (status: string) => {
    const map: Record<string, { label: string; cls: string }> = {
      ordered:   { label: '발주중',   cls: 'bg-amber-100 text-amber-700' },
      received:  { label: '입고완료', cls: 'bg-emerald-100 text-emerald-700' },
      cancelled: { label: '취소됨',   cls: 'bg-slate-100 text-slate-500' },
      mixed:     { label: '혼합',     cls: 'bg-indigo-100 text-indigo-600' },
      requested: { label: '반품신청', cls: 'bg-orange-100 text-orange-600' },
      picked_up: { label: '수거중',   cls: 'bg-blue-100 text-blue-600' },
      completed: { label: '완료',     cls: 'bg-emerald-100 text-emerald-700' },
      rejected:  { label: '거절',     cls: 'bg-red-100 text-red-600' },
    };
    const c = map[status] ?? { label: status, cls: 'bg-slate-100 text-slate-500' };
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${c.cls}`}>{c.label}</span>;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15,23,42,0.45)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black ${
              isOrder ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
            }`}>
              {isOrder ? '발' : '반'}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900">
                {isOrder
                  ? `${typeLabelFull((g as GroupedOrder).type)} 상세`
                  : '반품신청 상세'}
              </p>
              <p className="text-[11px] text-slate-400">{g.date} · {displayMfr(g.manufacturer)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 메타 정보 */}
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 grid grid-cols-2 gap-x-6 gap-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-semibold">상태</span>
            <span>{statusLabel(g.overallStatus)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400 font-semibold">주문자</span>
            <span className="text-slate-700 font-semibold">
              {g.managers.length > 0 ? g.managers.join(', ') : '—'}
            </span>
          </div>
          {isOrder && (g as GroupedOrder).confirmers.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-semibold">수령자</span>
              <span className="text-emerald-600 font-semibold">{(g as GroupedOrder).confirmers.join(', ')}</span>
            </div>
          )}
          {!isOrder && (g as GroupedReturnRequest).requests[0]?.reason && (
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="text-slate-400 font-semibold">반품사유</span>
              <span className="text-slate-700 font-semibold">
                {RETURN_REASON_LABELS[(g as GroupedReturnRequest).requests[0].reason]}
              </span>
            </div>
          )}
        </div>

        {/* 품목 테이블 */}
        <div className="overflow-y-auto flex-1 min-h-0">
          {isOrder ? (
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">브랜드</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">사이즈</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">수량</th>
                  <th className="text-center px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(g as GroupedOrder).orders.flatMap((order) =>
                  order.items.map((item, itemIdx) => (
                    <tr key={`${order.id}-${itemIdx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{item.brand}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.size}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800 tabular-nums">{item.quantity}개</td>
                      <td className="px-4 py-2.5 text-center">{statusLabel(order.status)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <>
            {/* 완료된 경우 인정/불인정 요약 표시 */}
            {(() => {
              const rg = g as GroupedReturnRequest;
              const totalReq = rg.requests.flatMap(r => r.items).reduce((s, i) => s + i.quantity, 0);
              const totalApproved = rg.requests.flatMap(r => r.items).reduce((s, i) => s + (i.actualReceivedQty ?? 0), 0);
              const hasResult = rg.overallStatus === 'completed' && rg.requests.flatMap(r => r.items).some(i => i.actualReceivedQty != null);
              if (!hasResult) return null;
              const rejected = totalReq - totalApproved;
              const rate = totalReq > 0 ? Math.round((totalApproved / totalReq) * 100) : 0;
              return (
                <div className="mx-4 mt-3 mb-1 rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">반품 처리 결과</p>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-[10px] text-slate-400 font-semibold">신청</p>
                      <p className="text-lg font-black text-slate-700 tabular-nums">{totalReq}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-emerald-500 font-semibold">인정</p>
                      <p className="text-lg font-black text-emerald-600 tabular-nums">{totalApproved}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] text-rose-400 font-semibold">불인정</p>
                      <p className="text-lg font-black text-rose-500 tabular-nums">{rejected}</p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex h-2 rounded-full overflow-hidden bg-rose-100">
                      <div className="bg-emerald-400" style={{ width: `${rate}%` }} />
                    </div>
                    <div className="flex justify-between text-[10px] font-semibold">
                      <span className="text-emerald-600">인정 {rate}%</span>
                      <span className="text-rose-400">불인정 {100 - rate}%</span>
                    </div>
                  </div>
                </div>
              );
            })()}
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white z-10">
                <tr className="border-b border-slate-100">
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">브랜드</th>
                  <th className="text-left px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">사이즈</th>
                  <th className="text-right px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">수량</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {(g as GroupedReturnRequest).requests.flatMap((req) =>
                  req.items.map((item, itemIdx) => (
                    <tr key={`${req.id}-${itemIdx}`} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 font-semibold text-slate-700">{item.brand}</td>
                      <td className="px-4 py-2.5 text-slate-500">{item.size}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-800 tabular-nums">{item.quantity}개</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </>
          )}
        </div>

        {/* 메모 (있을 경우) */}
        {isOrder && (g as GroupedOrder).orders.some(o => o.memo) && (
          <div className="px-5 py-3 border-t border-slate-100 shrink-0">
            {(g as GroupedOrder).orders.filter(o => o.memo).map(o => (
              <p key={o.id} className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-400">메모: </span>{o.memo}
              </p>
            ))}
          </div>
        )}
        {!isOrder && (g as GroupedReturnRequest).requests.some(r => r.memo) && (
          <div className="px-5 py-3 border-t border-slate-100 shrink-0">
            {(g as GroupedReturnRequest).requests.filter(r => r.memo).map(r => (
              <p key={r.id} className="text-[11px] text-slate-500">
                <span className="font-bold text-slate-400">메모: </span>{r.memo}
              </p>
            ))}
          </div>
        )}

        {/* 수거 후 처리 섹션 (picked_up 상태의 반품만) */}
        {!isOrder && (g as GroupedReturnRequest).overallStatus === 'picked_up' && onCompleteReturn && (
          <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/60 shrink-0">
            <p className="text-[11px] font-black text-slate-500 mb-2.5">수거 후 처리</p>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600 shrink-0">인정 수량</span>
              <span className="text-[10px] text-slate-400 shrink-0">/ {totalRequested}개</span>
              <div className="flex-1" />
              <div className="flex items-center gap-1 bg-white rounded-lg border border-emerald-300 px-1.5 py-1">
                <button
                  onClick={() => setApprovedCount(c => Math.max(0, c - 1))}
                  disabled={isSubmitting || approvedCount <= 0}
                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold disabled:opacity-30 text-sm"
                >−</button>
                <input
                  type="number"
                  min={0}
                  max={totalRequested}
                  value={approvedCount}
                  onChange={e => {
                    const v = parseInt(e.target.value, 10);
                    setApprovedCount(Math.min(totalRequested, Math.max(0, isNaN(v) ? 0 : v)));
                  }}
                  disabled={isSubmitting}
                  className="w-10 text-center text-sm font-black text-emerald-700 tabular-nums bg-transparent outline-none"
                />
                <button
                  onClick={() => setApprovedCount(c => Math.min(totalRequested, c + 1))}
                  disabled={isSubmitting || approvedCount >= totalRequested}
                  className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-slate-700 font-bold disabled:opacity-30 text-sm"
                >+</button>
              </div>
              <button
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await onCompleteReturn(g as GroupedReturnRequest, approvedCount);
                    onClose();
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                disabled={isSubmitting}
                className="px-3 py-1.5 rounded-lg text-xs font-bold bg-teal-500 hover:bg-teal-600 text-white transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {isSubmitting
                  ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  : '완료'
                }
              </button>
            </div>
            {/* 인정/불인정 요약 */}
            <div className="flex items-center justify-between mt-2 text-[10px] font-semibold text-slate-400">
              <span className="text-emerald-500">인정 {approvedCount}개</span>
              <span>불인정 {totalRequested - approvedCount}개 (손실)</span>
            </div>
          </div>
        )}

        {/* 푸터 */}
        <div className="px-5 py-3.5 border-t border-slate-100 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
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
  onCompleteReturn,
}) => {
  const recentRows = unifiedRows.slice(0, 10);
  const [detailRow, setDetailRow] = useState<UnifiedRow | null>(null);

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
                  <th className="text-center px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-wider">상세</th>
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
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => setDetailRow(row)}
                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                          >
                            상세보기
                          </button>
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
                        <td className="px-4 py-2.5 text-center">
                          <button
                            onClick={() => setDetailRow(row)}
                            className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 hover:underline transition-colors"
                          >
                            상세보기
                          </button>
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

      {/* ── 상세보기 모달 ── */}
      {detailRow && (
        <OrderDetailModal
          key={detailRow.kind === 'order' ? detailRow.data.id : detailRow.data.id}
          row={detailRow}
          onClose={() => setDetailRow(null)}
          onCompleteReturn={onCompleteReturn ? async (group, approvedTotal) => {
            const allItems = group.requests.flatMap(r => r.items);
            const totalReq = allItems.reduce((s, i) => s + i.quantity, 0);
            const ratio = totalReq > 0 ? approvedTotal / totalReq : 0;
            let remaining = approvedTotal;
            const qtyMap: Record<string, number> = {};
            allItems.forEach((item, idx) => {
              if (idx === allItems.length - 1) {
                qtyMap[item.id] = Math.max(0, remaining);
              } else {
                const qty = Math.min(item.quantity, Math.floor(item.quantity * ratio));
                qtyMap[item.id] = qty;
                remaining -= qty;
              }
            });
            for (const req of group.requests) {
              const reqQties: Record<string, number> = {};
              for (const item of req.items) {
                reqQties[item.id] = qtyMap[item.id] ?? 0;
              }
              await onCompleteReturn(req.id, reqQties);
            }
          } : undefined}
        />
      )}
    </div>
  );
};

export default OrderReportDashboard;
