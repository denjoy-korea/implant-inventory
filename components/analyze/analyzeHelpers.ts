export { getGrade, GRADE_CONFIG, gradeColorMap, statusColorMap } from './analyzeGradeConfig';
export { formatPhoneNumber, isExcelFile, splitExcelFiles } from './analyzeInputUtils';
export { PROCESSING_MESSAGES } from './analyzeProcessingMessages';
export { buildQuickInsights, generateReportText } from './analyzeReportUtils';

const HTTP_STATUS_REGEX = /(?:http[_\s-]*)?(\d{3})/i;

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
