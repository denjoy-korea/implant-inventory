import { pageViewService } from './pageViewService';

const UPDATE_CHECK_INTERVAL_MS = 10 * 60 * 1000;
const UPDATE_DEFER_DURATION_MS = 6 * 60 * 60 * 1000;
const UPDATE_DEFER_KEY = 'denjoy_pwa_update_deferred_until';
const FORCE_RELOAD_ONCE_KEY_PREFIX = 'denjoy_pwa_force_reload_once_';
const DEFAULT_UPDATE_MESSAGE = '새로운 기능과 안정성 개선이 포함되어 있습니다.';
const PWA_UPDATE_CHANNEL = 'denjoy-pwa-update';

const TRACKABLE_PAGES = new Set([
  'landing',
  'pricing',
  'analyze',
  'contact',
  'value',
  'login',
  'signup',
]);

type BroadcastPayload =
  | { type: 'PWA_UPDATE_AVAILABLE'; forceUpdate: boolean }
  | { type: 'PWA_APPLY_UPDATE' }
  | { type: 'PWA_RELOAD_NOW' };

export interface ReleaseManifest {
  build_id?: string;
  force_update?: boolean;
  message?: string;
  released_at?: string;
}

export interface PwaUpdateSnapshot {
  isSupported: boolean;
  isStarted: boolean;
  localBuildId: string;
  remoteBuildId: string | null;
  updateAvailable: boolean;
  forceUpdate: boolean;
  releaseMessage: string;
  deferredUntil: number | null;
  isApplying: boolean;
}

type SnapshotListener = (snapshot: PwaUpdateSnapshot) => void;

const LOCAL_BUILD_ID =
  typeof __APP_BUILD_ID__ === 'string' && __APP_BUILD_ID__.trim()
    ? __APP_BUILD_ID__.trim()
    : 'dev-local';

class PwaUpdateService {
  private listeners = new Set<SnapshotListener>();
  private registration: ServiceWorkerRegistration | null = null;
  private waitingWorker: ServiceWorker | null = null;
  private started = false;
  private registrationBound = false;
  private contextPage = 'landing';
  private updateIntervalId: number | null = null;
  private visibilityHandler: (() => void) | null = null;
  private controllerChangeHandler: (() => void) | null = null;
  private channel: BroadcastChannel | null = null;
  private isReloading = false;

  private state: PwaUpdateSnapshot = {
    isSupported: false,
    isStarted: false,
    localBuildId: LOCAL_BUILD_ID,
    remoteBuildId: null,
    updateAvailable: false,
    forceUpdate: false,
    releaseMessage: DEFAULT_UPDATE_MESSAGE,
    deferredUntil: null,
    isApplying: false,
  };

