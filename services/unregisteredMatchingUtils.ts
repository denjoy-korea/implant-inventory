/**
 * 미등록 수술 아이템 매칭/분류 유틸리티 (순수 함수)
 * UnregisteredDetailModal에서 추출 — 독립 테스트 가능
 */

import { fixIbsImplant } from './mappers';
import { getSizeMatchKey, toCanonicalSize } from './sizeNormalizer';
import { normalizeSurgery } from './normalizationService';
import { manufacturerAliasKey } from './appUtils';

export type SizePattern =
  | 'phi'
  | 'oslash-mm'
  | 'oslash-l'
  | 'cuff-phi'
  | 'dl-cuff'
  | 'numeric-code'
  | 'bare-numeric'
  | 'other'
  | 'empty';

export const SIZE_PATTERN_LABELS: Record<SizePattern, string> = {
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

/** 규격 문자열의 표기 패턴 탐지 */
export function detectSizePattern(size: string): SizePattern {
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

/** 여러 패턴 후보 중 빈도 기준 지배적 패턴 선택 */
export function pickDominantPattern(patterns: SizePattern[]): SizePattern {
  const counts = new Map<SizePattern, number>();
  patterns.forEach(pattern => {
    counts.set(pattern, (counts.get(pattern) ?? 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]))[0]?.[0] ?? 'other';
}

/** 제조사 별칭 정규화 후 동일성 비교 */
export function isSameManufacturerAlias(a: string, b: string): boolean {
  const aa = manufacturerAliasKey(a);
  const bb = manufacturerAliasKey(b);
  if (!aa || !bb) return false;
  return aa === bb || aa.includes(bb) || bb.includes(aa);
}

/** 재고 중복 감지용 로컬 키 생성 */
export function buildInventoryDuplicateKeyLocal(
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
