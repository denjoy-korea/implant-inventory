import { InventoryDetailColumnKey, InventoryDetailColumnVisibility } from './inventoryTypes';

export const USAGE_TOP_ITEMS = 7;

export function toMonthKey(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  let date: Date | null = null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    date = value;
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date -> JS Date
    const excelEpochMs = Date.UTC(1899, 11, 30);
    date = new Date(excelEpochMs + value * 24 * 60 * 60 * 1000);
  } else {
    const parsed = new Date(String(value));
    if (!Number.isNaN(parsed.getTime())) date = parsed;
  }

  if (!date) return null;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

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
