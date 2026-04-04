import type { DashboardTab } from './app';

export type UserRole = 'master' | 'dental_staff' | 'staff' | 'admin';

export const SERVICE_ADMIN_EMAILS = ['admin@denjoy.info'] as const;
const SERVICE_ADMIN_EMAIL_SET = new Set<string>(SERVICE_ADMIN_EMAILS);

type AdminIdentity = {
  role?: UserRole | null;
  email?: string | null;
};

export function isServiceAdminEmail(email?: string | null): boolean {
  if (typeof email !== 'string') return false;
  return SERVICE_ADMIN_EMAIL_SET.has(email.trim().toLowerCase());
}

export function isSystemAdminRole(role?: UserRole | null, email?: string | null): boolean {
  return role === 'admin' || isServiceAdminEmail(email);
}

export function normalizeUserRole(role: UserRole, email?: string | null): UserRole {
  return isSystemAdminRole(role, email) ? 'admin' : role;
}

export function isSystemAdminIdentity(identity?: AdminIdentity | null): boolean {
  return !!identity && isSystemAdminRole(identity.role, identity.email);
}

/** 치과 내 직책 (초대 시 지정, 권한과 무관) */
export type ClinicRole = 'director' | 'manager' | 'team_lead' | 'staff';

export const CLINIC_ROLE_LABELS: Record<ClinicRole, string> = {
  director:  '원장',
  manager:   '실장',
  team_lead: '팀장',
  staff:     '스탭',
};

/** 구성원 세부 권한 */
export interface MemberPermissions {
  canViewInventory: boolean;   // 재고 조회
  canEditInventory: boolean;   // 재고 수정
  canViewSurgery: boolean;     // 수술기록 조회
  canEditSurgery: boolean;     // 수술기록 등록/수정
  canManageOrders: boolean;    // 발주 관리
  canViewAnalytics: boolean;   // 분석/보고서 열람
  canManageFails: boolean;     // 실패 관리
  canManageVendors: boolean;   // 거래처 관리
  canManageWorkDays: boolean;  // 진료 요일 설정
  canManageOptimizer: boolean; // 권장재고산출설정
  canViewAuditLog: boolean;    // 감사 로그
  canManageDentweb: boolean;   // 덴트웹 자동화
  canManagePricing: boolean;   // 단가 관리
}

/** 권한 레벨 프리셋 */
export type PermissionLevel = 'full' | 'readonly' | 'custom';

export const DEFAULT_STAFF_PERMISSIONS: MemberPermissions = {
  canViewInventory: true,
  canEditInventory: true,
  canViewSurgery: true,
  canEditSurgery: true,
  canManageOrders: true,
  canViewAnalytics: true,
  canManageFails: true,
  canManageVendors: true,
  canManageWorkDays: true,
  canManageOptimizer: true,
  canViewAuditLog: true,
  canManageDentweb: true,
  canManagePricing: true,
};

export const READONLY_PERMISSIONS: MemberPermissions = {
  canViewInventory: true,
  canEditInventory: false,
  canViewSurgery: true,
  canEditSurgery: false,
  canManageOrders: false,
  canViewAnalytics: true,
  canManageFails: false,
  canManageVendors: false,
  canManageWorkDays: false,
  canManageOptimizer: false,
  canViewAuditLog: false,
  canManageDentweb: false,
  canManagePricing: false,
};

export const PERMISSION_LABELS: Record<keyof MemberPermissions, string> = {
  canViewInventory: '재고 조회',
  canEditInventory: '재고 수정',
  canViewSurgery: '수술기록 조회',
  canEditSurgery: '수술기록 등록/수정',
  canManageOrders: '발주 관리',
  canViewAnalytics: '분석/보고서 열람',
  canManageFails: '실패 관리',
  canManageVendors: '거래처 관리',
  canManageWorkDays: '진료 요일 설정',
  canManageOptimizer: '권장재고산출설정',
  canViewAuditLog: '감사 로그',
  canManageDentweb: '덴트웹 자동화',
  canManagePricing: '단가 관리',
};

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  clinicRole?: ClinicRole | null;
  hospitalId: string;
  status?: 'pending' | 'active' | 'readonly' | 'paused';
  suspendReason?: string | null;
  permissions?: MemberPermissions | null;
  mfaEnabled?: boolean;
  signupSource?: string | null;
  /** 개인 크레딧 잔액 (profiles.credit_balance) */
  creditBalance: number;
}

/** 신뢰 기기 (프론트엔드) */
export interface TrustedDevice {
  id: string;
  deviceName: string | null;
  createdAt: string;
  expiresAt: string;
}

/** Supabase profiles 테이블 Row */
export interface DbProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  clinic_role: ClinicRole | null;
  hospital_id: string | null;
  status: 'pending' | 'active' | 'readonly' | 'paused';
  suspend_reason?: string | null;
  permissions: MemberPermissions | null;
  created_at: string;
  updated_at: string;
  last_active_at?: string | null;
  last_sign_in_at?: string | null;
  session_token?: string | null;
  mfa_enabled?: boolean;
  signup_source?: string | null;
  email_hash?: string | null;
  phone_hash?: string | null;
  name_hash?: string | null;
  /** 개인 크레딧 잔액 */
  credit_balance?: number;
  /** H-4: 복호화 실패 시 런타임 플래그. DB에 저장되지 않음. true이면 DB 쓰기 경로에서 차단. */
  _decryptFailed?: boolean;
}

/** 주어진 탭에 접근 가능한지 권한 확인 */
export function canAccessTab(
  tab: DashboardTab,
  permissions: MemberPermissions | null | undefined,
  role: UserRole,
): boolean {
  if (role === 'master' || role === 'admin') return true;
  if (!permissions) return true;

  const safe = permissions as Partial<MemberPermissions>;

  switch (tab) {
    case 'overview':          return safe.canViewAnalytics ?? true;
    case 'inventory_master':  return safe.canViewInventory ?? true;
    case 'inventory_audit':   return safe.canViewInventory ?? true;
    case 'fixture_upload':    return safe.canEditInventory ?? true;
    case 'fixture_edit':      return safe.canEditInventory ?? true;
    case 'surgery_database':  return safe.canViewSurgery ?? true;
    case 'surgery_upload':    return safe.canEditSurgery ?? true;
    case 'order_management':  return safe.canManageOrders ?? true;
    case 'fail_management':   return safe.canManageFails ?? true;
    default:                  return true;
  }
}
