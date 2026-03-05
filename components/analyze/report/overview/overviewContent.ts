import type { AnalysisReport } from '../../../../types';

export interface AnalyzeOverviewCriteriaItem {
  name: string;
  pts: number;
  desc: string;
}

export const ANALYZE_OVERVIEW_CRITERIA_ITEMS: AnalyzeOverviewCriteriaItem[] = [
  { name: '교환 항목 분리 관리', pts: 15, desc: '재고 목록에 교환 픽스처 별도 분류 여부' },
  { name: '보험청구 2단계 구분', pts: 15, desc: '픽스쳐 목록 + 수술기록 양쪽 보험임플란트 구분' },
  { name: '수술기록→재고 매칭률', pts: 25, desc: '수술에 사용된 품목이 재고 목록에 등록되어 있는지' },
  { name: '재고→수술기록 활용률', pts: 20, desc: '등록된 재고가 실제 수술에 사용되고 있는지' },
  { name: '데이터 표기 일관성', pts: 15, desc: '같은 제조사/브랜드의 명칭 통일 여부' },
  { name: '사이즈 포맷 일관성', pts: 10, desc: '같은 브랜드 내 사이즈 표기법 통일 여부' },
];

type SummaryKey = keyof AnalysisReport['summary'];

export interface AnalyzeOverviewSummaryStatItem {
  key: SummaryKey;
  label: string;
}

export const ANALYZE_OVERVIEW_SUMMARY_STAT_ITEMS: AnalyzeOverviewSummaryStatItem[] = [
  { key: 'totalFixtureItems', label: '전체 품목' },
  { key: 'activeItems', label: '사용 품목' },
  { key: 'usedItems', label: '매칭 품목' },
  { key: 'deadStockItems', label: 'Dead Stock' },
  { key: 'surgeryOnlyItems', label: '미등록 품목' },
  { key: 'nameVariants', label: '표기 변형' },
];
