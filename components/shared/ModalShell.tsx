import React, { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Z } from '../../utils/zIndex';

interface ModalShellProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  titleId?: string;
  describedBy?: string;
  role?: 'dialog' | 'alertdialog';
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  disableFocusTrap?: boolean;
  closeOnBackdrop?: boolean;
  closeable?: boolean;
  zIndex?: number;
  maxWidth?: string;
  className?: string;
  backdropClassName?: string;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[href]',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

const ModalShell: React.FC<ModalShellProps> = ({
  isOpen,
  onClose,
  title,
  titleId,
  describedBy,
  role = 'dialog',
  initialFocusRef,
  disableFocusTrap = false,
  closeOnBackdrop = true,
  closeable = true,
  zIndex = Z.MODAL,
  maxWidth = 'max-w-md',
  className = '',
  backdropClassName = 'flex items-center justify-center p-4',
  children,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement | null;
    document.body.style.overflow = 'hidden';

    const frameId = requestAnimationFrame(() => {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (panelRef.current) {
        getFocusable(panelRef.current)[0]?.focus();
      }
    });

    return () => {
      cancelAnimationFrame(frameId);
      document.body.style.overflow = '';
      requestAnimationFrame(() => {
        previousFocusRef.current?.focus();
      });
    };
  }, [isOpen, initialFocusRef]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        if (closeable) onClose();
        return;
      }

      if (disableFocusTrap || e.key !== 'Tab' || !panelRef.current) return;

      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    },
    [closeable, disableFocusTrap, onClose]
  );

  const handleBackdropClick = useCallback(() => {
    if (closeOnBackdrop && closeable) onClose();
  }, [closeOnBackdrop, closeable, onClose]);

  if (!isOpen) return null;

  const ariaProps: React.AriaAttributes & { role: string } = {
    role,
    'aria-modal': true,
    ...(titleId ? { 'aria-labelledby': titleId } : { 'aria-label': title }),
    ...(describedBy ? { 'aria-describedby': describedBy } : {}),
  };

  return createPortal(
    <div
      className={`fixed inset-0 bg-black/60 ${backdropClassName}`}
      style={{ zIndex }}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        {...ariaProps}
        className={`bg-white rounded-2xl shadow-2xl w-full overflow-hidden ${maxWidth} ${className}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>,
    document.body
  );
};

export default ModalShell;
