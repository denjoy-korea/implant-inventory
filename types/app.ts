export type View = 'homepage' | 'landing' | 'login' | 'signup' | 'invite' | 'dashboard' | 'mypage' | 'admin_panel' | 'pricing' | 'contact' | 'value' | 'analyze' | 'notices' | 'mfa_otp' | 'reviews' | 'suspended' | 'consultation' | 'terms' | 'privacy' | 'about' | 'consulting' | 'solutions' | 'courses' | 'blog' | 'community';

export type DashboardTab = 'overview' | 'fixture_upload' | 'fixture_edit' | 'inventory_master' | 'inventory_audit' | 'surgery_upload' | 'surgery_database' | 'fail_management' | 'order_management' | 'member_management' | 'settings' | 'audit_log' | 'lectures';

export type UploadType = 'fixture' | 'surgery';

/** 3-tier app layer classification */
export type AppLayer = 'brand' | 'solution' | 'service-hub' | 'operational';

export const AUTH_VIEWS: View[] = ['login', 'signup'];

export const BRAND_VIEWS: View[] = [
  'homepage', 'about', 'consulting', 'solutions', 'courses',
  'blog', 'community', 'contact', 'login', 'signup',
  'terms', 'privacy',
];

export const SOLUTION_VIEWS: View[] = [
  'landing', 'value', 'pricing', 'analyze', 'reviews',
  'notices', 'consultation',
];

export const SERVICE_HUB_VIEWS: View[] = ['mypage', 'admin_panel'];
export const PUBLIC_BOTTOM_OFFSET_VIEWS: View[] = ['landing', 'value', 'pricing', 'contact', 'analyze', 'notices', 'reviews'];

const AUTH_VIEW_SET = new Set<View>(AUTH_VIEWS);
const BRAND_VIEW_SET = new Set<View>(BRAND_VIEWS);
const SOLUTION_VIEW_SET = new Set<View>(SOLUTION_VIEWS);
const SERVICE_HUB_VIEW_SET = new Set<View>(SERVICE_HUB_VIEWS);
const PUBLIC_BOTTOM_OFFSET_VIEW_SET = new Set<View>(PUBLIC_BOTTOM_OFFSET_VIEWS);

export function isBrandView(view: View): boolean {
  return BRAND_VIEW_SET.has(view);
}

export function isSolutionView(view: View): boolean {
  return SOLUTION_VIEW_SET.has(view);
}

export function isServiceHubView(view: View): boolean {
  return SERVICE_HUB_VIEW_SET.has(view);
}

export function usesHomepageHeaderShell(view: View): boolean {
  return AUTH_VIEW_SET.has(view) || isServiceHubView(view);
}

export function usesPublicBottomOffset(view: View): boolean {
  return PUBLIC_BOTTOM_OFFSET_VIEW_SET.has(view);
}

export function getViewLayer(view: View): AppLayer {
  if (isBrandView(view)) return 'brand';
  if (isSolutionView(view)) return 'solution';
  if (isServiceHubView(view)) return 'service-hub';
  return 'operational';
}
