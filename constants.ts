/**
 * 공유 상수 모음
 * 여러 컴포넌트에서 동일한 값을 참조하도록 단일 출처를 유지합니다.
 */

/** 픽스쳐 길이 최솟값 (mm). 이 값 미만은 직경으로 판단해 제외합니다. */
export const MIN_FIXTURE_LENGTH = 5;

/** 무기한 플랜의 daysUntilExpiry 센티넬 값. 이 값 이상이면 만료일 없음으로 처리합니다. */
export const UNLIMITED_DAYS = 9999;

/** 월 평균 일수 (그레고리력 기준). 기간을 월 단위로 환산할 때 사용합니다. */
export const DAYS_PER_MONTH = 30.44;

/** 저재고 경고 임계값 (권장재고 대비 비율). 이 비율 이하이면 부족으로 표시합니다. */
export const LOW_STOCK_RATIO = 0.3;
