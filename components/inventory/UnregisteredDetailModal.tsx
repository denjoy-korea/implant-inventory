import React, { useState, useMemo, useEffect } from 'react';
import ModalShell from '../shared/ModalShell';
import ConfirmModal from '../ConfirmModal';
import { InventoryItem, SurgeryUnregisteredItem } from '../../types';
import { fixIbsImplant } from '../../services/mappers';
import { getSizeMatchKey, toCanonicalSize, parseSize } from '../../services/sizeNormalizer';
import { normalizeSurgery } from '../../services/normalizationService';
import DentwebGuideModal from './DentwebGuideModal';
import ManualFixModal, { ManualFixCheckResult } from './ManualFixModal';
import {
  SizePattern,
  SIZE_PATTERN_LABELS,
  detectSizePattern,
  pickDominantPattern,
  isSameManufacturerAlias,
  buildInventoryDuplicateKeyLocal,
} from '../../services/unregisteredMatchingUtils';
import UnregisteredItemsTable from './unregistered/UnregisteredItemsTable';

const BULK_REGISTER_CONCURRENCY = 6;

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
  parsedDimensions: { diameter: number | null; length: number | null; cuff: string | null };
  dimensionalMatchInfo: 'exact_match' | 'dim_in_brand' | 'new_dim' | 'parse_fail' | 'no_inventory';
}


interface UnregisteredDetailModalProps {
  unregisteredFromSurgery: SurgeryUnregisteredItem[];
  visibleInventory: InventoryItem[];
  inventory: InventoryItem[];
  isReadOnly?: boolean;
  onAddInventoryItem: (newItem: InventoryItem) => boolean | void | Promise<boolean | void>;
  onResolveManualInput?: (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
    forceApply?: boolean;
  }) => Promise<ManualFixCheckResult>;
  onAdjustBaseStock?: (inventoryId: string, delta: number) => Promise<void>;
  onClose: () => void;
  initialViewMode: 'not_in_inventory' | 'non_list_input';
}

