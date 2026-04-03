
// ── 도메인 타입 re-export ─────────────────────────────────────────
export * from './types/plan';
export * from './types/return';
export * from './types/fail';
export * from './types/app';
export * from './types/user';
export * from './types/notice';
export * from './types/pricing';
export * from './types/service';

// ── 도메인 타입 import (이 파일 내 타입 정의에서 사용) ────────────
import type { PlanType, BillingCycle, HospitalPlanState } from './types/plan';
import type { MemberPermissions, UserRole } from './types/user';
import type { DashboardTab } from './types/app';

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

export type OrderType = 'replenishment' | 'fail_exchange' | 'return';
export type OrderStatus = 'ordered' | 'received' | 'cancelled';

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
  confirmedBy?: string;
  memo?: string;
  cancelledReason?: string;
}

// Deprecated in favor of Order, but kept for compatibility if needed
export interface FailOrder extends Order { }

export type BillingProgram = 'dentweb' | 'oneclick';

export const BILLING_PROGRAM_LABELS: Record<BillingProgram, string> = {
  dentweb: '덴트웹 (DentWeb)',
  oneclick: '원클릭 (OneClick)',
};

export interface Hospital {
  id: string;
  name: string;
  masterAdminId: string;
  createdAt: string;
  workDays: number[];
  /** 온보딩 완료 단계 비트마스크 (1=welcome,2=fixture,4=surgery,8=auditSeen,16=failAudit) */
  onboardingFlags: number;
  /** 워크스페이스에서 사용하는 청구프로그램 */
  billingProgram: BillingProgram | null;
  /** 사업자등록증 파일 참조 (null이면 미등록) */
  bizFileUrl: string | null;
}

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
  user: import('./types/user').User | null;
  currentView: import('./types/app').View;
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
  /** 병원별 청구프로그램 (선택 전이면 null) */
  hospitalBillingProgram: BillingProgram | null;
  /** 병원 사업자등록증 파일 참조 (null이면 미등록) */
  hospitalBizFileUrl: string | null;
  /** MFA OTP 검증 대기 중인 이메일 */
  mfaPendingEmail?: string;
  /** PricingPage에서 플랜 선택 후 회원가입으로 넘어온 경우 */
  preSelectedPlan?: PlanType;
}

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
  billing_program: BillingProgram | null;
  plan: PlanType;
  plan_expires_at: string | null;
  billing_cycle: BillingCycle | null;
  trial_started_at: string | null;
  trial_used: boolean;
  created_at: string;
  updated_at: string;
  /** 진료 요일 배열: 0=일, 1=월, 2=화, 3=수, 4=목, 5=금, 6=토 (기본: [1,2,3,4,5]) */
  work_days: number[];
  /** 온보딩 완료 단계 비트마스크 (1=welcome,2=fixture,4=surgery,8=auditSeen,16=failAudit) */
  onboarding_flags: number;
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
  confirmed_by: string | null;
  memo: string | null;
  cancelled_reason: string | null;
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

// suppress unused import warnings — these are used via re-export pattern above
export type { MemberPermissions, UserRole, DashboardTab };
