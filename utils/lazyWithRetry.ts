import { lazy } from 'react';

/**
 * Vite 배포 후 chunk 해시가 변경되면 이전 HTML을 캐싱한 브라우저에서
 * 존재하지 않는 JS 파일을 요청하게 됨 → MIME type 에러 발생.
 * 이 유틸은 dynamic import 실패 시 한 번 페이지를 새로고침하여 복구.
 *
 * React.lazy와 동일한 시그니처. factory 실패 시 1회 자동 새로고침.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const lazyWithRetry: typeof lazy = (factory: any) =>
  lazy(async () => {
    const key = 'lazy-retry-' + factory.toString().slice(0, 80);
    const hasRefreshed = sessionStorage.getItem(key);

    try {
      const module = await factory();
      sessionStorage.removeItem(key);
      return module;
    } catch (error) {
      if (!hasRefreshed) {
        sessionStorage.setItem(key, '1');
        window.location.reload();
      }
      throw error;
    }
  });
