import {
  PLAN_LIMITS,
  PLAN_NAMES,
} from '../../types';
import type {
  PlanFeature,
  PlanType,
} from '../../types';
import type {
  PublicShellDowngradeCreditDetail,
  PublicShellDowngradeDiff,
} from './publicShellTypes';

const FEATURE_LABELS: Partial<Record<PlanFeature, string>> = {
  dashboard_advanced: '고급 대시보드',
  brand_analytics: '브랜드 분석',
  fail_management: 'FAIL 관리',
  order_execution: '발주 실행',
  inventory_audit: '재고 실사',
  audit_history: '재고실사 이력 및 분석',
  return_management: '반납 관리',
  auto_stock_alert: '자동 재고 알림',
  monthly_report: '월간 리포트',
  role_management: '역할 관리',
  integrations: '외부 연동 (Notion · Slack)',
};

export function buildPublicShellDowngradeDiff(fromPlan: PlanType, toPlan: PlanType): PublicShellDowngradeDiff {
  const fromLimits = PLAN_LIMITS[fromPlan];
  const toLimits = PLAN_LIMITS[toPlan];
  const toFeatureSet = new Set(toLimits.features);

  const removedLabels = fromLimits.features
    .filter(feature => !toFeatureSet.has(feature))
    .map(feature => FEATURE_LABELS[feature])
    .filter(Boolean) as string[];

  const lines: string[] = [];
  if (removedLabels.length > 0) {
    lines.push('다음 기능이 더 이상 사용되지 않습니다:');
    removedLabels.forEach((label) => lines.push(`  • ${label}`));
  }

  const tips: string[] = [];
  if (toLimits.maxItems !== Infinity && fromLimits.maxItems > toLimits.maxItems) {
    tips.push(`재고 아이템 한도: ${fromLimits.maxItems}개 → ${toLimits.maxItems}개`);
  }
  if (toLimits.maxUsers !== Infinity && fromLimits.maxUsers > toLimits.maxUsers) {
    tips.push(`멤버 수: ${fromLimits.maxUsers}명 → ${toLimits.maxUsers}명 (초과 멤버는 읽기 전용 전환)`);
  }
  if (fromLimits.retentionMonths > toLimits.retentionMonths) {
    tips.push(`기록 보관 기간: ${fromLimits.retentionMonths}개월 → ${toLimits.retentionMonths}개월`);
  }

  return {
    message: lines.join('\n') || `${PLAN_NAMES[fromPlan]} 플랜의 일부 기능이 ${PLAN_NAMES[toPlan]} 플랜에서는 사용 불가합니다.`,
    tip: tips.length > 0 ? tips.join('\n') : undefined,
  };
}

export function buildPublicShellDowngradeCreditMessage(
  downgradeCreditDetail: PublicShellDowngradeCreditDetail | null,
  pendingPlan: PlanType | null | undefined
) {
  if (!downgradeCreditDetail || downgradeCreditDetail.creditAmount <= 0) return undefined;
  const detail = downgradeCreditDetail;
  const fmt = (value: number) => value.toLocaleString('ko-KR');
  const cycleLabel = detail.billingCycle === 'yearly' ? '연간' : '월간';
  const lines: string[] = [`크레딧 계산 내역 (${cycleLabel} · ${detail.totalDays}일 기준)`];

  if (detail.actualPaidAmount !== null) {
    lines.push(`· 결제 금액: ${fmt(detail.actualPaidAmount)}원`);
  }

  lines.push(`· 이용 기간: ${detail.usedDays}일 / ${detail.totalDays}일 → 잔여 ${detail.remainingDays}일`);
  lines.push(`· 현재 플랜 잔여: ${fmt(detail.upperRemaining)}원 (${fmt(detail.upperDailyRate)}원/일 × ${detail.remainingDays}일)`);
  if (detail.lowerDailyRate > 0) {
    lines.push(`· ${PLAN_NAMES[pendingPlan ?? 'free']} 사용료 차감: -${fmt(detail.lowerCost)}원 (${fmt(detail.lowerDailyRate)}원/일 × ${detail.remainingDays}일)`);
  }
  lines.push(`· 적립 크레딧: ${fmt(detail.creditAmount)}원`);

  return lines.join('\n');
}
