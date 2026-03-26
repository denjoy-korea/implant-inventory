import { describe, it, expect } from 'vitest';
import {
  detectSizePattern,
  pickDominantPattern,
  isSameManufacturerAlias,
  buildInventoryDuplicateKeyLocal,
  type SizePattern,
} from '@/services/unregisteredMatchingUtils';

describe('detectSizePattern', () => {
  it('Φ 기호 포함 → phi', () => {
    expect(detectSizePattern('Φ4.5x13')).toBe('phi');
  });

  it('C숫자+Φ → cuff-phi', () => {
    expect(detectSizePattern('C2Φ4.5')).toBe('cuff-phi');
  });

  it('Ø...mm 포함 → oslash-mm', () => {
    expect(detectSizePattern('Ø4.5mm x 13')).toBe('oslash-mm');
  });

  it('숫자x숫자 형식 → bare-numeric', () => {
    expect(detectSizePattern('4.5x13')).toBe('bare-numeric');
  });

  it('4~6자리 숫자코드 → numeric-code', () => {
    expect(detectSizePattern('4513')).toBe('numeric-code');
    expect(detectSizePattern('483410')).toBe('numeric-code');
  });

  it('빈 문자열 → empty', () => {
    expect(detectSizePattern('')).toBe('empty');
  });

  it('인식 불가 → other', () => {
    expect(detectSizePattern('abc')).toBe('other');
  });
});

describe('pickDominantPattern', () => {
  it('가장 빈도 높은 패턴 반환', () => {
    const patterns: SizePattern[] = ['phi', 'phi', 'bare-numeric'];
    expect(pickDominantPattern(patterns)).toBe('phi');
  });

  it('동점 시 알파벳 순 앞선 것 반환', () => {
    const patterns: SizePattern[] = ['phi', 'bare-numeric'];
    // bare-numeric < phi alphabetically
    expect(pickDominantPattern(patterns)).toBe('bare-numeric');
  });

  it('빈 배열 → other', () => {
    expect(pickDominantPattern([])).toBe('other');
  });
});

describe('isSameManufacturerAlias', () => {
  it('동일 제조사 대소문자 무관 → true', () => {
    expect(isSameManufacturerAlias('Osstem', 'osstem')).toBe(true);
  });

  it('다른 제조사 → false', () => {
    expect(isSameManufacturerAlias('Osstem', 'Dentium')).toBe(false);
  });

  it('빈 문자열 → false', () => {
    expect(isSameManufacturerAlias('', 'Osstem')).toBe(false);
  });
});

describe('buildInventoryDuplicateKeyLocal', () => {
  it('동일 입력에서 항상 같은 키 생성', () => {
    const k1 = buildInventoryDuplicateKeyLocal('Osstem', 'USII CA', '4.5x13');
    const k2 = buildInventoryDuplicateKeyLocal('Osstem', 'USII CA', '4.5x13');
    expect(k1).toBe(k2);
  });

  it('제조사 다르면 다른 키', () => {
    const k1 = buildInventoryDuplicateKeyLocal('Osstem', 'USII CA', '4.5x13');
    const k2 = buildInventoryDuplicateKeyLocal('Dentium', 'USII CA', '4.5x13');
    expect(k1).not.toBe(k2);
  });

  it('파이프 구분자 형식 유지', () => {
    const k = buildInventoryDuplicateKeyLocal('Osstem', 'USII CA', '4.5x13');
    expect(k.split('|')).toHaveLength(3);
  });
});
