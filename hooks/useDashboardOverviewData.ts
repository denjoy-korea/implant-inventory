import { useMemo } from 'react';
import type { InventoryItem, Order, ExcelRow, SurgeryUnregisteredItem } from '../types';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { manufacturerAliasKey, isExchangePrefix } from '../services/appUtils';

// ── Utilities (also used in component) ──

export const normalizeOverview = (value: string) =>
  String(value || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

export const buildDashboardOrderItemKey = (manufacturer: string, brand: string, size: string) =>
  `${normalizeOverview(manufacturer)}|${normalizeOverview(brand)}|${getSizeMatchKey(size, manufacturer)}`;

export function parseQty(value: unknown): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 1;
  return parsed;
}

export function parseDate(value: unknown): Date | null {
  if (!value) return null;
  const parsed = new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function monthKeyFromDate(value: unknown): string | null {
  const parsed = parseDate(value);
  if (!parsed) return null;
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function getRecentMonthKeys(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, index) => {
    const offset = count - 1 - index;
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  });
}

function pickDisplayManufacturer(current: string, candidate: string): string {
  const a = String(current || '').trim();
  const b = String(candidate || '').trim();
  if (!a) return b;
  if (!b) return a;
  const aHasImplant = /implant/i.test(a);
  const bHasImplant = /implant/i.test(b);
  if (bHasImplant && !aHasImplant) return b;
  if (aHasImplant && !bHasImplant) return a;
  return b.length > a.length ? b : a;
}

interface UseDashboardOverviewDataParams {
  inventory: InventoryItem[];
  orders: Order[];
  surgeryMaster: Record<string, ExcelRow[]>;
  surgeryUnregisteredItems: SurgeryUnregisteredItem[];
}

