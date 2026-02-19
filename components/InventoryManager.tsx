
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { InventoryItem, ExcelData, PlanType, PLAN_LIMITS, SurgeryUnregisteredItem } from '../types';
import { planService } from '../services/planService';
import { fixIbsImplant } from '../services/mappers';
import { getSizeMatchKey, toCanonicalSize } from '../services/sizeNormalizer';
import { normalizeSurgery } from '../services/normalizationService';
import AddItemModal from './AddItemModal';
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

type SizePattern =
  | 'phi'
  | 'oslash-mm'
  | 'oslash-l'
  | 'cuff-phi'
  | 'dl-cuff'
  | 'numeric-code'
  | 'bare-numeric'
  | 'other'
  | 'empty';

const SIZE_PATTERN_LABELS: Record<SizePattern, string> = {
  phi: 'Φ x 형',
  'oslash-mm': 'Ø x mm형',
  'oslash-l': 'Ø / L형',
  'cuff-phi': 'Cuff+Φ형',
  'dl-cuff': 'D:L: 형',
  'numeric-code': '숫자코드',
  'bare-numeric': 'N x N형',
  other: '기타',
  empty: '빈 값',
};
const USAGE_TOP_ITEMS = 7;
const BULK_REGISTER_CONCURRENCY = 6;

interface DentwebGuideStep {
  title: string;
  imageSrc: string;
  imageAlt: string;
  description: string;
  isWarning?: boolean;
}

const DENTWEB_GUIDE_STEPS: DentwebGuideStep[] = [
  {
    title: '1) 경영/통계 → 임플란트 수술통계 → 기간설정 → 해당 기록지 더블클릭',
    imageSrc: '/guide-dentweb-step4.png',
    imageAlt: '경영통계 진입 가이드',
    description: '상단 메뉴와 좌측 메뉴에서 임플란트 수술 통계 화면으로 이동한 뒤, 기간을 맞추고 우측 기록을 더블클릭합니다.',
  },
  {
    title: '2) 수술기록지에서 편집가능상태 전환 후 Fixture 클릭',
    imageSrc: '/guide-dentweb-step3.png',
    imageAlt: '수술기록지 편집 상태 전환 및 Fixture 클릭 가이드',
    description: '수술기록지 하단 편집가능상태로 전환 버튼을 누르고 Fixture 영역을 클릭해 선택 팝업을 엽니다.',
  },
  {
    title: '3) 제조사-브랜드-규격 목록에서 선택 후 선택완료',
    imageSrc: '/guide-dentweb-step2.png',
    imageAlt: '제조사-브랜드-규격 목록 선택 가이드',
    description: '직접 타이핑하지 말고 제조사/브랜드/규격을 목록에서 선택한 뒤 선택완료를 누릅니다.',
  },
  {
    title: '4) 직접입력은 절대 사용 금지 (목록 선택만 허용)',
    imageSrc: '/guide-dentweb-step1.png',
    imageAlt: '직접입력 금지 가이드',
    description: '이 화면의 직접입력 칸은 금지 입력 방식입니다. 반드시 목록 선택으로만 입력해야 통계/재고 데이터가 정확합니다.',
    isWarning: true,
  },
];

function detectSizePattern(size: string): SizePattern {
  const s = size.trim();
  if (!s) return 'empty';
  if (/^C\d+\s*[Φφ]/i.test(s)) return 'cuff-phi';
  if (/[Φφ]\s*\d/.test(s)) return 'phi';
  if (/[Øø]\s*\d.*\/\s*L/i.test(s)) return 'oslash-l';
  if (/[Øø]\s*\d.*mm/i.test(s)) return 'oslash-mm';
  if (/D[:\s]*\d.*L[:\s]*\d/i.test(s)) return 'dl-cuff';
  if (/^\d{4,6}[a-zA-Z]*$/.test(s)) return 'numeric-code';
  if (/\d+\.?\d*\s*[×xX*]\s*\d/.test(s)) return 'bare-numeric';
  return 'other';
}

