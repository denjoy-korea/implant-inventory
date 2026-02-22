/** unknown 타입 catch 블록에서 에러 메시지를 안전하게 추출 */
export function getErrorMessage(error: unknown, fallback = '알 수 없는 오류가 발생했습니다.'): string {
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === 'string' && error) return error;
  return fallback;
}

/** unknown 에러에서 특정 문자열 포함 여부 확인 */
export function errorIncludes(error: unknown, ...keywords: string[]): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  return keywords.some(kw => msg.toLowerCase().includes(kw.toLowerCase()));
}
