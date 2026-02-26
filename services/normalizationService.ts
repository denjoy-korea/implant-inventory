/**
 * normalizationService.ts
 * 문자열 정규화 유틸리티 — 용도별로 분리하여 일관성 유지
 */

/**
 * 수술기록 매칭용 정규화 (Surgery matching normalization)
 * - 접두어 제거: 수술중교환_, 수술중FAIL_, 보험임플란트
 * - 특수문자 제거: 공백, -, _, ., (, )
 * - Φ, φ → d 변환
 *
 * 용도: 수술기록지 ↔ 픽스쳐 매칭, 교환 매칭
 */
export const normalizeSurgery = (str: string): string => {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/보험임플란트/g, '')
    .replace(/수술중교환/g, '')
    .replace(/수술중fail/g, '')
    .replace(/[\s\-\_\.\(\)]/g, '')
    .replace(/[Φφ]/g, 'd');
};

/**
 * 재고 비교용 정규화 (Inventory comparison normalization)
 * - 접두어 유지: 수술중교환_, 보험청구 등 그대로 보존
 * - 공백, -, _ 만 제거
 *
 * 용도: 재고 마스터 중복 검사, 픽스쳐 → 재고 반영 시 비교
 */
export const normalizeInventory = (str: string): string => {
  return String(str || '')
    .trim()
    .toLowerCase()
    .replace(/[\s\-\_]/g, '');
};
