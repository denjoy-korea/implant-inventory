
import React, { useMemo, useRef, useState, useEffect } from 'react';
import { InventoryItem, ExcelData, PlanType, PLAN_LIMITS, SurgeryUnregisteredItem } from '../types';
import { useInventoryManagerControls } from '../hooks/useInventoryManagerControls';
import { fixIbsImplant } from '../services/mappers';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { normalizeSurgery } from '../services/normalizationService';
import { smoothLine, smoothArea } from './surgery-dashboard/shared';
import AddItemModal from './AddItemModal';
import EditNoticeModal from './inventory/EditNoticeModal';
import BaseStockModal from './inventory/BaseStockModal';
import OptimizeModal from './inventory/OptimizeModal';
import UnregisteredDetailModal from './inventory/UnregisteredDetailModal';
import InventoryDetailSection from './inventory/InventoryDetailSection';
import {
  INVENTORY_DETAIL_COLUMNS,
  toMonthKey,
  USAGE_TOP_ITEMS,
} from './inventory/inventoryDashboardConfig';
interface InventoryManagerProps {
  inventory: InventoryItem[];
  onUpdateStock: (id: string, initialStock: number, nextCurrentStock?: number) => void | Promise<void>;
  onBulkUpdateStocks?: (changes: Array<{ id: string; initialStock: number; nextCurrentStock: number }>) => Promise<void>;
  onDeleteInventoryItem: (id: string) => void;
  onAddInventoryItem: (newItem: InventoryItem) => boolean | void | Promise<boolean | void>;
  onUpdateInventoryItem: (updatedItem: InventoryItem) => void;
  surgeryData?: ExcelData | null;
  onQuickOrder?: (item: InventoryItem) => void;
  isReadOnly?: boolean;
  userId?: string;
  hospitalId?: string;
  plan?: PlanType;
  unregisteredFromSurgery?: SurgeryUnregisteredItem[];
  onRefreshLatestSurgeryUsage?: () => Promise<Record<string, number> | null>;
  onResolveManualInput?: (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
  }) => Promise<{
    checked: number;
    found: number;
    applicable: number;
    alreadyFixed: number;
    updated: number;
    failed: number;
    notFound: number;
    appliedManufacturer: string;
    appliedBrand: string;
    appliedSize: string;
  }>;
  initialShowBaseStockEdit?: boolean;
  onBaseStockEditApplied?: () => void;
}

