import { useEffect } from 'react';

/**
 * ESC 키 핸들러를 모달/드로어에 일관되게 적용하는 훅
 *
 * @param onEscape - ESC 키 눌렸을 때 실행할 콜백
 * @param enabled  - false 이면 핸들러를 등록하지 않음 (기본값 true)
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onEscape();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onEscape, enabled]);
}
