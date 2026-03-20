import { useMemo } from 'react';
import type { InventoryItem, Order, PlanType, SurgeryUnregisteredItem } from '../types';
import { PLAN_LIMITS } from '../types/plan';
import { isExchangePrefix } from '../services/appUtils';

interface UseInventoryManagerDataParams {
  inventory: InventoryItem[];
  orders: Order[];
  plan: PlanType;
  unregisteredFromSurgery: SurgeryUnregisteredItem[];
}

export function useInventoryManagerData({
  inventory,
  orders,
  plan,
  unregisteredFromSurgery,
}: UseInventoryManagerDataParams) {
  /** 수술중교환_ / 수술후FAIL / 보험청구 항목 제외한 실제 표시 대상 */
  const visibleInventory = useMemo(() => {
    return inventory.filter(item =>
      !isExchangePrefix(item.manufacturer) &&
      !item.manufacturer.startsWith('z수술후FAIL') &&
      item.manufacturer !== '보험청구' &&
      item.brand !== '보험임플란트'
    );
  }, [inventory]);

  /** 숨겨진 교환/청구 항목 수 */
  const hiddenCategoryCount = useMemo(() => {
    return inventory.length - visibleInventory.length;
  }, [inventory, visibleInventory]);

  const manufacturersList = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => { if (item.manufacturer) set.add(item.manufacturer); });
    return Array.from(set).sort();
  }, [visibleInventory]);

  /** 발주 대기 중(ordered)인 품목 키 집합: "제조사|브랜드|사이즈" */
  const pendingOrderKeys = useMemo(() => {
    const keys = new Set<string>();
    orders
      .filter(o => o.status === 'ordered' && o.type === 'replenishment')
      .forEach(o => o.items.forEach(i => keys.add(`${o.manufacturer}|${i.brand}|${i.size}`)));
    return keys;
  }, [orders]);

  // 미사용 / 장기 미사용 품목 분류 (최적화 대상)
  const deadStockItems = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0];

    return inventory
      .filter(i => {
        const manufacturer = String(i.manufacturer || '');
        const brand = String(i.brand || '');
        const lowerManufacturer = manufacturer.toLowerCase();
        const isFailCategory = isExchangePrefix(manufacturer)
          || manufacturer.startsWith('z수술후FAIL')
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
        if (a.neverUsed && !b.neverUsed) return 1;
        if (!a.neverUsed && b.neverUsed) return -1;
        return (a.lastUsedDate ?? '') < (b.lastUsedDate ?? '') ? -1 : 1;
      });
  }, [inventory]);

  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
  );

  const preferredUnregisteredViewMode = useMemo<'not_in_inventory' | 'non_list_input'>(
    () => (unregisteredFromSurgery.some(item => item.reason !== 'non_list_input') ? 'not_in_inventory' : 'non_list_input'),
    [unregisteredFromSurgery]
  );

  const sparklineMonths = useMemo(() => {
    const retentionMonths = PLAN_LIMITS[plan]?.retentionMonths ?? 3;
    return Math.min(Math.max(retentionMonths, 3), 24);
  }, [plan]);

  return {
    visibleInventory,
    hiddenCategoryCount,
    manufacturersList,
    pendingOrderKeys,
    deadStockItems,
    unregisteredUsageTotal,
    preferredUnregisteredViewMode,
    sparklineMonths,
  };
}
