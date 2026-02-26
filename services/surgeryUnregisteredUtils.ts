import { ExcelRow, InventoryItem, SurgeryUnregisteredItem, SurgeryUnregisteredSample } from '../types';
import { fixIbsImplant } from './mappers';
import { normalizeSurgery } from './normalizationService';
import { getSizeMatchKey } from './sizeNormalizer';

export type BrandSizeFormatEntry = {
  manufacturerKey: string;
  allowedSizeTexts: Set<string>;
};

export type BrandSizeFormatIndex = Map<string, BrandSizeFormatEntry[]>;

export function normalizeSizeTextStrict(raw: string): string {
  return String(raw || '').trim();
}

export function isManufacturerAliasMatch(left: string, right: string): boolean {
  if (!left || !right) return false;
  return left === right || left.includes(right) || right.includes(left);
}

export function buildBrandSizeFormatIndex(inventoryItems: InventoryItem[]): BrandSizeFormatIndex {
  const index: BrandSizeFormatIndex = new Map();

  inventoryItems
    .filter(item =>
      !item.manufacturer.startsWith('수술중교환_') &&
      item.manufacturer !== '보험청구' &&
      item.brand !== '보험임플란트'
    )
    .forEach(item => {
      const fixed = fixIbsImplant(item.manufacturer, item.brand);
      const manufacturerKey = normalizeSurgery(fixed.manufacturer);
      const brandKey = normalizeSurgery(fixed.brand);
      const sizeKey = getSizeMatchKey(item.size, fixed.manufacturer);
      const sizeText = normalizeSizeTextStrict(item.size);
      if (!manufacturerKey || !brandKey || !sizeKey || !sizeText) return;

      const bsKey = `${brandKey}|${sizeKey}`;
      const list = index.get(bsKey) || [];
      let entry = list.find(v => v.manufacturerKey === manufacturerKey);
      if (!entry) {
        entry = { manufacturerKey, allowedSizeTexts: new Set<string>() };
        list.push(entry);
      }
      entry.allowedSizeTexts.add(sizeText);
      index.set(bsKey, list);
    });

  return index;
}

export function hasRegisteredBrandSize(
  formatIndex: BrandSizeFormatIndex,
  manufacturer: string,
  brand: string,
  size: string
): boolean {
  const rowManufacturer = normalizeSurgery(manufacturer);
  const rowBrand = normalizeSurgery(brand);
  const rowSizeKey = getSizeMatchKey(size, manufacturer);
  const bsKey = `${rowBrand}|${rowSizeKey}`;
  const candidates = formatIndex.get(bsKey) || [];
  return candidates.some(candidate => isManufacturerAliasMatch(rowManufacturer, candidate.manufacturerKey));
}

export function isListBasedSurgeryInput(
  formatIndex: BrandSizeFormatIndex,
  manufacturer: string,
  brand: string,
  size: string
): boolean {
  const rowManufacturer = normalizeSurgery(manufacturer);
  const rowBrand = normalizeSurgery(brand);
  const rowSizeKey = getSizeMatchKey(size, manufacturer);
  const rowSizeText = normalizeSizeTextStrict(size);
  const bsKey = `${rowBrand}|${rowSizeKey}`;
  const candidates = formatIndex.get(bsKey) || [];
  return candidates.some(candidate =>
    isManufacturerAliasMatch(rowManufacturer, candidate.manufacturerKey) &&
    candidate.allowedSizeTexts.has(rowSizeText)
  );
}

function maskPatientInfoForPreview(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '-';
  if (value.includes('*')) return value;

  const nameOnly = value.replace(/\(.*$/, '').trim();
  const maskedName = nameOnly.length <= 1
    ? `${nameOnly || '-'}*`
    : `${nameOnly[0]}${'*'.repeat(Math.max(1, nameOnly.length - 1))}`;

  const parenMatch = value.match(/\(([^)]*)\)/);
  if (!parenMatch) return maskedName;

  const inside = String(parenMatch[1] || '').trim();
  const maskedInside = '*'.repeat(Math.max(4, inside.length || 0));
  return `${maskedName}(${maskedInside})`;
}

export function buildUnregisteredSample(row: ExcelRow): SurgeryUnregisteredSample {
  const date = String(row['날짜'] ?? row['수술일'] ?? '').trim() || '-';
  const patientRaw = String(row['환자정보'] ?? row['환자명'] ?? '').trim();
  const chartNumber = String(row['치아번호'] ?? row['차트번호'] ?? '').trim() || '-';
  const recordId = String(row._id || '').trim() || undefined;
  return {
    date,
    patientMasked: maskPatientInfoForPreview(patientRaw),
    chartNumber,
    recordId,
  };
}

export function appendUnregisteredSample(
  target: SurgeryUnregisteredItem,
  sample: SurgeryUnregisteredSample,
  maxSamples = 3
) {
  const current = target.samples ?? [];
  const dedupKey = `${sample.recordId || ''}|${sample.date}|${sample.patientMasked}|${sample.chartNumber}`;
  const exists = current.some(v => `${v.recordId || ''}|${v.date}|${v.patientMasked}|${v.chartNumber}` === dedupKey);
  if (exists) return;
  target.samples = [...current, sample].slice(0, maxSamples);
}