const InventoryManager: React.FC<InventoryManagerProps> = ({
  inventory,
  onUpdateStock,
  onBulkUpdateStocks,
  onDeleteInventoryItem,
  onAddInventoryItem,
  onUpdateInventoryItem,
  surgeryData,
  onQuickOrder,
  isReadOnly,
  userId,
  hospitalId,
  plan = 'free',
  unregisteredFromSurgery = [],
  onRefreshLatestSurgeryUsage,
  onResolveManualInput,
  initialShowBaseStockEdit,
  onBaseStockEditApplied,
}) => {
  const maxEdits = PLAN_LIMITS[plan].maxBaseStockEdits;
  const isUnlimited = maxEdits === Infinity;
  const {
    monthFactor,
    selectedManufacturer,
    isAddingItem,
    showEditNotice,
    showBaseStockModal,
    showUnregisteredDetailModal,
    showOptimizeModal,
    showOnlyOrderNeededRows,
    showInventoryDetailColumnFilter,
    inventoryDetailColumnVisibility,
    editCount,
    setMonthFactor,
    setSelectedManufacturer,
    setShowEditNotice,
    setShowBaseStockModal,
    setShowUnregisteredDetailModal,
    setShowOptimizeModal,
    setShowOnlyOrderNeededRows,
    setShowInventoryDetailColumnFilter,
    toggleInventoryDetailColumn,
    handleBaseStockSaved,
    openAddItemModal,
    closeAddItemModal,
  } = useInventoryManagerControls({
    hospitalId,
    isUnlimited,
  });
  const isEditExhausted = !isUnlimited && editCount >= maxEdits;

  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (initialShowBaseStockEdit && !isEditExhausted) {
      setShowEditNotice(true);
      autoOpenedRef.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 수술중FAIL_ / 보험청구 항목 제외한 실제 표시 대상 */
  const visibleInventory = useMemo(() => {
    return inventory.filter(item =>
      !item.manufacturer.startsWith('수술중FAIL_') && item.manufacturer !== '보험청구' && item.brand !== '보험임플란트'
    );
  }, [inventory]);

  /** 숨겨진 FAIL/청구 항목 수 */
  const hiddenCategoryCount = useMemo(() => {
    return inventory.length - visibleInventory.length;
  }, [inventory, visibleInventory]);

  const manufacturersList = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => { if (item.manufacturer) set.add(item.manufacturer); });
    return Array.from(set).sort();
  }, [visibleInventory]);

  const filteredInventory = useMemo(() => {
    return visibleInventory
      .filter(item => selectedManufacturer === null || item.manufacturer === selectedManufacturer)
      .sort((a, b) => {
        const mComp = a.manufacturer.localeCompare(b.manufacturer, 'ko');
        if (mComp !== 0) return mComp;
        const bComp = a.brand.localeCompare(b.brand, 'ko');
        if (bComp !== 0) return bComp;
        return a.size.localeCompare(b.size, 'ko', { numeric: true });
      });
  }, [visibleInventory, selectedManufacturer]);

  const inventoryDetailRows = useMemo(() => {
    if (!showOnlyOrderNeededRows) return filteredInventory;
    return filteredInventory.filter(item => item.currentStock < Math.ceil((item.recommendedStock ?? 0) * monthFactor));
  }, [filteredInventory, monthFactor, showOnlyOrderNeededRows]);

  const inventoryDetailVisibleColumnCount = useMemo(() => {
    return INVENTORY_DETAIL_COLUMNS.reduce((count, column) => (
      inventoryDetailColumnVisibility[column.key] ? count + 1 : count
    ), 0);
  }, [inventoryDetailColumnVisibility]);

  const inventoryDetailUsageTotal = useMemo(() => (
    inventoryDetailRows.reduce((sum, item) => sum + item.usageCount, 0)
  ), [inventoryDetailRows]);

  const inventoryDetailCurrentStockTotal = useMemo(() => (
    inventoryDetailRows.reduce((sum, item) => sum + item.currentStock, 0)
  ), [inventoryDetailRows]);

  // 사용량 차트 데이터 (TOP 7)
  const chartData = useMemo(() => {
    return [...filteredInventory]
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, USAGE_TOP_ITEMS)
      .filter(item => item.usageCount > 0);
  }, [filteredInventory]);

  const maxUsage = useMemo(() => {
    return Math.max(...chartData.map(d => d.usageCount), 1);
  }, [chartData]);

  const sparklineMonths = useMemo(() => {
    const retentionMonths = PLAN_LIMITS[plan]?.retentionMonths ?? 3;
    return Math.min(Math.max(retentionMonths, 3), 24);
  }, [plan]);

  const sparklineSeriesByItemId = useMemo(() => {
    const series = new Map<string, number[]>();
    if (!surgeryData || chartData.length === 0) return series;

    const sheet = surgeryData.sheets[surgeryData.activeSheetName];
    if (!sheet) return series;

    const rows = sheet.rows || [];

    const itemKeyToIds = new Map<string, string[]>();
    const monthlyUsageByItemId = new Map<string, Map<string, number>>();
    chartData.forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const key = `${normalizeSurgery(fixed.manufacturer)}|${normalizeSurgery(fixed.brand)}|${getSizeMatchKey(item.size, fixed.manufacturer)}`;
      const list = itemKeyToIds.get(key) ?? [];
      if (!list.includes(item.id)) list.push(item.id);
      itemKeyToIds.set(key, list);
      if (!series.has(item.id)) series.set(item.id, []);
      if (!monthlyUsageByItemId.has(item.id)) {
        monthlyUsageByItemId.set(item.id, new Map<string, number>());
      }
    });

    rows.forEach(row => {
      const isTotalRow = Object.values(row).some(val => String(val).includes('합계'));
      if (isTotalRow) return;
      const cls = String(row['구분'] || '');
      if (cls !== '식립' && cls !== '수술중 FAIL') return;
      const record = String(row['수술기록'] || '');
      if (record.includes('[GBR Only]')) return;

      const month = toMonthKey(row['날짜'] ?? row['수술일']);
      if (!month) return;

      const fixed = fixIbsImplant(
        String(row['제조사'] || '').trim(),
        String(row['브랜드'] || '').trim()
      );
      const key = `${normalizeSurgery(fixed.manufacturer)}|${normalizeSurgery(fixed.brand)}|${getSizeMatchKey(String(row['규격(SIZE)'] || '').trim(), fixed.manufacturer)}`;
      const targetIds = itemKeyToIds.get(key);
      if (!targetIds || targetIds.length === 0) return;

      const qtyValue = row['갯수'] !== undefined ? Number(row['갯수']) : 0;
      const qty = Number.isFinite(qtyValue) ? qtyValue : 0;
      if (qty <= 0) return;

      targetIds.forEach(id => {
        const monthMap = monthlyUsageByItemId.get(id);
        if (!monthMap) return;
        monthMap.set(month, (monthMap.get(month) ?? 0) + qty);
      });
    });

    // 각 품목별로 "값이 있는 첫 달 1일 ~ 마지막 값 달 말일" 구간을 생성
    // (플랜 조회기간 상한: sparklineMonths)
    monthlyUsageByItemId.forEach((monthMap, id) => {
      if (monthMap.size === 0) {
        series.set(id, []);
        return;
      }

      const sortedMonths = Array.from(monthMap.keys()).sort((a, b) => a.localeCompare(b));
      const rawLastMonth = sortedMonths[sortedMonths.length - 1];
      const [lastYearStr, lastMonthStr] = rawLastMonth.split('-');
      const lastMonthDate = new Date(Number(lastYearStr), Number(lastMonthStr) - 1, 1);
      const earliestAllowed = new Date(lastMonthDate);
      earliestAllowed.setMonth(earliestAllowed.getMonth() - (sparklineMonths - 1));
      const earliestAllowedKey = `${earliestAllowed.getFullYear()}-${String(earliestAllowed.getMonth() + 1).padStart(2, '0')}`;

      const scopedMonths = sortedMonths.filter(month => month >= earliestAllowedKey);
      if (scopedMonths.length === 0) {
        series.set(id, []);
        return;
      }

      const rangeStart = scopedMonths[0];
      const rangeEnd = scopedMonths[scopedMonths.length - 1];
      const [startYearStr, startMonthStr] = rangeStart.split('-');
      const [endYearStr, endMonthStr] = rangeEnd.split('-');

      const cursor = new Date(Number(startYearStr), Number(startMonthStr) - 1, 1);
      const end = new Date(Number(endYearStr), Number(endMonthStr) - 1, 1);
      const values: number[] = [];

      while (cursor <= end) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        values.push(monthMap.get(key) ?? 0);
        cursor.setMonth(cursor.getMonth() + 1);
      }

      series.set(id, values);
    });

    return series;
  }, [chartData, sparklineMonths, surgeryData]);

  // KPI 집계
  const kpiData = useMemo(() => {
    const totalUsage = filteredInventory.reduce((s, i) => s + i.usageCount, 0);
    const totalStock = filteredInventory.reduce((s, i) => s + i.currentStock, 0);
    const totalItems = filteredInventory.length;
    const shortageItems = filteredInventory.filter(i => i.currentStock < Math.ceil(i.recommendedStock * monthFactor));
    const shortageCount = shortageItems.length;
    const shortageRate = totalItems > 0 ? Math.round((shortageCount / totalItems) * 100) : 0;
    const shortageDeficit = shortageItems.reduce((s, i) => s + (Math.ceil(i.recommendedStock * monthFactor) - i.currentStock), 0);

    // 현재재고 충분도: 전체 재고 ÷ 월평균 총사용량 (몇 달치인지)
    const totalMonthlyDemand = filteredInventory.reduce((s, i) => s + (i.monthlyAvgUsage ?? 0), 0);
    const stockMonths = totalMonthlyDemand > 0 ? totalStock / totalMonthlyDemand : null;

    // 총사용량 vs 권장재고 비율 (사용률)
    const totalRecommended = filteredInventory.reduce((s, i) => s + Math.ceil(i.recommendedStock * monthFactor), 0);
    const usageVsRecommended = totalRecommended > 0 ? Math.round((totalUsage / totalRecommended) * 100) : null;

    return { totalUsage, totalStock, totalItems, shortageCount, shortageRate, shortageDeficit, stockMonths, usageVsRecommended };
  }, [filteredInventory, monthFactor]);

  const supplyCoverageData = useMemo(() => {
    const rows = filteredInventory.map(item => {
      const recommended = Math.max(1, Math.ceil((item.recommendedStock ?? 0) * monthFactor));
      const shortage = Math.max(0, recommended - item.currentStock);
      return { item, recommended, shortage };
    });

    const needsReplenishment = rows.filter(row => row.shortage > 0);
    const immediateReplenishment = needsReplenishment.filter(row => row.item.currentStock <= 0);
    const partialReplenishment = needsReplenishment.filter(row => row.item.currentStock > 0);
    const secured = rows.filter(row => row.shortage === 0);
    const topNeed = [...needsReplenishment].sort((a, b) => b.shortage - a.shortage)[0] ?? null;

    return {
      needsReplenishmentCount: needsReplenishment.length,
      immediateReplenishmentCount: immediateReplenishment.length,
      partialReplenishmentCount: partialReplenishment.length,
      securedCount: secured.length,
      totalShortage: needsReplenishment.reduce((sum, row) => sum + row.shortage, 0),
      topNeed,
    };
  }, [filteredInventory, monthFactor]);

  // 미사용 / 장기 미사용 품목 분류 (최적화 대상)
  const deadStockItems = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]; // YYYY-MM-DD

    return inventory
      .filter(i => {
        const manufacturer = String(i.manufacturer || '');
        const brand = String(i.brand || '');
        const lowerManufacturer = manufacturer.toLowerCase();
        const isFailCategory = manufacturer.startsWith('수술중FAIL_')
          || lowerManufacturer.includes('수술중fail')
          || lowerManufacturer.includes('fail_')
          || lowerManufacturer.includes('수술중 fail');
        const isInsuranceCategory = manufacturer === '보험청구'
          || brand === '보험청구'
          || manufacturer.includes('보험임플란트')
          || brand.includes('보험임플란트');
        return !isFailCategory && !isInsuranceCategory;
      })
      .map(i => {
        const neverUsed = i.usageCount === 0;
        const lastDate = i.lastUsedDate ?? null;
        const olderThanYear = !neverUsed && lastDate !== null && lastDate < oneYearAgoStr;
        return { ...i, neverUsed, olderThanYear, lastUsedDate: lastDate };
      })
      .filter(i => i.neverUsed || i.olderThanYear)
      .sort((a, b) => {
        // 미사용 먼저, 그 다음 오래된 순
        if (a.neverUsed && !b.neverUsed) return 1;
        if (!a.neverUsed && b.neverUsed) return -1;
        return (a.lastUsedDate ?? '') < (b.lastUsedDate ?? '') ? -1 : 1;
      });
  }, [inventory]);

  // 식립 / 수술중 FAIL 건수 분리
  const surgeryBreakdown = useMemo(() => {
    if (!surgeryData) return { placement: 0, fail: 0 };
    const sheet = surgeryData.sheets[surgeryData.activeSheetName];
    if (!sheet) return { placement: 0, fail: 0 };
    let placement = 0;
    let fail = 0;
    sheet.rows.forEach(row => {
      if (Object.values(row).some(val => String(val).includes('합계'))) return;
      if (String(row['수술기록'] || '').includes('[GBR Only]')) return;
      const cls = String(row['구분'] || '');
      const mfr = String(row['제조사'] || '');
      if (selectedManufacturer !== null && mfr !== selectedManufacturer) return;
      const qty = Number(row['갯수']) || 1;
      if (cls === '식립') placement += qty;
      else if (cls === '수술중 FAIL') fail += qty;
    });
    return { placement, fail };
  }, [surgeryData, selectedManufacturer]);

  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
  );

  const preferredUnregisteredViewMode = useMemo<'not_in_inventory' | 'non_list_input'>(
    () => (unregisteredFromSurgery.some(item => item.reason !== 'non_list_input') ? 'not_in_inventory' : 'non_list_input'),
    [unregisteredFromSurgery]
  );

  const stickyRef = useRef<HTMLDivElement | null>(null);
  const [stickyHeight, setStickyHeight] = useState(0);

  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      setStickyHeight(entry.contentRect.height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ================================================= */}
      {/* Sticky Header Block                               */}
      {/* ================================================= */}
      <div
        ref={stickyRef}
        className="sticky z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50/80 backdrop-blur-md"
        style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)' }}
      >
        {/* A. Header Strip */}
        <div className="hidden md:block bg-white/90 backdrop-blur-xl rounded-2xl border border-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100/50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* Left: summary metrics */}
            <div className="flex items-start gap-6 flex-wrap">
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 품목</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Items</p>
                <p className="text-base font-bold text-slate-800 tracking-tight mt-1">{filteredInventory.length}<span className="text-xs font-semibold text-slate-400 ml-1">items</span></p>
                {hiddenCategoryCount > 0 && (() => {
                  const isNormal = hiddenCategoryCount === visibleInventory.length + 1;
                  return (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-sm w-fit">
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isNormal ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'}`} />
                      <p className={`text-[10px] font-bold tracking-tight ${isNormal ? 'text-slate-600' : 'text-rose-600'}`}>
                        + FAIL/청구 {hiddenCategoryCount}개 별도{!isNormal && ' · 품목오류'}
                      </p>
                    </div>
                  );
                })()}
              </div>
              <div className="h-16 w-px bg-slate-100 mt-0.5" />
              {/* 총 사용량 */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800">총 사용량</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Total Usage</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className="text-base font-bold text-slate-800 tabular-nums tracking-tight">{kpiData.totalUsage.toLocaleString()}</p>
                  <span className="text-xs font-semibold text-slate-400">개</span>
                </div>
                {(surgeryBreakdown.placement > 0 || surgeryBreakdown.fail > 0) ? (
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-bold text-indigo-600">식립 {surgeryBreakdown.placement}</span>
                    {surgeryBreakdown.fail > 0 && <span className="text-[10px] font-bold text-rose-500">FAIL {surgeryBreakdown.fail}</span>}
                  </div>
                ) : null}
              </div>
              <div className="h-16 w-px bg-slate-100 mt-0.5" />
              {/* 현재 재고 */}
              <div className="relative">
                <h4 className="text-sm font-semibold text-slate-800">현재 재고</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Current Stock</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className={`text-base font-bold tabular-nums tracking-tight ${kpiData.totalStock < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                    {kpiData.totalStock.toLocaleString()}
                  </p>
                  <span className="text-xs font-semibold text-slate-400">개</span>
                </div>
                {kpiData.totalStock < 0 ? (
                  <p className="text-[10px] font-bold text-rose-500 mt-0.5">⚠ 입력 필요</p>
                ) : (() => {
                  // 권장량 기준 건강 분류 (예측 소진일 제거)
                  const itemsWithDemand = visibleInventory.filter(i => (i.usageCount ?? 0) > 0 || (i.monthlyAvgUsage ?? 0) > 0 || (i.dailyMaxUsage ?? 0) > 0);
                  const healthy = itemsWithDemand.filter(i => i.currentStock >= Math.max(1, Math.ceil((i.recommendedStock ?? 0) * monthFactor))).length;
                  const normal = itemsWithDemand.filter(i => {
                    const recommended = Math.max(1, Math.ceil((i.recommendedStock ?? 0) * monthFactor));
                    const threshold = Math.ceil(recommended * 0.7);
                    return i.currentStock < recommended && i.currentStock >= threshold;
                  }).length;
                  const caution = itemsWithDemand.filter(i => {
                    const recommended = Math.max(1, Math.ceil((i.recommendedStock ?? 0) * monthFactor));
                    const threshold = Math.ceil(recommended * 0.7);
                    return i.currentStock < threshold;
                  }).length;
                  if (itemsWithDemand.length === 0) return null;
                  return (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[9px] text-slate-400 font-medium">권장량 기준</p>
                      <div className="flex items-center gap-1.5">
                        {healthy > 0 && <span className="text-[9px] font-bold text-emerald-600">건강 {healthy}</span>}
                        {normal > 0 && <span className="text-[9px] font-bold text-amber-500">보통 {normal}</span>}
                        {caution > 0 && <span className="text-[9px] font-bold text-rose-500">주의 {caution}</span>}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="h-16 w-px bg-slate-100 mt-0.5" />
              {/* 부족 품목 */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800">부족 품목</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">{monthFactor}개월 기준</p>
                <div className="flex items-baseline gap-1 mt-1">
                  <p className={`text-base font-bold tabular-nums tracking-tight ${kpiData.shortageCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{kpiData.shortageCount}</p>
                  <span className="text-xs font-semibold text-slate-400">items</span>
                </div>
                {kpiData.shortageCount > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    총 <span className="text-rose-500">{kpiData.shortageDeficit}개</span> 부족
                  </p>
                )}
              </div>
              <div className="h-16 w-px bg-slate-100 mt-0.5" />
              {/* 재고 건강도 */}
              {(() => {
                const totalItems = Math.max(kpiData.totalItems, 1);
                const healthyCount = kpiData.totalItems - kpiData.shortageCount;
                const rate = Math.round(Math.max(0, healthyCount) / totalItems * 100);
                const isHealthy = rate >= 90;
                const isMid = rate >= 75;
                const color = isHealthy ? 'text-emerald-600' : isMid ? 'text-amber-500' : 'text-rose-500';
                const label = isHealthy ? '건강' : isMid ? '보통' : '주의';
                const bgColor = isHealthy ? 'bg-emerald-50 text-emerald-600' : isMid ? 'bg-amber-50 text-amber-600' : 'bg-rose-50 text-rose-500';
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-800">재고 건강도</h4>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">Stock Health</p>
                    <div className="flex items-baseline gap-1 mt-1">
                      <p className={`text-base font-bold tabular-nums tracking-tight ${color}`}>{rate}</p>
                      <span className={`text-xs font-semibold ${color}`}>%</span>
                      <span className={`ml-1 text-[9px] font-black px-1 py-0.5 rounded ${bgColor}`}>{label}</span>
                    </div>
                    <p className="text-[9px] text-slate-400 mt-0.5">부족 {kpiData.shortageCount}개 제외</p>
                  </div>
                );
              })()}
              <div className="h-16 w-px bg-slate-100 mt-0.5" />
              {/* 권장 기간 */}
              <div>
                <h4 className="text-sm font-semibold text-slate-800">권장 기간</h4>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium">부족 품목 기준</p>
                <div className="flex bg-white p-1 rounded-xl border border-slate-200 shadow-sm mt-1">
                  <button onClick={() => setMonthFactor(1)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${monthFactor === 1 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>1개월</button>
                  <button onClick={() => setMonthFactor(2)} className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${monthFactor === 2 ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}>2개월</button>
                </div>
              </div>
            </div>
            {/* Right: action buttons */}
            <div className="flex items-center gap-2">
              {/* 품목 최적화 버튼 — dead stock 존재 시 뱃지 표시 */}
              {!isReadOnly && deadStockItems.length > 0 && (
                <button
                  onClick={() => setShowOptimizeModal(true)}
                  className="relative px-4 py-2 text-xs font-bold rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-all flex items-center gap-1.5 shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12l-3-3m0 0l-3 3m3-3v6" /></svg>
                  품목 최적화
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-black flex items-center justify-center">
                    {deadStockItems.length}
                  </span>
                </button>
              )}
              {!isReadOnly && (
                <button
                  onClick={() => !isEditExhausted && setShowEditNotice(true)}
                  disabled={isEditExhausted}
                  className={`px-4 py-2 text-xs font-bold rounded-lg border transition-all flex items-center gap-1.5 ${isEditExhausted ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50 shadow-sm'}`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                  기초재고 편집{isUnlimited ? '' : isEditExhausted ? '' : ` (${maxEdits - editCount}회)`}
                </button>
              )}
              <button onClick={() => { if (!isReadOnly) openAddItemModal(); }} disabled={isReadOnly} className={`px-4 py-2 text-xs font-black rounded-lg shadow-md transition-all flex items-center gap-1.5 ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                품목 추가
              </button>
            </div>
          </div>
        </div>

        <div className="md:hidden bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
          <h3 className="text-sm font-black text-slate-800">모바일 재고 요약</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">총 품목</p>
              <p className="text-base font-black text-slate-800 tabular-nums">{filteredInventory.length}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
              <p className="text-[10px] font-bold text-slate-400">부족 품목</p>
              <p className={`text-base font-black tabular-nums ${kpiData.shortageCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{kpiData.shortageCount}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5 col-span-2">
              <p className="text-[10px] font-bold text-slate-400">현재 재고 합계</p>
              <p className={`text-base font-black tabular-nums ${kpiData.totalStock < 0 ? 'text-rose-600' : 'text-slate-800'}`}>
                {kpiData.totalStock.toLocaleString()}개
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="mobile-manufacturer-filter" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">제조사 필터</label>
            <select
              id="mobile-manufacturer-filter"
              value={selectedManufacturer ?? '__all__'}
              onChange={(event) => setSelectedManufacturer(event.target.value === '__all__' ? null : event.target.value)}
              className="mt-1 w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="__all__">전체 ({visibleInventory.length})</option>
              {manufacturersList.map((manufacturer) => {
                const count = visibleInventory.filter(i => i.manufacturer === manufacturer).length;
                return (
                  <option key={`mobile-mfr-${manufacturer}`} value={manufacturer}>
                    {manufacturer} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setMonthFactor(1)} className={`flex-1 h-10 rounded-xl text-xs font-black transition-all ${monthFactor === 1 ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>1개월</button>
            <button onClick={() => setMonthFactor(2)} className={`flex-1 h-10 rounded-xl text-xs font-black transition-all ${monthFactor === 2 ? 'bg-indigo-50 text-indigo-600 border border-indigo-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>2개월</button>
            {!isReadOnly && (
              <button
                type="button"
                onClick={openAddItemModal}
                className="h-10 px-3 rounded-xl bg-indigo-600 text-white text-xs font-black"
              >
                품목 추가
              </button>
            )}
          </div>
        </div>

        {/* C. Manufacturer Filter Strip */}
        <div className="hidden md:block bg-white/90 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100/50">
          <div className="flex gap-1.5 bg-indigo-50/40 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setSelectedManufacturer(null)}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${selectedManufacturer === null ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            >
              전체
              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${selectedManufacturer === null ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {visibleInventory.length}
              </span>
            </button>
            {manufacturersList.map(m => {
              const count = visibleInventory.filter(i => i.manufacturer === m).length;
              const hasShortage = visibleInventory.some(i => i.manufacturer === m && i.currentStock < Math.ceil(i.recommendedStock * monthFactor));
              return (
                <button
                  key={m}
                  onClick={() => setSelectedManufacturer(m)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-[11px] font-bold rounded-lg transition-all ${selectedManufacturer === m ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                >
                  {m}
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${selectedManufacturer === m ? 'bg-white/20 text-white' : hasShortage ? 'bg-rose-100 text-rose-500' : 'bg-slate-100 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>{/* end sticky wrapper */}

      {unregisteredFromSurgery.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 to-amber-100/40 border border-amber-200/80 rounded-2xl p-4 shadow-[0_8px_24px_-4px_rgba(245,158,11,0.12)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-black text-amber-800 tracking-tight">
                수술기록 미등록/비정형 품목 {unregisteredFromSurgery.length}종 감지
              </h3>
              <p className="text-xs text-amber-700 mt-1">
                재고 마스터 미등록 또는 목록 외 수기 입력으로 감지된 품목입니다.
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-full bg-white/80 border border-amber-200 text-[11px] font-bold text-amber-700">
                  누적 사용 {unregisteredUsageTotal.toLocaleString()}개
                </div>
                <button
                  onClick={() => {
                    setShowUnregisteredDetailModal(true);
                  }}
                  className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[11px] font-black shadow-lg shadow-indigo-200 hover:from-indigo-700 hover:to-violet-700 active:scale-95 transition-all"
                >
                  <span className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-300 opacity-75" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-400" />
                  </span>
                  <svg className="w-3.5 h-3.5 text-white/90 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                  </svg>
                  상세보기
                  <span className="px-1.5 py-0.5 rounded-full bg-white/20 text-[10px] leading-none">
                    {unregisteredFromSurgery.length}종
                  </span>
                </button>
              </div>
              <p className="text-[10px] font-bold text-amber-700">
                미등록 품목 확인 후 바로 목록 등록
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {unregisteredFromSurgery.slice(0, 8).map((item) => {
              const label = `${item.manufacturer} / ${item.brand} ${item.size}`;
              return (
                <span
                  key={label}
                  className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-semibold text-amber-800"
                  title={label}
                >
                  {item.brand} {item.size} · {item.usageCount}개
                </span>
              );
            })}
            {unregisteredFromSurgery.length > 8 && (
              <span className="px-2.5 py-1 rounded-lg bg-white border border-amber-200 text-[11px] font-semibold text-amber-700">
                +{unregisteredFromSurgery.length - 8}종 더 있음
              </span>
            )}
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* Usage Analysis Card — redesigned                  */}
      {/* ================================================= */}
      <div className="md:hidden bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <h3 className="text-sm font-black text-slate-800">모바일 사용량 요약</h3>
        {chartData.length > 0 ? (
          <div className="mt-3 space-y-2">
            {chartData.slice(0, 3).map((item, idx) => (
              <div key={`mobile-usage-${item.id}`} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2">
                <p className="text-sm font-semibold text-slate-700 truncate">
                  {idx + 1}. {item.brand} {item.size}
                </p>
                <p className="text-sm font-black text-indigo-600 tabular-nums">{item.usageCount}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs font-semibold text-slate-400">사용 데이터가 없습니다.</p>
        )}
      </div>
      <div className="hidden md:block bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* 헤더 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-6 pt-5 pb-4 border-b border-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">규격별 사용량 분석</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Usage Analysis by Specification</p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOP {Math.min(chartData.length, USAGE_TOP_ITEMS)}</span>
            <div className="w-px h-3 bg-slate-200" />
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
              {selectedManufacturer ?? '전체'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px]">
          {/* ── 좌측: 수평 바 차트 ── */}
          <div className="px-3 sm:px-6 py-4">
            {/* 컬럼 헤더 */}
            {chartData.length > 0 && (
              <div className="hidden lg:flex items-center gap-3 mb-2 pb-2 border-b border-slate-50">
                <span className="w-5 shrink-0" />
                <div className="w-[100px] shrink-0" />
                <div className="flex-1 max-w-[160px] sm:max-w-[280px]" />
                <div className="w-[160px] sm:w-[280px] shrink-0 grid grid-cols-4 gap-0">
                  <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">월평균</p>
                  <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">지난달</p>
                  <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">현재재고</p>
                  <p className="text-[9px] font-bold text-rose-400 text-center uppercase tracking-wide">부족분</p>
                </div>
                <div className="w-[120px] sm:w-[176px] shrink-0 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">사용 추이</p>
                  <p className="text-[9px] font-semibold text-indigo-400 mt-0.5">값 시작월~종료월</p>
                </div>
                <span className="w-2 shrink-0" />
              </div>
            )}
            <div className="overflow-x-auto pb-1">
              <div className="space-y-2 min-w-0">
              {chartData.length > 0 ? chartData.map((item, idx) => {
                const pct = Math.round((item.usageCount / maxUsage) * 100);
                const isTop = idx === 0;
                const isLow = item.currentStock < Math.ceil((item.recommendedStock ?? 0) * monthFactor);
                const avg = item.monthlyAvgUsage ?? 0;
                const last = item.lastMonthUsage ?? 0;
                const isSurge = avg > 0 && last > avg * 1.5 && last - avg >= 2;
                const isDrop = avg >= 2 && last < avg * 0.5 && avg - last >= 2;
                return (
                  <div key={item.id} className="group flex items-center gap-3">
                    {/* 순위 */}
                    <span className={`w-5 text-right text-[10px] font-black shrink-0 ${isTop ? 'text-indigo-500' : 'text-slate-300'}`}>
                      {idx + 1}
                    </span>
                    {/* 라벨 */}
                    <div className="w-[100px] shrink-0">
                      <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter leading-none">{item.brand}</p>
                      <p className="text-[11px] font-black text-slate-700 truncate leading-snug">{item.size}</p>
                    </div>
                    {/* 바 (최대 너비 제한) */}
                    <div className="flex-1 max-w-[160px] sm:max-w-[280px] h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${isTop ? 'bg-gradient-to-r from-indigo-500 to-violet-400' : 'bg-indigo-200 group-hover:bg-indigo-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {/* 수치 그리드 */}
                    <div className="w-[160px] sm:w-[280px] shrink-0 grid grid-cols-4 gap-0 items-center">
                      {/* 월평균 */}
                      <p className={`text-xs font-semibold tabular-nums text-center ${isTop ? 'text-indigo-500' : 'text-slate-500'}`}>
                        {avg.toFixed(1)}
                      </p>
                      {/* 지난달 */}
                      <div className="flex items-center justify-center gap-0.5">
                        <p className={`text-xs font-semibold tabular-nums ${last > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                          {last}
                        </p>
                        {isSurge && <span className="text-[8px] font-black text-orange-500 bg-orange-50 px-0.5 rounded leading-none">↑</span>}
                        {isDrop && <span className="text-[8px] font-black text-blue-400 bg-blue-50 px-0.5 rounded leading-none">↓</span>}
                      </div>
                      {/* 현재재고 */}
                      <p className={`text-xs font-bold tabular-nums text-center ${item.currentStock <= 0 ? 'text-rose-500' : 'text-slate-700'}`}>
                        {item.currentStock}
                      </p>
                      {/* 부족분 */}
                      {(() => {
                        const recommended = Math.ceil((item.recommendedStock ?? 0) * monthFactor);
                        const shortage = recommended - item.currentStock;
                        return shortage > 0
                          ? <p className="text-xs font-black tabular-nums text-center text-rose-500">-{shortage}</p>
                          : <p className="text-xs font-bold tabular-nums text-center text-emerald-500">충분</p>;
                      })()}
                    </div>
                    {/* 스파크라인 */}
                    <div className="w-[120px] sm:w-[176px] shrink-0 px-2">
                      {(() => {
                        const series = sparklineSeriesByItemId.get(item.id) ?? [];
                        if (!series.some(v => v > 0)) {
                          return (
                            <div className="h-8 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-center">
                              <span className="text-[9px] font-semibold text-slate-300">데이터 없음</span>
                            </div>
                          );
                        }

                        const width = 152;
                        const height = 28;
                        const minVal = Math.min(...series);
                        const maxVal = Math.max(...series, 0);
                        const range = Math.max(1, maxVal - minVal);
                        const stepX = series.length > 1 ? width / (series.length - 1) : 0;

                        const points = series.map((val, idx) => ({
                          x: idx * stepX,
                          y: height - ((val - minVal) / range) * height
                        }));
                        const pathLine = smoothLine(points);
                        const pathArea = smoothArea(points, height);

                        const lastPoint = points[points.length - 1] || { x: 0, y: height };
                        const strokeColor = isTop ? '#4f46e5' : '#818cf8';
                        const gradId = `sparkg-${item.id}`;

                        return (
                          <div className="relative h-8 rounded-lg border border-indigo-50 bg-indigo-50/20 px-2 py-1 group-hover:border-indigo-100 transition-colors">
                            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none" aria-label="품목 사용 추이">
                              <defs>
                                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
                                  <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
                                </linearGradient>
                              </defs>
                              <path d={pathArea} fill={`url(#${gradId})`} />
                              <path d={pathLine} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-sm" />
                              <circle cx={lastPoint.x} cy={lastPoint.y} r="2.5" fill="white" stroke={strokeColor} strokeWidth={1.5} className="shadow-sm" />
                            </svg>
                          </div>
                        );
                      })()}
                    </div>
                    {/* 재고 부족 닷 */}
                    <span className={`w-2 h-2 rounded-full shrink-0 ${isLow ? 'bg-rose-400' : 'bg-transparent'}`} title={isLow ? '재고 부족' : ''} />
                  </div>
                );
              }) : (
                <div className="py-10 text-center flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center">
                    <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <p className="text-xs text-slate-400 font-bold italic">사용 데이터가 없습니다.</p>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* ── 우측: 재고 확보 패널 ── */}
          <div className="lg:border-l border-t lg:border-t-0 border-slate-100 px-5 py-5 flex flex-col sm:flex-row lg:flex-col justify-between gap-4 min-w-[180px]">

            {/* 우선 확보 품목 */}
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">우선 확보 품목</p>
              {supplyCoverageData.topNeed ? (
                <div className="rounded-xl px-3 py-2.5 bg-amber-50 border border-amber-100">
                  <p className="text-[10px] font-black leading-none text-amber-700">
                    {supplyCoverageData.topNeed.item.brand}
                  </p>
                  <p className="text-[11px] font-bold mt-0.5 text-amber-600">
                    {supplyCoverageData.topNeed.item.size}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className="text-xl font-black tabular-nums leading-none text-amber-700">
                      {supplyCoverageData.topNeed.shortage}
                    </span>
                    <span className="text-[10px] font-bold text-amber-500">
                      개 보충 필요
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-3 py-2.5 bg-emerald-50 border border-emerald-100">
                  <p className="text-[11px] font-black text-emerald-600">전 품목 권장량 충족</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">추가 보충 필요 없음</p>
                </div>
              )}
            </div>

            <div className="h-px w-full bg-slate-50 hidden lg:block" />

            {/* 확보 현황 */}
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">재고 확보 현황</p>
              <p className="text-[9px] text-slate-300 font-semibold mb-2">권장량 기준</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">보충 필요</span>
                  </div>
                  <span className={`text-[12px] font-black tabular-nums ${supplyCoverageData.needsReplenishmentCount > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                    {supplyCoverageData.needsReplenishmentCount}종
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">총 부족 수량</span>
                  </div>
                  <span className={`text-[12px] font-black tabular-nums ${supplyCoverageData.totalShortage > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                    {supplyCoverageData.totalShortage}개
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">권장량 충족</span>
                  </div>
                  <span className="text-[12px] font-black tabular-nums text-emerald-600">
                    {supplyCoverageData.securedCount}종
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">즉시 보충</span>
                  </div>
                  <span className="text-[12px] font-black tabular-nums text-slate-600">
                    {supplyCoverageData.immediateReplenishmentCount}종
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 범례 */}
        <div className="flex flex-wrap items-center gap-3 px-4 sm:px-6 py-2.5 bg-slate-50/60 border-t border-slate-50">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-r from-indigo-500 to-violet-400" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">1위</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm bg-indigo-200" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">2위 이하</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-widest">재고 부족</span>
          </div>
          <div className="ml-auto text-[9px] text-slate-300 font-medium">수술 사용패턴 기반 권장량 기준</div>
        </div>
      </div>

      <InventoryDetailSection
        inventoryDetailRows={inventoryDetailRows}
        monthFactor={monthFactor}
        isReadOnly={isReadOnly}
        onQuickOrder={onQuickOrder}
        showOnlyOrderNeededRows={showOnlyOrderNeededRows}
        onToggleShowOnlyOrderNeededRows={() => setShowOnlyOrderNeededRows(prev => !prev)}
        showInventoryDetailColumnFilter={showInventoryDetailColumnFilter}
        onToggleInventoryDetailColumnFilter={() => setShowInventoryDetailColumnFilter(prev => !prev)}
        onCloseInventoryDetailColumnFilter={() => setShowInventoryDetailColumnFilter(false)}
        inventoryDetailColumnVisibility={inventoryDetailColumnVisibility}
        onToggleInventoryDetailColumn={toggleInventoryDetailColumn}
        inventoryDetailUsageTotal={inventoryDetailUsageTotal}
        inventoryDetailCurrentStockTotal={inventoryDetailCurrentStockTotal}
        inventoryDetailVisibleColumnCount={inventoryDetailVisibleColumnCount}
        stickyTopOffset={stickyHeight}
      />

      {/* ================================================= */}
      {/* 품목 최적화 Modal                                 */}
      {/* ================================================= */}
      {showOptimizeModal && (
        <OptimizeModal
          deadStockItems={deadStockItems}
          onDeleteInventoryItem={onDeleteInventoryItem}
          onClose={() => setShowOptimizeModal(false)}
        />
      )}

      {/* ================================================= */}
      {/* Add Item Modal                                    */}
      {/* ================================================= */}
      {isAddingItem && (
        <AddItemModal
          inventory={inventory}
          onAdd={async (newItem) => {
            const added = await Promise.resolve(onAddInventoryItem(newItem));
            if (added === false) return;
            // FAIL 연동 품목 자동 생성 (미존재 시에만)
            const failAlreadyExists = inventory.some(
              i => i.manufacturer === `수술중FAIL_${newItem.manufacturer}` &&
                i.brand === newItem.brand &&
                i.size === newItem.size
            );
            if (!failAlreadyExists) {
              const failItem: InventoryItem = {
                ...newItem,
                id: `manual_fail_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                manufacturer: `수술중FAIL_${newItem.manufacturer}`,
                initialStock: 0,
                stockAdjustment: 0,
                currentStock: 0,
              };
              await Promise.resolve(onAddInventoryItem(failItem));
            }
            closeAddItemModal();
          }}
          onClose={closeAddItemModal}
        />
      )}

      {/* ================================================= */}
      {/* Edit Notice Modal                                 */}
      {/* ================================================= */}
      {showEditNotice && (
        <EditNoticeModal
          onClose={() => setShowEditNotice(false)}
          onConfirm={() => {
            setShowEditNotice(false);
            setShowBaseStockModal(true);
          }}
          isUnlimited={isUnlimited}
          maxEdits={maxEdits}
          editCount={editCount}
        />
      )}

      {/* ================================================= */}
      {/* Base Stock Modal                                  */}
      {/* ================================================= */}
      {showBaseStockModal && (
        <BaseStockModal
          visibleInventory={visibleInventory}
          isUnlimited={isUnlimited}
          hospitalId={hospitalId}
          onRefreshLatestSurgeryUsage={onRefreshLatestSurgeryUsage}
          onBulkUpdateStocks={onBulkUpdateStocks}
          onUpdateStock={onUpdateStock}
          onClose={() => setShowBaseStockModal(false)}
          onAfterSave={(serverCount) => {
            handleBaseStockSaved(serverCount);
            if (autoOpenedRef.current) {
              autoOpenedRef.current = false;
              onBaseStockEditApplied?.();
            }
          }}
        />
      )}

      {/* ================================================= */}
      {/* Unregistered Detail Modal                         */}
      {/* ================================================= */}
      {showUnregisteredDetailModal && (
        <UnregisteredDetailModal
          unregisteredFromSurgery={unregisteredFromSurgery}
          visibleInventory={visibleInventory}
          inventory={inventory}
          isReadOnly={isReadOnly}
          onAddInventoryItem={onAddInventoryItem}
          onResolveManualInput={onResolveManualInput}
          onClose={() => setShowUnregisteredDetailModal(false)}
          initialViewMode={preferredUnregisteredViewMode}
        />
      )}

    </div>
  );
};

export default InventoryManager;
