// ============================================
// Plan & Billing Types
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
  | 'fail_management'
  | 'order_execution'
  | 'inventory_audit'
  | 'audit_history'    // 재고실사 이력 + 분석 (Plus+)
  | 'return_management'
  | 'auto_stock_alert'
  | 'monthly_report'
  | 'yearly_report'
  | 'supplier_management'
  | 'one_click_order'
  | 'ai_forecast'
  | 'role_management'
  | 'audit_log'
  | 'email_support'
  | 'priority_support'
  | 'integrations';

// ── 인테그레이션 타입 ─────────────────────────────────────────────
export type IntegrationProvider = 'notion' | 'slack' | 'solapi';

export interface HospitalIntegration {
  id: string;
  hospital_id: string;
  provider: IntegrationProvider;
  config: string;       // ENCv2: 암호화된 JSON blob
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotionConfig {
  api_token: string;
  database_id: string;
}

export interface SlackConfig {
  webhook_url: string;
}

export interface SolapiConfig {
  api_key: string;
  api_secret: string;
}

export type IntegrationConfig = NotionConfig | SlackConfig | SolapiConfig;

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
    maxItems: 50,
    maxUsers: 1,
    maxBaseStockEdits: 3,
    retentionMonths: 3,
    features: ['dashboard_basic', 'excel_upload', 'realtime_stock'],
  },
  basic: {
    maxItems: 200,
    maxUsers: 1,
    maxBaseStockEdits: Infinity,
    retentionMonths: 12,
    features: [
      'dashboard_basic', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'fail_management', 'order_execution',
      'inventory_audit',
    ],
  },
  plus: {
    maxItems: 500,
    maxUsers: 5,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'fail_management', 'order_execution',
      'inventory_audit', 'audit_history', 'return_management',
      'auto_stock_alert', 'monthly_report', 'role_management',
      'email_support', 'integrations',
    ],
  },
  business: {
    maxItems: Infinity,
    maxUsers: Infinity,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'fail_management', 'order_execution',
      'inventory_audit', 'audit_history', 'return_management',
      'auto_stock_alert', 'monthly_report', 'yearly_report',
      'supplier_management', 'one_click_order', 'ai_forecast', 'role_management',
      'audit_log', 'email_support', 'priority_support', 'integrations',
    ],
  },
  ultimate: {
    maxItems: Infinity,
    maxUsers: Infinity,
    maxBaseStockEdits: Infinity,
    retentionMonths: 999,
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'fail_management', 'order_execution',
      'inventory_audit', 'audit_history', 'return_management',
      'auto_stock_alert', 'monthly_report', 'yearly_report',
      'supplier_management', 'one_click_order', 'ai_forecast', 'role_management',
      'audit_log', 'email_support', 'priority_support', 'integrations',
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

/** 체험 기본 기간 (일) — 베타 신청분 28일은 utils/trialPolicy.ts에서 계산 */
export const TRIAL_DAYS = 14;

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
