import type { AnalysisReport } from '../../types';
import { getGrade } from './analyzeGradeConfig';

export function buildQuickInsights(report: AnalysisReport): string[] {
  const insights: string[] = [];

  if (report.summary.surgeryOnlyItems > 0) {
    insights.push(`수술기록에만 있는 미등록 품목이 ${report.summary.surgeryOnlyItems}건입니다.`);
  }
  if (report.summary.deadStockItems > 0) {
    insights.push(`수술기록이 없는 Dead Stock 후보가 ${report.summary.deadStockItems}건입니다.`);
  }
  if (report.diagnostics.some((item) => item.status === 'critical')) {
    const critical = report.diagnostics.find((item) => item.status === 'critical');
    if (critical) insights.push(`우선 개선 항목: ${critical.category} (${critical.score}/${critical.maxScore}점)`);
  }
  if (insights.length < 2 && report.recommendations.length > 0) {
    insights.push(`추천 액션: ${report.recommendations[0]}`);
  }
  if (insights.length < 2) {
    insights.push('현재 데이터 품질 진단 결과를 기반으로 맞춤 개선안을 받아보세요.');
  }

  return insights.slice(0, 2);
}

export function generateReportText(report: AnalysisReport): string {
  const grade = getGrade(report.dataQualityScore);
  const lines: string[] = [];

  lines.push('═══ 임플란트 재고 데이터 품질 진단 리포트 ═══');
  lines.push('');
  lines.push(`종합 점수: ${report.dataQualityScore}/100 (${grade.label}등급)`);
  lines.push(`평가: ${grade.text}`);
  lines.push('');

  lines.push('── 진단 항목 ──');
  for (const d of report.diagnostics) {
    const statusLabel = d.status === 'good' ? '[양호]' : d.status === 'warning' ? '[주의]' : '[위험]';
    lines.push(`${statusLabel} ${d.category}: ${d.title} (${d.score}/${d.maxScore}점)`);
    lines.push(`   ${d.detail}`);
  }
  lines.push('');

  lines.push('── 매칭 분석 요약 ──');
  lines.push(`매칭: ${report.matchedCount}건 / 재고 ${report.totalFixtureItems}건 / 수술기록 ${report.totalSurgeryItems}건`);
  lines.push(`불일치: ${report.unmatchedItems.length}건`);
  lines.push('');

  lines.push('── 사용 패턴 ──');
  lines.push(`총 수술: ${report.usagePatterns.totalSurgeries}건 (${report.usagePatterns.periodMonths}개월, 월평균 ${report.usagePatterns.monthlyAvgSurgeries}건)`);
  if (report.usagePatterns.topUsedItems.length > 0) {
    lines.push('TOP 사용 품목:');
    for (const item of report.usagePatterns.topUsedItems.slice(0, 5)) {
      lines.push(`  - ${item.manufacturer} ${item.brand} ${item.size}: ${item.count}건`);
    }
  }
  lines.push('');

  lines.push('── 개선 권장사항 ──');
  report.recommendations.forEach((rec, i) => {
    lines.push(`${i + 1}. ${rec}`);
  });
  lines.push('');
  lines.push('─────────────────────────────');
  lines.push('DenJOY 무료 데이터 품질 진단');

  return lines.join('\n');
}
