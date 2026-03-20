import { normalizeSurgery } from './normalizationService';
import { getSizeMatchKey } from './sizeNormalizer';
import { isExchangePrefix, stripExchangePrefix, manufacturerAliasKey } from './appUtils';
import type { ExcelRow } from '../types';

/**
 * surgeryMaster['수술기록지']에서 (제조사|브랜드|규격) 매칭키 Set을 만든다.
 * 식립 / 수술중교환 행만 포함.
 * 수술기록이 없으면 null 반환 → 배지 미표시 처리를 호출부에서 담당.
 */
export function buildSurgeryUsageSet(surgeryMaster: Record<string, ExcelRow[]>): Set<string> | null {
  const rows = surgeryMaster['수술기록지'] ?? [];
  if (rows.length === 0) return null;

  const set = new Set<string>();
  for (const row of rows) {
    const cls = String(row['구분'] || '').trim();
    if (cls !== '식립' && cls !== '수술중교환') continue;

    const manufacturer = String(row['제조사'] || '').trim();
    const brand = String(row['브랜드'] || '').trim();
    const size = String(row['규격(SIZE)'] || '').trim();

    if (!manufacturer && !brand) continue;
    if (isExchangePrefix(manufacturer)) continue;
    if (manufacturer === '보험청구' || brand === '보험임플란트') continue;

    const key = `${manufacturerAliasKey(manufacturer)}|${normalizeSurgery(brand)}|${getSizeMatchKey(size, manufacturer)}`;
    set.add(key);
  }
  return set;
}

/**
 * 픽스처 행이 수술기록에 사용된 이력이 있는지 확인한다.
 * usageSet이 null이면 수술기록 없음으로 간주하여 false 반환.
 */
export function isFixtureUsedInSurgery(
  usageSet: Set<string> | null,
  manufacturer: string,
  brand: string,
  size: string,
): boolean {
  if (!usageSet) return false;
  const key = `${manufacturerAliasKey(manufacturer)}|${normalizeSurgery(brand)}|${getSizeMatchKey(size, manufacturer)}`;
  return usageSet.has(key);
}

/**
 * 픽스처 행이 수술기록에 없는지 판별 (배지/필터용).
 * - 교환/FAIL prefix 행은 prefix를 제거한 제조사로 매칭.
 * - 보험청구 행은 항상 false (대상 외).
 * - usageSet이 null이면 false (수술기록 미업로드 → 배지 미표시).
 */
export function isFixtureRowUnused(
  usageSet: Set<string> | null,
  manufacturer: string,
  brand: string,
  size: string,
): boolean {
  if (!usageSet) return false;
  if (manufacturer === '보험청구' || brand === '보험임플란트') return false;
  if (manufacturer === 'z수술후FAIL') return false;
  const baseMfr = isExchangePrefix(manufacturer) ? stripExchangePrefix(manufacturer) : manufacturer;
  return !isFixtureUsedInSurgery(usageSet, baseMfr, brand, size);
}
