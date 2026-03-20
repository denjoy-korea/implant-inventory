import { useMemo } from 'react';
import type { Order, InventoryItem, ReturnRequest, ExcelRow } from '../types';
import { getSizeMatchKey, isIbsImplantManufacturer } from '../services/sizeNormalizer';
import { DONUT_COLORS } from '../components/surgery-dashboard/shared';
import { isExchangePrefix, isVirtualManufacturer } from '../services/appUtils';

// ── Exported utilities (used in component JSX too) ──

export const simpleNormalize = (str: string) =>
  String(str || '').trim().toLowerCase().replace(/[\s\-\_\.\(\)]/g, '');

export const displayMfr = (name: string) =>
  isIbsImplantManufacturer(name) ? 'IBS Implant' : name;

export const buildOrderItemKey = (manufacturer: string, brand: string, size: string) =>
  `${simpleNormalize(manufacturer)}|${simpleNormalize(brand)}|${getSizeMatchKey(size, manufacturer)}`;

export const formatManagerCell = (managers: string[], confirmers: string[]) => {
  const base = managers.join(', ');
  if (confirmers.length === 0) return base;
  return `${base} (${confirmers.join(', ')})`;
};

export interface LowStockEntry {
  item: InventoryItem;
  rawDeficit: number;
  pendingQty: number;
  remainingDeficit: number;
}

interface UseOrderManagerDataParams {
  orders: Order[];
  inventory: InventoryItem[];
  surgeryMaster: Record<string, ExcelRow[]>;
  returnRequests: ReturnRequest[];
}

