import { useState, useCallback, useRef } from 'react';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  message: string;
  type: ToastType;
}

interface UseToastReturn {
  toast: Toast | null;
  showToast: (message: string, type: ToastType, duration?: number) => void;
  hideToast: () => void;
}

/**
 * useToast — 통합 토스트 관리 훅
 * @param defaultDuration 기본 표시 시간 (ms), default: 3500
 */
export function useToast(defaultDuration = 3500): UseToastReturn {
  const [toast, setToast] = useState<Toast | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    setToast(null);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showToast = useCallback((message: string, type: ToastType, duration?: number) => {
    setToast({ message, type });
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), duration ?? defaultDuration);
  }, [defaultDuration]);

  return { toast, showToast, hideToast };
}
