import { InventoryItem } from '../types';
import { normalizeInventory, normalizeSurgery } from './normalizationService';
import { fixIbsImplant } from './mappers';
import { toCanonicalSize, getSizeMatchKey } from './sizeNormalizer';

/**
 * 교환 카테고리 제조사 prefix 판별 (구 '수술중FAIL_' + 신 '수술중교환_' 양쪽 호환)
 */
export function isExchangePrefix(manufacturer: string): boolean {
  return manufacturer.startsWith('수술중교환_') || manufacturer.startsWith('수술중FAIL_');
}

/**
 * 교환 카테고리 prefix 제거 — '수술중교환_xxx' 또는 '수술중FAIL_xxx' → 'xxx'
 */
export function stripExchangePrefix(manufacturer: string): string {
  if (manufacturer.startsWith('수술중교환_')) return manufacturer.slice('수술중교환_'.length);
  if (manufacturer.startsWith('수술중FAIL_')) return manufacturer.slice('수술중FAIL_'.length);
  return manufacturer;
}

/**
 * 제조사 별칭 키 생성 — 대소문자/공백 무시
 * 교환 카테고리는 일반 제조사와 중복키가 섞이지 않도록 별도 네임스페이스 유지
 */
export function manufacturerAliasKey(raw: string): string {
  const value = String(raw || '').trim();
  if (!value) return '';

  // 교환 카테고리는 일반 제조사와 중복키가 섞이지 않도록 별도 네임스페이스 유지
  const compact = value.toLowerCase().replace(/\s+/g, '');
  if (compact.startsWith('수술중교환') || compact.startsWith('수술중fail')) {
    return `fail:${normalizeInventory(value)}`;
  }

  return normalizeSurgery(value).replace(/implant/g, '');
}

// ---------------------------------------------------------------------------
// 재고 중복 키 생성 (구 inventoryUtils.ts)
// ---------------------------------------------------------------------------
export function buildInventoryDuplicateKey(
  item: Pick<InventoryItem, 'manufacturer' | 'brand' | 'size'>
): string {
  const fixed = fixIbsImplant(String(item.manufacturer || ''), String(item.brand || ''));
  const canonicalSize = toCanonicalSize(String(item.size || ''), fixed.manufacturer);
  const manufacturerKey = manufacturerAliasKey(fixed.manufacturer);
  const brandKey = normalizeInventory(fixed.brand);
  const sizeKey = getSizeMatchKey(canonicalSize, fixed.manufacturer);
  return `${manufacturerKey}|${brandKey}|${sizeKey}`;
}