function pickDominantPattern(patterns: SizePattern[]): SizePattern {
  const counts = new Map<SizePattern, number>();
  patterns.forEach(pattern => {
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0]?.[0] ?? 'other';
}

function manufacturerAliasKey(raw: string): string {
  return normalizeSurgery(raw).replace(/implant/g, '');
}

function isSameManufacturerAlias(a: string, b: string): boolean {
  const aa = manufacturerAliasKey(a);
  const bb = manufacturerAliasKey(b);
  if (!aa || !bb) return false;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

function buildInventoryDuplicateKeyLocal(
  manufacturer: string,
  brand: string,
  size: string
): string {
  const fixed = fixIbsImplant(String(manufacturer || '').trim(), String(brand || '').trim());
  const canonicalSize = toCanonicalSize(String(size || '').trim(), fixed.manufacturer);
  const compactManufacturer = fixed.manufacturer.toLowerCase().replace(/\s+/g, '');
  const manufacturerKey = compactManufacturer.startsWith('수술중fail')
    ? `fail:${normalizeSurgery(fixed.manufacturer)}`
    : normalizeSurgery(fixed.manufacturer).replace(/implant/g, '');
  const brandKey = normalizeSurgery(fixed.brand);
  const sizeKey = getSizeMatchKey(canonicalSize, fixed.manufacturer);
  return `${manufacturerKey}|${brandKey}|${sizeKey}`;
}

interface UnregisteredReviewItem extends SurgeryUnregisteredItem {
  rowKey: string;
  canonicalManufacturer: string;
  canonicalBrand: string;
  canonicalSize: string;
  resolvedManufacturerFromExisting: boolean;
  hasBaseline: boolean;
  isConsistent: boolean;
  actualPattern: SizePattern;
  actualPatternLabel: string;
  baselinePattern: SizePattern | null;
  baselinePatternLabel: string | null;
  isDuplicate: boolean;
  canRegister: boolean;
  registerBlockReason: string | null;
  preferredManualFixSize: string;
}

interface ManualFixCheckResult {
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
}

interface ManualFixDraft {
  manufacturer: string;
  brand: string;
  size: string;
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
}) => {
  const [monthFactor, setMonthFactor] = useState<number>(1);
  const [selectedManufacturer, setSelectedManufacturer] = useState<string | null>(null);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [editFormData, setEditFormData] = useState<Partial<InventoryItem>>({});
  const [showEditNotice, setShowEditNotice] = useState(false);
  const [showBaseStockModal, setShowBaseStockModal] = useState(false);
  const [baseStockInputs, setBaseStockInputs] = useState<Record<string, number>>({});
  const [baseStockManufacturerFilter, setBaseStockManufacturerFilter] = useState<string | null>(null);
  const [baseStockBrandFilter, setBaseStockBrandFilter] = useState<string | null>(null);
  const [isSavingBaseStock, setIsSavingBaseStock] = useState(false);
  const [showUnregisteredDetailModal, setShowUnregisteredDetailModal] = useState(false);
  const [showDentwebGuideModal, setShowDentwebGuideModal] = useState(false);
  const [dentwebGuideStepIndex, setDentwebGuideStepIndex] = useState(0);
  const [manualFixTarget, setManualFixTarget] = useState<UnregisteredReviewItem | null>(null);
  const [manualFixCheckResult, setManualFixCheckResult] = useState<ManualFixCheckResult | null>(null);
  const [manualFixError, setManualFixError] = useState<string | null>(null);
  const [isManualFixVerifying, setIsManualFixVerifying] = useState(false);
  const [isManualFixApplying, setIsManualFixApplying] = useState(false);
  const [isManualFixEditing, setIsManualFixEditing] = useState(false);
  const [manualFixDraft, setManualFixDraft] = useState<ManualFixDraft>({
    manufacturer: '',
    brand: '',
    size: '',
  });
  const [unregisteredSearch, setUnregisteredSearch] = useState('');
  const [unregisteredViewMode, setUnregisteredViewMode] = useState<'not_in_inventory' | 'non_list_input'>('not_in_inventory');
  const [registeringUnregistered, setRegisteringUnregistered] = useState<Record<string, boolean>>({});
  const [isBulkRegistering, setIsBulkRegistering] = useState(false);
  const [bulkRegisterProgress, setBulkRegisterProgress] = useState<{ done: number; total: number } | null>(null);
  const [resolvedUnregisteredRows, setResolvedUnregisteredRows] = useState<Record<string, true>>({});
  const [showOptimizeModal, setShowOptimizeModal] = useState(false);
  const [optimizeFilter, setOptimizeFilter] = useState<'year' | 'never'>('year');
  const [selectedOptimizeIds, setSelectedOptimizeIds] = useState<Set<string>>(new Set());
  const [isDeletingOptimize, setIsDeletingOptimize] = useState(false);

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

  const baseStockManufacturerOptions = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => {
      if (item.manufacturer) set.add(item.manufacturer);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [visibleInventory]);

  const baseStockBrandOptions = useMemo(() => {
    const set = new Set<string>();
    visibleInventory.forEach(item => {
      if (baseStockManufacturerFilter !== null && item.manufacturer !== baseStockManufacturerFilter) return;
      if (item.brand) set.add(item.brand);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'ko'));
  }, [visibleInventory, baseStockManufacturerFilter]);

  useEffect(() => {
    if (baseStockBrandFilter === null) return;
    if (!baseStockBrandOptions.includes(baseStockBrandFilter)) {
      setBaseStockBrandFilter(null);
    }
  }, [baseStockBrandFilter, baseStockBrandOptions]);

  const baseStockFilteredRows = useMemo(() => {
    return visibleInventory
      .filter(item => baseStockManufacturerFilter === null || item.manufacturer === baseStockManufacturerFilter)
      .filter(item => baseStockBrandFilter === null || item.brand === baseStockBrandFilter)
      .sort((a, b) => {
        const mComp = a.manufacturer.localeCompare(b.manufacturer, 'ko');
        if (mComp !== 0) return mComp;
        const bComp = a.brand.localeCompare(b.brand, 'ko');
        if (bComp !== 0) return bComp;
        return a.size.localeCompare(b.size, 'ko', { numeric: true });
      });
  }, [visibleInventory, baseStockManufacturerFilter, baseStockBrandFilter]);

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

  // 긴급도 계산: 현재재고 ÷ 일최대사용 → 소진 예상일
  const urgencyData = useMemo(() => {
    const items = filteredInventory
      .filter(i => i.usageCount > 0 && (i.dailyMaxUsage ?? 0) > 0)
      .map(i => {
        const daily = i.dailyMaxUsage ?? 0;
        const daysLeft = daily > 0 ? Math.floor(i.currentStock / daily) : Infinity;
        const level: 'critical' | 'warning' | 'ok' =
          daysLeft <= 3 ? 'critical' : daysLeft <= 7 ? 'warning' : 'ok';
        return { ...i, daysLeft, level };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft);
    const critical = items.filter(i => i.level === 'critical');
    const warning  = items.filter(i => i.level === 'warning');
    const mostUrgent = items[0] ?? null;
    return { critical, warning, mostUrgent };
  }, [filteredInventory]);

  // KPI 집계
  const kpiData = useMemo(() => {
    const totalUsage = filteredInventory.reduce((s, i) => s + i.usageCount, 0);
    const totalStock = filteredInventory.reduce((s, i) => s + i.currentStock, 0);
    const totalItems = filteredInventory.length;
    const shortageCount = filteredInventory.filter(i => i.currentStock < Math.ceil(i.recommendedStock * monthFactor)).length;
    const shortageRate = totalItems > 0 ? Math.round((shortageCount / totalItems) * 100) : 0;

    // 현재재고 충분도: 전체 재고 ÷ 월평균 총사용량 (몇 달치인지)
    const totalMonthlyDemand = filteredInventory.reduce((s, i) => s + (i.monthlyAvgUsage ?? 0), 0);
    const stockMonths = totalMonthlyDemand > 0 ? totalStock / totalMonthlyDemand : null;

    // 총사용량 vs 권장재고 비율 (사용률)
    const totalRecommended = filteredInventory.reduce((s, i) => s + Math.ceil(i.recommendedStock * monthFactor), 0);
    const usageVsRecommended = totalRecommended > 0 ? Math.round((totalUsage / totalRecommended) * 100) : null;

    return { totalUsage, totalStock, totalItems, shortageCount, shortageRate, stockMonths, usageVsRecommended };
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

  const openBaseStockModal = () => {
    const seededInputs: Record<string, number> = {};
    visibleInventory.forEach(item => {
      const safeCurrentStock = Number.isFinite(item.currentStock) ? item.currentStock : 0;
      seededInputs[item.id] = Math.max(0, Math.round(safeCurrentStock));
    });
    setBaseStockInputs(seededInputs);
    setBaseStockManufacturerFilter(null);
    setBaseStockBrandFilter(null);
    setShowBaseStockModal(true);
  };

  const handleBaseStockInputChange = (itemId: string, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const next = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    setBaseStockInputs(prev => ({ ...prev, [itemId]: next }));
  };

  const handleBaseStockModalClose = () => {
    if (isSavingBaseStock) return;
    setShowBaseStockModal(false);
    setBaseStockInputs({});
    setBaseStockManufacturerFilter(null);
    setBaseStockBrandFilter(null);
  };


  const inputStyle = "w-full p-2 text-xs text-slate-900 bg-white border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-bold";
  const highlightedInputStyle = "w-full p-2 text-xs text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg outline-none font-bold";

  const existingPatternBaseline = useMemo(() => {
    const groupedPatterns = new Map<string, SizePattern[]>();
    visibleInventory.forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const canonicalSize = toCanonicalSize(item.size, fixed.manufacturer);
      const key = `${normalizeSurgery(fixed.manufacturer)}|${normalizeSurgery(fixed.brand)}`;
      const list = groupedPatterns.get(key) ?? [];
      list.push(detectSizePattern(canonicalSize));
      groupedPatterns.set(key, list);
    });

    const baselineMap = new Map<string, { dominantPattern: SizePattern; sampleCount: number }>();
    groupedPatterns.forEach((patterns, key) => {
      baselineMap.set(key, {
        dominantPattern: pickDominantPattern(patterns),
        sampleCount: patterns.length,
      });
    });
    return baselineMap;
  }, [visibleInventory]);

  const existingInventoryKeySet = useMemo(() => {
    const keySet = new Set<string>();
    visibleInventory.forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const canonicalSize = toCanonicalSize(item.size, fixed.manufacturer).trim().toLowerCase();
      keySet.add(`${normalizeSurgery(fixed.manufacturer)}|${normalizeSurgery(fixed.brand)}|${canonicalSize}`);
    });
    return keySet;
  }, [visibleInventory]);

  const allInventoryDuplicateKeySet = useMemo(() => {
    const keySet = new Set<string>();
    inventory.forEach(item => {
      keySet.add(buildInventoryDuplicateKeyLocal(item.manufacturer, item.brand, item.size));
    });
    return keySet;
  }, [inventory]);

  const existingManufacturersByBrand = useMemo(() => {
    const map = new Map<string, string[]>();
    visibleInventory.forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const brandKey = normalizeSurgery(fixed.brand);
      if (!brandKey) return;
      const list = map.get(brandKey) ?? [];
      if (!list.includes(fixed.manufacturer)) list.push(fixed.manufacturer);
      map.set(brandKey, list);
    });

    return map;
  }, [visibleInventory]);

  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
  );
  const unregisteredReviewItems = useMemo<UnregisteredReviewItem[]>(() => {
    return unregisteredFromSurgery.map(item => {
      const fixed = fixIbsImplant(String(item.manufacturer || '').trim(), String(item.brand || '').trim());
      const normalizedBrand = normalizeSurgery(fixed.brand);
      const candidateManufacturers = existingManufacturersByBrand.get(normalizedBrand) ?? [];
      const resolvedManufacturer =
        candidateManufacturers.find(m => isSameManufacturerAlias(m, fixed.manufacturer))
        ?? candidateManufacturers.find(m => normalizeSurgery(m) === normalizeSurgery(fixed.manufacturer))
        ?? fixed.manufacturer;
      const canonicalSize = toCanonicalSize(String(item.size || '').trim(), resolvedManufacturer).trim();
      const normalizedManufacturer = normalizeSurgery(resolvedManufacturer);
      const normalizedSize = canonicalSize.toLowerCase();
      const groupKey = `${normalizedManufacturer}|${normalizedBrand}`;
      const rowKey = `${groupKey}|${normalizedSize}`;

      const baseline = existingPatternBaseline.get(groupKey) ?? null;
      const actualPattern = detectSizePattern(canonicalSize);
      const hasBaseline = !!baseline;
      const isConsistent = !hasBaseline || actualPattern === baseline.dominantPattern;
      const isDuplicate = existingInventoryKeySet.has(rowKey);
      const canonicalSizeKey = getSizeMatchKey(canonicalSize, resolvedManufacturer);
      const preferredInventorySize = visibleInventory.find(inv => {
        const invFixed = fixIbsImplant(inv.manufacturer, inv.brand);
        return (
          normalizeSurgery(invFixed.brand) === normalizedBrand &&
          isSameManufacturerAlias(invFixed.manufacturer, resolvedManufacturer) &&
          getSizeMatchKey(inv.size, invFixed.manufacturer) === canonicalSizeKey
        );
      })?.size;
      const preferredManualFixSize = preferredInventorySize || canonicalSize;

      let registerBlockReason: string | null = null;
      if (!fixed.manufacturer || !fixed.brand || !canonicalSize || canonicalSize === '-') {
        registerBlockReason = '제조사/브랜드/규격 정보가 부족합니다';
      } else if (item.reason === 'non_list_input') {
        registerBlockReason = '목록 선택이 아닌 수기 입력입니다. 수술기록 원본 표기를 수정하세요';
      } else if (!hasBaseline) {
        registerBlockReason = '기존 제조사-브랜드 규격 기준이 없어 등록할 수 없습니다';
      } else if (isDuplicate) {
        registerBlockReason = '이미 등록된 규격입니다';
      } else if (hasBaseline && !isConsistent) {
        registerBlockReason = `기준 패턴(${SIZE_PATTERN_LABELS[baseline.dominantPattern]})과 불일치`;
      }

      return {
        ...item,
        rowKey,
        canonicalManufacturer: resolvedManufacturer,
        canonicalBrand: fixed.brand,
        canonicalSize: canonicalSize || item.size,
        resolvedManufacturerFromExisting: resolvedManufacturer !== fixed.manufacturer,
        hasBaseline,
        isConsistent,
        actualPattern,
        actualPatternLabel: SIZE_PATTERN_LABELS[actualPattern],
        baselinePattern: baseline?.dominantPattern ?? null,
        baselinePatternLabel: baseline ? SIZE_PATTERN_LABELS[baseline.dominantPattern] : null,
        isDuplicate,
        canRegister: registerBlockReason === null,
        registerBlockReason,
        preferredManualFixSize,
      };
    });
  }, [unregisteredFromSurgery, existingPatternBaseline, existingInventoryKeySet, existingManufacturersByBrand, visibleInventory]);

  const effectiveUnregisteredReviewItems = useMemo(
    () => unregisteredReviewItems.filter(item => !resolvedUnregisteredRows[item.rowKey]),
    [unregisteredReviewItems, resolvedUnregisteredRows]
  );

  const unregisteredBreakdown = useMemo(() => {
    const missing = effectiveUnregisteredReviewItems.filter(item => item.reason !== 'non_list_input');
    const manual = effectiveUnregisteredReviewItems.filter(item => item.reason === 'non_list_input');
    return {
      missingCount: missing.length,
      manualCount: manual.length,
      missingUsage: missing.reduce((sum, item) => sum + item.usageCount, 0),
      manualUsage: manual.reduce((sum, item) => sum + item.usageCount, 0),
    };
  }, [effectiveUnregisteredReviewItems]);

  const preferredUnregisteredViewMode = useMemo<'not_in_inventory' | 'non_list_input'>(
    () => (unregisteredBreakdown.missingCount > 0 ? 'not_in_inventory' : 'non_list_input'),
    [unregisteredBreakdown.missingCount]
  );

  const unregisteredRegistrableCount = useMemo(
    () => effectiveUnregisteredReviewItems.filter(item => item.canRegister).length,
    [effectiveUnregisteredReviewItems]
  );

  const modeFilteredUnregistered = useMemo(() => {
    return effectiveUnregisteredReviewItems.filter(item => item.reason === unregisteredViewMode);
  }, [effectiveUnregisteredReviewItems, unregisteredViewMode]);

  const filteredUnregistered = useMemo(() => {
    const q = unregisteredSearch.trim().toLowerCase();
    if (!q) return modeFilteredUnregistered;
    return modeFilteredUnregistered.filter(item => {
      const text = `${item.manufacturer} ${item.brand} ${item.size} ${item.canonicalSize}`.toLowerCase();
      return text.includes(q);
    });
  }, [modeFilteredUnregistered, unregisteredSearch]);
  const filteredUnregisteredRegistrableCount = useMemo(
    () => filteredUnregistered.filter(item => item.canRegister).length,
    [filteredUnregistered]
  );
  const isManualOnlyUnregisteredView = useMemo(
    () => filteredUnregistered.length > 0 && filteredUnregistered.every(item => item.reason === 'non_list_input'),
    [filteredUnregistered]
  );

  useEffect(() => {
    if (!showUnregisteredDetailModal) return;
    if (unregisteredViewMode === 'not_in_inventory' && unregisteredBreakdown.missingCount === 0 && unregisteredBreakdown.manualCount > 0) {
      setUnregisteredViewMode('non_list_input');
      return;
    }
    if (unregisteredViewMode === 'non_list_input' && unregisteredBreakdown.manualCount === 0 && unregisteredBreakdown.missingCount > 0) {
      setUnregisteredViewMode('not_in_inventory');
    }
  }, [
    showUnregisteredDetailModal,
    unregisteredViewMode,
    unregisteredBreakdown.missingCount,
    unregisteredBreakdown.manualCount,
  ]);

  const bulkRegisterTargets = useMemo(
    () => filteredUnregistered.filter(item => item.canRegister && !registeringUnregistered[item.rowKey]),
    [filteredUnregistered, registeringUnregistered]
  );

  const registerUnregisteredItem = async (item: UnregisteredReviewItem): Promise<void> => {
    if (!item.canRegister) return;
    if (registeringUnregistered[item.rowKey]) return;

    setRegisteringUnregistered(prev => ({ ...prev, [item.rowKey]: true }));
    const mainItem: InventoryItem = {
      id: `manual_unregistered_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      manufacturer: item.canonicalManufacturer,
      brand: item.canonicalBrand,
      size: item.canonicalSize,
      initialStock: 0,
      stockAdjustment: 0,
      usageCount: 0,
      currentStock: 0,
      recommendedStock: 5,
      monthlyAvgUsage: 0,
      dailyMaxUsage: 0,
    };

    const failItem: InventoryItem = {
      ...mainItem,
      id: `manual_unregistered_fail_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      manufacturer: `수술중FAIL_${item.canonicalManufacturer}`,
    };

    try {
      let insertedAny = false;
      const runtimeKeySet = new Set(allInventoryDuplicateKeySet);
      const candidates = [mainItem, failItem];

      for (const candidate of candidates) {
        const candidateKey = buildInventoryDuplicateKeyLocal(candidate.manufacturer, candidate.brand, candidate.size);
        if (runtimeKeySet.has(candidateKey)) continue;

        const result = await Promise.resolve(onAddInventoryItem(candidate));
        if (result === false) continue;

        runtimeKeySet.add(candidateKey);
        insertedAny = true;
      }

      if (insertedAny) {
        setResolvedUnregisteredRows(prev => ({ ...prev, [item.rowKey]: true }));
      }
    } catch (error) {
      console.error('[InventoryManager] 미등록 품목 등록 실패:', error);
    } finally {
      setRegisteringUnregistered(prev => {
        const next = { ...prev };
        delete next[item.rowKey];
        return next;
      });
    }
  };

  const handleRegisterUnregistered = async (item: UnregisteredReviewItem) => {
    await registerUnregisteredItem(item);
  };

  const handleBulkRegisterUnregistered = async () => {
    if (isBulkRegistering) return;
    const targets = bulkRegisterTargets;
    if (targets.length === 0) return;

    setIsBulkRegistering(true);
    setBulkRegisterProgress({ done: 0, total: targets.length });
    const queue = [...targets];
    const workerCount = Math.min(BULK_REGISTER_CONCURRENCY, queue.length);

    const runWorker = async () => {
      while (true) {
        const item = queue.shift();
        if (!item) return;
        await registerUnregisteredItem(item);
        setBulkRegisterProgress(prev => {
          if (!prev) return prev;
          return { ...prev, done: Math.min(prev.done + 1, prev.total) };
        });
      }
    };

    await Promise.all(
      Array.from({ length: workerCount }, () => runWorker())
    );

    setIsBulkRegistering(false);
  };

  const handleApplyBaseStock = async () => {
    if (isSavingBaseStock) return;
    setIsSavingBaseStock(true);
    try {
      const latestUsageMap = (await onRefreshLatestSurgeryUsage?.()) ?? null;
      if (onRefreshLatestSurgeryUsage && latestUsageMap === null) {
        return;
      }
      const stockUpdates: Array<{ id: string; initialStock: number; nextCurrentStock: number }> = [];

      for (const item of visibleInventory) {
        const countedCurrentStock = Math.max(0, Math.round(baseStockInputs[item.id] ?? 0));
        const latestUsage = Math.max(0, Math.round(latestUsageMap?.[item.id] ?? item.usageCount ?? 0));
        const nextInitialStock = countedCurrentStock + latestUsage;

        if (nextInitialStock === item.initialStock) continue;

        stockUpdates.push({
          id: item.id,
          initialStock: nextInitialStock,
          nextCurrentStock: countedCurrentStock,
        });
      }

      if (stockUpdates.length > 0) {
        if (onBulkUpdateStocks) {
          await onBulkUpdateStocks(stockUpdates);
        } else {
          for (const update of stockUpdates) {
            await Promise.resolve(onUpdateStock(update.id, update.initialStock, update.nextCurrentStock));
          }
        }
      }

      // 서버 카운트는 "저장 시도 1회" 기준으로 증가
      setEditCount(prev => prev + 1);
      if (hospitalId && !isUnlimited) {
        planService.incrementBaseStockEditCount(hospitalId).then(serverCount => {
          setEditCount(serverCount);
        });
      }

      setShowBaseStockModal(false);
      setBaseStockInputs({});
      setBaseStockManufacturerFilter(null);
      setBaseStockBrandFilter(null);
    } finally {
      setIsSavingBaseStock(false);
    }
  };

  const getManualFixRecordIds = (item: UnregisteredReviewItem): string[] => {
    const fromItem = (item.recordIds || []).filter(Boolean);
    const fromSamples = (item.samples || [])
      .map(sample => String(sample.recordId || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...fromItem, ...fromSamples]));
  };

  const handleOpenManualFixModal = (item: UnregisteredReviewItem) => {
    setManualFixTarget(item);
    setManualFixCheckResult(null);
    setManualFixError(null);
    setIsManualFixEditing(false);
    setManualFixDraft({
      manufacturer: item.canonicalManufacturer,
      brand: item.canonicalBrand,
      size: item.preferredManualFixSize,
    });
  };

  const handleManualFixDraftChange = (field: keyof ManualFixDraft, value: string) => {
    setManualFixDraft(prev => ({ ...prev, [field]: value }));
    setManualFixCheckResult(null);
    setManualFixError(null);
  };

  const handleVerifyManualFix = async () => {
    if (!manualFixTarget || !onResolveManualInput) return;
    const recordIds = getManualFixRecordIds(manualFixTarget);
    if (recordIds.length === 0) {
      setManualFixError('대상 레코드 ID를 찾을 수 없어 확인할 수 없습니다.');
      return;
    }

    setManualFixError(null);
    setIsManualFixVerifying(true);
    try {
      const draftManufacturer = String(manualFixDraft.manufacturer || '').trim();
      const draftBrand = String(manualFixDraft.brand || '').trim();
      const draftSize = String(manualFixDraft.size || '').trim();
      if (!draftManufacturer || !draftBrand || !draftSize) {
        setManualFixError('제조사, 브랜드, 규격은 모두 입력해야 합니다.');
        return;
      }

      const result = await onResolveManualInput({
        recordIds,
        targetManufacturer: draftManufacturer,
        targetBrand: draftBrand,
        targetSize: draftSize,
        verifyOnly: true,
      });
      setManualFixCheckResult(result);

      if (result.applicable === 0) {
        setResolvedUnregisteredRows(prev => ({ ...prev, [manualFixTarget.rowKey]: true }));
      }
    } catch (error) {
      console.error('[InventoryManager] 수기 입력 확인 실패:', error);
      setManualFixError('수정 완료 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsManualFixVerifying(false);
    }
  };

  const handleApplyManualFix = async () => {
    if (!manualFixTarget || !onResolveManualInput) return;
    const recordIds = getManualFixRecordIds(manualFixTarget);
    if (recordIds.length === 0) {
      setManualFixError('대상 레코드 ID를 찾을 수 없어 적용할 수 없습니다.');
      return;
    }

    setManualFixError(null);
    setIsManualFixApplying(true);
    try {
      const draftManufacturer = String(manualFixDraft.manufacturer || '').trim();
      const draftBrand = String(manualFixDraft.brand || '').trim();
      const draftSize = String(manualFixDraft.size || '').trim();
      if (!draftManufacturer || !draftBrand || !draftSize) {
        setManualFixError('제조사, 브랜드, 규격은 모두 입력해야 합니다.');
        return;
      }

      const result = await onResolveManualInput({
        recordIds,
        targetManufacturer: draftManufacturer,
        targetBrand: draftBrand,
        targetSize: draftSize,
      });
      setManualFixCheckResult(result);

      if (result.failed === 0) {
        setResolvedUnregisteredRows(prev => ({ ...prev, [manualFixTarget.rowKey]: true }));
      }
    } catch (error) {
      console.error('[InventoryManager] 수기 입력 DB 적용 실패:', error);
      setManualFixError('수정 적용 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsManualFixApplying(false);
    }
  };

  const handleCloseManualFixModal = () => {
    if (isManualFixApplying || isManualFixVerifying) return;
    setManualFixTarget(null);
    setManualFixCheckResult(null);
    setManualFixError(null);
    setIsManualFixEditing(false);
    setManualFixDraft({ manufacturer: '', brand: '', size: '' });
  };

  const currentDentwebGuideStep = DENTWEB_GUIDE_STEPS[dentwebGuideStepIndex] ?? DENTWEB_GUIDE_STEPS[0];
  const isFirstDentwebGuideStep = dentwebGuideStepIndex <= 0;
  const isLastDentwebGuideStep = dentwebGuideStepIndex >= DENTWEB_GUIDE_STEPS.length - 1;
  const isManualFixDraftValid =
    String(manualFixDraft.manufacturer || '').trim().length > 0 &&
    String(manualFixDraft.brand || '').trim().length > 0 &&
    String(manualFixDraft.size || '').trim().length > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* ================================================= */}
      {/* Sticky Header Block                               */}
      {/* ================================================= */}
      <div className="sticky top-[44px] z-20 space-y-4 pt-px pb-3 -mt-px bg-slate-50" style={{ boxShadow: '0 4px 12px -4px rgba(0,0,0,0.08)' }}>
        {/* A. Header Strip */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm">
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
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isNormal ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <p className={`text-[10px] font-medium ${isNormal ? 'text-indigo-500' : 'text-rose-500'}`}>
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
                  // 1일 최대사용량 기준 건강 분류
                  const itemsWithUsage = visibleInventory.filter(i => (i.dailyMaxUsage ?? 0) > 0);
                  const healthy = itemsWithUsage.filter(i => i.currentStock > (i.dailyMaxUsage ?? 0)).length;
                  const normal = itemsWithUsage.filter(i => i.currentStock === (i.dailyMaxUsage ?? 0)).length;
                  const caution = itemsWithUsage.filter(i => i.currentStock < (i.dailyMaxUsage ?? 0)).length;
                  if (itemsWithUsage.length === 0) return null;
                  return (
                    <div className="mt-0.5 space-y-0.5">
                      <p className="text-[9px] text-slate-400 font-medium">1일 최대사용량 기준</p>
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
                {kpiData.totalItems > 0 && (
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    전체의 <span className={`${kpiData.shortageRate >= 30 ? 'text-rose-500' : kpiData.shortageRate >= 15 ? 'text-amber-500' : 'text-emerald-600'}`}>{kpiData.shortageRate}%</span>
                  </p>
                )}
              </div>
              <div className="h-16 w-px bg-slate-100 mt-0.5" />
              {/* 재고 건강도 */}
              {(() => {
                const activeItems = visibleInventory.filter(i => i.usageCount > 0);
                const totalStock = Math.max(kpiData.totalStock, 1);
                const activeStockRaw = activeItems.reduce((s, i) => s + Math.max(0, i.currentStock), 0);
                // 감점: 월평균 20배 초과 + 일최대 > 현재재고 (과잉재고이나 피크 미달)
                const penaltyItems = activeItems.filter(i =>
                  i.currentStock > (i.monthlyAvgUsage ?? 0) * 20 &&
                  (i.dailyMaxUsage ?? 0) > i.currentStock
                );
                const penaltyStock = penaltyItems.reduce((s, i) => s + i.currentStock, 0);
                const adjustedActive = activeStockRaw - penaltyStock;
                const rate = Math.round(Math.max(0, adjustedActive) / totalStock * 100);
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
                    {penaltyItems.length > 0 ? (
                      <p className="text-[9px] text-rose-400 font-bold mt-0.5">감점 {penaltyItems.length}건</p>
                    ) : (
                      <p className="text-[9px] text-slate-400 mt-0.5">감점 없음</p>
                    )}
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
                  onClick={() => { setShowOptimizeModal(true); setSelectedOptimizeIds(new Set()); }}
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
        <div className="bg-white rounded-2xl px-5 py-3 border border-slate-100 shadow-sm">
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
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
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
                    setResolvedUnregisteredRows({});
                    setUnregisteredViewMode(preferredUnregisteredViewMode);
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
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
          <div className="px-6 py-5 space-y-2.5">
            {chartData.length > 0 ? chartData.map((item, idx) => {
              const pct = Math.round((item.usageCount / maxUsage) * 100);
              const isTop = idx === 0;
              const isLow = item.currentStock < Math.ceil((item.recommendedStock ?? 0) * monthFactor);
              return (
                <div key={item.id} className="group flex items-center gap-3">
                  {/* 순위 */}
                  <span className={`w-5 text-right text-[10px] font-black shrink-0 ${isTop ? 'text-indigo-500' : 'text-slate-300'}`}>
                    {idx + 1}
                  </span>
                  {/* 라벨 */}
                  <div className="w-[110px] shrink-0">
                    <p className="text-[10px] font-bold text-slate-400 truncate uppercase tracking-tighter leading-none">{item.brand}</p>
                    <p className="text-[11px] font-black text-slate-700 truncate leading-snug">{item.size}</p>
                  </div>
                  {/* 바 */}
                  <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isTop ? 'bg-gradient-to-r from-indigo-500 to-violet-400' : 'bg-indigo-200 group-hover:bg-indigo-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  {/* 수치 */}
                  <div className="w-[140px] shrink-0 text-right flex items-center justify-end gap-3">
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-medium leading-none">월평균</p>
                      <p className={`text-[11px] font-bold tabular-nums ${isTop ? 'text-indigo-500' : 'text-slate-500'}`}>
                        {item.monthlyAvgUsage?.toFixed(1) ?? '-'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-medium leading-none">지난달</p>
                      <p className={`text-[11px] font-bold tabular-nums ${(item.lastMonthUsage ?? 0) > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                        {item.lastMonthUsage ?? 0}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 font-medium leading-none">누적</p>
                      <p className={`text-[11px] font-black tabular-nums ${isTop ? 'text-indigo-600' : 'text-slate-600'}`}>
                        {item.usageCount}
                      </p>
                    </div>
                    {isLow && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" title="재고 부족" />
                    )}
                  </div>
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

          {/* ── 우측: 긴급도 패널 ── */}
          <div className="lg:border-l border-t lg:border-t-0 border-slate-100 px-5 py-5 flex flex-row lg:flex-col justify-between gap-4 min-w-[180px]">

            {/* 가장 긴급한 품목 */}
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">최우선 발주</p>
              {urgencyData.mostUrgent ? (
                <div className={`rounded-xl px-3 py-2.5 ${urgencyData.mostUrgent.level === 'critical' ? 'bg-rose-50 border border-rose-100' : 'bg-amber-50 border border-amber-100'}`}>
                  <p className={`text-[10px] font-black leading-none ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {urgencyData.mostUrgent.brand}
                  </p>
                  <p className={`text-[11px] font-bold mt-0.5 ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-500' : 'text-amber-500'}`}>
                    {urgencyData.mostUrgent.size}
                  </p>
                  <div className="flex items-baseline gap-1 mt-1.5">
                    <span className={`text-xl font-black tabular-nums leading-none ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {urgencyData.mostUrgent.daysLeft <= 0 ? '0' : urgencyData.mostUrgent.daysLeft}
                    </span>
                    <span className={`text-[10px] font-bold ${urgencyData.mostUrgent.level === 'critical' ? 'text-rose-400' : 'text-amber-400'}`}>
                      일 후 소진
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl px-3 py-2.5 bg-emerald-50 border border-emerald-100">
                  <p className="text-[11px] font-black text-emerald-600">전 품목 안전</p>
                  <p className="text-[10px] text-emerald-400 mt-0.5">긴급 품목 없음</p>
                </div>
              )}
            </div>

            <div className="h-px w-full bg-slate-50 hidden lg:block" />

            {/* 긴급도 요약 */}
            <div className="flex-1">
              <p className="text-[9px] uppercase tracking-widest font-bold text-slate-400 mb-2">긴급도 현황</p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">3일 이내</span>
                  </div>
                  <span className={`text-[12px] font-black tabular-nums ${urgencyData.critical.length > 0 ? 'text-rose-600' : 'text-slate-300'}`}>
                    {urgencyData.critical.length}건
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">7일 이내</span>
                  </div>
                  <span className={`text-[12px] font-black tabular-nums ${urgencyData.warning.length > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
                    {urgencyData.warning.length}건
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[10px] font-bold text-slate-500">안전</span>
                  </div>
                  <span className="text-[12px] font-black tabular-nums text-emerald-600">
                    {filteredInventory.filter(i => i.usageCount > 0 && (i.dailyMaxUsage ?? 0) > 0 && Math.floor(i.currentStock / (i.dailyMaxUsage ?? 1)) > 7).length}건
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
          <div className="ml-auto text-[9px] text-slate-300 font-medium">수술기록 연동 기준</div>
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
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center">기초 재고</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center">
                  <div>사용량</div>
                  <div className="text-sm font-black text-rose-500 mt-1 tabular-nums">{filteredInventory.reduce((s, i) => s + i.usageCount, 0)}</div>
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-indigo-400 text-center">월평균사용</th>
                <th className="px-6 py-3 text-[11px] font-bold text-indigo-400 text-center">일최대사용</th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center">
                  <div>현재 재고</div>
                  <div className="text-sm font-black text-slate-800 mt-1 tabular-nums">{filteredInventory.reduce((s, i) => s + i.currentStock, 0)}</div>
                </th>
                <th className="px-6 py-3 text-[11px] font-bold text-slate-400 text-center text-indigo-600">권장량</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => {
                const recommended = Math.ceil(item.recommendedStock * monthFactor);
                const isLowStock = item.currentStock < recommended;

                return (
                  <tr key={item.id} className="group transition-colors hover:bg-slate-50/40">
                    <td className="px-6 py-4 text-[10px] font-bold text-slate-400">{item.manufacturer}</td>
                    <td className="px-6 py-4 text-sm font-black text-slate-800 tracking-tight">{item.brand}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-600">{item.size}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-slate-700 tabular-nums">
                      {item.initialStock}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-rose-500 tabular-nums">{item.usageCount > 0 ? `-${item.usageCount}` : '0'}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{item.monthlyAvgUsage ?? 0}</td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{item.dailyMaxUsage ?? 0}</td>
                    <td className={`px-6 py-4 text-center text-sm font-black tabular-nums transition-colors ${isLowStock ? 'text-rose-600 bg-rose-50/50' : 'text-slate-900'}`}>
                      {item.currentStock}
                    </td>
                    <td className="px-6 py-4 text-center text-sm font-black text-indigo-600 tabular-nums">{recommended}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================================================= */}
      {/* 품목 최적화 Modal                                 */}
      {/* ================================================= */}
      {showOptimizeModal && (() => {
        const yearItems  = deadStockItems.filter(i => i.olderThanYear);
        const neverItems = deadStockItems.filter(i => i.neverUsed);
        const displayed  = optimizeFilter === 'year' ? yearItems : neverItems;
        const allSelected = displayed.length > 0 && displayed.every(i => selectedOptimizeIds.has(i.id));

        const toggleAll = () => {
          if (allSelected) {
            setSelectedOptimizeIds(prev => { const s = new Set(prev); displayed.forEach(i => s.delete(i.id)); return s; });
          } else {
            setSelectedOptimizeIds(prev => { const s = new Set(prev); displayed.forEach(i => s.add(i.id)); return s; });
          }
        };

        const handleDelete = async () => {
          if (selectedOptimizeIds.size === 0) return;
          setIsDeletingOptimize(true);
          for (const id of selectedOptimizeIds) {
            await Promise.resolve(onDeleteInventoryItem(id));
          }
          setSelectedOptimizeIds(new Set());
          setIsDeletingOptimize(false);
          if (deadStockItems.filter(i => !selectedOptimizeIds.has(i.id)).length === 0) {
            setShowOptimizeModal(false);
          }
        };

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]">
              {/* Header */}
              <div className="px-6 pt-5 pb-4 border-b border-slate-100">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">품목 최적화</h3>
                    <p className="text-xs text-slate-500 mt-0.5">장기 미사용 품목을 정리하여 재고 마스터를 슬림하게 유지하세요.</p>
                  </div>
                  <button onClick={() => setShowOptimizeModal(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                {/* 요약 배너 */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setOptimizeFilter('year'); setSelectedOptimizeIds(new Set()); }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${optimizeFilter === 'year' ? 'border-amber-400 bg-amber-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <span className="text-xs font-bold text-slate-700">1년 이상 미사용</span>
                    </div>
                    <p className="text-2xl font-black text-amber-600 tabular-nums">{yearItems.length}<span className="text-sm font-semibold text-slate-400 ml-1">품목</span></p>
                    <p className="text-[10px] text-slate-400 mt-0.5">사용 기록이 1년 이상 없는 규격</p>
                  </button>
                  <button
                    onClick={() => { setOptimizeFilter('never'); setSelectedOptimizeIds(new Set()); }}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${optimizeFilter === 'never' ? 'border-rose-400 bg-rose-50' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-4 h-4 text-rose-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                      <span className="text-xs font-bold text-slate-700">한 번도 미사용</span>
                    </div>
                    <p className="text-2xl font-black text-rose-500 tabular-nums">{neverItems.length}<span className="text-sm font-semibold text-slate-400 ml-1">품목</span></p>
                    <p className="text-[10px] text-slate-400 mt-0.5">수술기록에 전혀 나타나지 않은 규격</p>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 overflow-y-auto">
                {displayed.length === 0 ? (
                  <div className="py-16 text-center text-slate-400 text-sm">해당하는 품목이 없습니다.</div>
                ) : (
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                      <tr>
                        <th className="w-10 px-4 py-3">
                          <input type="checkbox" checked={allSelected} onChange={toggleAll} className="w-4 h-4 rounded border-slate-300 accent-indigo-600 cursor-pointer" />
                        </th>
                        <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">제조사 / 브랜드</th>
                        <th className="px-3 py-3 text-left text-[11px] font-bold text-slate-500 uppercase">규격</th>
                        <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase">현재재고</th>
                        <th className="px-3 py-3 text-center text-[11px] font-bold text-slate-500 uppercase">마지막 사용일</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {displayed.map(item => (
                        <tr
                          key={item.id}
                          onClick={() => setSelectedOptimizeIds(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; })}
                          className={`cursor-pointer transition-colors ${selectedOptimizeIds.has(item.id) ? 'bg-rose-50' : 'hover:bg-slate-50'}`}
                        >
                          <td className="w-10 px-4 py-3">
                            <input type="checkbox" checked={selectedOptimizeIds.has(item.id)} onChange={() => {}} className="w-4 h-4 rounded border-slate-300 accent-indigo-600 pointer-events-none" />
                          </td>
                          <td className="px-3 py-3">
                            <div className="text-xs font-bold text-slate-700">{item.brand}</div>
                            <div className="text-[10px] text-slate-400">{item.manufacturer}</div>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-xs font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{item.size}</span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className={`text-xs font-bold tabular-nums ${item.currentStock > 0 ? 'text-slate-700' : 'text-slate-400'}`}>
                              {item.currentStock}개
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            {item.neverUsed ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-rose-100 text-rose-600 text-[10px] font-bold">미사용</span>
                            ) : (
                              <span className="text-[11px] text-amber-700 font-semibold">{item.lastUsedDate}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {selectedOptimizeIds.size > 0
                    ? <><span className="font-bold text-slate-800">{selectedOptimizeIds.size}개</span> 품목 선택됨</>
                    : '삭제할 품목을 선택하세요'}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowOptimizeModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors">
                    닫기
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={selectedOptimizeIds.size === 0 || isDeletingOptimize}
                    className="px-4 py-2 text-sm font-bold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    {isDeletingOptimize ? '삭제 중...' : `선택 품목 삭제 (${selectedOptimizeIds.size})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

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
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-8 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mb-5">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">기초 재고 편집 안내</h3>
              <div className="w-full mt-1 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-sm font-bold text-amber-700 text-balance">최초 1회만 사용을 권장합니다</p>
                <p className="text-xs text-amber-600 mt-1 leading-relaxed text-balance">시스템 도입 시 기초 재고를 일괄 등록하는 용도입니다.</p>
              </div>
              <p className="w-full mt-4 text-sm text-slate-500 leading-relaxed text-balance">이후 재고는 <span className="font-bold text-slate-700">현재 재고</span>를 기준으로 관리되며, <span className="font-bold text-slate-700">주문(발주 입고)</span>과 <span className="font-bold text-slate-700">재고 실사</span>를 통해 정확한 현재 재고를 유지하세요.</p>
              <div className="mt-4 px-4 py-2 bg-slate-50 rounded-xl">
                <span className="text-xs font-bold text-slate-400">남은 편집 횟수: <span className="text-indigo-600">{isUnlimited ? '무제한' : `${maxEdits - editCount}회`}</span></span>
              </div>
            </div>
            <div className="px-8 pb-8 flex gap-3">
              <button
                onClick={() => setShowEditNotice(false)}
                className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
              >
                취소
              </button>
              <button
                onClick={() => {
                  setShowEditNotice(false);
                  openBaseStockModal();
                }}
                className="flex-1 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                편집 시작
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* Base Stock Modal                                  */}
      {/* ================================================= */}
      {showBaseStockModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl h-[84vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">기초재고 실사 입력</h3>
                <p className="text-xs text-slate-500 mt-1">
                  최신 수술기록 사용량 + 실사 현재재고를 합산해 기초재고로 저장합니다.
                </p>
              </div>
              <button
                onClick={handleBaseStockModalClose}
                disabled={isSavingBaseStock}
                aria-label="닫기"
                className={`p-2 rounded-xl transition-colors ${isSavingBaseStock ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-200'}`}
              >
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-white shrink-0 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1">제조사</span>
                <button
                  onClick={() => setBaseStockManufacturerFilter(null)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    baseStockManufacturerFilter === null ? 'bg-slate-800 text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  전체
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${baseStockManufacturerFilter === null ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                    {visibleInventory.length}
                  </span>
                </button>
                {baseStockManufacturerOptions.map(mfr => {
                  const count = visibleInventory.filter(item => item.manufacturer === mfr).length;
                  const active = baseStockManufacturerFilter === mfr;
                  return (
                    <button
                      key={mfr}
                      onClick={() => setBaseStockManufacturerFilter(mfr)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${active ? 'bg-slate-800 text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {mfr}
                      <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 mr-1">브랜드</span>
                <button
                  onClick={() => setBaseStockBrandFilter(null)}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    baseStockBrandFilter === null ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'
                  }`}
                >
                  전체
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${baseStockBrandFilter === null ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                    {baseStockFilteredRows.length}
                  </span>
                </button>
                {baseStockBrandOptions.map(brand => {
                  const count = visibleInventory.filter(item => {
                    if (baseStockManufacturerFilter !== null && item.manufacturer !== baseStockManufacturerFilter) return false;
                    return item.brand === brand;
                  }).length;
                  const active = baseStockBrandFilter === brand;
                  return (
                    <button
                      key={brand}
                      onClick={() => setBaseStockBrandFilter(brand)}
                      className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${active ? 'bg-indigo-600 text-white' : 'text-slate-500 bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {brand}
                      <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${active ? 'bg-white/20 text-white' : 'bg-white text-slate-500'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
                <span className="ml-auto text-xs text-slate-400 font-medium">
                  {baseStockFilteredRows.length}개 항목 표시
                </span>
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              {baseStockFilteredRows.length === 0 ? (
                <div className="h-full min-h-[240px] flex items-center justify-center text-sm font-semibold text-slate-400">
                  선택한 필터에 해당하는 품목이 없습니다.
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-[64px] text-center">No</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">제조사</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">브랜드</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">규격</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-rose-500 uppercase tracking-wider text-center">최신 사용량</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-indigo-500 uppercase tracking-wider text-center">현재재고(실사)</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-emerald-600 uppercase tracking-wider text-center">반영 기초재고</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {baseStockFilteredRows.map((item, idx) => {
                      const countedCurrentStock = Math.max(0, Math.round(baseStockInputs[item.id] ?? 0));
                      const usage = Math.max(0, Math.round(item.usageCount ?? 0));
                      const nextBaseStock = countedCurrentStock + usage;
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="px-4 py-3 text-xs font-black text-slate-400 text-center tabular-nums">{idx + 1}</td>
                          <td className="px-4 py-3 text-[11px] font-bold text-slate-500">{item.manufacturer}</td>
                          <td className="px-4 py-3 text-sm font-black text-slate-800">{item.brand}</td>
                          <td className="px-4 py-3 text-sm font-semibold text-slate-600">{item.size}</td>
                          <td className="px-4 py-3 text-center text-sm font-black text-rose-500 tabular-nums">{usage}</td>
                          <td className="px-4 py-3 text-center">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={countedCurrentStock}
                              onChange={(e) => handleBaseStockInputChange(item.id, e.target.value)}
                              className="w-24 px-2 py-1.5 text-sm text-center font-black text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg outline-none focus:border-indigo-500"
                            />
                          </td>
                          <td className="px-4 py-3 text-center text-sm font-black text-emerald-600 tabular-nums">{nextBaseStock}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between gap-4">
              <p className="text-xs text-slate-500 font-medium">
                저장 시 최신 수술기록을 다시 조회한 뒤 기초재고를 계산합니다.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBaseStockModalClose}
                  disabled={isSavingBaseStock}
                  className={`px-5 py-2 text-sm font-bold rounded-xl border transition-colors ${
                    isSavingBaseStock
                      ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                      : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  취소
                </button>
                <button
                  onClick={handleApplyBaseStock}
                  disabled={isSavingBaseStock || visibleInventory.length === 0}
                  className={`px-5 py-2 text-sm font-black rounded-xl transition-colors ${
                    !isSavingBaseStock && visibleInventory.length > 0
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isSavingBaseStock ? '저장 중...' : '기초재고 반영'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* Unregistered Detail Modal                         */}
      {/* ================================================= */}
      {showUnregisteredDetailModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[82vh] flex flex-col">
            <div className="px-6 py-5 bg-amber-500 text-white flex items-start justify-between gap-4 shrink-0">
              <div>
                <h3 className="text-lg font-black">수술기록 미등록 품목 상세</h3>
                <p className="text-amber-100 text-xs font-medium mt-1">
                  총 {effectiveUnregisteredReviewItems.length}종 · 미등록 {unregisteredBreakdown.missingCount}종 · 수기 입력 {unregisteredBreakdown.manualCount}종 · 등록 가능 {unregisteredRegistrableCount}종 · 누적 사용 {unregisteredUsageTotal.toLocaleString()}개
                </p>
              </div>
              <button
                onClick={() => {
                  if (isBulkRegistering) return;
                  setShowUnregisteredDetailModal(false);
                  setUnregisteredSearch('');
                  setUnregisteredViewMode(preferredUnregisteredViewMode);
                  setBulkRegisterProgress(null);
                  setResolvedUnregisteredRows({});
                }}
                disabled={isBulkRegistering}
                aria-label="닫기"
                className={`p-2 rounded-full transition-colors ${isBulkRegistering ? 'opacity-50 cursor-not-allowed' : 'hover:bg-white/15'}`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 max-w-md">
                  <input
                    type="text"
                    value={unregisteredSearch}
                    onChange={(e) => setUnregisteredSearch(e.target.value)}
                    placeholder="제조사, 브랜드, 규격 검색"
                    className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-amber-400"
                  />
                  <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.35-4.35M10 18a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
                  </svg>
                </div>
                <span className="text-xs font-bold text-slate-500">
                  {filteredUnregistered.length}건 표시 · 등록 가능 {filteredUnregisteredRegistrableCount}건
                </span>
                {!isReadOnly && (
                  <button
                    onClick={handleBulkRegisterUnregistered}
                    disabled={isBulkRegistering || bulkRegisterTargets.length === 0}
                    className={`ml-auto px-3 py-2 rounded-lg text-xs font-black transition-colors ${
                      !isBulkRegistering && bulkRegisterTargets.length > 0
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isBulkRegistering
                      ? `일괄 등록 중 (${bulkRegisterProgress?.done ?? 0}/${bulkRegisterProgress?.total ?? 0})`
                      : `등록 가능 ${bulkRegisterTargets.length}건 한번에 등록`}
                  </button>
                )}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => setUnregisteredViewMode('not_in_inventory')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    unregisteredViewMode === 'not_in_inventory'
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  미등록 {unregisteredBreakdown.missingCount}
                </button>
                <button
                  onClick={() => setUnregisteredViewMode('non_list_input')}
                  className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all ${
                    unregisteredViewMode === 'non_list_input'
                      ? 'bg-rose-600 text-white'
                      : 'text-slate-500 bg-white border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  수기 입력 {unregisteredBreakdown.manualCount}
                </button>
                <span className="ml-auto text-[11px] font-semibold text-slate-500">
                  현재 탭 누적 사용 {(
                    unregisteredViewMode === 'not_in_inventory'
                      ? unregisteredBreakdown.missingUsage
                      : unregisteredBreakdown.manualUsage
                  ).toLocaleString()}개
                </span>
              </div>
              {unregisteredViewMode === 'non_list_input' && (
                <div className="mt-2 px-3 py-2 rounded-lg border border-rose-200 bg-rose-50/80">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-[11px] font-bold text-rose-600 break-keep">
                      수기 입력 데이터는 덴트웹 수술기록지에서 픽스쳐 정보를 목록에서 선택하도록 수정이 필요합니다.
                    </p>
                    <button
                      onClick={() => {
                        setDentwebGuideStepIndex(0);
                        setShowDentwebGuideModal(true);
                      }}
                      className="px-2.5 py-1 rounded-md bg-white border border-rose-200 text-[11px] font-black text-rose-600 hover:bg-rose-100 transition-colors"
                    >
                      가이드문서 확인하기
                    </button>
                  </div>
                </div>
              )}
              {bulkRegisterProgress && (
                <p className="mt-2 text-[11px] font-semibold text-slate-500">
                  일괄 등록 진행: {bulkRegisterProgress.done}/{bulkRegisterProgress.total}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden">
              {filteredUnregistered.length === 0 ? (
                <div className="h-full min-h-[240px] flex items-center justify-center text-sm text-slate-400 font-semibold">
                  검색 결과가 없습니다.
                </div>
              ) : (
                isManualOnlyUnregisteredView ? (
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <tr>
                        <th className="w-[80px] px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">No</th>
                        <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">수정 대상 기록</th>
                        <th className="w-[156px] px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">수정</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUnregistered.map((item, idx) => (
                        <tr key={item.rowKey} className="hover:bg-amber-50/40 transition-colors">
                          <td className="px-4 py-3 text-sm font-black text-slate-400 text-center tabular-nums whitespace-nowrap align-top">
                            {idx + 1}
                          </td>
                          <td className="px-4 py-3 align-top">
                            {item.samples && item.samples.length > 0 ? (
                              <div className="space-y-1.5">
                                {item.reason === 'non_list_input' && (
                                  <p className="text-[11px] font-black text-rose-500 break-keep whitespace-normal">
                                    입력 형식: {item.manufacturer} - {item.brand} - {item.size}
                                  </p>
                                )}
                                {item.samples.slice(0, 3).map((sample, sampleIdx) => (
                                  <p key={`${item.rowKey}-manual-sample-${sampleIdx}`} className="text-base font-black text-slate-600 leading-tight break-keep whitespace-normal">
                                    {sample.date} · {sample.patientMasked} ({sample.chartNumber})
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <span className="text-sm font-semibold text-slate-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                            {item.reason === 'non_list_input' ? (
                              <button
                                onClick={() => handleOpenManualFixModal(item)}
                                disabled={isReadOnly || !onResolveManualInput}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                                  !isReadOnly && onResolveManualInput
                                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                수정
                              </button>
                            ) : (
                              <span className="text-xs font-semibold text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <table className="w-full text-left border-collapse table-fixed text-[12px]">
                    <thead className="sticky top-0 bg-slate-50 border-b border-slate-200 z-10">
                      <tr>
                        <th className="w-[56px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center whitespace-nowrap">No</th>
                        <th className="w-[92px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">제조사</th>
                        <th className="w-[100px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">브랜드</th>
                        <th className="w-[132px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">규격</th>
                        <th className="w-[176px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">일치 여부</th>
                        <th className="w-[92px] px-3 py-3 text-[10px] font-bold text-amber-600 uppercase tracking-wider text-right whitespace-nowrap">누적 사용</th>
                        <th className="w-[196px] px-3 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right whitespace-nowrap">등록</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUnregistered.map((item, idx) => (
                        <tr
                          key={item.rowKey}
                          className={`hover:bg-amber-50/40 transition-colors ${item.hasBaseline && !item.isConsistent ? 'bg-rose-50/20' : ''}`}
                        >
                          <td className="px-3 py-3 text-xs font-black text-slate-400 text-center tabular-nums whitespace-nowrap align-top">{idx + 1}</td>
                          <td className="px-3 py-3 whitespace-nowrap align-top">
                            <p className="text-[11px] font-bold text-slate-500">{item.manufacturer}</p>
                            {item.resolvedManufacturerFromExisting && (
                              <p className="text-[10px] font-semibold text-indigo-500 mt-0.5 break-keep whitespace-normal leading-tight">
                                등록 제조사: {item.canonicalManufacturer}
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-[13px] font-black text-slate-800 whitespace-nowrap align-top">{item.brand}</td>
                          <td className="px-3 py-3 align-top">
                            <p className="text-[13px] font-semibold text-slate-600 whitespace-nowrap">{item.size}</p>
                            {item.canonicalSize !== item.size && (
                              <p className="text-[10px] font-semibold text-indigo-500 mt-0.5 break-keep whitespace-normal leading-tight">
                                등록 규격: {item.canonicalSize}
                              </p>
                            )}
                            {item.reason === 'non_list_input' && (
                              <p className="text-[10px] font-semibold text-rose-500 mt-0.5 break-keep whitespace-normal leading-tight">
                                목록 외 수기 입력 표기
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 align-top">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-md text-[10px] font-black ${
                                !item.hasBaseline
                                  ? 'bg-slate-100 text-slate-500'
                                  : item.isConsistent
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {!item.hasBaseline ? '기준 없음' : item.isConsistent ? '일치' : '불일치'}
                            </span>
                            {item.hasBaseline ? (
                              <p className="text-[10px] font-semibold text-slate-500 mt-1 break-keep whitespace-normal leading-tight">
                                기준 {item.baselinePatternLabel} · 현재 {item.actualPatternLabel}
                              </p>
                            ) : (
                              <p className="text-[10px] font-semibold text-slate-400 mt-1 break-keep whitespace-normal leading-tight">
                                기존 제조사-브랜드 규격 기준 없음
                              </p>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right whitespace-nowrap align-top">
                            <span className="inline-flex px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-black text-amber-700 tabular-nums whitespace-nowrap">
                              {item.usageCount.toLocaleString()}개
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right align-top">
                            <div className="flex flex-col items-end gap-1">
                              {item.reason === 'non_list_input' && (
                                <button
                                  onClick={() => handleOpenManualFixModal(item)}
                                  disabled={isReadOnly || !onResolveManualInput}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                                    !isReadOnly && onResolveManualInput
                                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                  }`}
                                >
                                  수정
                                </button>
                              )}
                              <button
                                onClick={() => handleRegisterUnregistered(item)}
                                disabled={!item.canRegister || !!registeringUnregistered[item.rowKey]}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                                  item.canRegister && !registeringUnregistered[item.rowKey]
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                }`}
                              >
                                {registeringUnregistered[item.rowKey] ? '등록 중...' : item.canRegister ? '목록 등록' : '등록 불가'}
                              </button>
                              {!item.canRegister && (
                                <p className="max-w-[196px] text-[10px] font-semibold text-rose-500 break-keep whitespace-normal text-right leading-tight">
                                  {item.registerBlockReason}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={() => {
                  if (isBulkRegistering) return;
                  setShowUnregisteredDetailModal(false);
                  setUnregisteredSearch('');
                  setUnregisteredViewMode(preferredUnregisteredViewMode);
                  setBulkRegisterProgress(null);
                  setResolvedUnregisteredRows({});
                }}
                disabled={isBulkRegistering}
                className={`px-5 py-2 text-sm font-bold border rounded-xl transition-colors ${
                  isBulkRegistering
                    ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                    : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {manualFixTarget && (
        <div className="fixed inset-0 z-[230] flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden max-h-[86vh] flex flex-col">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-start justify-between gap-4 shrink-0">
              <div>
                <h3 className="text-lg font-black">수기 입력 데이터 수정 적용</h3>
                <p className="text-rose-100 text-xs font-medium mt-1">
                  덴트웹 편집 완료 여부를 먼저 확인한 뒤, 필요 시 수술기록 DB에 표준 형식을 적용합니다.
                </p>
              </div>
              <button
                onClick={handleCloseManualFixModal}
                disabled={isManualFixApplying || isManualFixVerifying}
                aria-label="닫기"
                className={`p-2 rounded-full transition-colors ${
                  isManualFixApplying || isManualFixVerifying
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-white/15'
                }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-4 space-y-3 overflow-auto">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-bold text-slate-500 mb-1">수정 전 입력 형식</p>
                <p className="text-base font-black text-rose-600 break-keep">
                  {manualFixTarget.manufacturer} - {manualFixTarget.brand} - {manualFixTarget.size}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold text-emerald-700">수정 후 적용 형식 (구조 고정)</p>
                  <button
                    onClick={() => setIsManualFixEditing(prev => !prev)}
                    disabled={isManualFixVerifying || isManualFixApplying}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-black transition-colors ${
                      isManualFixVerifying || isManualFixApplying
                        ? 'bg-emerald-100 text-emerald-300 cursor-not-allowed'
                        : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                    }`}
                    title="표준값 편집"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487a2.25 2.25 0 113.182 3.182L9.75 17.963 6 18.75l.787-3.75L16.862 4.487z" />
                    </svg>
                    {isManualFixEditing ? '편집 완료' : '편집'}
                  </button>
                </div>

                {isManualFixEditing ? (
                  <div className="mt-2 space-y-2">
                    <p className="text-[11px] font-semibold text-emerald-700/90">
                      기본 틀은 고정되며, 각 값만 수정할 수 있습니다. (제조사 - 브랜드 - 규격)
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={manualFixDraft.manufacturer}
                        onChange={(event) => handleManualFixDraftChange('manufacturer', event.target.value)}
                        placeholder="제조사"
                        className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                      <input
                        type="text"
                        value={manualFixDraft.brand}
                        onChange={(event) => handleManualFixDraftChange('brand', event.target.value)}
                        placeholder="브랜드"
                        className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                      <input
                        type="text"
                        value={manualFixDraft.size}
                        onChange={(event) => handleManualFixDraftChange('size', event.target.value)}
                        placeholder="규격"
                        className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                      />
                    </div>
                    <p className="text-sm font-black text-emerald-700 break-keep">
                      {String(manualFixDraft.manufacturer || '').trim() || '제조사'} - {String(manualFixDraft.brand || '').trim() || '브랜드'} - {String(manualFixDraft.size || '').trim() || '규격'}
                    </p>
                  </div>
                ) : (
                  <p className="mt-1 text-base font-black text-emerald-700 break-keep">
                    {String(manualFixDraft.manufacturer || '').trim() || manualFixTarget.canonicalManufacturer} - {String(manualFixDraft.brand || '').trim() || manualFixTarget.canonicalBrand} - {String(manualFixDraft.size || '').trim() || manualFixTarget.preferredManualFixSize}
                  </p>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-bold text-slate-500">
                    대상 레코드 {getManualFixRecordIds(manualFixTarget).length}건
                  </p>
                  <button
                    onClick={handleVerifyManualFix}
                    disabled={isManualFixVerifying || isManualFixApplying || !onResolveManualInput || !isManualFixDraftValid}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                      !isManualFixVerifying && !isManualFixApplying && onResolveManualInput && isManualFixDraftValid
                        ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    {isManualFixVerifying ? '확인 중...' : '덴트웹 편집 후 확인'}
                  </button>
                </div>
                <div className="mt-2 space-y-1.5">
                  {(manualFixTarget.samples || []).slice(0, 3).map((sample, idx) => (
                    <p key={`${manualFixTarget.rowKey}-manualfix-sample-${idx}`} className="text-[12px] font-semibold text-slate-600 break-keep">
                      {sample.date} · {sample.patientMasked} ({sample.chartNumber})
                    </p>
                  ))}
                  {(manualFixTarget.samples || []).length > 3 && (
                    <p className="text-[11px] font-semibold text-slate-400">
                      +{(manualFixTarget.samples || []).length - 3}건 더 있음
                    </p>
                  )}
                </div>
              </div>

              {manualFixCheckResult && (
                <div className={`rounded-xl border p-3 ${
                  manualFixCheckResult.applicable === 0
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-amber-200 bg-amber-50'
                }`}>
                  <p className={`text-xs font-black ${
                    manualFixCheckResult.applicable === 0 ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {manualFixCheckResult.applicable === 0
                      ? '이미 목록 선택 형식으로 수정된 상태입니다.'
                      : `${manualFixCheckResult.applicable}건이 아직 수기 입력 형태입니다. 아래 확인 후 적용을 누르면 DB에 표준 형식으로 반영됩니다.`}
                  </p>
                  <p className="text-[11px] font-semibold text-slate-600 mt-1">
                    확인 {manualFixCheckResult.checked}건 · 찾음 {manualFixCheckResult.found}건 · 이미 수정됨 {manualFixCheckResult.alreadyFixed}건 · 미발견 {manualFixCheckResult.notFound}건
                    {manualFixCheckResult.updated > 0 ? ` · 적용 ${manualFixCheckResult.updated}건` : ''}
                    {manualFixCheckResult.failed > 0 ? ` · 실패 ${manualFixCheckResult.failed}건` : ''}
                  </p>
                </div>
              )}

              {manualFixError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                  <p className="text-xs font-bold text-rose-600">{manualFixError}</p>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-2 shrink-0">
              <button
                onClick={handleCloseManualFixModal}
                disabled={isManualFixApplying || isManualFixVerifying}
                className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
                  isManualFixApplying || isManualFixVerifying
                    ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                    : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
                }`}
              >
                닫기
              </button>
              <button
                onClick={handleApplyManualFix}
                disabled={
                  isManualFixApplying ||
                  isManualFixVerifying ||
                  !onResolveManualInput ||
                  !isManualFixDraftValid ||
                  getManualFixRecordIds(manualFixTarget).length === 0 ||
                  (manualFixCheckResult ? manualFixCheckResult.applicable === 0 : false)
                }
                className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
                  !isManualFixApplying &&
                  !isManualFixVerifying &&
                  !!onResolveManualInput &&
                  isManualFixDraftValid &&
                  getManualFixRecordIds(manualFixTarget).length > 0 &&
                  !(manualFixCheckResult ? manualFixCheckResult.applicable === 0 : false)
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isManualFixApplying ? '적용 중...' : '확인 후 적용'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDentwebGuideModal && (
        <div className="fixed inset-0 z-[240] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden max-h-[88vh] flex flex-col">
            <div className="px-6 py-5 bg-slate-900 text-white flex items-start justify-between gap-4 shrink-0">
              <div>
                <h3 className="text-lg font-black">덴트웹 수술기록지 수정 가이드</h3>
                <p className="text-slate-300 text-xs font-medium mt-1">
                  수기 입력 건은 반드시 목록 선택 방식으로 수정해야 합니다.
                </p>
              </div>
              <button
                onClick={() => setShowDentwebGuideModal(false)}
                aria-label="닫기"
                className="p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-6 py-3 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-500">
                단계별로 한 장씩 확인하세요. ({dentwebGuideStepIndex + 1}/{DENTWEB_GUIDE_STEPS.length})
              </p>
              <div className="flex items-center gap-1.5">
                {DENTWEB_GUIDE_STEPS.map((_, idx) => (
                  <span
                    key={`guide-dot-${idx}`}
                    className={`h-1.5 rounded-full transition-all ${
                      idx === dentwebGuideStepIndex ? 'w-5 bg-indigo-500' : 'w-1.5 bg-slate-300'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="px-6 py-4 flex-1 overflow-hidden">
              <section className={`h-full rounded-xl border p-4 flex flex-col gap-3 ${
                currentDentwebGuideStep.isWarning
                  ? 'border-rose-200 bg-rose-50'
                  : 'border-slate-200 bg-white'
              }`}>
                <h4 className={`text-sm font-black break-keep ${
                  currentDentwebGuideStep.isWarning ? 'text-rose-600' : 'text-slate-800'
                }`}>
                  {currentDentwebGuideStep.title}
                </h4>
                <p className={`text-xs font-semibold break-keep ${
                  currentDentwebGuideStep.isWarning ? 'text-rose-500' : 'text-slate-500'
                }`}>
                  {currentDentwebGuideStep.description}
                </p>
                <div className={`flex-1 min-h-0 rounded-xl overflow-hidden border ${
                  currentDentwebGuideStep.isWarning ? 'border-rose-200 bg-white' : 'border-slate-200 bg-slate-50'
                }`}>
                  <img
                    src={currentDentwebGuideStep.imageSrc}
                    alt={currentDentwebGuideStep.imageAlt}
                    className="w-full h-full object-contain"
                    loading="lazy"
                  />
                </div>
              </section>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setDentwebGuideStepIndex(prev => Math.max(0, prev - 1))}
                disabled={isFirstDentwebGuideStep}
                className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
                  isFirstDentwebGuideStep
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                이전
              </button>
              {!isLastDentwebGuideStep ? (
                <button
                  onClick={() => setDentwebGuideStepIndex(prev => Math.min(DENTWEB_GUIDE_STEPS.length - 1, prev + 1))}
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-black hover:bg-indigo-700 transition-colors"
                >
                  다음
                </button>
              ) : (
              <button
                onClick={() => setShowDentwebGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-sm font-black hover:bg-slate-700 transition-colors"
              >
                확인
              </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default InventoryManager;
