export type AnalyzeUploadTarget = 'fixture' | 'surgery';

export const MAX_ANALYZE_SURGERY_FILES = 6;
const EXCEL_FORMAT_WARNING_SUFFIX = '파일은 제외되었습니다. .xlsx/.xls만 지원합니다.';

export function buildAnalyzeUploadFormatWarning(fileNames: string[]): string {
  return `형식 오류: ${fileNames.join(', ')} ${EXCEL_FORMAT_WARNING_SUFFIX}`;
}

export function mergeAnalyzeSurgeryFiles(previousFiles: File[], validFiles: File[]): File[] {
  return [...previousFiles, ...validFiles].slice(0, MAX_ANALYZE_SURGERY_FILES);
}
