import React, { useState, useMemo, useEffect } from 'react';
import { InventoryItem, SurgeryUnregisteredItem } from '../../types';
import { fixIbsImplant } from '../../services/mappers';
import { getSizeMatchKey, toCanonicalSize } from '../../services/sizeNormalizer';
import { normalizeSurgery } from '../../services/normalizationService';
import { manufacturerAliasKey } from '../../services/appUtils';
import DentwebGuideModal from './DentwebGuideModal';

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

const BULK_REGISTER_CONCURRENCY = 6;

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

interface ManualFixModalProps {
  target: UnregisteredReviewItem;
  onResolveManualInput?: (params: {
    recordIds: string[];
    targetManufacturer: string;
    targetBrand: string;
    targetSize: string;
    verifyOnly?: boolean;
  }) => Promise<ManualFixCheckResult>;
  onClose: () => void;
  onResolved: (rowKey: string) => void;
}

const ManualFixModal: React.FC<ManualFixModalProps> = ({ target, onResolveManualInput, onClose, onResolved }) => {
  const [manualFixCheckResult, setManualFixCheckResult] = useState<ManualFixCheckResult | null>(null);
  const [manualFixError, setManualFixError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<ManualFixDraft>({
    manufacturer: target.canonicalManufacturer,
    brand: target.canonicalBrand,
    size: target.preferredManualFixSize,
  });

  const isDraftValid =
    String(draft.manufacturer || '').trim().length > 0 &&
    String(draft.brand || '').trim().length > 0 &&
    String(draft.size || '').trim().length > 0;

  const getRecordIds = (): string[] => {
    const fromItem = (target.recordIds || []).filter(Boolean);
    const fromSamples = (target.samples || [])
      .map(sample => String(sample.recordId || '').trim())
      .filter(Boolean);
    return Array.from(new Set([...fromItem, ...fromSamples]));
  };

  const handleDraftChange = (field: keyof ManualFixDraft, value: string) => {
    setDraft(prev => ({ ...prev, [field]: value }));
    setManualFixCheckResult(null);
    setManualFixError(null);
  };

  const handleVerify = async () => {
    if (!onResolveManualInput) return;
    const recordIds = getRecordIds();
    if (recordIds.length === 0) {
      setManualFixError('대상 레코드 ID를 찾을 수 없어 확인할 수 없습니다.');
      return;
    }
    setManualFixError(null);
    setIsVerifying(true);
    try {
      const draftManufacturer = String(draft.manufacturer || '').trim();
      const draftBrand = String(draft.brand || '').trim();
      const draftSize = String(draft.size || '').trim();
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
        onResolved(target.rowKey);
      }
    } catch (error) {
      console.error('[ManualFixModal] 수기 입력 확인 실패:', error);
      setManualFixError('수정 완료 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleApply = async () => {
    if (!onResolveManualInput) return;
    const recordIds = getRecordIds();
    if (recordIds.length === 0) {
      setManualFixError('대상 레코드 ID를 찾을 수 없어 적용할 수 없습니다.');
      return;
    }
    setManualFixError(null);
    setIsApplying(true);
    try {
      const draftManufacturer = String(draft.manufacturer || '').trim();
      const draftBrand = String(draft.brand || '').trim();
      const draftSize = String(draft.size || '').trim();
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
        onResolved(target.rowKey);
      }
    } catch (error) {
      console.error('[ManualFixModal] 수기 입력 DB 적용 실패:', error);
      setManualFixError('수정 적용 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleClose = () => {
    if (isApplying || isVerifying) return;
    onClose();
  };

  const recordIds = getRecordIds();

  return (
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
            onClick={handleClose}
            disabled={isApplying || isVerifying}
            aria-label="닫기"
            className={`p-2 rounded-full transition-colors ${
              isApplying || isVerifying
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
              {target.manufacturer} - {target.brand} - {target.size}
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-bold text-emerald-700">수정 후 적용 형식 (구조 고정)</p>
              <button
                onClick={() => setIsEditing(prev => !prev)}
                disabled={isVerifying || isApplying}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-black transition-colors ${
                  isVerifying || isApplying
                    ? 'bg-emerald-100 text-emerald-300 cursor-not-allowed'
                    : 'bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                }`}
                title="표준값 편집"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16.862 4.487a2.25 2.25 0 113.182 3.182L9.75 17.963 6 18.75l.787-3.75L16.862 4.487z" />
                </svg>
                {isEditing ? '편집 완료' : '편집'}
              </button>
            </div>

            {isEditing ? (
              <div className="mt-2 space-y-2">
                <p className="text-[11px] font-semibold text-emerald-700/90">
                  기본 틀은 고정되며, 각 값만 수정할 수 있습니다. (제조사 - 브랜드 - 규격)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={draft.manufacturer}
                    onChange={(event) => handleDraftChange('manufacturer', event.target.value)}
                    placeholder="제조사"
                    className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <input
                    type="text"
                    value={draft.brand}
                    onChange={(event) => handleDraftChange('brand', event.target.value)}
                    placeholder="브랜드"
                    className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                  <input
                    type="text"
                    value={draft.size}
                    onChange={(event) => handleDraftChange('size', event.target.value)}
                    placeholder="규격"
                    className="w-full px-2.5 py-2 rounded-lg border border-emerald-200 bg-white text-[13px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300"
                  />
                </div>
                <p className="text-sm font-black text-emerald-700 break-keep">
                  {String(draft.manufacturer || '').trim() || '제조사'} - {String(draft.brand || '').trim() || '브랜드'} - {String(draft.size || '').trim() || '규격'}
                </p>
              </div>
            ) : (
              <p className="mt-1 text-base font-black text-emerald-700 break-keep">
                {String(draft.manufacturer || '').trim() || target.canonicalManufacturer} - {String(draft.brand || '').trim() || target.canonicalBrand} - {String(draft.size || '').trim() || target.preferredManualFixSize}
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-500">
                대상 레코드 {recordIds.length}건
              </p>
              <button
                onClick={handleVerify}
                disabled={isVerifying || isApplying || !onResolveManualInput || !isDraftValid}
                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${
                  !isVerifying && !isApplying && onResolveManualInput && isDraftValid
                    ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isVerifying ? '확인 중...' : '덴트웹 편집 후 확인'}
              </button>
            </div>
            <div className="mt-2 space-y-1.5">
              {(target.samples || []).slice(0, 3).map((sample, idx) => (
                <p key={`${target.rowKey}-manualfix-sample-${idx}`} className="text-[12px] font-semibold text-slate-600 break-keep">
                  {sample.date} · {sample.patientMasked} ({sample.chartNumber})
                </p>
              ))}
              {(target.samples || []).length > 3 && (
                <p className="text-[11px] font-semibold text-slate-400">
                  +{(target.samples || []).length - 3}건 더 있음
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
            onClick={handleClose}
            disabled={isApplying || isVerifying}
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${
              isApplying || isVerifying
                ? 'text-slate-400 bg-slate-100 border-slate-200 cursor-not-allowed'
                : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-100'
            }`}
          >
            닫기
          </button>
          <button
            onClick={handleApply}
            disabled={
              isApplying ||
              isVerifying ||
              !onResolveManualInput ||
              !isDraftValid ||
              recordIds.length === 0 ||
              (manualFixCheckResult ? manualFixCheckResult.applicable === 0 : false)
            }
            className={`px-4 py-2 rounded-xl text-sm font-black transition-colors ${
              !isApplying &&
              !isVerifying &&
              !!onResolveManualInput &&
              isDraftValid &&
              recordIds.length > 0 &&
              !(manualFixCheckResult ? manualFixCheckResult.applicable === 0 : false)
                ? 'bg-rose-600 text-white hover:bg-rose-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            {isApplying ? '적용 중...' : '확인 후 적용'}
          </button>
        </div>
      </div>
    </div>
  );
};

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
  }) => Promise<ManualFixCheckResult>;
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

  const unregisteredUsageTotal = useMemo(
    () => unregisteredFromSurgery.reduce((sum, item) => sum + item.usageCount, 0),
    [unregisteredFromSurgery]
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

  const bulkRegisterTargets = useMemo(
    () => filteredUnregistered.filter(item => item.canRegister && !registeringUnregistered[item.rowKey]),
    [filteredUnregistered, registeringUnregistered]
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
      manufacturer: `수술중교환_${item.canonicalManufacturer}`,
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
      console.error('[UnregisteredDetailModal] 미등록 품목 등록 실패:', error);
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

  const handleClose = () => {
    if (isBulkRegistering) return;
    onClose();
  };

  return (
    <>
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
            {filteredUnregistered.length === 0 ? (
              <div className="h-full min-h-[240px] flex items-center justify-center text-sm text-slate-400 font-semibold">
                검색 결과가 없습니다.
              </div>
            ) : (
              isManualOnlyUnregisteredView ? (
                <table className="w-full text-left border-collapse table-fixed">
                  <thead className="md:sticky md:top-0 bg-slate-50 border-b border-slate-200 z-10">
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
                              onClick={() => setManualFixTarget(item)}
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
                  <thead className="md:sticky md:top-0 bg-slate-50 border-b border-slate-200 z-10">
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
                                onClick={() => setManualFixTarget(item)}
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
        </div>
      </div>

      {manualFixTarget && (
        <ManualFixModal
          target={manualFixTarget}
          onResolveManualInput={onResolveManualInput}
          onClose={() => setManualFixTarget(null)}
          onResolved={(rowKey) => {
            setResolvedUnregisteredRows(prev => ({ ...prev, [rowKey]: true }));
            setManualFixTarget(null);
          }}
        />
      )}

      {showDentwebGuide && (
        <DentwebGuideModal onClose={() => setShowDentwebGuide(false)} />
      )}
    </>
  );
};

export default UnregisteredDetailModal;
