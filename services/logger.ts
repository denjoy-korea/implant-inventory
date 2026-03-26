/**
 * 환경별 로그 레벨 분리
 * - dev: debug/info 출력 허용
 * - prod: warn/error만 출력
 * - Sentry 연동 시 error 레벨에서 captureException 호출
 */

const isDev = import.meta.env.DEV;

export const logger = {
  debug: (...args: unknown[]) => { if (isDev) console.log(...args); },
  info:  (...args: unknown[]) => { if (isDev) console.log(...args); },
  warn:  (...args: unknown[]) => console.warn(...args),
  error: (...args: unknown[]) => { console.error(...args); },
};
