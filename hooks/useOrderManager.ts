
import React, { useMemo, useState, useEffect } from 'react';
import {
  Order, OrderStatus, InventoryItem, ReturnRequest, ReturnStatus,
  ReturnMutationResult, ExcelRow, CreateReturnParams,
  RETURN_STATUS_LABELS,
} from '../types';
import type { ReturnCategory } from '../components/order/ReturnCandidateModal';
import { useCountUp } from '../components/surgery-dashboard/shared';
import { useOrderManagerData, simpleNormalize, buildOrderItemKey } from './useOrderManagerData';
import { isIbsImplantManufacturer } from '../services/sizeNormalizer';

// ── 그룹 타입 정의 ─────────────────────────────────────────────────
export interface GroupedOrder {
  id: string;
  date: string;
  manufacturer: string;
  type: Order['type'];
  orders: Order[];
  totalItems: number;
  totalQuantity: number;
  managers: string[];
  confirmers: string[];
  statuses: OrderStatus[];
  overallStatus: OrderStatus | 'mixed';
}

export interface GroupedReturnRequest {
  id: string;
  date: string;
  manufacturer: string;
  requests: ReturnRequest[];
  totalItems: number;
  totalQty: number;
  managers: string[];
  confirmers: string[];
  overallStatus: ReturnStatus | 'mixed';
}

export type UnifiedRow =
  | { kind: 'order'; data: GroupedOrder }
  | { kind: 'return'; data: GroupedReturnRequest };

// ── 교환 반품 대상 타입 ────────────────────────────────────────────
export interface ExchangeReturnTarget {
  manufacturer: string;
  count: number;
  groups: { brand: string; size: string; maxQty: number }[];
}

// ── 훅 파라미터 ───────────────────────────────────────────────────
interface UseOrderManagerParams {
  orders: Order[];
  inventory: InventoryItem[];
  surgeryMaster: Record<string, ExcelRow[]>;
  currentUserName: string;
  isReadOnly?: boolean;
  returnRequests: ReturnRequest[];
  showAlertToast: (message: string, type: 'success' | 'error' | 'info') => void;
  onCreateReturn: (params: CreateReturnParams) => Promise<void>;
  onCompleteReturn: (returnId: string, actualQties?: Record<string, number>) => Promise<ReturnMutationResult>;
  onUpdateReturnStatus: (
    returnId: string,
    status: ReturnStatus,
    currentStatus: ReturnStatus
  ) => Promise<ReturnMutationResult>;
  onQuickOrder: (item: InventoryItem, quantity?: number) => void;
}

