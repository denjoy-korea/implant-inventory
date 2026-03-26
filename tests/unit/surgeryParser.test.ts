import { describe, it, expect } from 'vitest';
import {
  getSurgeryDate,
  getSurgeryManufacturer,
  getSurgeryBrand,
  getSurgerySize,
  getSurgeryQuantity,
  getSurgeryClassification,
  parseSurgeryDate,
  isImplantSurgery,
} from '@/services/surgeryParser';

import type { SurgeryRow } from '@/types';

const makeRow = (overrides: Partial<SurgeryRow> = {}): SurgeryRow =>
  ({
    날짜: '2026-03-15',
    제조사: 'Osstem',
    브랜드: 'USII CA',
    '규격(SIZE)': '4.5x13',
    갯수: 1,
    구분: '식립',
    ...overrides,
  } as SurgeryRow);

describe('getSurgeryDate', () => {
  it('날짜 필드를 반환한다', () => {
    expect(getSurgeryDate(makeRow({ 날짜: '2026-03-15' }))).toBe('2026-03-15');
  });

  it('날짜 없을 때 수술일 필드 폴백', () => {
    const row = makeRow({ 날짜: undefined });
    row['수술일'] = '2026-02-01';
    expect(getSurgeryDate(row)).toBe('2026-02-01');
  });

  it('둘 다 없으면 빈 문자열', () => {
    const row = { 제조사: 'Osstem' } as SurgeryRow;
    expect(getSurgeryDate(row)).toBe('');
  });
});

describe('getSurgeryManufacturer', () => {
  it('제조사 앞뒤 공백 제거', () => {
    expect(getSurgeryManufacturer(makeRow({ 제조사: '  Osstem  ' }))).toBe('Osstem');
  });

  it('빈 값이면 빈 문자열', () => {
    expect(getSurgeryManufacturer(makeRow({ 제조사: '' }))).toBe('');
  });
});

describe('getSurgeryBrand', () => {
  it('브랜드 공백 제거', () => {
    expect(getSurgeryBrand(makeRow({ 브랜드: ' USII CA ' }))).toBe('USII CA');
  });
});

describe('getSurgerySize', () => {
  it('규격(SIZE) 필드 우선 반환', () => {
    expect(getSurgerySize(makeRow({ '규격(SIZE)': '4.5x13' }))).toBe('4.5x13');
  });

  it('규격(SIZE) 없으면 규격 필드 폴백', () => {
    const row = makeRow({ '규격(SIZE)': '' });
    row['규격'] = '4.0x10';
    expect(getSurgerySize(row)).toBe('4.0x10');
  });
});

describe('getSurgeryQuantity', () => {
  it('정상 수량 반환', () => {
    expect(getSurgeryQuantity(makeRow({ 갯수: 3 }))).toBe(3);
  });

  it('수량 필드 없으면 1 반환', () => {
    const row = { 제조사: 'Osstem' } as SurgeryRow;
    expect(getSurgeryQuantity(row)).toBe(1);
  });

  it('0 이하이면 1 반환', () => {
    expect(getSurgeryQuantity(makeRow({ 갯수: 0 }))).toBe(1);
  });

  it('NaN이면 1 반환', () => {
    expect(getSurgeryQuantity(makeRow({ 갯수: NaN }))).toBe(1);
  });
});

describe('getSurgeryClassification', () => {
  it('기본값 식립', () => {
    const row = { 제조사: 'Osstem' } as SurgeryRow;
    expect(getSurgeryClassification(row)).toBe('식립');
  });

  it('z수술후FAIL → 수술후FAIL 정규화', () => {
    expect(getSurgeryClassification(makeRow({ 구분: 'z수술후FAIL' }))).toBe('수술후FAIL');
  });

  it('골이식만 그대로 반환', () => {
    expect(getSurgeryClassification(makeRow({ 구분: '골이식만' }))).toBe('골이식만');
  });
});

describe('parseSurgeryDate', () => {
  it('유효한 날짜 문자열을 Date로 변환', () => {
    const d = parseSurgeryDate(makeRow({ 날짜: '2026-03-15' }));
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2026);
  });

  it('빈 날짜면 null', () => {
    const row = { 제조사: 'Osstem' } as SurgeryRow;
    expect(parseSurgeryDate(row)).toBeNull();
  });

  it('유효하지 않은 날짜면 null', () => {
    expect(parseSurgeryDate(makeRow({ 날짜: 'not-a-date' }))).toBeNull();
  });
});

describe('isImplantSurgery', () => {
  it('식립은 true', () => {
    expect(isImplantSurgery(makeRow({ 구분: '식립' }))).toBe(true);
  });

  it('골이식만은 false', () => {
    expect(isImplantSurgery(makeRow({ 구분: '골이식만' }))).toBe(false);
  });

  it('수술후FAIL은 true', () => {
    expect(isImplantSurgery(makeRow({ 구분: '수술후FAIL' }))).toBe(true);
  });
});
