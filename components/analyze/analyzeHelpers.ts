import { AnalysisReport } from '../../types';

export const GRADE_CONFIG = {
  A: { label: 'A', color: 'emerald', text: '데이터 관리가 우수합니다', min: 80 },
  B: { label: 'B', color: 'amber', text: '개선하면 더 좋아집니다', min: 60 },
  C: { label: 'C', color: 'orange', text: '상당한 개선이 필요합니다', min: 40 },
  D: { label: 'D', color: 'rose', text: '데이터 관리 체계 재검토가 필요합니다', min: 0 },
} as const;

export const gradeColorMap: Record<string, { bg: string; text: string; border: string; light: string; stroke: string }> = {
  emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', border: 'border-emerald-200', light: 'bg-emerald-50', stroke: '#10b981' },
  amber: { bg: 'bg-amber-500', text: 'text-amber-600', border: 'border-amber-200', light: 'bg-amber-50', stroke: '#f59e0b' },
  orange: { bg: 'bg-orange-500', text: 'text-orange-600', border: 'border-orange-200', light: 'bg-orange-50', stroke: '#f97316' },
  rose: { bg: 'bg-rose-500', text: 'text-rose-600', border: 'border-rose-200', light: 'bg-rose-50', stroke: '#f43f5e' },
};

export const statusColorMap = {
  good: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', icon: '✓', iconBg: 'bg-emerald-100 text-emerald-600' },
  warning: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', icon: '!', iconBg: 'bg-amber-100 text-amber-600' },
  critical: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', icon: '✕', iconBg: 'bg-rose-100 text-rose-600' },
};

export const PROCESSING_MESSAGES = [
  '파일을 읽고 있습니다...',
  '재고 목록을 분석하고 있습니다...',
  '수술기록을 파싱하고 있습니다...',
  '교환 항목을 검사하고 있습니다...',
  '보험청구 구분을 확인하고 있습니다...',
  '품목 매칭을 진행하고 있습니다...',
  '표기 일관성을 검사하고 있습니다...',
  '사용 패턴을 분석하고 있습니다...',
  '리포트를 생성하고 있습니다...',
];

const EXCEL_FILE_REGEX = /\.(xlsx|xls)$/i;
const HTTP_STATUS_REGEX = /(?:http[_\s-]*)?(\d{3})/i;

export function formatPhoneNumber(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('02')) {
    // 서울 02 지역번호: 02-XXX-XXXX or 02-XXXX-XXXX
    if (digits.length <= 5) return digits.replace(/^(\d{2})(\d+)$/, '$1-$2');
    if (digits.length <= 9) return digits.replace(/^(\d{2})(\d{3})(\d+)$/, '$1-$2-$3');
    return digits.slice(0, 10).replace(/^(\d{2})(\d{4})(\d{4})$/, '$1-$2-$3');
  }
  // 010, 031, 032 등 10~11자리
  if (digits.length <= 6) return digits.replace(/^(\d{3})(\d+)$/, '$1-$2');
  if (digits.length <= 10) return digits.replace(/^(\d{3})(\d{3})(\d+)$/, '$1-$2-$3');
  return digits.slice(0, 11).replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
}

export function getGrade(score: number) {
  if (score >= 80) return GRADE_CONFIG.A;
  if (score >= 60) return GRADE_CONFIG.B;
  if (score >= 40) return GRADE_CONFIG.C;
  return GRADE_CONFIG.D;
}

export function isExcelFile(file: File): boolean {
  return EXCEL_FILE_REGEX.test(file.name);
}

export function splitExcelFiles(files: File[]): { valid: File[]; invalid: File[] } {
  const valid: File[] = [];
  const invalid: File[] = [];

  files.forEach((file) => {
    if (isExcelFile(file)) valid.push(file);
    else invalid.push(file);
  });

  return { valid, invalid };
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message || '';
  if (typeof error === 'string') return error;
  return '';
}

function getErrorStatus(error: unknown): number | null {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = (error as { status?: unknown }).status;
    if (typeof status === 'number') return status;
  }

  const message = getErrorMessage(error);
  const match = message.match(HTTP_STATUS_REGEX);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isNaN(parsed) ? null : parsed;
}

export function classifyAnalyzeError(error: unknown): string {
  const rawMessage = getErrorMessage(error);
  const message = rawMessage.toLowerCase();

  if (rawMessage.includes('파일 구분 오류')) {
    return rawMessage;
  }

  if (message.includes('xlsx') || message.includes('xls') || message.includes('zip') || message.includes('format') || message.includes('file')) {
    return '형식 오류: .xlsx 또는 .xls 엑셀 파일인지 확인해주세요.';
  }
  if (message.includes('sheet') || message.includes('column') || message.includes('header') || message.includes('수술기록지') || message.includes('parse')) {
    return '데이터 오류: 필수 시트/열이 누락되지 않았는지 확인해주세요.';
  }
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
    return '네트워크 오류: 연결 상태를 확인한 뒤 다시 시도해주세요.';
  }

  return '분석 처리 오류: 파일 내용 확인 후 다시 시도해주세요.';
}

export function classifyLeadSubmitError(error: unknown): string {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return '네트워크 오류: 인터넷 연결 후 다시 전송해주세요.';
  }

  const status = getErrorStatus(error);
  if (status !== null) {
    if (status >= 500) {
      return '서버 오류: 전송이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
    }
    if (status >= 400) {
      return '입력 오류: 이메일/연락처 형식을 확인한 뒤 다시 전송해주세요.';
    }
  }

  const message = getErrorMessage(error).toLowerCase();
  if (message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('abort')) {
    return '네트워크 오류: 연결이 불안정합니다. 다시 전송해주세요.';
  }

  return '전송 오류: 요청이 완료되지 않았습니다. 다시 전송해주세요.';
}

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
