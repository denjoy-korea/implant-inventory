
export interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

/** 재고(Fixture) 엑셀 행 — 알려진 컬럼 명시 */
export interface FixtureRow {
  '제조사'?: string;
  '브랜드'?: string;
  '규격(SIZE)'?: string;
  '규격'?: string;
  '사이즈'?: string;
  'Size'?: string;
  'size'?: string;
  '수량'?: string | number;
  '사용안함'?: boolean;
  '발주수량'?: string | number;
  [key: string]: string | number | boolean | undefined;
}

/** 수술기록 엑셀 행 — 알려진 컬럼 명시 */
export interface SurgeryRow {
  '수술일'?: string | number;
  '환자명'?: string;
  '제조사'?: string;
  '브랜드'?: string;
  '규격(SIZE)'?: string;
  '규격'?: string;
  '수량'?: string | number;
  '수술기록'?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface ExcelSheet {
  name: string;
  columns: string[];
  rows: ExcelRow[];
}

export interface ExcelData {
  sheets: Record<string, ExcelSheet>;
  activeSheetName: string;
}

export interface InventoryItem {
  id: string;
  manufacturer: string;
  brand: string;
  size: string;
  initialStock: number;
  stockAdjustment: number;
  usageCount: number;
  currentStock: number;
  recommendedStock: number;
  monthlyAvgUsage?: number;
  dailyMaxUsage?: number;
  lastMonthUsage?: number;
  /** 예측 모델 기반 일평균 소진량 (최근 추세+변동성 반영) */
  predictedDailyUsage?: number;
  /** 예측 모델 신뢰도 (0~1) */
  forecastConfidence?: number;
  /** 가장 최근 수술에 사용된 날짜 (ISO string). 수술기록 데이터 로드 시 계산됨. */
  lastUsedDate?: string | null;
}

export type OrderType = 'replenishment' | 'fail_exchange';
export type OrderStatus = 'ordered' | 'received';

export interface OrderItem {
  brand: string;
  size: string;
  quantity: number;
}

export interface Order {
  id: string;
  type: OrderType;
  manufacturer: string;
  date: string;
  items: OrderItem[];
  manager: string;
  status: OrderStatus;
  receivedDate?: string;
}

// Deprecated in favor of Order, but kept for compatibility if needed
export interface FailOrder extends Order { }

export type UserRole = 'master' | 'dental_staff' | 'staff' | 'admin';

/** 치과 내 직책 (초대 시 지정, 권한과 무관) */
export type ClinicRole = 'director' | 'manager' | 'team_lead' | 'staff';

export const CLINIC_ROLE_LABELS: Record<ClinicRole, string> = {
  director:  '원장',
  manager:   '실장',
  team_lead: '팀장',
  staff:     '스탭',
};

export interface Hospital {
  id: string;
  name: string;
  masterAdminId: string; // email of the master admin
  createdAt: string;
  workDays: number[];    // 진료 요일 배열 (기본: 월~금 [1,2,3,4,5])
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  role: UserRole;
  clinicRole?: ClinicRole | null;
  hospitalId: string;
  status?: 'pending' | 'active' | 'readonly' | 'paused'; // New field for approval flow
  permissions?: MemberPermissions | null;
  mfaEnabled?: boolean;
  signupSource?: string | null;
}

/** 주어진 탭에 접근 가능한지 권한 확인 */
export function canAccessTab(
  tab: DashboardTab,
  permissions: MemberPermissions | null | undefined,
  role: UserRole,
): boolean {
  // master / admin 은 항상 모든 탭 접근 가능
  if (role === 'master' || role === 'admin') return true;
  // permissions 미설정 시 전체 허용 (기본값)
  if (!permissions) return true;

  // 레거시/비정상 권한 객체 호환:
  // 일부 키가 누락된 경우는 "차단"이 아니라 기존 동작(허용)으로 간주한다.
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
    // 설정·멤버관리·감사로그 는 항상 접근 허용 (master 전용 여부는 별도 처리)
    default:                  return true;
  }
}

export type View = 'landing' | 'login' | 'signup' | 'invite' | 'dashboard' | 'admin_panel' | 'pricing' | 'contact' | 'value' | 'analyze' | 'notices' | 'mfa_otp' | 'reviews' | 'suspended';

export interface DiagnosticItem {
  category: string;
  status: 'good' | 'warning' | 'critical';
  score: number;
  maxScore: number;
  title: string;
  detail: string;
  items?: string[];
}

export interface UnmatchedItem {
  manufacturer: string;
  brand: string;
  size: string;
  source: 'surgery_only' | 'fixture_only';
  reason: string;
}

/** 수술기록지에는 있으나 재고 마스터에 없는 품목 알림용 */
export interface SurgeryUnregisteredSample {
  date: string;
  patientMasked: string;
  chartNumber: string;
  recordId?: string;
}