export function useDashboardOverviewData({
  inventory,
  orders,
  surgeryMaster,
  surgeryUnregisteredItems,
}: UseDashboardOverviewDataParams) {
  const visibleInventory = useMemo(
    () =>
      inventory.filter(
        (item) =>
          !isExchangePrefix(item.manufacturer) &&
          item.manufacturer !== '보험청구' &&
          item.brand !== '보험임플란트'
      ),
    [inventory]
  );

  const pendingReplenishmentQtyByKey = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status !== 'ordered' || order.type !== 'replenishment') return;
      order.items.forEach((item) => {
        const key = buildDashboardOrderItemKey(order.manufacturer, item.brand, item.size);
        map.set(key, (map.get(key) ?? 0) + Number(item.quantity || 0));
      });
    });
    return map;
  }, [orders]);

  const pendingFailExchangeQtyByKey = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((order) => {
      if (order.status !== 'ordered' || order.type !== 'fail_exchange') return;
      order.items.forEach((item) => {
        const key = buildDashboardOrderItemKey(order.manufacturer, item.brand, item.size);
        map.set(key, (map.get(key) ?? 0) + Number(item.quantity || 0));
      });
    });
    return map;
  }, [orders]);

  const shortageEntries = useMemo(() => {
    return visibleInventory
      .map((item) => {
        const rawDeficit = Math.max(0, item.recommendedStock - item.currentStock);
        if (rawDeficit <= 0) return null;
        const key = buildDashboardOrderItemKey(item.manufacturer, item.brand, item.size);
        const pendingQty = pendingReplenishmentQtyByKey.get(key) ?? 0;
        const remainingDeficit = Math.max(0, rawDeficit - pendingQty);
        if (remainingDeficit <= 0) return null;
        return { item, rawDeficit, pendingQty, remainingDeficit };
      })
      .filter((e): e is { item: InventoryItem; rawDeficit: number; pendingQty: number; remainingDeficit: number } => e !== null)
      .sort((a, b) => b.remainingDeficit - a.remainingDeficit);
  }, [visibleInventory, pendingReplenishmentQtyByKey]);

  const shortageSummary = useMemo(
    () => ({
      itemCount: shortageEntries.length,
      deficitQty: shortageEntries.reduce((sum, entry) => sum + entry.remainingDeficit, 0),
    }),
    [shortageEntries]
  );

  const orderedReplenishment = useMemo(
    () => orders.filter((o) => o.status === 'ordered' && o.type === 'replenishment'),
    [orders]
  );
  const orderedFailExchange = useMemo(
    () => orders.filter((o) => o.status === 'ordered' && o.type === 'fail_exchange'),
    [orders]
  );

  const pendingOrderSummary = useMemo(
    () => ({
      replenishmentCount: orderedReplenishment.length,
      replenishmentQty: orderedReplenishment.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
        0
      ),
      failExchangeCount: orderedFailExchange.length,
      failExchangeQty: orderedFailExchange.reduce(
        (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + Number(item.quantity || 0), 0),
        0
      ),
    }),
    [orderedFailExchange, orderedReplenishment]
  );

  const cleanSurgeryRows = useMemo(
    () => {
      const surgeryRows = surgeryMaster['수술기록지'] || [];
      return surgeryRows.filter((row) => !Object.values(row).some((val) => String(val).includes('합계')));
    },
    [surgeryMaster]
  );

  const pendingFailRows = useMemo(
    () => cleanSurgeryRows.filter((row) => String(row['구분'] || '').trim() === '수술중교환'),
    [cleanSurgeryRows]
  );

  const failExchangeEntries = useMemo(() => {
    const aggregated = new Map<string, { manufacturer: string; brand: string; size: string; pendingFails: number }>();
    pendingFailRows.forEach((row) => {
      const manufacturer = String(row['제조사'] || '').trim() || '기타';
      const brand = String(row['브랜드'] || '').trim() || '-';
      const size = String(row['규격(SIZE)'] || '').trim() || '-';
      const key = buildDashboardOrderItemKey(manufacturer, brand, size);
      const current = aggregated.get(key);
      const qty = parseQty(row['갯수']);
      if (current) {
        current.pendingFails += qty;
      } else {
        aggregated.set(key, { manufacturer, brand, size, pendingFails: qty });
      }
    });
    return Array.from(aggregated.entries())
      .map(([key, value]) => {
        const orderedExchange = pendingFailExchangeQtyByKey.get(key) ?? 0;
        const remainingToExchange = Math.max(0, value.pendingFails - orderedExchange);
        return { ...value, orderedExchange, remainingToExchange };
      })
      .filter((entry) => entry.remainingToExchange > 0)
      .sort((a, b) => b.remainingToExchange - a.remainingToExchange);
  }, [pendingFailRows, pendingFailExchangeQtyByKey]);

  const failSummary = useMemo(
    () => ({
      pendingRows: pendingFailRows.length,
      pendingQty: pendingFailRows.reduce((sum, row) => sum + parseQty(row['갯수']), 0),
      remainingExchangeQty: failExchangeEntries.reduce((sum, entry) => sum + entry.remainingToExchange, 0),
    }),
    [failExchangeEntries, pendingFailRows]
  );

  const unregisteredSummary = useMemo(
    () => ({
      count: surgeryUnregisteredItems.length,
      usageQty: surgeryUnregisteredItems.reduce((sum, item) => sum + Number(item.usageCount || 0), 0),
    }),
    [surgeryUnregisteredItems]
  );

  const monthlyTotals = useMemo(() => {
    const monthMap = new Map<string, { placement: number; fail: number }>();
    cleanSurgeryRows.forEach((row) => {
      const cls = String(row['구분'] || '').trim();
      if (cls !== '식립' && cls !== '수술중교환') return;
      const monthKey = monthKeyFromDate(row['날짜']);
      if (!monthKey) return;
      const qty = parseQty(row['갯수']);
      const current = monthMap.get(monthKey) ?? { placement: 0, fail: 0 };
      if (cls === '식립') current.placement += qty;
      if (cls === '수술중교환') current.fail += qty;
      monthMap.set(monthKey, current);
    });
    return Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, value]) => ({ month, ...value }));
  }, [cleanSurgeryRows]);

  const orderProcessing = useMemo(() => {
    const total = orders.length;
    const received = orders.filter((order) => order.status === 'received').length;
    const pending = orders.filter((order) => order.status === 'ordered').length;
    const rate = total > 0 ? Math.round((received / total) * 100) : 0;
    return { total, received, pending, rate };
  }, [orders]);

  const thisMonthSurgery = useMemo(() => {
    const thisMonth = new Date().toISOString().slice(0, 7);
    let placementQty = 0;
    let failQty = 0;
    cleanSurgeryRows.forEach((row) => {
      const rawDate = String(row['날짜'] || '');
      if (!rawDate.startsWith(thisMonth)) return;
      const cls = String(row['구분'] || '').trim();
      const qty = parseQty(row['갯수']);
      if (cls === '식립') placementQty += qty;
      if (cls === '수술중교환') failQty += qty;
    });
    return { placementQty, failQty };
  }, [cleanSurgeryRows]);

  const latestSurgeryDate = useMemo(() => {
    let maxDate: Date | null = null;
    for (const row of cleanSurgeryRows) {
      if (String(row['구분'] ?? '').trim() === '수술중교환') continue;
      const parsed = parseDate(row['날짜']);
      if (!parsed) continue;
      if (!maxDate || parsed > maxDate) maxDate = parsed;
    }
    return maxDate ? maxDate.toISOString().slice(0, 10) : null;
  }, [cleanSurgeryRows]);

  const recentMonthKeys = useMemo(() => getRecentMonthKeys(6), []);

  const manufacturerUsageSummary = useMemo(() => {
    const monthSet = new Set(recentMonthKeys);
    const map = new Map<
      string,
      {
        manufacturer: string;
        totalQty: number;
        recentQty: number;
        placementQty: number;
        failQty: number;
        brandMap: Map<string, number>;
        monthMap: Map<string, number>;
      }
    >();

    cleanSurgeryRows.forEach((row) => {
      const cls = String(row['구분'] || '').trim();
      if (cls !== '식립' && cls !== '수술중교환') return;
      const manufacturer = String(row['제조사'] || '').trim();
      const brand = String(row['브랜드'] || '').trim() || '-';
      if (!manufacturer) return;
      if (isExchangePrefix(manufacturer) || manufacturer === '보험청구' || brand === '보험임플란트') return;
      const manufacturerKey = manufacturerAliasKey(manufacturer);
      if (!manufacturerKey) return;
      const qty = parseQty(row['갯수']);
      const monthKey = monthKeyFromDate(row['날짜']);
      const current = map.get(manufacturerKey) ?? {
        manufacturer,
        totalQty: 0,
        recentQty: 0,
        placementQty: 0,
        failQty: 0,
        brandMap: new Map<string, number>(),
        monthMap: new Map<string, number>(),
      };
      current.manufacturer = pickDisplayManufacturer(current.manufacturer, manufacturer);
      current.totalQty += qty;
      if (cls === '식립') current.placementQty += qty;
      if (cls === '수술중교환') current.failQty += qty;
      if (monthKey && monthSet.has(monthKey)) current.recentQty += qty;
      current.brandMap.set(brand, (current.brandMap.get(brand) ?? 0) + qty);
      if (monthKey) current.monthMap.set(monthKey, (current.monthMap.get(monthKey) ?? 0) + qty);
      map.set(manufacturerKey, current);
    });

    const rows = Array.from(map.values())
      .map((value) => {
        const topBrands = Array.from(value.brandMap.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([brand, qty]) => ({ brand, qty }));
        const monthly = recentMonthKeys.map((month) => ({
          month,
          qty: value.monthMap.get(month) ?? 0,
        }));
        const failRate = value.totalQty > 0 ? Math.round((value.failQty / value.totalQty) * 100) : 0;
        return {
          manufacturer: value.manufacturer,
          totalQty: value.totalQty,
          recentQty: value.recentQty,
          placementQty: value.placementQty,
          failQty: value.failQty,
          failRate,
          topBrands,
          monthly,
        };
      })
      .sort((a, b) => {
        if (b.recentQty !== a.recentQty) return b.recentQty - a.recentQty;
        return b.totalQty - a.totalQty;
      });

    return {
      rows,
      totalQty: rows.reduce((sum, row) => sum + row.totalQty, 0),
      recentQty: rows.reduce((sum, row) => sum + row.recentQty, 0),
      placementQty: rows.reduce((sum, row) => sum + row.placementQty, 0),
      failQty: rows.reduce((sum, row) => sum + row.failQty, 0),
    };
  }, [cleanSurgeryRows, recentMonthKeys]);

  const hasBaseStockSet = useMemo(
    () => visibleInventory.some((item) => item.initialStock > 0),
    [visibleInventory]
  );

  return {
    visibleInventory,
    pendingReplenishmentQtyByKey,
    pendingFailExchangeQtyByKey,
    shortageEntries,
    shortageSummary,
    pendingOrderSummary,
    cleanSurgeryRows,
    pendingFailRows,
    failExchangeEntries,
    failSummary,
    unregisteredSummary,
    monthlyTotals,
    orderProcessing,
    thisMonthSurgery,
    latestSurgeryDate,
    recentMonthKeys,
    manufacturerUsageSummary,
    hasBaseStockSet,
  };
}
