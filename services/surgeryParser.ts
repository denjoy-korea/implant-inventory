/**
 * surgeryParser.ts
 *
 * 수술기록 ExcelRow 접근 패턴을 타입 안전하게 래핑하는 유틸리티.
 * - analysisService, mappers 등에서 반복되는 필드 접근 코드 단일화
 * - SurgeryRow 타입 기반으로 컬럼명 오타를 컴파일 시점에 감지
 */

import { SurgeryRow } from '../types';

/**
 * 수술기록 행에서 날짜 문자열 추출
 * DB에서 로드된 행은 '날짜' 컬럼, 엑셀 원본 업로드 행은 '수술일' 컬럼 사용
 */
export function getSurgeryDate(row: SurgeryRow): string {
  const raw = row['날짜'] ?? row['수술일'] ?? '';
  return String(raw).trim();
}

/**
 * 수술기록 행에서 제조사 문자열 추출 (공백 제거)
 */
export function getSurgeryManufacturer(row: SurgeryRow): string {
  return String(row['제조사'] || '').trim();
}

/**
 * 수술기록 행에서 브랜드 문자열 추출 (공백 제거)
 */
export function getSurgeryBrand(row: SurgeryRow): string {
  return String(row['브랜드'] || '').trim();
}

/**
 * 수술기록 행에서 규격(SIZE) 문자열 추출
 * '규격(SIZE)' → '규격' 순으로 폴백
 */
export function getSurgerySize(row: SurgeryRow): string {
  return String(row['규격(SIZE)'] || row['규격'] || '').trim();
}

/**
 * 수술기록 행에서 수량 숫자 추출 (파싱 실패 시 1 반환)
 */
export function getSurgeryQuantity(row: SurgeryRow): number {
  const raw = row['갯수'] ?? row['수량'];
  const n = Number(raw);
  return isNaN(n) || n <= 0 ? 1 : n;
}

/**
 * 수술기록 행에서 구분(식립/청구/수술중 FAIL/골이식만) 추출
 */
export function getSurgeryClassification(row: SurgeryRow): string {
  return String(row['구분'] || '식립').trim();
}

/**
 * 수술기록 행의 '날짜' 필드를 Date 객체로 변환
 * 유효하지 않은 날짜는 null 반환
 */
export function parseSurgeryDate(row: SurgeryRow): Date | null {
  const dateStr = getSurgeryDate(row);
  if (!dateStr) return null;
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * 수술기록 행이 임플란트 식립 기록인지 확인 (골이식만 제외)
 */
export function isImplantSurgery(row: SurgeryRow): boolean {
  return getSurgeryClassification(row) !== '골이식만';
}