export interface SurgeryUnregisteredItem {
  manufacturer: string;
  brand: string;
  size: string;
  usageCount: number;
  reason?: 'not_in_inventory' | 'non_list_input';
  samples?: SurgeryUnregisteredSample[];
  recordIds?: string[];
}

export interface AnalysisReport {
  dataQualityScore: number;
  diagnostics: DiagnosticItem[];
  matchedCount: number;
  totalFixtureItems: number;
  totalSurgeryItems: number;
  unmatchedItems: UnmatchedItem[];
  usagePatterns: {
    topUsedItems: { manufacturer: string; brand: string; size: string; count: number }[];
    monthlyAvgSurgeries: number;
    totalSurgeries: number;
    primarySurgeries: number;
    secondarySurgeries: number;
    failSurgeries: number;
    fixtureUsageCount: number;
    insuranceClaimCount: number;
    failUsageCount: number;
    periodMonths: number;
    manufacturerDistribution: { label: string; count: number }[];
  };
  recommendations: string[];
  summary: {
    totalFixtureItems: number;
    activeItems: number;
    usedItems: number;
    deadStockItems: number;
    surgeryOnlyItems: number;
    nameVariants: number;
  };
}
export type DashboardTab = 'overview' | 'fixture_upload' | 'fixture_edit' | 'inventory_master' | 'inventory_audit' | 'surgery_upload' | 'surgery_database' | 'fail_management' | 'order_management' | 'member_management' | 'settings' | 'audit_log';
export type UploadType = 'fixture' | 'surgery';

export interface ParsedSize {
  diameter: number | null;
  length: number | null;
  cuff: string | null;
  suffix: string | null;
  raw: string;
  matchKey: string;
}

export interface AppState {
  fixtureData: ExcelData | null;
  surgeryData: ExcelData | null;
  fixtureFileName: string | null;
  surgeryFileName: string | null;
  inventory: InventoryItem[];
  orders: Order[];
  surgeryMaster: Record<string, ExcelRow[]>;
  activeSurgerySheetName: string;
  selectedFixtureIndices: Record<string, Set<number>>;
  selectedSurgeryIndices: Record<string, Set<number>>;
  isLoading: boolean;
  user: User | null;
  currentView: View;
  dashboardTab: DashboardTab;
  isFixtureLengthExtracted: boolean;
  fixtureBackup: Record<string, { rows: ExcelRow[], columns: string[] }> | null;
  showProfile: boolean;
  adminViewMode: 'admin' | 'user';
  planState: HospitalPlanState | null;
  memberCount: number;
  hospitalName: string;
  /** 병원 master_admin_id — staff 워크스페이스에서도 본인이 master인지 판별용 */
  hospitalMasterAdminId: string;
  /** 병원별 진료 요일 설정 (기본: 월~금 [1,2,3,4,5]) */
  hospitalWorkDays: number[];
  /** MFA OTP 검증 대기 중인 이메일 */
  mfaPendingEmail?: string;
  /** PricingPage에서 플랜 선택 후 회원가입으로 넘어온 경우 */
  preSelectedPlan?: PlanType;
}

// ============================================
// Plan Types & Constants
// ============================================

/** 플랜 타입 */
export type PlanType = 'free' | 'basic' | 'plus' | 'business' | 'ultimate';

/** 결제 주기 */
export type BillingCycle = 'monthly' | 'yearly';

/** 기능 식별자 */
export type PlanFeature =
  | 'dashboard_basic'
  | 'dashboard_advanced'
  | 'excel_upload'
  | 'realtime_stock'
  | 'brand_analytics'
  | 'auto_stock_alert'
  | 'monthly_report'
  | 'yearly_report'
  | 'supplier_management'
  | 'one_click_order'
  | 'ai_forecast'
  | 'role_management'
  | 'audit_log'
  | 'email_support'
  | 'priority_support';

/** 플랜별 제한 */
export interface PlanLimits {
  maxItems: number;
  maxUsers: number;
  maxBaseStockEdits: number;
  retentionMonths: number;
  features: PlanFeature[];
}

/** 플랜 가격 정보 */
export interface PlanPricing {
  monthlyPrice: number;
  yearlyPrice: number;
}

/** 병원 플랜 상태 (프론트엔드 사용) */
export interface HospitalPlanState {
  plan: PlanType;
  expiresAt: string | null;
  billingCycle: BillingCycle | null;
  trialStartedAt: string | null;
  trialUsed: boolean;
  isTrialActive: boolean;
  trialDaysRemaining: number;
  daysUntilExpiry: number;
  /** T1: 수술기록 보관 만료까지 남은 일수 (planService 확장 시 채워짐) */
  retentionDaysLeft?: number;
  /** T3: 이번 달 업로드 한도 초과 여부 (planService 확장 시 채워짐) */
  uploadLimitExceeded?: boolean;
}