// ─────────────────────────────────────────────────────────────────
export function useOrderManager({
  orders,
  inventory,
  surgeryMaster,
  currentUserName,
  isReadOnly,
  returnRequests,
  showAlertToast,
  onCreateReturn,
  onCompleteReturn,
  onUpdateReturnStatus,
  onQuickOrder,
}: UseOrderManagerParams) {

  // ── 뷰포트 감지 ──
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const syncViewport = () => setIsMobileViewport(mediaQuery.matches);
    syncViewport();
    mediaQuery.addEventListener('change', syncViewport);
    return () => mediaQuery.removeEventListener('change', syncViewport);
  }, []);

  // ── 필터 state ──
  const [filterType, setFilterType] = useState<Order['type'] | 'all' | 'fail_and_return'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');

  // ── 취소 모달 state ──
  const [cancelModalOrder, setCancelModalOrder] = useState<Order[] | null>(null);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  // ── 일괄 주문 모달 state ──
  const [showBulkOrderModal, setShowBulkOrderModal] = useState(false);

  // ── 모바일 인라인 발주 state ──
  const [unselectedLowStockKeys, setUnselectedLowStockKeys] = useState<Set<string>>(new Set());
  const [isMobileBulkOrdering, setIsMobileBulkOrdering] = useState(false);

  // ── 상세 입고 확인 모달 state ──
  const [selectedGroupModal, setSelectedGroupModal] = useState<GroupedOrder | null>(null);
  const [isReceiptConfirming, setIsReceiptConfirming] = useState(false);

  // ── 주문 히스토리 패널 state ──
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);

  // ── 반품 신청 모달 state ──
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [isCreatingReturn, setIsCreatingReturn] = useState(false);
  const [returnActionLoadingId, setReturnActionLoadingId] = useState<string | null>(null);

  // ── 발주 권장 품목 UI state ──
  const [expandedMfrs, setExpandedMfrs] = useState<Set<string>>(new Set());
  const [brandOrderModalMfr, setBrandOrderModalMfr] = useState<string | null>(null);

  // ── 반품 권장 모달 state ──
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showReturnCandidateModal, setShowReturnCandidateModal] = useState(false);
  const [returnCandidateCategory, setReturnCandidateCategory] = useState<ReturnCategory>('overstock');
  const [showBulkReturnConfirm, setShowBulkReturnConfirm] = useState(false);
  const [isBulkReturning, setIsBulkReturning] = useState(false);

  // ── 교환 권장 품목 반품 처리 모달 state ──
  const [exchangeReturnTarget, setExchangeReturnTarget] = useState<ExchangeReturnTarget | null>(null);
  const [exchangeItemQuantities, setExchangeItemQuantities] = useState<Record<string, number>>({});
  const [isExchangeReturnSubmitting, setIsExchangeReturnSubmitting] = useState(false);

  // ── useOrderManagerData 결과 ────────────────────────────────────
  const {
    pendingQtyByItemKey,
    lowStockItems,
    returnCandidates,
    bulkReturnItems,
    deadStockItems,
    exchangeCandidates,
    kpiData,
    monthlyOrderData,
    manufacturerDonut,
    donutPaths,
    groupedLowStock,
    orderedLowStockGroups,
    manufacturerOptions,
  } = useOrderManagerData({ orders, inventory, surgeryMaster, returnRequests });

  // ── 필터링된 주문 목록 ─────────────────────────────────────────
  const filteredOrders = useMemo(() => {
    return orders
      .filter(order => {
        if (order.status !== 'ordered') return false;
        const typeMatch =
          filterType === 'all' ||
          (filterType === 'fail_and_return'
            ? order.type === 'fail_exchange' || order.type === 'return'
            : order.type === filterType);
        const dateFromMatch = !filterDateFrom || order.date >= filterDateFrom;
        const dateToMatch = !filterDateTo || order.date <= filterDateTo;
        const mfrMatch = filterManufacturer === 'all' || order.manufacturer === filterManufacturer;
        return typeMatch && dateFromMatch && dateToMatch && mfrMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [orders, filterType, filterDateFrom, filterDateTo, filterManufacturer]);

  // ── 발주 그룹핑 ────────────────────────────────────────────────
  const groupedOrders = useMemo<GroupedOrder[]>(() => {
    const groups: Record<string, GroupedOrder> = {};
    filteredOrders.forEach(order => {
      const key = `${order.date}|${simpleNormalize(order.manufacturer)}|${order.type}`;
      if (!groups[key]) {
        groups[key] = {
          id: key,
          date: order.date,
          manufacturer: order.manufacturer,
          type: order.type,
          orders: [],
          totalItems: 0,
          totalQuantity: 0,
          managers: [],
          confirmers: [],
          statuses: [],
          overallStatus: 'ordered' as OrderStatus | 'mixed',
        };
      }
      const g = groups[key];
      g.orders.push(order);
      g.totalItems += order.items.length;
      g.totalQuantity += order.items.reduce((sum, i) => sum + i.quantity, 0);
      if (!g.managers.includes(order.manager)) g.managers.push(order.manager);
      if (
        order.confirmedBy &&
        order.confirmedBy !== order.manager &&
        !g.confirmers.includes(order.confirmedBy)
      ) {
        g.confirmers.push(order.confirmedBy);
      }
      if (!g.statuses.includes(order.status)) g.statuses.push(order.status);
    });

    return Object.values(groups)
      .map(g => {
        let overallStatus: GroupedOrder['overallStatus'] = 'mixed';
        if (g.statuses.length === 1) {
          overallStatus = g.statuses[0];
        } else if (!g.statuses.includes('ordered') && !g.statuses.includes('received')) {
          overallStatus = 'cancelled';
        } else if (!g.statuses.includes('ordered')) {
          overallStatus = 'received';
        } else if (g.statuses.includes('ordered') && g.statuses.includes('received')) {
          overallStatus = 'mixed';
        } else {
          overallStatus = 'ordered';
        }
        return { ...g, overallStatus };
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [filteredOrders]);

  // ── 반품 신청 그룹핑 ───────────────────────────────────────────
  const groupedReturnRequests = useMemo<GroupedReturnRequest[]>(() => {
    const map = new Map<string, GroupedReturnRequest>();
    const sourceRequests = returnRequests.filter(
      r => r.status === 'requested' || r.status === 'picked_up'
    );
    sourceRequests.forEach(r => {
      const key = `${r.requestedDate}|${simpleNormalize(r.manufacturer)}`;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          date: r.requestedDate,
          manufacturer: r.manufacturer,
          requests: [],
          totalItems: 0,
          totalQty: 0,
          managers: [],
          confirmers: [],
          overallStatus: r.status,
        });
      }
      const g = map.get(key)!;
      g.requests.push(r);
      g.totalItems += r.items.length;
      g.totalQty += r.items.reduce((s, i) => s + i.quantity, 0);
      if (!g.managers.includes(r.manager)) g.managers.push(r.manager);
      if (
        r.confirmedBy &&
        r.confirmedBy !== r.manager &&
        !g.confirmers.includes(r.confirmedBy)
      ) {
        g.confirmers.push(r.confirmedBy);
      }
    });
    for (const g of map.values()) {
      const statuses = new Set(g.requests.map(r => r.status));
      g.overallStatus = statuses.size === 1 ? g.requests[0].status : 'mixed';
    }
    return Array.from(map.values());
  }, [returnRequests]);

  // ── 통합 행 목록 (발주 + 반품신청) ────────────────────────────
  const unifiedRows = useMemo<UnifiedRow[]>(() => {
    const rows: UnifiedRow[] = [
      ...groupedOrders.map(g => ({ kind: 'order' as const, data: g })),
      ...groupedReturnRequests.map(g => ({ kind: 'return' as const, data: g })),
    ];
    return rows.sort((a, b) => b.data.date.localeCompare(a.data.date));
  }, [groupedOrders, groupedReturnRequests]);

  // ── 통계 ───────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalOrders = orders.filter(o =>
      filterType === 'all' ||
      (filterType === 'fail_and_return'
        ? o.type === 'fail_exchange' || o.type === 'return'
        : o.type === filterType)
    );
    const pendingOrders = totalOrders.filter(o => o.status === 'ordered');
    const receivedOrders = totalOrders.filter(o => o.status === 'received');
    const sumQty = (list: Order[]) =>
      list.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const lowStockDeficit = lowStockItems.reduce((acc, e) => acc + e.remainingDeficit, 0);
    return {
      totalCount: totalOrders.length,
      totalQty: sumQty(totalOrders),
      pendingCount: pendingOrders.length,
      pendingQty: sumQty(pendingOrders),
      receivedCount: receivedOrders.length,
      receivedQty: sumQty(receivedOrders),
      lowStockCount: lowStockItems.length,
      lowStockQty: lowStockDeficit,
    };
  }, [orders, lowStockItems, filterType]);

  // ── 탭별 카운트 ────────────────────────────────────────────────
  const typeCounts = useMemo(
    () => ({
      all: orders.length,
      replenishment: orders.filter(o => o.type === 'replenishment').length,
      fail_exchange: orders.filter(o => o.type === 'fail_exchange').length,
      return: orders.filter(o => o.type === 'return').length,
    }),
    [orders]
  );

  // ── 교환 반품 총 수량 ──────────────────────────────────────────
  const exchangeTotalQty = useMemo(() => {
    if (!exchangeReturnTarget) return 0;
    return exchangeReturnTarget.groups.reduce(
      (s, g) => s + (exchangeItemQuantities[`${g.brand}|${g.size}`] ?? g.maxQty),
      0
    );
  }, [exchangeReturnTarget, exchangeItemQuantities]);

  // ── 첫 제조사 자동 펼침 ────────────────────────────────────────
  React.useEffect(() => {
    if (expandedMfrs.size === 0 && groupedLowStock.length > 0) {
      setExpandedMfrs(new Set([groupedLowStock[0][0]]));
    }
  }, [groupedLowStock.length]);

  // ── 카운트업 애니메이션 ────────────────────────────────────────
  const animPendingRep = useCountUp(kpiData.pendingRepCount);
  const animExcRet = useCountUp(kpiData.pendingExcRetCount);
  const animLowStock = useCountUp(kpiData.lowStockCount);
  const animTotal = useCountUp(stats.totalCount);

  // ── 핸들러: 반품 신청 생성 ────────────────────────────────────
  const handleReturnCreate = async (params: CreateReturnParams) => {
    setIsCreatingReturn(true);
    try {
      await onCreateReturn(params);
      setShowReturnModal(false);
      showAlertToast('반품 신청이 등록되었습니다.', 'success');
    } catch {
      showAlertToast('반품 신청에 실패했습니다.', 'error');
    } finally {
      setIsCreatingReturn(false);
    }
  };

  // ── 핸들러: 반품 상태 변경 ────────────────────────────────────
  const handleReturnUpdateStatus = async (
    returnId: string,
    newStatus: ReturnStatus,
    currentStatus: ReturnStatus
  ) => {
    setReturnActionLoadingId(returnId);
    try {
      if (newStatus === 'completed') {
        const result = await onCompleteReturn(returnId);
        if (result.ok) showAlertToast('반품 완료 처리되었습니다.', 'success');
        else
          showAlertToast(
            result.reason === 'conflict'
              ? '상태가 변경되어 반영할 수 없습니다.'
              : '처리 중 오류가 발생했습니다.',
            'error'
          );
      } else {
        const result = await onUpdateReturnStatus(returnId, newStatus, currentStatus);
        if (result.ok)
          showAlertToast(
            `상태가 "${RETURN_STATUS_LABELS[newStatus]}"(으)로 변경되었습니다.`,
            'success'
          );
        else
          showAlertToast(
            result.reason === 'conflict'
              ? '상태가 변경되어 반영할 수 없습니다.'
              : '처리 중 오류가 발생했습니다.',
            'error'
          );
      }
    } finally {
      setReturnActionLoadingId(null);
    }
  };

  // ── 핸들러: 반품 완료 (실수령 수량 포함) ─────────────────────
  const handleReturnCompleteWithQties = async (
    returnId: string,
    actualQties: Record<string, number>
  ) => {
    setReturnActionLoadingId(returnId);
    try {
      const result = await onCompleteReturn(returnId, actualQties);
      if (result.ok) showAlertToast('반품 완료 처리되었습니다.', 'success');
      else
        showAlertToast(
          result.reason === 'conflict'
            ? '상태가 변경되어 반영할 수 없습니다.'
            : '처리 중 오류가 발생했습니다.',
          'error'
        );
      return result;
    } finally {
      setReturnActionLoadingId(null);
    }
  };

  // ── 핸들러: 일괄 반품 ─────────────────────────────────────────
  const handleBulkReturn = async () => {
    setIsBulkReturning(true);
    const byMfr: Record<string, typeof bulkReturnItems[0][]> = {};
    for (const item of bulkReturnItems) {
      const mfr = item.manufacturer || '기타';
      if (!byMfr[mfr]) byMfr[mfr] = [];
      byMfr[mfr].push(item);
    }
    try {
      await Promise.all(
        Object.entries(byMfr).map(([mfr, items]) => {
          const totalQty = items.reduce((s, i) => s + i.returnQty, 0);
          return onCreateReturn({
            manufacturer: mfr,
            reason: 'excess_stock',
            manager: currentUserName || '일괄반품',
            memo: `일괄 반품 (${items.length}개 품목, 총 ${totalQty}개)`,
            items: items.map(i => ({ brand: i.brand, size: i.size, quantity: i.returnQty })),
          });
        })
      );
      showAlertToast(`일괄 반품 등록 완료: ${bulkReturnItems.length}개 품목`, 'success');
    } catch {
      showAlertToast('일괄 반품 등록 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsBulkReturning(false);
      setShowBulkReturnConfirm(false);
    }
  };

  // ── 핸들러: 모바일 인라인 일괄 발주 ──────────────────────────
  const handleMobileBulkOrder = async () => {
    const selected = lowStockItems.filter(
      e => !unselectedLowStockKeys.has(buildOrderItemKey(e.item.manufacturer, e.item.brand, e.item.size))
    );
    if (selected.length === 0) return;
    setIsMobileBulkOrdering(true);
    try {
      await Promise.all(selected.map(entry => onQuickOrder(entry.item)));
      showAlertToast(`${selected.length}품목 발주 완료`, 'success');
      setUnselectedLowStockKeys(new Set());
    } catch {
      showAlertToast('일부 발주 처리에 실패했습니다.', 'error');
    } finally {
      setIsMobileBulkOrdering(false);
    }
  };

  // ── 핸들러: 교환 카드 클릭 → 교환반품 모달 열기 ─────────────
  const handleExchangeCandidateClick = (manufacturer: string, actualCount: number) => {
    if (isReadOnly || actualCount === 0) return;
    const rows = (surgeryMaster['수술기록지'] || []).filter(row => {
      if (row['구분'] !== '수술중교환') return false;
      const raw = String(row['제조사'] || '기타');
      const mfr = isIbsImplantManufacturer(raw) ? 'IBS Implant' : raw;
      return mfr === manufacturer;
    });
    const groupMap: Record<string, { brand: string; size: string; maxQty: number }> = {};
    rows.forEach(row => {
      const brand = String(row['브랜드'] || manufacturer);
      const size = String(row['규격(SIZE)'] || row['규격'] || '기타');
      const key = `${brand}|${size}`;
      if (!groupMap[key]) groupMap[key] = { brand, size, maxQty: 0 };
      groupMap[key].maxQty++;
    });
    const groups = Object.values(groupMap).sort(
      (a, b) => a.brand.localeCompare(b.brand) || a.size.localeCompare(b.size)
    );
    const initQtys: Record<string, number> = {};
    groups.forEach(g => { initQtys[`${g.brand}|${g.size}`] = g.maxQty; });
    setExchangeReturnTarget({ manufacturer, count: actualCount, groups });
    setExchangeItemQuantities(initQtys);
  };

  // ── 핸들러: 교환 수량 조정 ────────────────────────────────────
  const adjustExchangeQty = (key: string, delta: number, maxQty: number) => {
    setExchangeItemQuantities(prev => {
      const cur = prev[key] ?? maxQty;
      return { ...prev, [key]: Math.min(maxQty, Math.max(0, cur + delta)) };
    });
  };

  // ── 핸들러: 교환 반품 제출 ────────────────────────────────────
  const handleExchangeReturnSubmit = async () => {
    if (!exchangeReturnTarget || exchangeTotalQty === 0) return;
    setIsExchangeReturnSubmitting(true);
    try {
      const { manufacturer, groups } = exchangeReturnTarget;
      const items = groups
        .map(g => ({
          brand: g.brand,
          size: g.size,
          quantity: exchangeItemQuantities[`${g.brand}|${g.size}`] ?? g.maxQty,
        }))
        .filter(it => it.quantity > 0);
      await onCreateReturn({
        manufacturer,
        reason: 'exchange',
        manager: currentUserName,
        memo: `교환 반품 ${exchangeTotalQty}개`,
        items,
      });
      setExchangeReturnTarget(null);
      showAlertToast('반품 처리 완료. 전자장부에서 주문금액 변동을 확인하세요.', 'success');
    } catch {
      showAlertToast('반품 처리에 실패했습니다.', 'error');
    } finally {
      setIsExchangeReturnSubmitting(false);
    }
  };

  return {
    // 뷰포트
    isMobileViewport,
    // 필터 state
    filterType, setFilterType,
    filterDateFrom, setFilterDateFrom,
    filterDateTo, setFilterDateTo,
    filterManufacturer, setFilterManufacturer,
    // 취소 모달
    cancelModalOrder, setCancelModalOrder,
    isCancelLoading, setIsCancelLoading,
    // 일괄 주문 모달
    showBulkOrderModal, setShowBulkOrderModal,
    // 모바일 인라인 발주
    unselectedLowStockKeys, setUnselectedLowStockKeys,
    isMobileBulkOrdering,
    // 입고 확인 모달
    selectedGroupModal, setSelectedGroupModal,
    isReceiptConfirming, setIsReceiptConfirming,
    // 히스토리 패널
    showHistoryPanel, setShowHistoryPanel,
    // 반품 신청 모달
    showReturnModal, setShowReturnModal,
    isCreatingReturn,
    returnActionLoadingId,
    // 발주 권장 UI
    expandedMfrs, setExpandedMfrs,
    brandOrderModalMfr, setBrandOrderModalMfr,
    // 반품 권장 모달
    showOptimizeModal, setShowOptimizeModal,
    showReturnCandidateModal, setShowReturnCandidateModal,
    returnCandidateCategory, setReturnCandidateCategory,
    showBulkReturnConfirm, setShowBulkReturnConfirm,
    isBulkReturning,
    // 교환 반품 모달
    exchangeReturnTarget, setExchangeReturnTarget,
    exchangeItemQuantities,
    isExchangeReturnSubmitting,
    exchangeTotalQty,
    // useOrderManagerData 결과
    pendingQtyByItemKey,
    lowStockItems,
    returnCandidates,
    bulkReturnItems,
    deadStockItems,
    exchangeCandidates,
    kpiData,
    monthlyOrderData,
    manufacturerDonut,
    donutPaths,
    groupedLowStock,
    orderedLowStockGroups,
    manufacturerOptions,
    // 파생 데이터
    filteredOrders,
    groupedOrders,
    groupedReturnRequests,
    unifiedRows,
    stats,
    typeCounts,
    // 애니메이션
    animPendingRep,
    animExcRet,
    animLowStock,
    animTotal,
    // 핸들러
    handleReturnCreate,
    handleReturnUpdateStatus,
    handleReturnCompleteWithQties,
    handleBulkReturn,
    handleMobileBulkOrder,
    handleExchangeCandidateClick,
    adjustExchangeQty,
    handleExchangeReturnSubmit,
  };
}
