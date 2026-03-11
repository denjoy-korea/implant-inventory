const SUPPORT_ALERTS_ENABLED_KEY = 'denjoy_support_alerts_enabled';

export type SupportAlertPermission = NotificationPermission | 'unsupported';

export interface SupportAlertSnapshot {
  permission: SupportAlertPermission;
  enabled: boolean;
  isStandalone: boolean;
}

function getNotificationPermission(): SupportAlertPermission {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') {
    return 'unsupported';
  }
  return Notification.permission;
}

function getIsStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true;
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || (window as Window & typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  }).webkitAudioContext;
  return Ctor ? new Ctor() : null;
}

export const adminSupportAlertService = {
  getSnapshot(): SupportAlertSnapshot {
    if (typeof window === 'undefined') {
      return { permission: 'unsupported', enabled: false, isStandalone: false };
    }

    return {
      permission: getNotificationPermission(),
      enabled: window.localStorage.getItem(SUPPORT_ALERTS_ENABLED_KEY) === 'true',
      isStandalone: getIsStandalone(),
    };
  },

  async requestPermission(): Promise<SupportAlertSnapshot> {
    if (typeof window === 'undefined' || typeof Notification === 'undefined') {
      return { permission: 'unsupported', enabled: false, isStandalone: false };
    }

    const permission = await Notification.requestPermission();
    const enabled = permission === 'granted';
    window.localStorage.setItem(SUPPORT_ALERTS_ENABLED_KEY, enabled ? 'true' : 'false');

    return {
      permission,
      enabled,
      isStandalone: getIsStandalone(),
    };
  },

  disable(): SupportAlertSnapshot {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SUPPORT_ALERTS_ENABLED_KEY, 'false');
    }
    return this.getSnapshot();
  },

  playIncomingTone(): void {
    const audioContext = getAudioContext();
    if (!audioContext) return;

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(784, now);
    oscillator.frequency.exponentialRampToValueAtTime(1046, now + 0.16);

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(0.04, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.36);

    void audioContext.close().catch(() => {});
  },

  async showIncomingNotification(params: {
    title: string;
    body: string;
    tag: string;
  }): Promise<void> {
    const snapshot = this.getSnapshot();
    if (!snapshot.enabled || snapshot.permission !== 'granted' || typeof window === 'undefined') {
      return;
    }

    const options: NotificationOptions = {
      body: params.body,
      tag: params.tag,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
    };

    try {
      const registration = await navigator.serviceWorker?.getRegistration?.();
      if (registration) {
        await registration.showNotification(params.title, options);
        return;
      }
    } catch {
      // Fall through to window.Notification below.
    }

    try {
      new Notification(params.title, options);
    } catch {
      // Ignore notification rendering failures.
    }
  },
};