/** 플랜별 제한 상수 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxItems: 100,
    maxUsers: 1,
    maxBaseStockEdits: 3,
    retentionMonths: 3,
    features: ['dashboard_basic', 'excel_upload', 'realtime_stock', 'brand_analytics'],
  },
  basic: {
    maxItems: 200,
    maxUsers: 3,
    maxBaseStockEdits: 5,
    retentionMonths: 6,
    features: ['dashboard_basic', 'excel_upload', 'realtime_stock', 'brand_analytics'],
  },
  plus: {
    maxItems: 500,
    maxUsers: 5,
    maxBaseStockEdits: 10,
    retentionMonths: 12,
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'auto_stock_alert', 'monthly_report', 'role_management', 'email_support',
    ],
  },
  business: {
    maxItems: Infinity,
    maxUsers: Infinity,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'auto_stock_alert', 'monthly_report', 'yearly_report',
      'supplier_management', 'one_click_order', 'ai_forecast', 'role_management',
      'email_support', 'priority_support',
    ],
  },
  ultimate: {
    maxItems: Infinity,
    maxUsers: Infinity,
    maxBaseStockEdits: Infinity,
    retentionMonths: 999,
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'auto_stock_alert', 'monthly_report', 'yearly_report',
      'supplier_management', 'one_click_order', 'ai_forecast', 'role_management',
      'audit_log', 'email_support', 'priority_support',
    ],
  },
};

/** 플랜별 가격 */
export const PLAN_PRICING: Record<PlanType, PlanPricing> = {
  free: { monthlyPrice: 0, yearlyPrice: 0 },
  basic: { monthlyPrice: 29000, yearlyPrice: 23000 },
  plus: { monthlyPrice: 69000, yearlyPrice: 55000 },
  business: { monthlyPrice: 129000, yearlyPrice: 103000 },
  ultimate: { monthlyPrice: 0, yearlyPrice: 0 },
};

/** 플랜 표시 이름 */
export const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Free',
  basic: 'Basic',
  plus: 'Plus',
  business: 'Business',
  ultimate: 'Ultimate',
};

/** 플랜 축약 이름 (관리자 목록/배지용) */
export const PLAN_SHORT_NAMES: Record<PlanType, string> = {
  free: 'Free',
  basic: 'Base',
  plus: 'Plus',
  business: 'Bizs',
  ultimate: 'Maxs',
};

/** 플랜 순서 (업그레이드 비교용) */
export const PLAN_ORDER: Record<PlanType, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  business: 3,
  ultimate: 4,
};

/** 체험 기간 (일) — 베타 4주 */
export const TRIAL_DAYS = 28;

// ============================================
// Supabase Database Types
// ============================================

/** 기본 진료 요일: 월~금 */
export const DEFAULT_WORK_DAYS: number[] = [1, 2, 3, 4, 5];

/** Supabase hospitals 테이블 Row */
export interface DbHospital {
  id: string;
  name: string;
  master_admin_id: string | null;
  phone: string | null;
  biz_file_url: string | null;
  plan: PlanType;
  plan_expires_at: string | null;
  billing_cycle: BillingCycle | null;
  trial_started_at: string | null;
  trial_used: boolean;
  created_at: string;
  updated_at: string;
  /** 진료 요일 배열: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토 (기본: [1,2,3,4,5]) */
  work_days: number[];
}

/** 구성원 세부 권한 */
export interface MemberPermissions {
  canViewInventory: boolean;   // 재고 조회
  canEditInventory: boolean;   // 재고 수정
  canViewSurgery: boolean;     // 수술기록 조회
  canEditSurgery: boolean;     // 수술기록 등록/수정
  canManageOrders: boolean;    // 발주 관리
  canViewAnalytics: boolean;   // 분석/보고서 열람
  canManageFails: boolean;     // 실패 관리
}

/** 거래처 영업사원 연락처 */
export interface VendorContact {
  id: string;
  hospitalId: string;
  manufacturer: string;
  repName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
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
};

export const READONLY_PERMISSIONS: MemberPermissions = {
  canViewInventory: true,
  canEditInventory: false,
  canViewSurgery: true,
  canEditSurgery: false,
  canManageOrders: false,
  canViewAnalytics: true,
  canManageFails: false,
};

export const PERMISSION_LABELS: Record<keyof MemberPermissions, string> = {
  canViewInventory: '재고 조회',
  canEditInventory: '재고 수정',
  canViewSurgery: '수술기록 조회',
  canEditSurgery: '수술기록 등록/수정',
  canManageOrders: '발주 관리',
  canViewAnalytics: '분석/보고서 열람',
  canManageFails: '실패 관리',
};

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
  permissions: MemberPermissions | null;
  created_at: string;
  updated_at: string;
  last_sign_in_at?: string | null;
  session_token?: string | null;
  mfa_enabled?: boolean;
  signup_source?: string | null;
  email_hash?: string | null;
  phone_hash?: string | null;
}

