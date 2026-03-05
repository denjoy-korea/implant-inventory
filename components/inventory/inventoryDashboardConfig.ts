import { InventoryDetailColumnKey, InventoryDetailColumnVisibility } from './inventoryTypes';

export const USAGE_TOP_ITEMS = 7;

export { toMonthKey } from '../../services/dateUtils';

export const INVENTORY_DETAIL_COLUMNS: Array<{ key: InventoryDetailColumnKey; label: string }> = [
  { key: 'manufacturer', label: '제조사' },
  { key: 'brand', label: '브랜드' },
  { key: 'size', label: '규격' },
  { key: 'initialStock', label: '기초 재고' },
  { key: 'usageCount', label: '사용량' },
  { key: 'monthlyAvgUsage', label: '월평균사용' },
  { key: 'dailyMaxUsage', label: '일최대사용' },
  { key: 'currentStock', label: '현재 재고' },
  { key: 'recommendedStock', label: '권장량' },
];

export const DEFAULT_INVENTORY_DETAIL_COLUMN_VISIBILITY: InventoryDetailColumnVisibility = {
  manufacturer: true,
  brand: true,
  size: true,
  initialStock: true,
  usageCount: true,
  monthlyAvgUsage: true,
  dailyMaxUsage: true,
  currentStock: true,
  recommendedStock: true,
};
