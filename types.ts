
export interface ExcelRow {
  [key: string]: any;
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
  hospitalId: string;
  status?: 'pending' | 'active' | 'readonly' | 'paused'; // New field for approval flow
}

export type View = 'landing' | 'login' | 'signup' | 'dashboard' | 'admin_panel' | 'pricing' | 'contact' | 'value' | 'analyze' | 'notices';

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
}

/** 플랜별 제한 상수 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxItems: 80,
    maxUsers: 1,
    maxBaseStockEdits: 3,
    retentionMonths: 3,
    features: ['dashboard_basic', 'excel_upload', 'realtime_stock', 'brand_analytics'],
  },
  basic: {
    maxItems: 200,
    maxUsers: 1,
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
  basic: { monthlyPrice: 19000, yearlyPrice: 15000 },
  plus: { monthlyPrice: 49000, yearlyPrice: 39000 },
  business: { monthlyPrice: 99000, yearlyPrice: 79000 },
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

/** 플랜 순서 (업그레이드 비교용) */
export const PLAN_ORDER: Record<PlanType, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  business: 3,
  ultimate: 4,
};

/** 체험 기간 (일) */
export const TRIAL_DAYS = 14;

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

/** Supabase profiles 테이블 Row */
export interface DbProfile {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
  hospital_id: string | null;
  status: 'pending' | 'active' | 'readonly' | 'paused';
  created_at: string;
  updated_at: string;
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
