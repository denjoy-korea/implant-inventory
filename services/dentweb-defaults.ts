// 덴트웹 픽스처 기본값 — 데이터는 dentweb-defaults-data.json 참조
import rawData from './dentweb-defaults-data.json';

export interface DentwWebSize {
  size: string;
  unused: boolean;
}

export interface DentwWebBrand {
  sizes: DentwWebSize[];
  sizeFormat: string;
}

export interface DentwWebData {
  [manufacturer: string]: {
    [brand: string]: DentwWebBrand;
  };
}

const DENTWEB_DEFAULTS = rawData as unknown as DentwWebData;

/** 모든 제조사 목록 (활성 데이터 있는 것만) */
export function getDentwWebManufacturers(): string[] {
  return Object.keys(DENTWEB_DEFAULTS);
}

/** 제조사별 브랜드 목록 */
export function getDentwWebBrands(manufacturer: string): string[] {
  return Object.keys(DENTWEB_DEFAULTS[manufacturer] ?? {});
}

/** 브랜드별 규격 목록 (사용안함 제외 가능) */
export function getDentwWebSizes(manufacturer: string, brand: string, includeUnused = false): string[] {
  const brandData = DENTWEB_DEFAULTS[manufacturer]?.[brand];
  if (!brandData) return [];
  return brandData.sizes
    .filter(s => includeUnused || !s.unused)
    .map(s => s.size);
}

/** 브랜드의 규격 형식 */
export function getDentwWebSizeFormat(manufacturer: string, brand: string): string {
  return DENTWEB_DEFAULTS[manufacturer]?.[brand]?.sizeFormat ?? 'text';
}
