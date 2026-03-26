import { describe, it, expect } from 'vitest';
import { toMonthKey } from '@/services/dateUtils';

describe('toMonthKey', () => {
  it('Date 객체를 YYYY-MM 형식으로 변환한다', () => {
    expect(toMonthKey(new Date('2026-03-15'))).toBe('2026-03');
  });

  it('날짜 문자열을 YYYY-MM 형식으로 변환한다', () => {
    expect(toMonthKey('2026-01-01')).toBe('2026-01');
  });

  it('1월은 01로 패딩된다', () => {
    expect(toMonthKey('2026-01-15')).toBe('2026-01');
  });

  it('12월은 12로 반환된다', () => {
    expect(toMonthKey('2025-12-31')).toBe('2025-12');
  });

  it('Excel serial 날짜를 변환한다', () => {
    // Excel serial 45000 = 2023-03-15 근사
    const result = toMonthKey(45000);
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });

  it('null 입력 시 null 반환', () => {
    expect(toMonthKey(null)).toBeNull();
  });

  it('undefined 입력 시 null 반환', () => {
    expect(toMonthKey(undefined)).toBeNull();
  });

  it('유효하지 않은 문자열 시 null 반환', () => {
    expect(toMonthKey('not-a-date')).toBeNull();
  });

  it('유효하지 않은 Date 객체 시 null 반환', () => {
    expect(toMonthKey(new Date('invalid'))).toBeNull();
  });
});
