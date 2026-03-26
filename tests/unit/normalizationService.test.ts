import { describe, it, expect } from 'vitest';
import { normalizeSurgery, normalizeInventory } from '@/services/normalizationService';

describe('normalizeSurgery', () => {
  it('소문자 변환 + 공백 제거', () => {
    expect(normalizeSurgery('Osstem Implant')).toBe('osstemimplant');
  });

  it('보험임플란트 접두어 제거', () => {
    expect(normalizeSurgery('보험임플란트Osstem')).toBe('osstem');
  });

  it('수술중교환 접두어 제거', () => {
    expect(normalizeSurgery('수술중교환Dentium')).toBe('dentium');
  });

  it('수술중fail 접두어 제거 (대소문자 무관)', () => {
    expect(normalizeSurgery('수술중FAIL덴티움')).toBe('덴티움');
  });

  it('Φ/φ → d 변환 (점도 제거됨)', () => {
    // normalizeSurgery는 특수문자 제거 시 점(.)도 제거하므로 'Φ4.5' → 'd45'
    expect(normalizeSurgery('Φ4.5')).toBe('d45');
    expect(normalizeSurgery('φ3.5')).toBe('d35');
  });

  it('특수문자 제거: 하이픈, 언더스코어, 괄호', () => {
    expect(normalizeSurgery('IBS-Implant_(CA)')).toBe('ibsimplantca');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(normalizeSurgery('')).toBe('');
  });
});

describe('normalizeInventory', () => {
  it('소문자 변환 + 공백/하이픈/언더스코어 제거', () => {
    expect(normalizeInventory('Osstem-Implant_CA')).toBe('osstemimplantca');
  });

  it('수술중교환 접두어 유지 (수술기록과 다른 점)', () => {
    expect(normalizeInventory('수술중교환_Osstem')).toBe('수술중교환osstem');
  });

  it('빈 문자열 → 빈 문자열', () => {
    expect(normalizeInventory('')).toBe('');
  });
});
