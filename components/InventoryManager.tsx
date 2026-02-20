
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, ExcelData, PlanType, PLAN_LIMITS, SurgeryUnregisteredItem } from '../types';
import { planService } from '../services/planService';
import { fixIbsImplant } from '../services/mappers';
import { getSizeMatchKey } from '../services/sizeNormalizer';
import { normalizeSurgery } from '../services/normalizationService';
import { smoothLine, smoothArea } from './surgery-dashboard/shared';
import AddItemModal from './AddItemModal';
import EditNoticeModal from './inventory/EditNoticeModal';
import BaseStockModal from './inventory/BaseStockModal';
import OptimizeModal from './inventory/OptimizeModal';
import UnregisteredDetailModal from './inventory/UnregisteredDetailModal';
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
}

const USAGE_TOP_ITEMS = 7;

function toMonthKey(value: unknown): string | null {
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



type InventoryDetailColumnKey =
  | 'manufacturer'
  | 'brand'
  | 'size'
  | 'initialStock'
  | 'usageCount'
  | 'monthlyAvgUsage'
  | 'dailyMaxUsage'
  | 'currentStock'
  | 'recommendedStock';

const INVENTORY_DETAIL_COLUMNS: Array<{ key: InventoryDetailColumnKey; label: string }> = [
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

const DEFAULT_INVENTORY_DETAIL_COLUMN_VISIBILITY: Record<InventoryDetailColumnKey, boolean> = {
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
}) => {
  const [monthFactor, setMonthFactor] = useState<number>(1);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});
  const [showEditNotice, setShowEditNotice] = useState(false);
  const [showBaseStockModal, setShowBaseStockModal] = useState(false);
  const [showUnregisteredDetailModal, setShowUnregisteredDetailModal] = useState(false);
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [showOnlyOrderNeededRows, setShowOnlyOrderNeededRows] = useState(false);
  const [showInventoryDetailColumnFilter, setShowInventoryDetailColumnFilter] = useState(false);
  const [inventoryDetailColumnVisibility, setInventoryDetailColumnVisibility] = useState<Record<InventoryDetailColumnKey, boolean>>(
    DEFAULT_INVENTORY_DETAIL_COLUMN_VISIBILITY
  );
  const inventoryDetailColumnFilterRef = useRef<HTMLDivElement | null>(null);

  const maxEdits = PLAN_LIMITS[plan].maxBaseStockEdits;
  const isUnlimited = maxEdits === Infinity;
  const [editCount, setEditCount] = useState(0);
  const editCountLoadedRef = useRef(false);
  const isEditExhausted = !isUnlimited && editCount >= maxEdits;

  // 서버에서 기초재고 수정 횟수 로드 (hospitalId 있을 때만)
  useEffect(() => {
    if (!hospitalId || isUnlimited) return;
    editCountLoadedRef.current = false;
    planService.getBaseStockEditCount(hospitalId).then(count => {
      setEditCount(count);
      editCountLoadedRef.current = true;
    });
  }, [hospitalId, isUnlimited]);

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
      .filter(i => !i.manufacturer.startsWith('수술중FAIL_') && i.manufacturer !== '보험청구')
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

  const handleEditChange = (field: keyof InventoryItem, value: any) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleInventoryDetailColumn = (columnKey: InventoryDetailColumnKey) => {
    setInventoryDetailColumnVisibility(prev => {
      const visibleCount = INVENTORY_DETAIL_COLUMNS.reduce((count, column) => (
        prev[column.key] ? count + 1 : count
      ), 0);

      if (prev[columnKey] && visibleCount <= 1) return prev;
      return { ...prev, [columnKey]: !prev[columnKey] };
    });
  };

  useEffect(() => {
    if (!showInventoryDetailColumnFilter) return;
    const handleOutside = (event: MouseEvent) => {
      if (!inventoryDetailColumnFilterRef.current) return;
      if (!inventoryDetailColumnFilterRef.current.contains(event.target as Node)) {
        setShowInventoryDetailColumnFilter(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
    };
  }, [showInventoryDetailColumnFilter]);

  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
  );

  const preferredUnregisteredViewMode = useMemo<'not_in_inventory' | 'non_list_input'>(
    () => (unregisteredFromSurgery.some(item => item.reason !== 'non_list_input') ? 'not_in_inventory' : 'non_list_input'),
    [unregisteredFromSurgery]
  );

  const handleBaseStockSaved = (serverCount: number) => {
    if (serverCount >= 0) {
      setEditCount(serverCount);
      return;
    }
    setEditCount(prev => prev + 1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ================================================= */}
      {/* Sticky Header Block                               */}
      {/* ================================================= */}
      <div
        className="sticky z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50/80 backdrop-blur-md"
        style={{ top: 'var(--dashboard-header-height, 44px)', boxShadow: '0 4px 12px -4px rgba(0,0,0,0.05)' }}
      >
        {/* A. Header Strip */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl border border-white/60 p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100/50">
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
              <button onClick={() => { if (!isReadOnly) { setEditFormData({ initialStock: 0 }); setIsAddingItem(true); } }} disabled={isReadOnly} className={`px-4 py-2 text-xs font-black rounded-lg shadow-md transition-all flex items-center gap-1.5 ${isReadOnly ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'}`}>
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                품목 추가
              </button>
            </div>
          </div>
        </div>

        {/* C. Manufacturer Filter Strip */}
        <div className="bg-white/90 backdrop-blur-xl rounded-2xl px-5 py-3 border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] ring-1 ring-slate-100/50">
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-50">
          <div>
            <h3 className="text-sm font-black text-slate-800 tracking-tight">규격별 사용량 분석</h3>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mt-0.5">Usage Analysis by Specification</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">TOP {Math.min(chartData.length, USAGE_TOP_ITEMS)}</span>
            <div className="w-px h-3 bg-slate-200" />
            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">
              {selectedManufacturer ?? '전체'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px]">
          {/* ── 좌측: 수평 바 차트 ── */}
          <div className="px-6 py-4">
            {/* 컬럼 헤더 */}
            {chartData.length > 0 && (
              <div className="flex items-center gap-3 mb-2 pb-2 border-b border-slate-50">
                <span className="w-5 shrink-0" />
                <div className="w-[100px] shrink-0" />
                <div className="flex-1 max-w-[280px]" />
                <div className="w-[280px] shrink-0 grid grid-cols-4 gap-0">
                  <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">월평균</p>
                  <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">지난달</p>
                  <p className="text-[9px] font-bold text-slate-400 text-center uppercase tracking-wide">현재재고</p>
                  <p className="text-[9px] font-bold text-rose-400 text-center uppercase tracking-wide">부족분</p>
                </div>
                <div className="w-[176px] shrink-0 text-center">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">사용 추이</p>
                  <p className="text-[9px] font-semibold text-indigo-400 mt-0.5">값 시작월~종료월</p>
                </div>
                <span className="w-2 shrink-0" />
              </div>
            )}
            <div className="space-y-2">
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
                    <div className="flex-1 max-w-[280px] h-1.5 bg-slate-50 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ease-out ${isTop ? 'bg-gradient-to-r from-indigo-500 to-violet-400' : 'bg-indigo-200 group-hover:bg-indigo-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    {/* 수치 그리드 */}
                    <div className="w-[280px] shrink-0 grid grid-cols-4 gap-0 items-center">
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
                    <div className="w-[176px] shrink-0 px-2">
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

          {/* ── 우측: 재고 확보 패널 ── */}
          <div className="lg:border-l border-t lg:border-t-0 border-slate-100 px-5 py-5 flex flex-row lg:flex-col justify-between gap-4 min-w-[180px]">

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
        <div className="flex items-center gap-4 px-6 py-2.5 bg-slate-50/60 border-t border-slate-50">
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

      {/* ================================================= */}
      {/* Deep Analysis Divider                             */}
      {/* ================================================= */}
      <div className="flex items-center gap-4 py-4">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
        <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 rounded-full border border-slate-100">
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
          <span className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-semibold">Inventory Detail</span>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ================================================= */}
      {/* Table Card                                        */}
      {/* ================================================= */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
          <div className="flex-1 min-w-0" />
          <div className="flex items-center gap-2">
            <div className="relative" ref={inventoryDetailColumnFilterRef}>
              <button
                type="button"
                onClick={() => setShowInventoryDetailColumnFilter(prev => !prev)}
                aria-label="재고 상세 컬럼 필터 열기"
                title="컬럼 필터"
                className={`p-2 rounded-lg border transition-all ${showInventoryDetailColumnFilter
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                </svg>
              </button>
              {showInventoryDetailColumnFilter && (
                <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl border border-slate-200 shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {INVENTORY_DETAIL_COLUMNS.map((column, idx) => {
                    const isVisible = inventoryDetailColumnVisibility[column.key];
                    return (
                      <button
                        key={column.key}
                        type="button"
                        onClick={() => toggleInventoryDetailColumn(column.key)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-50 transition-colors"
                        aria-label={`${column.label} 컬럼 ${isVisible ? '숨기기' : '보이기'}`}
                        title={isVisible ? `${column.label} 숨기기` : `${column.label} 표시`}
                      >
                        <span className="text-slate-300 px-1 shrink-0" aria-hidden="true">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <circle cx="9" cy="5" r="1.5" />
                            <circle cx="15" cy="5" r="1.5" />
                            <circle cx="9" cy="12" r="1.5" />
                            <circle cx="15" cy="12" r="1.5" />
                            <circle cx="9" cy="19" r="1.5" />
                            <circle cx="15" cy="19" r="1.5" />
                          </svg>
                        </span>
                        <span className="shrink-0">
                          {isVisible ? (
                            <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                            </svg>
                          )}
                        </span>
                        <span className={`flex-1 text-left font-medium ${isVisible ? 'text-slate-700' : 'text-slate-400'}`}>{column.label}</span>
                        <span className="text-[9px] text-slate-300 tabular-nums w-4 text-right">{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowOnlyOrderNeededRows(prev => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${showOnlyOrderNeededRows
                  ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              title="권장량 대비 주문이 필요한 항목만 보기"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
              </svg>
              {showOnlyOrderNeededRows ? '전체보기' : '주문 필요'}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky z-10 bg-slate-50/90 backdrop-blur-md border-b border-slate-200 shadow-sm" style={{ top: 'var(--dashboard-header-height, 44px)' }}>
              <tr>
                {inventoryDetailColumnVisibility.manufacturer && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="h-4 mb-1" />
                    제조사
                  </th>
                )}
                {inventoryDetailColumnVisibility.brand && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="h-4 mb-1" />
                    브랜드
                  </th>
                )}
                {inventoryDetailColumnVisibility.size && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                    <div className="h-4 mb-1" />
                    규격
                  </th>
                )}
                {inventoryDetailColumnVisibility.initialStock && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    기초 재고
                  </th>
                )}
                {inventoryDetailColumnVisibility.usageCount && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 text-center tracking-widest">
                    <div className="text-sm font-black text-rose-500 tabular-nums h-4 mb-1 flex items-center justify-center">{inventoryDetailUsageTotal}</div>
                    사용량
                  </th>
                )}
                {inventoryDetailColumnVisibility.monthlyAvgUsage && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-indigo-400 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    월평균사용
                  </th>
                )}
                {inventoryDetailColumnVisibility.dailyMaxUsage && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-indigo-400 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    일최대사용
                  </th>
                )}
                {inventoryDetailColumnVisibility.currentStock && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-slate-500 text-center tracking-widest">
                    <div className="text-sm font-black text-slate-800 tabular-nums h-4 mb-1 flex items-center justify-center">{inventoryDetailCurrentStockTotal}</div>
                    현재 재고
                  </th>
                )}
                {inventoryDetailColumnVisibility.recommendedStock && (
                  <th className="px-6 pt-2 pb-2 text-[11px] font-black text-indigo-600 text-center tracking-widest">
                    <div className="h-4 mb-1" />
                    권장량
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventoryDetailRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={Math.max(1, inventoryDetailVisibleColumnCount)}
                    className="px-6 py-8 text-center text-sm font-semibold text-slate-400"
                  >
                    조건에 맞는 재고 항목이 없습니다.
                  </td>
                </tr>
              ) : (
                inventoryDetailRows.map((item, idx) => {
                  const recommended = Math.ceil((item.recommendedStock ?? 0) * monthFactor);
                  const isLowStock = item.currentStock < recommended;
                  const isEven = idx % 2 === 1;

                  return (
                    <tr key={item.id} className={`group transition-all duration-200 hover:bg-indigo-50/60 hover:shadow-[inset_3px_0_0_#818cf8] ${isEven ? 'bg-slate-100/70' : 'bg-white'}`}>
                      {inventoryDetailColumnVisibility.manufacturer && (
                        <td className="px-6 py-2.5 text-[10px] font-bold text-slate-400 group-hover:text-slate-500 transition-colors">{item.manufacturer}</td>
                      )}
                      {inventoryDetailColumnVisibility.brand && (
                        <td className="px-6 py-2.5 text-sm font-black text-slate-800 tracking-tight group-hover:text-indigo-900 transition-colors">{item.brand}</td>
                      )}
                      {inventoryDetailColumnVisibility.size && (
                        <td className="px-6 py-2.5 text-sm font-semibold text-slate-600">{item.size}</td>
                      )}
                      {inventoryDetailColumnVisibility.initialStock && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-slate-700 tabular-nums">
                          {item.initialStock}
                        </td>
                      )}
                      {inventoryDetailColumnVisibility.usageCount && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-rose-500 tabular-nums">{item.usageCount > 0 ? `-${item.usageCount}` : '0'}</td>
                      )}
                      {inventoryDetailColumnVisibility.monthlyAvgUsage && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-indigo-600 tabular-nums">{item.monthlyAvgUsage ?? 0}</td>
                      )}
                      {inventoryDetailColumnVisibility.dailyMaxUsage && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-indigo-600 tabular-nums">{item.dailyMaxUsage ?? 0}</td>
                      )}
                      {inventoryDetailColumnVisibility.currentStock && (
                        <td className={`px-6 py-2.5 text-center text-sm font-black tabular-nums transition-colors ${isLowStock ? 'text-rose-600 bg-rose-50/60' : 'text-slate-900'}`}>
                          {item.currentStock}
                        </td>
                      )}
                      {inventoryDetailColumnVisibility.recommendedStock && (
                        <td className="px-6 py-2.5 text-center text-sm font-black text-indigo-600 tabular-nums">{recommended}</td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

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
            setIsAddingItem(false);
            setEditFormData({});
          }}
          onClose={() => {
            setIsAddingItem(false);
            setEditFormData({});
          }}
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
          onAfterSave={handleBaseStockSaved}
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