/** Supabase inventory 테이블 Row */
export interface DbInventoryItem {
  id: string;
  hospital_id: string;
  manufacturer: string;
  brand: string;
  size: string;
  initial_stock: number;
  stock_adjustment: number;
  created_at: string;
  updated_at: string;
}

/** Supabase inventory_audits 테이블 Row */
export interface DbInventoryAudit {
  id: string;
  hospital_id: string;
  inventory_id: string;
  audit_date: string;
  system_stock: number;
  actual_stock: number;
  difference: number;
  reason: string | null;
  created_at: string;
}

/** Supabase surgery_records 테이블 Row */
export interface DbSurgeryRecord {
  id: string;
  hospital_id: string;
  date: string | null;
  patient_info: string | null;
  patient_info_hash: string | null;
  tooth_number: string | null;
  quantity: number;
  surgery_record: string | null;
  classification: string;
  manufacturer: string | null;
  brand: string | null;
  size: string | null;
  bone_quality: string | null;
  initial_fixation: string | null;
  created_at: string;
}

/** Supabase orders 테이블 Row */
export interface DbOrder {
  id: string;
  hospital_id: string;
  type: OrderType;
  manufacturer: string;
  date: string;
  manager: string;
  status: OrderStatus;
  received_date: string | null;
  created_at: string;
}

/** Supabase order_items 테이블 Row */
export interface DbOrderItem {
  id: string;
  order_id: string;
  brand: string;
  size: string;
  quantity: number;
}

/** Supabase billing_history 테이블 Row */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface DbBillingHistory {
  id: string;
  hospital_id: string;
  plan: PlanType;
  billing_cycle: BillingCycle | null;
  amount: number;
  payment_method: string;
  payment_status: PaymentStatus;
  payment_ref: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Supabase data_reset_requests 테이블 Row */
export type ResetRequestStatus = 'pending' | 'scheduled' | 'completed' | 'cancelled' | 'rejected';

export interface DbResetRequest {
  id: string;
  hospital_id: string;
  requested_by: string;
  reason: string | null;
  status: ResetRequestStatus;
  approved_by: string | null;
  approved_at: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
}

/** Supabase public_notices 테이블 Row */
export interface DbNotice {
  id: string;
  title: string;
  content: string;
  category: NoticeCategory;
  is_important: boolean;
  author: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** 서비스 에러 */
export interface ServiceError {
  code: string;
  message: string;
  details?: string;
}

/** 공통 에러 코드 */
export const ERROR_CODES = {
  AUTH_INVALID_CREDENTIALS: '아이디 또는 비밀번호가 일치하지 않습니다.',
  AUTH_EMAIL_EXISTS: '이미 등록된 이메일입니다.',
  AUTH_WEAK_PASSWORD: '비밀번호가 너무 약합니다.',
  AUTH_SESSION_EXPIRED: '세션이 만료되었습니다. 다시 로그인해주세요.',
  RLS_VIOLATION: '접근 권한이 없습니다.',
  NETWORK_ERROR: '네트워크 연결을 확인해주세요.',
  UNKNOWN: '알 수 없는 오류가 발생했습니다.',
} as const;

/** DB → Frontend 변환 함수 시그니처 */
export type DbToFrontend<TDb, TFe> = (dbRow: TDb) => TFe;
export type FrontendToDb<TFe, TDb> = (feItem: TFe) => Partial<TDb>;

/** 마이그레이션 결과 */
export interface MigrationResult {
  inventory: { migrated: number; errors: number };
  surgery: { migrated: number; errors: number };
  orders: { migrated: number; errors: number };
  success: boolean;
}

export type NoticeCategory = '공지' | '업데이트' | '오류수정' | '이벤트';

export const NOTICE_CATEGORIES: { value: NoticeCategory; label: string; color: string; bg: string }[] = [
  { value: '공지', label: '공지', color: 'text-rose-600', bg: 'bg-rose-100' },
  { value: '업데이트', label: '업데이트', color: 'text-indigo-600', bg: 'bg-indigo-100' },
  { value: '오류수정', label: '오류수정', color: 'text-amber-600', bg: 'bg-amber-100' },
  { value: '이벤트', label: '이벤트', color: 'text-emerald-600', bg: 'bg-emerald-100' },
];

export interface Notice {
  id: string;
  title: string;
  content: string;
  date: string; // ISO String
  author: string;
  isImportant?: boolean;
  category?: NoticeCategory;
}
