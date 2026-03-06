
import { useState, useEffect, useRef } from 'react';
import { contactService } from '../services/contactService';
import { pageViewService } from '../services/pageViewService';

interface UseWaitlistFormDeps {
  showToast: (msg: string, type: 'success' | 'error') => void;
  showLegalType: 'terms' | 'privacy' | null;
}

export function useWaitlistForm(deps: UseWaitlistFormDeps) {
  const { showToast, showLegalType } = deps;

  const [waitlistPlan, setWaitlistPlan] = useState<{ key: string; name: string } | null>(null);
  const [waitlistName, setWaitlistName] = useState('');
  const [waitlistEmail, setWaitlistEmail] = useState('');
  const [waitlistAgreed, setWaitlistAgreed] = useState(false);
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const waitlistDialogRef = useRef<HTMLDivElement>(null);

  // Focus trap effect
  useEffect(() => {
    if (!waitlistPlan) return;
    const previousFocused = document.activeElement as HTMLElement | null;
    const dialog = waitlistDialogRef.current;
    if (!dialog) return;

    const getFocusable = (): HTMLElement[] =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), [href], select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    window.setTimeout(() => getFocusable()[0]?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (showLegalType) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!waitlistSubmitting) setWaitlistPlan(null);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = getFocusable();
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previousFocused?.focus();
    };
  }, [showLegalType, waitlistPlan, waitlistSubmitting]);

  const handleWaitlistSubmit = async () => {
    if (!waitlistPlan || !waitlistEmail.trim() || !waitlistName.trim() || !waitlistAgreed) return;
    setWaitlistSubmitting(true);
    pageViewService.trackEvent('waitlist_submit_start', { plan: waitlistPlan.key, source: 'auth_signup' }, 'signup');
    try {
      await contactService.submit({
        hospital_name: '-',
        contact_name: waitlistName.trim(),
        email: waitlistEmail.trim(),
        phone: '-',
        weekly_surgeries: '-',
        inquiry_type: `plan_waitlist_${waitlistPlan.key}`,
        content: `${waitlistPlan.name} 플랜 대기 신청`,
      });
      pageViewService.trackEvent('waitlist_submit', { plan: waitlistPlan.key, source: 'auth_signup' }, 'signup');
      setWaitlistPlan(null);
      setWaitlistAgreed(false);
      setWaitlistName('');
      setWaitlistEmail('');
    } catch (error) {
      pageViewService.trackEvent('waitlist_submit_error', { plan: waitlistPlan.key, source: 'auth_signup' }, 'signup');
      const message =
        error instanceof Error && error.message
          ? error.message
          : '대기 신청에 실패했습니다. 잠시 후 다시 시도해 주세요.';
      showToast(message, 'error');
    } finally {
      setWaitlistSubmitting(false);
    }
  };

  return {
    waitlistPlan, setWaitlistPlan,
    waitlistName, setWaitlistName,
    waitlistEmail, setWaitlistEmail,
    waitlistAgreed, setWaitlistAgreed,
    waitlistSubmitting,
    waitlistDialogRef,
    handleWaitlistSubmit,
  };
}
