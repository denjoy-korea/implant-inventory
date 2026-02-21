import { View, DashboardTab } from './types';

/* ── Hash Routing Constants ── */
export const VIEW_HASH: Record<View, string> = {
  landing: '', login: 'login', signup: 'signup', invite: 'invite', dashboard: 'dashboard',
  admin_panel: 'admin', pricing: 'pricing', contact: 'contact',
  value: 'value', analyze: 'analyze', notices: 'notices', mfa_otp: 'mfa', reviews: 'reviews',
};

export const TAB_HASH: Record<DashboardTab, string> = {
  overview: '', fixture_upload: 'upload', fixture_edit: 'edit',
  inventory_master: 'inventory', inventory_audit: 'audit',
  surgery_database: 'surgery', fail_management: 'fail',
  order_management: 'orders', member_management: 'members',
  surgery_upload: 'surgery-upload', settings: 'settings',
  audit_log: 'audit-log',
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
  return view === 'landing' ? '#/' : `#/${VIEW_HASH[view]}`;
}

export function parseHash(hash: string): { view: View; tab?: DashboardTab } {
  const path = hash.replace(/^#\/?/, '');
  const [first, second] = path.split('/').filter(Boolean);
  if (!first) return { view: 'landing' };
  if (first === 'dashboard') {
    return { view: 'dashboard', tab: second ? (HASH_TO_TAB[second] || 'overview') : 'overview' };
  }
  return { view: (HASH_TO_VIEW[first] || 'landing') as View };
}
