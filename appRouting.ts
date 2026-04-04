import { View, DashboardTab } from './types';

/* ── Pathname Routing Constants (brand + solution pages) ── */
export const VIEW_PATH: Partial<Record<View, string>> = {
  homepage: '/',
  about: '/about',
  consulting: '/consulting',
  solutions: '/solutions',
  courses: '/courses',
  blog: '/blog',
  community: '/community',
  contact: '/contact',
  login: '/login',
  signup: '/signup',
  terms: '/terms',
  privacy: '/privacy',
  landing: '/inventory',
  value: '/inventory/value',
  pricing: '/inventory/pricing',
  analyze: '/inventory/analyze',
};

/** Reverse map: pathname → View */
export const PATH_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_PATH).map(([k, v]) => [v, k as View])
) as Record<string, View>;

function normalizePathname(pathname: string): string {
  if (!pathname) return '/';
  if (pathname !== '/' && pathname.endsWith('/')) {
    return pathname.replace(/\/+$/, '') || '/';
  }
  return pathname;
}

export function resolveViewFromPathname(pathname: string): View | undefined {
  const normalizedPath = normalizePathname(pathname);
  let view: View | undefined = PATH_TO_VIEW[normalizedPath] as View | undefined;

  // Legacy nested mount fallback: /inventory/about -> /about
  if (!view && normalizedPath.startsWith('/inventory/')) {
    const nestedPath = normalizedPath.replace(/^\/inventory/, '') || '/';
    view = PATH_TO_VIEW[nestedPath] as View | undefined;
  }

  if (!view && normalizedPath.startsWith('/courses/')) {
    return 'courses';
  }

  if (!view && normalizedPath === '/admin') {
    return 'admin_panel';
  }

  return view;
}

export function resolveInitialViewFromLocation(pathname: string, hash: string): View | undefined {
  const pathView = resolveViewFromPathname(pathname);
  if (pathView) return pathView;

  // Legacy hash fallback: #/implant-inventory -> landing
  if (hash === '#/implant-inventory' || hash === '#/implant-inventory/') {
    return 'landing';
  }

  return undefined;
}

/* ── Hash Routing Constants ── */
export const VIEW_HASH: Record<View, string> = {
  homepage: '', landing: 'implant-inventory', login: 'login', signup: 'signup', invite: 'invite', dashboard: 'dashboard', mypage: 'mypage',
  admin_panel: 'admin', pricing: 'pricing', contact: 'contact',
  value: 'value', analyze: 'analyze', notices: 'notices', mfa_otp: 'mfa', reviews: 'reviews',
  suspended: '',  // homepage와 동일한 hash — URL로 직접 진입 불가, 항상 loadHospitalData가 결정
  consultation: 'consultation',
  terms: 'terms',
  privacy: 'privacy',
  courses: 'courses',
  about: 'about',
  consulting: 'consulting',
  solutions: 'solutions',
  blog: 'blog',
  community: 'community',
};

export const TAB_HASH: Record<DashboardTab, string> = {
  overview: '', fixture_upload: 'upload', fixture_edit: 'edit',
  inventory_master: 'inventory', inventory_audit: 'audit',
  surgery_database: 'surgery', fail_management: 'fail',
  order_management: 'orders', member_management: 'members',
  surgery_upload: 'surgery-upload', settings: 'settings',
  audit_log: 'audit-log', lectures: 'lectures',
};

export const HASH_TO_VIEW = Object.fromEntries(
  Object.entries(VIEW_HASH).filter(([, v]) => v).map(([k, v]) => [v, k])
) as Record<string, View>;

export const HASH_TO_TAB = Object.fromEntries(
  Object.entries(TAB_HASH).filter(([, v]) => v).map(([k, v]) => [v, k])
) as Record<string, DashboardTab>;

/* ── Hash Routing Functions ── */
export function buildHash(view: View, tab: DashboardTab): string {
  if (view === 'dashboard') {
    const t = TAB_HASH[tab];
    return t ? `#/dashboard/${t}` : '#/dashboard';
  }
  return view === 'homepage' ? '#/' : `#/${VIEW_HASH[view]}`;
}

export function parseHash(hash: string): { view: View; tab?: DashboardTab } {
  const path = hash.replace(/^#\/?/, '');
  const [first, second] = path.split('/').filter(Boolean);
  if (!first) return { view: 'homepage' };
  if (first === 'dashboard') {
    return { view: 'dashboard', tab: second ? (HASH_TO_TAB[second] || 'overview') : 'overview' };
  }
  return { view: (HASH_TO_VIEW[first] || 'homepage') as View };
}
