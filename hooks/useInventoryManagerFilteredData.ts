import { useMemo } from 'react';
import type { InventoryItem, ExcelData } from '../types';
import {
  INVENTORY_DETAIL_COLUMNS,
  USAGE_TOP_ITEMS,
} from '../components/inventory/inventoryDashboardConfig';

interface UseInventoryManagerFilteredDataParams {
  visibleInventory: InventoryItem[];
  selectedManufacturer: string | null;
  monthFactor: number;
  showOnlyOrderNeededRows: boolean;
  inventoryDetailColumnVisibility: Record<string, boolean>;
  pendingOrderKeys: Set<string>;
  surgeryData?: ExcelData | null;
}

export function useInventoryManagerFilteredData({
  visibleInventory,
  selectedManufacturer,
  monthFactor,
  showOnlyOrderNeededRows,
  inventoryDetailColumnVisibility,
  pendingOrderKeys,
  surgeryData,
}: UseInventoryManagerFilteredDataParams) {
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

  const mobileOrderNeededItems = useMemo(() => (
    filteredInventory
      .map((item) => {
        const recommended = Math.max(1, Math.ceil((item.recommendedStock ?? 0) * monthFactor));
        const deficit = Math.max(0, recommended - item.currentStock);
        const alreadyOrdered = pendingOrderKeys.has(`${item.manufacturer}|${item.brand}|${item.size}`);
        return { item, recommended, deficit, alreadyOrdered };
      })
      .filter((row) => row.deficit > 0)
      .sort((a, b) => {
        if (a.alreadyOrdered !== b.alreadyOrdered) return a.alreadyOrdered ? 1 : -1;
        if (b.deficit !== a.deficit) return b.deficit - a.deficit;
        return b.item.usageCount - a.item.usageCount;
      })
  ), [filteredInventory, monthFactor, pendingOrderKeys]);

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

  // 식립 / 수술중교환 건수 분리
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
      else if (cls === '수술중교환') fail += qty;
    });
    return { placement, fail };
  }, [surgeryData, selectedManufacturer]);

  return {
    filteredInventory,
    inventoryDetailRows,
    inventoryDetailVisibleColumnCount,
    inventoryDetailUsageTotal,
    inventoryDetailCurrentStockTotal,
    mobileOrderNeededItems,
    chartData,
    maxUsage,
    kpiData,
    supplyCoverageData,
    surgeryBreakdown,
  };
}
