import { normalizeInventory, normalizeSurgery } from './normalizationService';

/**
 * 교환 카테고리 제조사 prefix 판별 (구 '수술중FAIL_' + 신 '수술중교환_' 양쪽 호환)
 */
export function isExchangePrefix(manufacturer: string): boolean {
  return manufacturer.startsWith('수술중교환_') || manufacturer.startsWith('수술중FAIL_');
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
