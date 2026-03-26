/**
 * sizeNormalizer.ts TypeScript 직접 import 테스트
 * scripts/unit.test.mjs의 JS 재구현 로직을 대체한다.
 * 원본 TS 변경 시 이 테스트가 즉시 감지 (drift 위험 해소)
 */
import { describe, it, expect } from 'vitest';
import {
  extractLengthFromSize,
  isIbsImplantManufacturer,
  parseSize,
  getSizeMatchKey,
  toCanonicalSize,
} from '@/services/sizeNormalizer';

describe('extractLengthFromSize', () => {
  // unit.test.mjs에서 이식된 케이스들
  it('"4.5x13" → "13"', () => {
    expect(extractLengthFromSize('4.5x13')).toBe('13');
  });

  it('"L10" → "10" (대문자 L 접두어)', () => {
    expect(extractLengthFromSize('L10')).toBe('10');
  });

  it('"l10" → "10" (소문자 l 접두어)', () => {
    expect(extractLengthFromSize('l10')).toBe('10');
  });

  it('"410016" → "16" (6자리 숫자코드 마지막 2자리)', () => {
    expect(extractLengthFromSize('410016')).toBe('16');
  });

  it('null → 빈 문자열', () => {
    expect(extractLengthFromSize(null)).toBe('');
  });

  it('undefined → 빈 문자열', () => {
    expect(extractLengthFromSize(undefined)).toBe('');
  });

  it('"" → 빈 문자열', () => {
    expect(extractLengthFromSize('')).toBe('');
  });

  // 추가 케이스
  it('"3x4x13" → 중간 x 이후 값 "4"', () => {
    // doubleXMatch: 가운데 x 이후 숫자
    expect(extractLengthFromSize('3x4x13')).toBe('4');
  });

  it('"4513" → "13" (4자리 숫자코드)', () => {
    expect(extractLengthFromSize('4513')).toBe('13');
  });

  it('숫자 타입 입력도 처리', () => {
    expect(extractLengthFromSize(4513)).toBe('13');
  });

  it('"13" (2자리 숫자) → 빈 문자열 (패턴 없음)', () => {
    expect(extractLengthFromSize('13')).toBe('');
  });

  it('숫자 42 (2자리) → 빈 문자열', () => {
    expect(extractLengthFromSize(42)).toBe('');
  });

  it('"X8.5" → "8.5" (대문자 X 접두어, 소수점 포함)', () => {
    expect(extractLengthFromSize('X8.5')).toBe('8.5');
  });

  it('"1234" → "34" (4자리 숫자코드 마지막 2자리)', () => {
    expect(extractLengthFromSize('1234')).toBe('34');
  });

  it('공백만 있는 문자열 → 빈 문자열', () => {
    expect(extractLengthFromSize('   ')).toBe('');
  });
});

describe('isIbsImplantManufacturer', () => {
  it('"IBS" → true', () => {
    expect(isIbsImplantManufacturer('IBS')).toBe(true);
  });

  it('"ibs" (소문자) → true', () => {
    expect(isIbsImplantManufacturer('ibs')).toBe(true);
  });

  it('"IBS Implant" → true', () => {
    expect(isIbsImplantManufacturer('IBS Implant')).toBe(true);
  });

  it('"Osstem" → false', () => {
    expect(isIbsImplantManufacturer('Osstem')).toBe(false);
  });

  it('undefined → false', () => {
    expect(isIbsImplantManufacturer(undefined)).toBe(false);
  });
});

describe('parseSize', () => {
  it('빈 문자열 → diameter/length null', () => {
    const result = parseSize('');
    expect(result.diameter).toBeNull();
    expect(result.length).toBeNull();
  });

  it('"Φ4.5x13" → diameter 4.5, length 13', () => {
    const result = parseSize('Φ4.5x13');
    expect(result.diameter).toBe(4.5);
    expect(result.length).toBe(13);
  });

  it('"4.5x13" bare numeric → diameter 4.5, length 13', () => {
    const result = parseSize('4.5x13');
    expect(result.diameter).toBe(4.5);
    expect(result.length).toBe(13);
  });

  it('Dentium 4자리 코드 "3513" → diameter 3.5, length 13', () => {
    const result = parseSize('3513', 'Dentium');
    expect(result.diameter).toBe(3.5);
    expect(result.length).toBe(13);
  });

  it('파싱 실패 → matchKey가 정규화된 문자열', () => {
    const result = parseSize('unknown-size');
    expect(result.matchKey).toBe('unknownsize');
  });
});

describe('getSizeMatchKey', () => {
  it('"Φ4.5x13" → 결정론적 matchKey 반환', () => {
    const k1 = getSizeMatchKey('Φ4.5x13');
    const k2 = getSizeMatchKey('Φ4.5x13');
    expect(k1).toBe(k2);
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(getSizeMatchKey('')).toBe('');
  });
});

describe('toCanonicalSize', () => {
  it('빈 문자열 → 빈 문자열', () => {
    expect(toCanonicalSize('')).toBe('');
  });

  it('IBS가 아닌 제조사: Φ 포맷 구분자 정규화', () => {
    const result = toCanonicalSize('Φ4.5×13', 'Osstem');
    expect(result).toContain('×');
  });

  it('IBS Implant: D:L: 형식 → C Φ X 형식 변환', () => {
    const result = toCanonicalSize('D:3.5 L:11 Cuff:4', 'IBS Implant');
    expect(result).toMatch(/^C4\s*Φ/);
  });

  it('IBS 이외 일반 제조사: 그대로 반환', () => {
    const result = toCanonicalSize('4.5x13', 'Osstem');
    expect(result).toBe('4.5x13');
  });
});
