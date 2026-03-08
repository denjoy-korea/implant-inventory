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
  | 'audit_history'         // 재고실사 이력 + 분석 (Plus+)
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
  | 'integrations'
  // 신규 추가
  | 'surgery_chart_basic'    // 수술기록 기본 차트 (월별 추세·요일별 패턴) — Basic+
  | 'surgery_chart_advanced' // 수술기록 고급 차트 전체 — Plus+
  | 'exchange_analysis'      // 교환관리 하단 4섹션 분석 — Plus+
  | 'order_optimization'     // 발주 최적화 추천 + OptimizeModal — Plus+
  | 'simple_order';          // 간편발주 (카톡 복사) — Plus+

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
  /** 수술기록 조회 가능 기간 (실제 저장과 분리) */
  viewMonths: number;
  /** 수술기록 업로드 빈도 */
  uploadFrequency: 'monthly' | 'weekly' | 'unlimited';
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
    maxBaseStockEdits: 0,
    retentionMonths: 24,        // 실제 저장 24개월
    viewMonths: 3,              // 조회는 3개월
    uploadFrequency: 'monthly',
    features: ['excel_upload'], // 재고·발주 대시보드 없음
  },
  basic: {
    maxItems: 150,
    maxUsers: 1,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 12,
    uploadFrequency: 'weekly',
    features: [
      'dashboard_basic', 'excel_upload', 'realtime_stock',
      'fail_management', 'order_execution', 'inventory_audit',
      'surgery_chart_basic',
    ],
  },
  plus: {
    maxItems: 300,
    maxUsers: 5,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 24,
    uploadFrequency: 'unlimited',
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'fail_management', 'order_execution',
      'inventory_audit', 'audit_history', 'return_management',
      'auto_stock_alert', 'exchange_analysis', 'order_optimization',
      'surgery_chart_basic', 'surgery_chart_advanced',
      'simple_order', 'role_management', 'email_support',
    ],
  },
  business: {
    maxItems: Infinity,
    maxUsers: 10,               // 기본 10명 (초과 시 별도 과금 5,000원/인)
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 24,
    uploadFrequency: 'unlimited',
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'fail_management', 'order_execution',
      'inventory_audit', 'audit_history', 'return_management',
      'auto_stock_alert', 'exchange_analysis', 'order_optimization',
      'surgery_chart_basic', 'surgery_chart_advanced',
      'simple_order', 'one_click_order', 'monthly_report', 'yearly_report',
      'supplier_management', 'ai_forecast', 'role_management',
      'audit_log', 'email_support', 'priority_support', 'integrations',
    ],
  },
  ultimate: {
    maxItems: Infinity,
    maxUsers: Infinity,
    maxBaseStockEdits: Infinity,
    retentionMonths: 24,
    viewMonths: 24,
    uploadFrequency: 'unlimited',
    features: [
      'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
      'brand_analytics', 'fail_management', 'order_execution',
      'inventory_audit', 'audit_history', 'return_management',
      'auto_stock_alert', 'exchange_analysis', 'order_optimization',
      'surgery_chart_basic', 'surgery_chart_advanced',
      'simple_order', 'one_click_order', 'monthly_report', 'yearly_report',
      'supplier_management', 'ai_forecast', 'role_management',
      'audit_log', 'email_support', 'priority_support', 'integrations',
    ],
  },
};

/** 플랜별 가격 */
export const PLAN_PRICING: Record<PlanType, PlanPricing> = {
  free: { monthlyPrice: 0, yearlyPrice: 0 },
  basic: { monthlyPrice: 27000, yearlyPrice: 21000 },
  plus: { monthlyPrice: 59000, yearlyPrice: 47000 },
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

/** Business 플랜 추가 사용자 단가 (부가세 별도, 1인/월) */
export const EXTRA_USER_PRICE_PER_MONTH = 5000;

/** Supabase billing_history 테이블 Row */
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export interface DbBillingHistory {
  id: string;
  hospital_id: string | null; // 병원 삭제 시 SET NULL (migration 20260223040000)
  plan: PlanType;
  billing_cycle: BillingCycle | null;
  amount: number;
  /** true=test/sandbox, false=live settlement */
  is_test_payment: boolean;
  payment_method: string;
  payment_status: PaymentStatus;
  payment_ref: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}