const UnregisteredDetailModal: React.FC<UnregisteredDetailModalProps> = ({
  unregisteredFromSurgery,
  visibleInventory,
  inventory,
  isReadOnly,
  onAddInventoryItem,
  onResolveManualInput,
  onAdjustBaseStock,
  onClose,
  initialViewMode,
}) => {
  const [unregisteredSearch, setUnregisteredSearch] = useState('');
  const [unregisteredViewMode, setUnregisteredViewMode] = useState<'not_in_inventory' | 'non_list_input'>(initialViewMode);
  const [registeringUnregistered, setRegisteringUnregistered] = useState<Record<string, boolean>>({});
  const [isBulkRegistering, setIsBulkRegistering] = useState(false);
  const [bulkRegisterProgress, setBulkRegisterProgress] = useState<{ done: number; total: number } | null>(null);
  const [resolvedUnregisteredRows, setResolvedUnregisteredRows] = useState<Record<string, true>>({});
  const [manualFixTarget, setManualFixTarget] = useState<UnregisteredReviewItem | null>(null);
  const [showDentwebGuide, setShowDentwebGuide] = useState(false);
  const [showConsistencyPanel, setShowConsistencyPanel] = useState(true);
  const [registerConfirmTarget, setRegisterConfirmTarget] = useState<UnregisteredReviewItem | null>(null);

  // 브랜드별 기존 재고 치수 프로파일 (직경·길이·커프 집합)
  const brandDimensionProfiles = useMemo(() => {
    const map = new Map<string, {
      diameters: Set<number>;
      lengths: Set<number>;
      cuffs: Set<string | null>;
      sampleCount: number;
    }>();
    visibleInventory.forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const brandKey = normalizeSurgery(fixed.brand);
      if (!brandKey) return;
      const parsed = parseSize(item.size, fixed.manufacturer);
      if (parsed.diameter === null || parsed.length === null) return;
      const existing = map.get(brandKey) ?? {
        diameters: new Set<number>(),
        lengths: new Set<number>(),
        cuffs: new Set<string | null>(),
        sampleCount: 0,
      };
      existing.diameters.add(parsed.diameter);
      existing.lengths.add(parsed.length);
      existing.cuffs.add(parsed.cuff);
      existing.sampleCount++;
      map.set(brandKey, existing);
    });
    return map;
  }, [visibleInventory]);

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
      // rowKey는 원본 제조사를 포함해 유일성 보장 (resolved 제조사가 같아도 원본이 다르면 별도 행)
      const rawNormManufacturer = normalizeSurgery(String(item.manufacturer || '').trim());
      const rowKey = `${rawNormManufacturer}|${normalizedBrand}|${normalizedSize}`;
      // isDuplicate 체크는 resolved 제조사 기준 (기존 재고와 비교)
      const resolvedRowKey = `${groupKey}|${normalizedSize}`;

      const baseline = existingPatternBaseline.get(groupKey) ?? null;
      const actualPattern = detectSizePattern(canonicalSize);
      const hasBaseline = !!baseline;
      const isConsistent = !hasBaseline || actualPattern === baseline.dominantPattern;
      const isDuplicate = existingInventoryKeySet.has(resolvedRowKey);
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

      // 치수 기반 분석: parseSize로 직경·길이·커프 추출
      const surgeryParsed = parseSize(String(item.size || '').trim(), resolvedManufacturer);
      const canParseDimensions = surgeryParsed.diameter !== null && surgeryParsed.length !== null;
      const brandProfile = brandDimensionProfiles.get(normalizedBrand) ?? null;

      // 치수 일치 유형 판별
      let dimensionalMatchInfo: UnregisteredReviewItem['dimensionalMatchInfo'];
      if (!canParseDimensions) {
        dimensionalMatchInfo = 'parse_fail';
      } else if (!brandProfile || brandProfile.sampleCount === 0) {
        dimensionalMatchInfo = 'no_inventory';
      } else if (preferredInventorySize !== undefined) {
        // matchKey로 재고에서 동일 치수 찾음 (포맷 무관)
        dimensionalMatchInfo = 'exact_match';
      } else {
        const diaKnown = brandProfile.diameters.has(surgeryParsed.diameter!);
        const lenKnown = brandProfile.lengths.has(surgeryParsed.length!);
        // 커프 일치 여부 (맨 앞·맨 뒤 위치 무관, matchKey로 이미 정규화)
        const cuffVal = surgeryParsed.cuff;
        const cuffKnown = cuffVal !== null && brandProfile.cuffs.has(cuffVal);
        if (diaKnown && lenKnown) {
          // 직경·길이 모두 브랜드 재고에 존재
          dimensionalMatchInfo = 'dim_in_brand';
        } else if (diaKnown && cuffKnown) {
          // 직경 + 커프 일치 → 같은 제품군의 다른 길이 변형 가능성
          dimensionalMatchInfo = 'dim_in_brand';
        } else {
          // 파싱 성공했으나 브랜드 재고에 없는 치수 조합
          dimensionalMatchInfo = 'new_dim';
        }
      }

      // 치수 파싱 실패 시에만 차단 (포맷·패턴 불일치는 더 이상 차단 안 함)
      const dimensionalBlock: string | null = !canParseDimensions
        ? '직경/길이를 추출할 수 없습니다 — 덴트웹에서 목록 선택으로 입력해 주세요'
        : null;

      let registerBlockReason: string | null = null;
      if (!fixed.manufacturer || !fixed.brand || !canonicalSize || canonicalSize === '-') {
        registerBlockReason = '제조사/브랜드/규격 정보가 부족합니다';
      } else if (item.reason === 'non_list_input') {
        // 치수 추출 가능 → 기존 재고 형식으로 수술기록 일괄 수정 허용
        registerBlockReason = dimensionalBlock;
      } else if (isDuplicate) {
        registerBlockReason = '이미 등록된 규격입니다';
      } else {
        // 치수 검증 통과 → 신규 등록 허용 (포맷 불일치는 차단 안 함)
        registerBlockReason = dimensionalBlock;
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
        parsedDimensions: { diameter: surgeryParsed.diameter, length: surgeryParsed.length, cuff: surgeryParsed.cuff },
        dimensionalMatchInfo,
      };
    });
  }, [unregisteredFromSurgery, existingPatternBaseline, existingInventoryKeySet, existingManufacturersByBrand, visibleInventory, brandDimensionProfiles]);

  const effectiveUnregisteredReviewItems = useMemo(
    () => unregisteredReviewItems.filter(item => !resolvedUnregisteredRows[item.rowKey]),
    [unregisteredReviewItems, resolvedUnregisteredRows]
  );

  const unregisteredBreakdown = useMemo(() => {
    // 일관성 있는 non_list_input(canRegister=true)은 미등록 탭에 포함
    const missing = effectiveUnregisteredReviewItems.filter(
      item => item.reason === 'not_in_inventory' || (item.reason === 'non_list_input' && item.canRegister)
    );
    const manual = effectiveUnregisteredReviewItems.filter(
      item => item.reason === 'non_list_input' && !item.canRegister
    );
    return {
      missingCount: missing.length,
      manualCount: manual.length,
      missingUsage: missing.reduce((sum, item) => sum + item.usageCount, 0),
      manualUsage: manual.reduce((sum, item) => sum + item.usageCount, 0),
    };
  }, [effectiveUnregisteredReviewItems]);

  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
  );

  const unregisteredRegistrableCount = useMemo(
    () => effectiveUnregisteredReviewItems.filter(item => item.canRegister).length,
    [effectiveUnregisteredReviewItems]
  );

  // 브랜드별 일관성 분석 그룹 (기존 재고 기준 없는 미등록 품목 대상)
  const brandConsistencyGroups = useMemo(() => {
    if (unregisteredViewMode !== 'not_in_inventory') return [];
    const brandMap = new Map<string, {
      brand: string; manufacturers: Set<string>; items: UnregisteredReviewItem[]; patterns: SizePattern[];
    }>();
    effectiveUnregisteredReviewItems
      .filter(item => item.reason !== 'non_list_input' && !item.hasBaseline)
      .forEach(item => {
        const key = normalizeSurgery(item.canonicalBrand);
        const entry = brandMap.get(key) ?? { brand: item.canonicalBrand, manufacturers: new Set<string>(), items: [], patterns: [] };
        entry.manufacturers.add(item.canonicalManufacturer);
        entry.items.push(item);
        entry.patterns.push(item.actualPattern);
        brandMap.set(key, entry);
      });
    return Array.from(brandMap.values())
      .map(entry => {
        const dominant = pickDominantPattern(entry.patterns);
        const isConsistent = entry.patterns.every(p => p === dominant);
        const registrableCount = entry.items.filter(i => i.canRegister).length;
        const totalUsage = entry.items.reduce((sum, i) => sum + i.usageCount, 0);
        const manufacturerList = Array.from(entry.manufacturers);
        return {
          brand: entry.brand,
          manufacturers: manufacturerList,
          itemCount: entry.items.length,
          totalUsage,
          dominantPattern: dominant,
          dominantPatternLabel: SIZE_PATTERN_LABELS[dominant],
          isConsistent,
          registrableCount,
        };
      })
      .sort((a, b) => b.totalUsage - a.totalUsage);
  }, [effectiveUnregisteredReviewItems, unregisteredViewMode]);

  const modeFilteredUnregistered = useMemo(() => {
    if (unregisteredViewMode === 'not_in_inventory') {
      // 미등록 탭: 미등록 + 일관성 있는 non_list_input(등록 가능)
      return effectiveUnregisteredReviewItems.filter(
        item => item.reason === 'not_in_inventory' || (item.reason === 'non_list_input' && item.canRegister)
      );
    }
    // 수기 입력 탭: 패턴 혼재로 등록 불가인 non_list_input만
    return effectiveUnregisteredReviewItems.filter(
      item => item.reason === 'non_list_input' && !item.canRegister
    );
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
    () => unregisteredViewMode === 'non_list_input' && filteredUnregistered.length > 0,
    [unregisteredViewMode, filteredUnregistered]
  );

  const bulkRegisterTargets = useMemo(
    () => filteredUnregistered.filter(item => item.canRegister && item.dimensionalMatchInfo !== 'new_dim' && !registeringUnregistered[item.rowKey]),
    [filteredUnregistered, registeringUnregistered]
  );

  const newDimCount = useMemo(
    () => filteredUnregistered.filter(item => item.canRegister && item.dimensionalMatchInfo === 'new_dim').length,
    [filteredUnregistered]
  );

  useEffect(() => {
    if (unregisteredViewMode === 'not_in_inventory' && unregisteredBreakdown.missingCount === 0 && unregisteredBreakdown.manualCount > 0) {
      setUnregisteredViewMode('non_list_input');
      return;
    }
    if (unregisteredViewMode === 'non_list_input' && unregisteredBreakdown.manualCount === 0 && unregisteredBreakdown.missingCount > 0) {
      setUnregisteredViewMode('not_in_inventory');
    }
  }, [unregisteredViewMode, unregisteredBreakdown.missingCount, unregisteredBreakdown.manualCount]);

  const registerUnregisteredItem = async (item: UnregisteredReviewItem, sharedKeySet?: Set<string>): Promise<void> => {
    if (!item.canRegister) return;
    if (registeringUnregistered[item.rowKey]) return;

    setRegisteringUnregistered(prev => ({ ...prev, [item.rowKey]: true }));

    // non_list_input: 수술기록 형식 수정 (기존 재고 형식으로 일괄 수정) 후 재고 추가로 계속 진행
    if (item.reason === 'non_list_input' && onResolveManualInput) {
      try {
        const recordIds = item.recordIds ?? [];
        if (recordIds.length > 0) {
          await onResolveManualInput({
            recordIds,
            targetManufacturer: item.canonicalManufacturer,
            targetBrand: item.canonicalBrand,
            targetSize: item.preferredManualFixSize,
          });
        }
      } catch (error) {
        console.error('[UnregisteredDetailModal] 수기 입력 일괄 수정 실패:', error);
      }
    }

    const mainItem: InventoryItem = {
      id: `manual_unregistered_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      manufacturer: item.canonicalManufacturer,
      brand: item.canonicalBrand,
      // 기존 재고와 동일한 브랜드 규격 양식 사용 (신규 치수도 canonical 형식으로 등록)
      size: item.preferredManualFixSize,
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
      manufacturer: `수술중교환_${item.canonicalManufacturer}`,
    };

    try {
      let insertedAny = false;
      let allSkippedAsDuplicates = true; // 모든 후보가 이미 등록된 경우 추적
      // 일괄 등록 시 sharedKeySet을 공유해 워커 간 중복 삽입 방지, 개별 등록 시 독립 복사본 사용
      const runtimeKeySet = sharedKeySet ?? new Set(allInventoryDuplicateKeySet);
      const candidates = [mainItem, failItem];

      for (const candidate of candidates) {
        const candidateKey = buildInventoryDuplicateKeyLocal(candidate.manufacturer, candidate.brand, candidate.size);
        if (runtimeKeySet.has(candidateKey)) continue;

        allSkippedAsDuplicates = false; // 실제 등록 시도한 후보가 있음
        // 20초 타임아웃: 네트워크 hang 시 "등록 중..." 영구 잔류 방지
        const result = await Promise.race([
          Promise.resolve(onAddInventoryItem(candidate)),
          new Promise<false>(resolve => setTimeout(() => resolve(false), 20_000)),
        ]);
        if (result === false) continue;

        runtimeKeySet.add(candidateKey);
        insertedAny = true;
      }

      // 직접 등록 성공 or 모든 후보가 이미 다른 경로로 등록된 중복 → 목록에서 제거
      if (insertedAny || allSkippedAsDuplicates) {
        setResolvedUnregisteredRows(prev => ({ ...prev, [item.rowKey]: true }));
      }
    } catch (error) {
      console.error('[UnregisteredDetailModal] 미등록 품목 등록 실패:', error);
    } finally {
      setRegisteringUnregistered(prev => {
        const next = { ...prev };
        delete next[item.rowKey];
        return next;
      });
    }
  };

  const handleRegisterUnregistered = (item: UnregisteredReviewItem) => {
    setRegisterConfirmTarget(item);
  };

  const handleBulkRegisterUnregistered = async () => {
    if (isBulkRegistering) return;
    const targets = bulkRegisterTargets;
    if (targets.length === 0) return;

    setIsBulkRegistering(true);
    setBulkRegisterProgress({ done: 0, total: targets.length });
    const queue = [...targets];
    const workerCount = Math.min(BULK_REGISTER_CONCURRENCY, queue.length);
    // 모든 워커가 동일한 Set을 공유 → 동시 등록 시 중복 삽입 방지
    const sharedKeySet = new Set(allInventoryDuplicateKeySet);

    const runWorker = async () => {
      while (true) {
        const item = queue.shift();
        if (!item) return;
        await registerUnregisteredItem(item, sharedKeySet);
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
    setBulkRegisterProgress(null);
  };

  const handleClose = () => {
    if (isBulkRegistering) return;
    onClose();
  };

  return (
    <>
      <ModalShell isOpen={true} onClose={onClose} title="수술기록 미등록 품목 상세" titleId="unregistered-detail-title" zIndex={200} maxWidth="max-w-4xl" className="max-h-[82vh] flex flex-col">
          <div className="px-6 py-5 bg-amber-500 text-white flex items-start justify-between gap-4 shrink-0">
            <div>
              <h3 id="unregistered-detail-title" className="text-lg font-black flex items-center gap-2">
                수술기록 미등록 품목 상세
                <span className="relative group/modal-why inline-flex items-center">
                  <svg className="w-4 h-4 text-white/70 cursor-help flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="absolute top-full left-0 mt-2 w-80 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg px-3 py-2.5 shadow-xl opacity-0 group-hover/modal-why:opacity-100 transition-opacity duration-75 pointer-events-none z-50">
                    <p className="font-bold text-amber-300 mb-1">왜 감지되나요?</p>
                    <p><span className="font-semibold text-white">① 미등록</span> — 수술기록지의 제조사·브랜드·규격이 재고 마스터에 없는 경우. 목록에 추가하면 재고 추적이 시작됩니다.</p>
                    <p className="mt-1.5"><span className="font-semibold text-white">② 수기 입력 (파싱 불가)</span> — 직경·길이를 자동으로 추출할 수 없는 형식. 덴트웹에서 목록 선택으로 수정 필요.</p>
                    <p className="mt-1.5"><span className="font-semibold text-amber-300">※ 치수 분석 허용</span> — 직경·길이 추출 성공 시 브랜드 재고와 치수 비교 후 등록 또는 자동 수정 가능.</p>
                    <p className="mt-1.5 text-slate-400">해결: 치수 파싱 성공 항목은 목록 등록, 파싱 불가 수기 입력은 덴트웹에서 수정하세요.</p>
                  </div>
                </span>
              </h3>
              <p className="text-amber-100 text-xs font-medium mt-1">
                총 {effectiveUnregisteredReviewItems.length}종 · 미등록 {unregisteredBreakdown.missingCount}종 · 수기 입력 {unregisteredBreakdown.manualCount}종 · 등록 가능 {unregisteredRegistrableCount}종 · 누적 사용 {unregisteredUsageTotal.toLocaleString()}개
              </p>
            </div>
            <button
              onClick={handleClose}
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
                {newDimCount > 0 && (
                  <span className="ml-1 text-amber-600">· 신규치수 {newDimCount}건(개별확인)</span>
                )}
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
                    : `안전 등록 ${bulkRegisterTargets.length}건 한번에 등록`}
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
                    직경·길이를 자동으로 추출할 수 없는 규격입니다. 덴트웹 수술기록지에서 픽스쳐를 목록에서 선택하도록 수정이 필요합니다.
                  </p>
                  <button
                    onClick={() => setShowDentwebGuide(true)}
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
            {/* 브랜드 자체 일관성 분석 패널 */}
            {brandConsistencyGroups.length > 0 && (
              <div className="px-6 py-3 bg-indigo-50 border-b border-indigo-100">
                <button
                  onClick={() => setShowConsistencyPanel(prev => !prev)}
                  className="w-full flex items-center justify-between gap-2 group"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    <span className="text-[11px] font-black text-indigo-700">브랜드 자체 규격 일관성 분석</span>
                    <span className="text-[10px] text-indigo-500">기존 재고 기준 없는 브랜드 — 치수(직경·길이) 파싱 기반 분석</span>
                  </div>
                  <svg className={`w-3.5 h-3.5 text-indigo-400 transition-transform ${showConsistencyPanel ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showConsistencyPanel && (
                  <div className="mt-2 space-y-1.5">
                    {brandConsistencyGroups.map(group => (
                      <div key={group.brand} className={`flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 rounded-lg text-[11px] ${
                        group.isConsistent ? 'bg-emerald-50 border border-emerald-200' : 'bg-orange-50 border border-orange-200'
                      }`}>
                        <span className="font-black text-slate-700">{group.brand}</span>
                        {group.manufacturers.length > 1 && (
                          <span className="text-slate-400 font-medium">
                            제조사 변형 {group.manufacturers.length}개: {group.manufacturers.join(', ')}
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                          group.isConsistent ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {group.dominantPatternLabel}
                        </span>
                        {group.isConsistent ? (
                          <span className="font-bold text-emerald-600">
                            {group.itemCount}종 패턴 일치 · {group.registrableCount}종 등록 가능
                          </span>
                        ) : (
                          <span className="font-bold text-orange-600">패턴 혼재 — 치수 파싱으로 검증 ({group.registrableCount}종 등록 가능)</span>
                        )}
                        <span className="ml-auto text-slate-400">누적 {group.totalUsage.toLocaleString()}개</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <UnregisteredItemsTable
              filteredUnregistered={filteredUnregistered}
              isManualOnlyUnregisteredView={isManualOnlyUnregisteredView}
              isReadOnly={isReadOnly}
              hasManualResolver={!!onResolveManualInput}
              registeringUnregistered={registeringUnregistered}
              onOpenManualFix={(item) => setManualFixTarget(item as UnregisteredReviewItem)}
              onRegister={(item) => void handleRegisterUnregistered(item as UnregisteredReviewItem)}
            />
          </div>

          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2 shrink-0">
            <button
              onClick={handleClose}
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
      </ModalShell>

      {manualFixTarget && (
        <ManualFixModal
          target={manualFixTarget}
          mode={manualFixTarget.reason === 'not_in_inventory' ? 'brand_fix' : 'manual_input'}
          visibleInventory={visibleInventory}
          onResolveManualInput={onResolveManualInput}
          onAdjustBaseStock={onAdjustBaseStock}
          onClose={() => setManualFixTarget(null)}
          onResolved={(rowKey) => {
            // not_in_inventory 항목은 수술기록 수정 후에도 재고 등록이 별도이므로 행 유지
            if (manualFixTarget.reason !== 'not_in_inventory') {
              setResolvedUnregisteredRows(prev => ({ ...prev, [rowKey]: true }));
            }
            setManualFixTarget(null);
          }}
        />
      )}

      {showDentwebGuide && (
        <DentwebGuideModal onClose={() => setShowDentwebGuide(false)} />
      )}

      {registerConfirmTarget && (
        <ConfirmModal
          title={registerConfirmTarget.dimensionalMatchInfo === 'new_dim' ? '신규 치수 확인 후 등록' : '재고 목록 등록 확인'}
          message={
            registerConfirmTarget.dimensionalMatchInfo === 'new_dim'
              ? `이 치수(${registerConfirmTarget.canonicalSize})는 기존 재고에 없는 조합입니다. 실제 존재하는 규격인지 확인하셨나요?`
              : `아래 정보로 재고 목록에 등록합니다. 제조사·브랜드·규격이 정확한지 확인해 주세요.`
          }
          tip={`${registerConfirmTarget.canonicalManufacturer} · ${registerConfirmTarget.canonicalBrand} · ${registerConfirmTarget.canonicalSize}`}
          confirmLabel="등록"
          cancelLabel="취소"
          confirmColor={registerConfirmTarget.dimensionalMatchInfo === 'new_dim' ? 'amber' : 'indigo'}
          onConfirm={() => {
            const target = registerConfirmTarget;
            setRegisterConfirmTarget(null);
            void registerUnregisteredItem(target);
          }}
          onCancel={() => setRegisterConfirmTarget(null)}
        />
      )}
    </>
  );
};

export default UnregisteredDetailModal;