  getSnapshot(): PwaUpdateSnapshot {
    return { ...this.state };
  }

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener);
    listener(this.getSnapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  setContextPage(view: string): void {
    if (TRACKABLE_PAGES.has(view)) {
      this.contextPage = view;
      return;
    }
    this.contextPage = 'landing';
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    this.state.isStarted = true;
    this.state.deferredUntil = this.readDeferredUntil();

    if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      this.state.isSupported = false;
      this.emit();
      return;
    }

    this.state.isSupported = true;
    this.setupBroadcastChannel();
    this.setupLifecycleListeners();
    this.emit();
    void this.initialize();
  }

  async applyUpdate(): Promise<void> {
    if (!this.state.isSupported) return;
    this.clearDeferred();
    this.state.isApplying = true;
    this.emit();
    this.trackEvent('pwa_update_accept', {
      local_build_id: this.state.localBuildId,
      remote_build_id: this.state.remoteBuildId,
    });

    this.broadcast({ type: 'PWA_APPLY_UPDATE' });
    this.sendSkipWaiting();

    const registration = await this.getRegistration();
    if (registration) {
      await registration.update().catch(() => {});
      this.sendSkipWaiting();
    }

    window.setTimeout(() => {
      if (!this.state.isApplying || this.isReloading) return;
      this.state.isApplying = false;
      this.emit();
      if (this.state.forceUpdate) {
        window.location.reload();
      }
    }, 8000);
  }

  deferUpdate(): void {
    if (this.state.forceUpdate) return;
    const deferredUntil = Date.now() + UPDATE_DEFER_DURATION_MS;
    this.state.deferredUntil = deferredUntil;
    this.writeDeferredUntil(deferredUntil);
    this.emit();
    this.trackEvent('pwa_update_defer', {
      deferred_until: new Date(deferredUntil).toISOString(),
      local_build_id: this.state.localBuildId,
      remote_build_id: this.state.remoteBuildId,
    });
  }

  private async initialize(): Promise<void> {
    const registration = await this.getRegistration();
    if (!registration) return;

    if (registration.waiting) {
      this.markUpdateAvailable(registration.waiting, 'registration_waiting');
    }

    await this.checkForUpdates('initial');
  }

  private async getRegistration(): Promise<ServiceWorkerRegistration | null> {
    try {
      const registration = this.registration
        ?? await navigator.serviceWorker.getRegistration('/sw.js')
        ?? await navigator.serviceWorker.register('/sw.js');

      this.registration = registration;
      if (!this.registrationBound) {
        this.bindRegistration(registration);
        this.registrationBound = true;
      }
      return registration;
    } catch (error) {
      console.error('[PWA] service worker registration failed:', error);
      return null;
    }
  }

  private bindRegistration(registration: ServiceWorkerRegistration): void {
    registration.addEventListener('updatefound', () => {
      const installing = registration.installing;
      if (!installing) return;

      installing.addEventListener('statechange', () => {
        if (installing.state !== 'installed') return;
        if (!navigator.serviceWorker.controller) return; // first install
        this.markUpdateAvailable(registration.waiting ?? installing, 'updatefound_installed');
      });
    });
  }

  private setupLifecycleListeners(): void {
    this.controllerChangeHandler = () => {
      if (this.isReloading) return;
      this.isReloading = true;
      this.trackEvent(
        this.state.forceUpdate ? 'pwa_update_force_applied' : 'pwa_update_applied',
        {
          local_build_id: this.state.localBuildId,
          remote_build_id: this.state.remoteBuildId,
        },
      );
      this.broadcast({ type: 'PWA_RELOAD_NOW' });
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', this.controllerChangeHandler);

    this.visibilityHandler = () => {
      if (document.visibilityState !== 'visible') return;
      void this.checkForUpdates('visibility');
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    this.updateIntervalId = window.setInterval(() => {
      void this.checkForUpdates('interval');
    }, UPDATE_CHECK_INTERVAL_MS);
  }

  private setupBroadcastChannel(): void {
    if (typeof BroadcastChannel === 'undefined') return;
    this.channel = new BroadcastChannel(PWA_UPDATE_CHANNEL);
    this.channel.addEventListener('message', (event: MessageEvent<BroadcastPayload>) => {
      const payload = event.data;
      if (!payload || typeof payload !== 'object' || !('type' in payload)) return;

      if (payload.type === 'PWA_APPLY_UPDATE') {
        this.sendSkipWaiting();
        return;
      }
      if (payload.type === 'PWA_RELOAD_NOW') {
        if (this.isReloading) return;
        this.isReloading = true;
        window.location.reload();
        return;
      }
      if (payload.type === 'PWA_UPDATE_AVAILABLE') {
        if (payload.forceUpdate) this.state.forceUpdate = true;
        if (!this.state.updateAvailable) {
          this.state.updateAvailable = true;
          this.emit();
        }
      }
    });
  }

  private broadcast(payload: BroadcastPayload): void {
    this.channel?.postMessage(payload);
  }

  private async checkForUpdates(source: 'initial' | 'interval' | 'visibility'): Promise<void> {
    const registration = await this.getRegistration();
    if (!registration) return;

    await registration.update().catch(() => {});
    if (registration.waiting) {
      this.markUpdateAvailable(registration.waiting, `registration_waiting_${source}`);
    }

    const manifest = await this.fetchReleaseManifest();
    if (!manifest) return;

    const remoteBuildId = typeof manifest.build_id === 'string' && manifest.build_id.trim()
      ? manifest.build_id.trim()
      : null;
    if (remoteBuildId !== this.state.remoteBuildId) {
      this.state.remoteBuildId = remoteBuildId;
    }

    if (typeof manifest.message === 'string' && manifest.message.trim()) {
      this.state.releaseMessage = manifest.message.trim();
    }

    const hasRemoteDiff = Boolean(
      remoteBuildId && remoteBuildId !== this.state.localBuildId,
    );
    const isForceUpdate = manifest.force_update === true;
    if (isForceUpdate) {
      this.state.forceUpdate = true;
    }

    if (hasRemoteDiff && !this.state.updateAvailable && registration.waiting) {
      this.markUpdateAvailable(
        registration.waiting,
        `release_manifest_${source}`,
        isForceUpdate,
      );
      return;
    }

    if (hasRemoteDiff && isForceUpdate && !registration.waiting) {
      this.forceReloadOnce(remoteBuildId!);
    }

    this.emit();
  }

  private async fetchReleaseManifest(): Promise<ReleaseManifest | null> {
    try {
      const response = await fetch(`/release.json?ts=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data || typeof data !== 'object') return null;
      return data as ReleaseManifest;
    } catch {
      return null;
    }
  }

  private forceReloadOnce(remoteBuildId: string): void {
    const key = `${FORCE_RELOAD_ONCE_KEY_PREFIX}${remoteBuildId}`;
    try {
      if (sessionStorage.getItem(key) === '1') return;
      sessionStorage.setItem(key, '1');
    } catch {
      // ignore sessionStorage failures
    }
    if (this.isReloading) return;
    this.isReloading = true;
    this.trackEvent('pwa_update_force_applied', {
      mode: 'release_manifest_reload',
      local_build_id: this.state.localBuildId,
      remote_build_id: remoteBuildId,
    });
    window.location.reload();
  }

  private markUpdateAvailable(
    worker: ServiceWorker | null,
    source: string,
    forceUpdate = this.state.forceUpdate,
  ): void {
    if (worker) this.waitingWorker = worker;
    const wasAvailable = this.state.updateAvailable;

    this.state.updateAvailable = true;
    this.state.isApplying = false;
    this.state.forceUpdate = this.state.forceUpdate || forceUpdate;
    if (!this.state.releaseMessage) {
      this.state.releaseMessage = DEFAULT_UPDATE_MESSAGE;
    }

    if (!wasAvailable) {
      this.trackEvent('pwa_update_detected', {
        source,
        local_build_id: this.state.localBuildId,
        remote_build_id: this.state.remoteBuildId,
      });
      this.trackEvent('pwa_update_prompt_shown', {
        source,
        force_update: this.state.forceUpdate,
      });
      this.broadcast({
        type: 'PWA_UPDATE_AVAILABLE',
        forceUpdate: this.state.forceUpdate,
      });
    }
    this.emit();
  }

  private sendSkipWaiting(): void {
    const worker = this.registration?.waiting ?? this.waitingWorker;
    if (!worker) return;
    worker.postMessage({ type: 'SKIP_WAITING' });
  }

  private readDeferredUntil(): number | null {
    try {
      const raw = localStorage.getItem(UPDATE_DEFER_KEY);
      if (!raw) return null;
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed <= Date.now()) {
        localStorage.removeItem(UPDATE_DEFER_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private writeDeferredUntil(value: number): void {
    try {
      localStorage.setItem(UPDATE_DEFER_KEY, String(value));
    } catch {
      // ignore localStorage failures
    }
  }

  private clearDeferred(): void {
    this.state.deferredUntil = null;
    try {
      localStorage.removeItem(UPDATE_DEFER_KEY);
    } catch {
      // ignore localStorage failures
    }
  }

  private trackEvent(eventType: string, eventData?: Record<string, unknown>): void {
    pageViewService.trackEvent(eventType, eventData, this.contextPage);
  }

  private emit(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((listener) => listener(snapshot));
  }
}

export const pwaUpdateService = new PwaUpdateService();