export function useOrderManagerData({
  orders,
  inventory,
  surgeryMaster,
  returnRequests,
}: UseOrderManagerDataParams) {
  const pendingQtyByItemKey = useMemo(() => {
    const qtyMap = new Map<string, number>();
    orders.forEach(order => {
      if (order.status !== 'ordered' || order.type !== 'replenishment') return;
      order.items.forEach(oi => {
        const key = buildOrderItemKey(order.manufacturer, oi.brand, oi.size);
        qtyMap.set(key, (qtyMap.get(key) ?? 0) + Number(oi.quantity || 0));
      });
    });
    return qtyMap;
  }, [orders]);

  const lowStockItems = useMemo<LowStockEntry[]>(() => {
    return inventory
      .filter(item => !isVirtualManufacturer(item.manufacturer) && item.brand !== '보험임플란트')
      .map(item => {
        const rawDeficit = Math.max(0, item.recommendedStock - item.currentStock);
        if (rawDeficit <= 0) return null;
        const itemKey = buildOrderItemKey(item.manufacturer, item.brand, item.size);
        const pendingQty = pendingQtyByItemKey.get(itemKey) ?? 0;
        const remainingDeficit = Math.max(0, rawDeficit - pendingQty);
        if (remainingDeficit <= 0) return null;
        return { item, rawDeficit, pendingQty, remainingDeficit };
      })
      .filter((entry): entry is LowStockEntry => entry !== null)
      .sort((a, b) => {
        const aSeverity = a.remainingDeficit / Math.max(a.item.recommendedStock, 1);
        const bSeverity = b.remainingDeficit / Math.max(b.item.recommendedStock, 1);
        return bSeverity - aSeverity;
      });
  }, [inventory, pendingQtyByItemKey]);

  const returnCandidates = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    const isExcluded = (item: InventoryItem) => {
      const mfr = (item.manufacturer || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      return mfr.includes('fail') || mfr.includes('교환') || mfr === '보험청구' || brand === '보험청구'
        || mfr.includes('보험임플란트') || brand.includes('보험임플란트');
    };

    const eligible = inventory.filter(i => !isExcluded(i) && i.currentStock > 0);
    const olderThanYear = eligible.filter(i => {
      if (i.usageCount === 0) return false;
      const lastDate = i.lastUsedDate ?? null;
      return lastDate !== null && lastDate < oneYearAgoStr;
    });
    const neverUsed = eligible.filter(i => i.usageCount === 0);
    const overstock = eligible.filter(i => i.recommendedStock > 0 && i.currentStock > i.recommendedStock);

    return {
      olderThanYear,
      neverUsed,
      overstock,
      olderThanYearQty: olderThanYear.reduce((s, i) => s + i.currentStock, 0),
      neverUsedQty: neverUsed.reduce((s, i) => s + i.currentStock, 0),
      overstockExcess: overstock.reduce((s, i) => s + (i.currentStock - i.recommendedStock), 0),
      total: olderThanYear.length + neverUsed.length + overstock.length,
    };
  }, [inventory]);

  const bulkReturnItems = useMemo(() => {
    return inventory
      .filter(i => {
        if (i.currentStock <= 2) return false;
        const mfr = (i.manufacturer || '').toLowerCase();
        const brand = (i.brand || '').toLowerCase();
        return !mfr.includes('fail') && !mfr.includes('교환')
          && mfr !== '보험청구' && brand !== '보험청구'
          && !mfr.includes('보험임플란트') && !brand.includes('보험임플란트');
      })
      .map(i => ({ ...i, returnQty: i.currentStock - 2 }));
  }, [inventory]);

  const deadStockItems = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    return inventory
      .filter(i => {
        const mfr = String(i.manufacturer || '');
        const brand = String(i.brand || '');
        const lowerMfr = mfr.toLowerCase();
        return !isExchangePrefix(mfr)
          && !lowerMfr.includes('수술중fail')
          && !lowerMfr.includes('fail_')
          && !lowerMfr.includes('수술중 fail')
          && mfr !== '보험청구'
          && brand !== '보험청구'
          && !mfr.includes('보험임플란트')
          && !brand.includes('보험임플란트');
      })
      .map(i => {
        const neverUsed = i.usageCount === 0;
        const lastDate = i.lastUsedDate ?? null;
        const olderThanYear = !neverUsed && lastDate !== null && lastDate < oneYearAgoStr;
        return { ...i, neverUsed, olderThanYear, lastUsedDate: lastDate };
      })
      .filter(i => i.neverUsed || i.olderThanYear)
      .sort((a, b) => {
        if (a.neverUsed && !b.neverUsed) return 1;
        if (!a.neverUsed && b.neverUsed) return -1;
        return (a.lastUsedDate ?? '') < (b.lastUsedDate ?? '') ? -1 : 1;
      });
  }, [inventory]);

  const exchangeCandidates = useMemo(() => {
    const allRows = surgeryMaster['수술기록지'] || [];
    const pending = allRows.filter(row => row['구분'] === '수술중교환');
    const byMfr: Record<string, number> = {};
    pending.forEach(row => {
      const raw = String(row['제조사'] || '기타');
      const mfr = isIbsImplantManufacturer(raw) ? 'IBS Implant' : raw;
      byMfr[mfr] = (byMfr[mfr] || 0) + 1;
    });
    const pendingByMfr: Record<string, number> = {};
    const completedByMfr: Record<string, number> = {};
    returnRequests
      .filter(r => r.reason === 'exchange' && r.status !== 'rejected')
      .forEach(r => {
        // z수술후FAIL 마커 아이템 제외 — FAIL 건수가 교환 actualCount 차감에 영향 주지 않도록
        const qty = r.items.reduce((s: number, it) => it.brand === 'z수술후FAIL' ? s : s + it.quantity, 0);
        if (r.status === 'requested' || r.status === 'picked_up') {
          pendingByMfr[r.manufacturer] = (pendingByMfr[r.manufacturer] || 0) + qty;
        } else if (r.status === 'completed') {
          // 완료된 반품도 차감 유지 — 수술기록에서 처리된 건수로 영구 차감
          completedByMfr[r.manufacturer] = (completedByMfr[r.manufacturer] || 0) + qty;
        }
      });
    const list = Object.entries(byMfr)
      .map(([manufacturer, count]) => {
        const returnPending = pendingByMfr[manufacturer] || 0;
        const returnCompleted = completedByMfr[manufacturer] || 0;
        const actualCount = Math.max(0, count - returnPending - returnCompleted);
        return { manufacturer, count, returnPending, actualCount };
      })
      .sort((a, b) => b.actualCount - a.actualCount);
    const totalActual = list.reduce((s, x) => s + x.actualCount, 0);
    return { list, total: pending.length, totalActual };
  }, [surgeryMaster, returnRequests]);

  const kpiData = useMemo(() => {
    const pendingReplenishments = orders.filter(o => o.type === 'replenishment' && o.status === 'ordered');
    const pendingReplenishmentQty = pendingReplenishments.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const receivedOrders = orders.filter(o => o.status === 'received');
    const receivedQty = receivedOrders.reduce((acc, o) => acc + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    const pendingExcRet = orders.filter(o => (o.type === 'fail_exchange' || o.type === 'return') && o.status === 'ordered');
    const lowStockDeficit = lowStockItems.reduce((acc, entry) => acc + entry.remainingDeficit, 0);

    return {
      pendingRepCount: pendingReplenishments.length,
      pendingRepQty: pendingReplenishmentQty,
      receivedCount: receivedOrders.length,
      receivedQty,
      pendingExcRetCount: pendingExcRet.length,
      lowStockCount: lowStockItems.length,
      lowStockQty: lowStockDeficit,
    };
  }, [orders, lowStockItems]);

  const monthlyOrderData = useMemo(() => {
    const monthMap: Record<string, { replenishment: number; fail_exchange: number; total: number }> = {};
    orders.forEach(o => {
      const d = o.date;
      if (!d || d.length < 7) return;
      const month = d.substring(0, 7);
      if (!monthMap[month]) monthMap[month] = { replenishment: 0, fail_exchange: 0, total: 0 };
      const qty = o.items.reduce((s, item) => s + Number(item.quantity || 0), 0);
      if (o.type === 'replenishment') monthMap[month].replenishment += qty;
      else monthMap[month].fail_exchange += qty;
      monthMap[month].total += qty;
    });
    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }, [orders]);

  const manufacturerDonut = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => {
      counts[o.manufacturer] = (counts[o.manufacturer] || 0) + 1;
    });
    const total = orders.length;
    if (total === 0) return [];
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([name, count], i) => ({
        name, count,
        percent: Math.round((count / total) * 100),
        color: DONUT_COLORS[i % DONUT_COLORS.length],
      }));
  }, [orders]);

  const donutPaths = useMemo(() => {
    const total = manufacturerDonut.reduce((s, d) => s + d.count, 0);
    if (total === 0) return [];
    const r = 50, cx = 60, cy = 60;
    let cumulativeAngle = -90;
    return manufacturerDonut.map(seg => {
      const angle = (seg.count / total) * 360;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const x1 = cx + r * Math.cos(startRad);
      const y1 = cy + r * Math.sin(startRad);
      const x2 = cx + r * Math.cos(endRad);
      const y2 = cy + r * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;
      const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
      return { ...seg, path };
    });
  }, [manufacturerDonut]);

  const groupedLowStock = useMemo(() => {
    const groups: Record<string, LowStockEntry[]> = {};
    lowStockItems.forEach(entry => {
      const m = entry.item.manufacturer;
      if (!groups[m]) groups[m] = [];
      groups[m].push(entry);
    });
    return Object.entries(groups).sort(([, a], [, b]) => b.length - a.length);
  }, [lowStockItems]);

  const orderedLowStockGroups = useMemo(() => {
    const groups: Record<string, number> = {};
    inventory
      .filter(item => simpleNormalize(item.manufacturer) !== simpleNormalize('보험임플란트'))
      .forEach(item => {
        const rawDeficit = Math.max(0, item.recommendedStock - item.currentStock);
        if (rawDeficit <= 0) return;
        const pendingQty = pendingQtyByItemKey.get(buildOrderItemKey(item.manufacturer, item.brand, item.size)) ?? 0;
        if (Math.max(0, rawDeficit - pendingQty) > 0) return;
        const mfr = displayMfr(item.manufacturer);
        groups[mfr] = (groups[mfr] || 0) + 1;
      });
    return Object.entries(groups).sort(([, a], [, b]) => b - a);
  }, [inventory, pendingQtyByItemKey]);

  const manufacturerOptions = useMemo(() => {
    const set = new Set(orders.map(o => o.manufacturer));
    return Array.from(set).sort();
  }, [orders]);

  return {
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
  };
}
