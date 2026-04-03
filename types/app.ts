export type View = 'homepage' | 'landing' | 'login' | 'signup' | 'invite' | 'dashboard' | 'mypage' | 'admin_panel' | 'pricing' | 'contact' | 'value' | 'analyze' | 'notices' | 'mfa_otp' | 'reviews' | 'suspended' | 'consultation' | 'terms' | 'privacy' | 'about' | 'consulting' | 'solutions' | 'courses' | 'blog' | 'community';

export type DashboardTab = 'overview' | 'fixture_upload' | 'fixture_edit' | 'inventory_master' | 'inventory_audit' | 'surgery_upload' | 'surgery_database' | 'fail_management' | 'order_management' | 'member_management' | 'settings' | 'audit_log' | 'lectures';

export type UploadType = 'fixture' | 'surgery';

/** 3-tier app layer classification */
export type AppLayer = 'brand' | 'solution' | 'service-hub' | 'operational';

const BRAND_VIEWS: View[] = [
  'homepage', 'about', 'consulting', 'solutions', 'courses',
  'blog', 'community', 'contact', 'login', 'signup',
  'terms', 'privacy',
];

const SOLUTION_VIEWS: View[] = [
  'landing', 'value', 'pricing', 'analyze', 'reviews',
  'notices', 'consultation',
];

const SERVICE_HUB_VIEWS: View[] = ['mypage', 'admin_panel'];

export function getViewLayer(view: View): AppLayer {
  if (BRAND_VIEWS.includes(view)) return 'brand';
  if (SOLUTION_VIEWS.includes(view)) return 'solution';
  if (SERVICE_HUB_VIEWS.includes(view)) return 'service-hub';
  return 'operational';
}
