import type { PlanType, View } from '../../types';

const DENJOY_HOME = import.meta.env.VITE_DENJOY_HOME_URL ?? 'https://denjoy.info';
const INVENTORY_URL = import.meta.env.VITE_INVENTORY_URL
  ?? (typeof window !== 'undefined' ? window.location.origin : 'https://inventory.denjoy.info');
const REMOTE_MAIN_HOME_AUTH_FOR_DEV = import.meta.env.VITE_FORCE_REMOTE_MAIN_HOME_AUTH === 'true';
const LOCAL_AUTH_ENABLED = import.meta.env.DEV && !REMOTE_MAIN_HOME_AUTH_FOR_DEV;

export function buildDenjoyAuthUrl(
  type: 'login' | 'signup',
  options?: { plan?: PlanType; source?: string }
) {
  if (typeof window !== 'undefined' && LOCAL_AUTH_ENABLED) {
    const url = new URL(window.location.origin);
    url.hash = `#/${type}`;
    return url.toString();
  }

  const url = new URL(`${DENJOY_HOME}/${type}`);
  url.searchParams.set('returnTo', INVENTORY_URL);
  url.searchParams.set('service', 'implant-inventory');
  if (options?.plan) url.searchParams.set('plan', options.plan);
  if (options?.source) url.searchParams.set('source', options.source);
  return url.toString();
}

export function redirectToDenjoyAuth(
  type: 'login' | 'signup',
  options?: { plan?: PlanType; source?: string }
) {
  if (typeof window === 'undefined') return;
  window.location.assign(buildDenjoyAuthUrl(type, options));
}

export function isLocalDenjoyAuthEnabled() {
  return LOCAL_AUTH_ENABLED;
}

export type PublicAuthRoute = 'login' | 'signup';
export type PublicAuthRedirectOptions = { plan?: PlanType; source?: View };
