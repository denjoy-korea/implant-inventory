import { describe, it, expect } from 'vitest';
import {
  isExchangePrefix,
  isVirtualManufacturer,
  stripExchangePrefix,
  manufacturerAliasKey,
  buildInventoryDuplicateKey,
} from '@/services/appUtils';

describe('isExchangePrefix', () => {
  it('수술중교환_ 접두어 → true', () => {
    expect(isExchangePrefix('수술중교환_Osstem')).toBe(true);
  });

  it('수술중FAIL_ 접두어 → true', () => {
    expect(isExchangePrefix('수술중FAIL_Dentium')).toBe(true);
  });

  it('일반 제조사 → false', () => {
    expect(isExchangePrefix('Osstem')).toBe(false);
  });

  it('빈 문자열 → false', () => {
    expect(isExchangePrefix('')).toBe(false);
  });
});

describe('isVirtualManufacturer', () => {
  it('수술중교환_ → true', () => {
    expect(isVirtualManufacturer('수술중교환_Osstem')).toBe(true);
  });

  it('z수술후FAIL → true', () => {
    expect(isVirtualManufacturer('z수술후FAIL')).toBe(true);
  });

  it('보험청구 → true', () => {
    expect(isVirtualManufacturer('보험청구')).toBe(true);
  });

  it('일반 제조사 → false', () => {
    expect(isVirtualManufacturer('Osstem')).toBe(false);
  });
});

describe('stripExchangePrefix', () => {
  it('수술중교환_ 제거', () => {
    expect(stripExchangePrefix('수술중교환_Osstem')).toBe('Osstem');
  });

  it('수술중FAIL_ 제거', () => {
    expect(stripExchangePrefix('수술중FAIL_Dentium')).toBe('Dentium');
  });

  it('접두어 없으면 그대로', () => {
    expect(stripExchangePrefix('Osstem')).toBe('Osstem');
  });
});

describe('manufacturerAliasKey', () => {
  it('일반 제조사 정규화', () => {
    const k1 = manufacturerAliasKey('Osstem');
    const k2 = manufacturerAliasKey('osstem');
    expect(k1).toBe(k2);
  });

  it('교환 카테고리는 fail: 네임스페이스', () => {
    const key = manufacturerAliasKey('수술중교환_Osstem');
    expect(key).toMatch(/^fail:/);
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(manufacturerAliasKey('')).toBe('');
  });
});

describe('buildInventoryDuplicateKey', () => {
  it('동일 입력에서 항상 같은 키 생성', () => {
    const item = { manufacturer: 'Osstem', brand: 'USII CA', size: '4.5x13' };
    expect(buildInventoryDuplicateKey(item)).toBe(buildInventoryDuplicateKey(item));
  });

  it('제조사가 다르면 다른 키', () => {
    const k1 = buildInventoryDuplicateKey({ manufacturer: 'Osstem', brand: 'USII CA', size: '4.5x13' });
    const k2 = buildInventoryDuplicateKey({ manufacturer: 'Dentium', brand: 'USII CA', size: '4.5x13' });
    expect(k1).not.toBe(k2);
  });

  it('파이프 구분자 3개 섹션 형식', () => {
    const k = buildInventoryDuplicateKey({ manufacturer: 'Osstem', brand: 'USII CA', size: '4.5x13' });
    expect(k.split('|')).toHaveLength(3);
  });
});
