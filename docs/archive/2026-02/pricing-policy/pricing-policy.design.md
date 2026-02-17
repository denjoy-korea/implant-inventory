# pricing-policy 설계서

> **Feature**: pricing-policy (가격정책 및 기능 게이팅)
> **Phase**: Design
> **작성일**: 2026-02-15
> **Plan 문서**: `docs/01-plan/features/pricing-policy.plan.md`
> **PDCA Cycle**: #3

---

## 1. 설계 개요

### 1.1 범위

Plan 문서의 P-01 ~ P-07 (In Scope) 구현 설계.

| ID | 항목 | 설계 섹션 |
|:--:|------|:---------:|
| P-01 | 플랜 DB 스키마 | 2 |
| P-02 | 플랜 상수/타입 정의 | 3 |
| P-03 | 기능 게이팅 서비스 (planService) | 4 |
| P-04 | 기능 게이팅 컴포넌트 (FeatureGate) | 5 |
| P-05 | 대시보드 플랜 표시 | 6 |
| P-06 | 플랜 변경 UI | 7 |
| P-07 | 체험 기간 로직 | 8 |

### 1.2 아키텍처 레이어

기존 4-Layer 아키텍처를 유지합니다.

```
┌─────────────────────────────────────────────┐
│  Presentation (React Components)            │
│  FeatureGate / UpgradeModal / PlanBadge     │
├─────────────────────────────────────────────┤
│  Service Layer                              │
│  planService.ts                             │
├─────────────────────────────────────────────┤
│  Client Layer                               │
│  supabaseClient.ts (기존)                   │
├─────────────────────────────────────────────┤
│  Supabase Cloud                             │
│  hospitals.plan / hospitals.plan_expires_at  │
│  hospitals.trial_started_at                 │
└─────────────────────────────────────────────┘
```

### 1.3 데이터 흐름

```
[App.tsx 초기화]
  ↓ loadHospitalData()
  ↓ planService.getHospitalPlan(hospitalId)
  ↓ planState = { plan, expiresAt, trialStartedAt, isTrialActive }
  ↓ setState({ planState })
  ↓
[컴포넌트]
  ├─ <FeatureGate feature="analytics" plan={planState.plan}>
  │    ├─ 허용 → children 렌더링
  │    └─ 차단 → <UpgradeModal requiredPlan="basic" />
  ├─ <PlanBadge plan={planState.plan} />
  └─ <DashboardOverview planState={planState} />
```

---

## 2. DB 스키마 (P-01)

### 2.1 hospitals 테이블 필드 추가

**파일**: `supabase/005_plan_schema.sql`

```sql
-- ============================================
-- 005: 플랜 필드 추가 (hospitals 테이블)
-- ============================================

-- 플랜 타입 (free/basic/plus/business)
ALTER TABLE hospitals
  ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'basic', 'plus', 'business'));

-- 플랜 만료일 (null = 무기한, free는 항상 null)
ALTER TABLE hospitals
  ADD COLUMN plan_expires_at TIMESTAMPTZ DEFAULT NULL;

-- 결제 주기 (monthly/yearly)
ALTER TABLE hospitals
  ADD COLUMN billing_cycle TEXT DEFAULT NULL
    CHECK (billing_cycle IS NULL OR billing_cycle IN ('monthly', 'yearly'));

-- 체험 시작일 (null = 체험 안 함)
ALTER TABLE hospitals
  ADD COLUMN trial_started_at TIMESTAMPTZ DEFAULT NULL;

-- 체험 종료 여부 (true = 체험 완료, 재체험 불가)
ALTER TABLE hospitals
  ADD COLUMN trial_used BOOLEAN NOT NULL DEFAULT false;

-- 인덱스: 플랜별 병원 조회 (관리용)
CREATE INDEX idx_hospitals_plan ON hospitals(plan);
```

### 2.2 변경된 hospitals 테이블 구조

```
hospitals
├── id                  UUID PK
├── name                TEXT NOT NULL
├── master_admin_id     UUID FK → auth.users
├── phone               TEXT
├── biz_file_url        TEXT
├── plan                TEXT DEFAULT 'free'       ← NEW
├── plan_expires_at     TIMESTAMPTZ               ← NEW
├── billing_cycle       TEXT                      ← NEW
├── trial_started_at    TIMESTAMPTZ               ← NEW
├── trial_used          BOOLEAN DEFAULT false     ← NEW
├── created_at          TIMESTAMPTZ
└── updated_at          TIMESTAMPTZ
```

### 2.3 RLS 정책

기존 hospitals RLS로 충분합니다:
- `anyone_search_hospitals`: SELECT 허용 (플랜 정보 포함 조회)
- `master_update_own_hospital`: Master만 자기 병원 플랜 UPDATE 가능

추가 정책 불필요: 플랜 변경은 master만 수행하며, 이미 `master_update_own_hospital` 정책이 존재.

---

## 3. 타입 및 상수 정의 (P-02)

### 3.1 types.ts 추가 타입

```typescript
// ============================================
// Plan Types
// ============================================

/** 플랜 타입 */
export type PlanType = 'free' | 'basic' | 'plus' | 'business';

/** 결제 주기 */
export type BillingCycle = 'monthly' | 'yearly';

/** 플랜별 제한 */
export interface PlanLimits {
  maxItems: number;        // 재고 품목 수 제한
  maxUsers: number;        // 사용자 수 제한
  retentionMonths: number; // 수술기록 보관 개월 수
  features: PlanFeature[]; // 사용 가능 기능 목록
}

/** 기능 식별자 */
export type PlanFeature =
  | 'dashboard_basic'      // 기본 대시보드
  | 'dashboard_advanced'   // 고급 대시보드
  | 'excel_upload'         // 엑셀 업로드/다운로드
  | 'realtime_stock'       // 실시간 재고 현황
  | 'brand_analytics'      // 브랜드별 소모량 분석
  | 'auto_stock_alert'     // 자동 재고 알림
  | 'monthly_report'       // 월간 리포트
  | 'yearly_report'        // 연간 리포트
  | 'supplier_management'  // 거래처 관리
  | 'one_click_order'      // 원클릭 발주
  | 'ai_forecast'          // AI 수요 예측
  | 'role_management'      // 역할별 권한 관리
  | 'audit_log'            // 감사 로그
  | 'email_support'        // 이메일 지원
  | 'priority_support';    // 우선 지원

/** 플랜 가격 정보 */
export interface PlanPricing {
  monthlyPrice: number;    // 월간 가격 (원)
  yearlyPrice: number;     // 연간 결제 시 월 가격 (원)
}

/** 병원 플랜 상태 (프론트엔드 사용) */
export interface HospitalPlanState {
  plan: PlanType;
  expiresAt: string | null;     // ISO 문자열
  billingCycle: BillingCycle | null;
  trialStartedAt: string | null;
  trialUsed: boolean;
  isTrialActive: boolean;       // 계산 필드: 체험 기간 중인지
  trialDaysRemaining: number;   // 계산 필드: 체험 남은 일수
  daysUntilExpiry: number;      // 계산 필드: 만료까지 남은 일수
}
```

### 3.2 플랜 상수 (PLAN_LIMITS)

**위치**: `types.ts` 하단 또는 별도 constants 영역

```typescript
/** 플랜별 제한 상수 */
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxItems: 50,
    maxUsers: 1,
    retentionMonths: 3,
    features: [
      'dashboard_basic',
      'excel_upload',
      'realtime_stock',
    ],
  },
  basic: {
    maxItems: 200,
    maxUsers: 1,
    retentionMonths: 6,
    features: [
      'dashboard_basic',
      'excel_upload',
      'realtime_stock',
      'brand_analytics',
    ],
  },
  plus: {
    maxItems: 500,
    maxUsers: 5,
    retentionMonths: 12,
    features: [
      'dashboard_basic',
      'dashboard_advanced',
      'excel_upload',
      'realtime_stock',
      'brand_analytics',
      'auto_stock_alert',
      'monthly_report',
      'role_management',
      'email_support',
    ],
  },
  business: {
    maxItems: Infinity,
    maxUsers: Infinity,
    retentionMonths: 24,
    features: [
      'dashboard_basic',
      'dashboard_advanced',
      'excel_upload',
      'realtime_stock',
      'brand_analytics',
      'auto_stock_alert',
      'monthly_report',
      'yearly_report',
      'supplier_management',
      'one_click_order',
      'ai_forecast',
      'role_management',
      'audit_log',
      'email_support',
      'priority_support',
    ],
  },
};

/** 플랜별 가격 */
export const PLAN_PRICING: Record<PlanType, PlanPricing> = {
  free: { monthlyPrice: 0, yearlyPrice: 0 },
  basic: { monthlyPrice: 19000, yearlyPrice: 15000 },
  plus: { monthlyPrice: 49000, yearlyPrice: 39000 },
  business: { monthlyPrice: 99000, yearlyPrice: 79000 },
};

/** 플랜 표시 이름 */
export const PLAN_NAMES: Record<PlanType, string> = {
  free: 'Free',
  basic: 'Basic',
  plus: 'Plus',
  business: 'Business',
};

/** 플랜 순서 (업그레이드 비교용) */
export const PLAN_ORDER: Record<PlanType, number> = {
  free: 0,
  basic: 1,
  plus: 2,
  business: 3,
};

/** 체험 기간 (일) */
export const TRIAL_DAYS = 14;
```

### 3.3 DbHospital 타입 확장

```typescript
/** 기존 DbHospital에 추가 필드 */
export interface DbHospital {
  id: string;
  name: string;
  master_admin_id: string | null;
  phone: string | null;
  biz_file_url: string | null;
  plan: PlanType;                      // ← NEW
  plan_expires_at: string | null;      // ← NEW
  billing_cycle: BillingCycle | null;  // ← NEW
  trial_started_at: string | null;     // ← NEW
  trial_used: boolean;                 // ← NEW
  created_at: string;
  updated_at: string;
}
```

### 3.4 AppState 확장

```typescript
export interface AppState {
  // ... 기존 필드 유지 ...
  planState: HospitalPlanState | null;  // ← NEW
}
```

---

## 4. planService 설계 (P-03)

### 4.1 파일 위치

**파일**: `services/planService.ts`

### 4.2 API 목록

```typescript
import { supabase } from './supabaseClient';
import {
  PlanType,
  BillingCycle,
  PlanFeature,
  HospitalPlanState,
  PLAN_LIMITS,
  PLAN_ORDER,
  TRIAL_DAYS,
} from '../types';

export const planService = {
  /**
   * 병원의 플랜 상태 조회
   * loadHospitalData() 시 호출
   */
  async getHospitalPlan(hospitalId: string): Promise<HospitalPlanState>,

  /**
   * 기능 접근 가능 여부 확인
   * FeatureGate 컴포넌트에서 호출
   */
  canAccess(plan: PlanType, feature: PlanFeature): boolean,

  /**
   * 재고 품목 수 제한 확인
   * 품목 추가 시 호출
   */
  canAddItem(plan: PlanType, currentItemCount: number): boolean,

  /**
   * 사용자 수 제한 확인
   * 멤버 초대 시 호출
   */
  canAddUser(plan: PlanType, currentUserCount: number): boolean,

  /**
   * 특정 기능에 필요한 최소 플랜 반환
   * UpgradeModal에서 "XX 플랜 이상" 표시용
   */
  getRequiredPlan(feature: PlanFeature): PlanType,

  /**
   * 품목 수 제한에 필요한 최소 플랜 반환
   * "XX개 이상은 Basic 플랜이 필요합니다" 표시용
   */
  getRequiredPlanForItems(itemCount: number): PlanType,

  /**
   * 플랜 업그레이드 가능 여부
   */
  isUpgrade(from: PlanType, to: PlanType): boolean,

  /**
   * 무료 체험 시작
   * Master만 호출 가능, 1회만 가능
   */
  async startTrial(hospitalId: string): Promise<boolean>,

  /**
   * 체험 기간 만료 확인 및 자동 다운그레이드
   * App 초기화 시 호출
   */
  async checkAndExpireTrial(hospitalId: string): Promise<HospitalPlanState>,

  /**
   * 플랜 변경 (Phase 1에서는 수동 변경만, 결제 연동 없음)
   * Master만 호출 가능
   */
  async changePlan(
    hospitalId: string,
    newPlan: PlanType,
    billingCycle: BillingCycle
  ): Promise<boolean>,
};
```

### 4.3 핵심 메서드 상세 설계

#### getHospitalPlan

```typescript
async getHospitalPlan(hospitalId: string): Promise<HospitalPlanState> {
  const { data, error } = await supabase
    .from('hospitals')
    .select('plan, plan_expires_at, billing_cycle, trial_started_at, trial_used')
    .eq('id', hospitalId)
    .single();

  if (error || !data) {
    // 기본값: free 플랜
    return {
      plan: 'free',
      expiresAt: null,
      billingCycle: null,
      trialStartedAt: null,
      trialUsed: false,
      isTrialActive: false,
      trialDaysRemaining: 0,
      daysUntilExpiry: Infinity,
    };
  }

  const now = new Date();
  const trialStarted = data.trial_started_at ? new Date(data.trial_started_at) : null;
  const trialEnd = trialStarted
    ? new Date(trialStarted.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)
    : null;
  const isTrialActive = trialStarted !== null
    && !data.trial_used
    && trialEnd !== null
    && now < trialEnd;
  const trialDaysRemaining = isTrialActive && trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  const expiresAt = data.plan_expires_at ? new Date(data.plan_expires_at) : null;
  const daysUntilExpiry = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    : Infinity;

  return {
    plan: data.plan as PlanType,
    expiresAt: data.plan_expires_at,
    billingCycle: data.billing_cycle as BillingCycle | null,
    trialStartedAt: data.trial_started_at,
    trialUsed: data.trial_used,
    isTrialActive,
    trialDaysRemaining,
    daysUntilExpiry: daysUntilExpiry === Infinity ? 9999 : daysUntilExpiry,
  };
}
```

#### canAccess / canAddItem / canAddUser

```typescript
canAccess(plan: PlanType, feature: PlanFeature): boolean {
  return PLAN_LIMITS[plan].features.includes(feature);
},

canAddItem(plan: PlanType, currentItemCount: number): boolean {
  return currentItemCount < PLAN_LIMITS[plan].maxItems;
},

canAddUser(plan: PlanType, currentUserCount: number): boolean {
  return currentUserCount < PLAN_LIMITS[plan].maxUsers;
},
```

#### getRequiredPlan

```typescript
getRequiredPlan(feature: PlanFeature): PlanType {
  const plans: PlanType[] = ['free', 'basic', 'plus', 'business'];
  for (const plan of plans) {
    if (PLAN_LIMITS[plan].features.includes(feature)) {
      return plan;
    }
  }
  return 'business';
},
```

#### startTrial

```typescript
async startTrial(hospitalId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('hospitals')
    .update({
      plan: 'plus',
      trial_started_at: new Date().toISOString(),
      trial_used: false,
    })
    .eq('id', hospitalId)
    .select()
    .single();

  if (error) {
    console.error('[planService] Start trial failed:', error);
    return false;
  }
  return true;
},
```

#### checkAndExpireTrial

```typescript
async checkAndExpireTrial(hospitalId: string): Promise<HospitalPlanState> {
  const planState = await this.getHospitalPlan(hospitalId);

  // 체험 중이 아니거나 이미 만료 처리됨
  if (!planState.trialStartedAt || planState.trialUsed) return planState;

  const trialEnd = new Date(
    new Date(planState.trialStartedAt).getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  );

  if (new Date() >= trialEnd) {
    // 체험 만료 → free로 다운그레이드
    await supabase
      .from('hospitals')
      .update({
        plan: 'free',
        plan_expires_at: null,
        billing_cycle: null,
        trial_used: true,
      })
      .eq('id', hospitalId);

    return {
      ...planState,
      plan: 'free',
      expiresAt: null,
      billingCycle: null,
      trialUsed: true,
      isTrialActive: false,
      trialDaysRemaining: 0,
    };
  }

  return planState;
},
```

#### changePlan

```typescript
async changePlan(
  hospitalId: string,
  newPlan: PlanType,
  billingCycle: BillingCycle
): Promise<boolean> {
  const expiresAt = newPlan === 'free'
    ? null
    : billingCycle === 'yearly'
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('hospitals')
    .update({
      plan: newPlan,
      plan_expires_at: expiresAt,
      billing_cycle: newPlan === 'free' ? null : billingCycle,
      // 체험 중이었다면 체험 사용 완료 처리
      trial_used: true,
    })
    .eq('id', hospitalId);

  if (error) {
    console.error('[planService] Change plan failed:', error);
    return false;
  }
  return true;
},
```

---

## 5. FeatureGate 컴포넌트 (P-04)

### 5.1 FeatureGate.tsx

**파일**: `components/FeatureGate.tsx`

```typescript
interface FeatureGateProps {
  feature: PlanFeature;
  plan: PlanType;
  children: React.ReactNode;
  fallback?: React.ReactNode;   // 커스텀 차단 UI (기본: 업그레이드 유도)
}
```

**동작 로직**:
```
planService.canAccess(plan, feature) ?
  → children 렌더링
  : fallback || <LockedOverlay requiredPlan={getRequiredPlan(feature)} />
```

**LockedOverlay**: 기능 차단 시 표시되는 오버레이

```
┌─────────────────────────────────────┐
│  🔒 이 기능은 Basic 이상에서        │
│     사용할 수 있습니다              │
│                                     │
│  [ 플랜 업그레이드 ]               │
│  ────────────────                   │
│  (배경: 실제 UI 블러 처리)          │
└─────────────────────────────────────┘
```

### 5.2 UpgradeModal.tsx

**파일**: `components/UpgradeModal.tsx`

```typescript
interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: PlanType;
  requiredPlan: PlanType;
  triggerMessage: string;         // "재고 품목 50개를 초과했습니다"
  onSelectPlan: (plan: PlanType) => void;
}
```

**UI 구조**:
```
┌─────────────────────────────────────────────────┐
│  ⬆️ 업그레이드가 필요합니다                      │
│                                                  │
│  "재고 품목 50개를 초과했습니다"                  │
│                                                  │
│  ┌────────┐  ┌────────┐  ┌────────┐             │
│  │ Basic  │  │ Plus   │  │ Business│             │
│  │ 19,000 │  │ 49,000 │  │ 99,000 │             │
│  │ [선택] │  │ [추천] │  │ [선택] │             │
│  └────────┘  └────────┘  └────────┘             │
│                                                  │
│  현재 플랜: Free                                 │
│  [닫기]                                          │
└─────────────────────────────────────────────────┘
```

- `requiredPlan`보다 낮은 플랜은 비활성화 (회색)
- `requiredPlan`과 같거나 높은 플랜만 선택 가능
- "추천" 배지는 Plus에 표시 (기존 PricingPage.tsx 일관성)

### 5.3 PlanBadge.tsx

**파일**: `components/PlanBadge.tsx`

```typescript
interface PlanBadgeProps {
  plan: PlanType;
  size?: 'sm' | 'md';
}
```

**표시 규칙**:
| 플랜 | 색상 | 텍스트 |
|------|------|--------|
| free | `bg-slate-100 text-slate-600` | Free |
| basic | `bg-teal-50 text-teal-600` | Basic |
| plus | `bg-indigo-50 text-indigo-600` | Plus |
| business | `bg-violet-50 text-violet-600` | Business |

- 기존 App.tsx:733-737의 하드코딩된 'Plus'/'Ultimate' 배지를 대체
- `size='sm'`: Header용 (11px), `size='md'`: UserProfile용 (13px)

---

## 6. 대시보드 플랜 표시 (P-05)

### 6.1 DashboardOverview 변경

**파일**: `components/DashboardOverview.tsx`

**Props 추가**:
```typescript
interface DashboardOverviewProps {
  // ... 기존 props ...
  planState: HospitalPlanState | null;  // ← NEW
}
```

**변경 사항**:
1. KPI 카드 아래에 **플랜 상태 카드** 추가
2. 품목 수 KPI에 `planState.plan`에 따른 제한량 표시

**플랜 상태 카드 UI**:
```
┌──────────────────────────────────┐
│  📋 현재 플랜                    │
│                                  │
│  Plus                 D-284일   │
│  ───────────────────────         │
│  품목: 45/500 (9%)              │
│  사용자: 2/5 (40%)              │
│  기록 보관: 12개월               │
│                                  │
│  [플랜 변경]                    │
└──────────────────────────────────┘
```

**체험 중일 때**:
```
┌──────────────────────────────────┐
│  🎉 Plus 체험 중                 │
│                                  │
│  14일 무료 체험 (11일 남음)      │
│  ██████████░░░░ 78%             │
│                                  │
│  체험 종료 후 Free로 전환됩니다  │
│  [지금 구독하기]                │
└──────────────────────────────────┘
```

### 6.2 App.tsx Header 영역 변경

**현재 코드 (App.tsx:710~738)** — 하드코딩 제거:

```typescript
// Before (하드코딩)
const subEnd = new Date('2027-01-15');
const remaining = ...;
// 'Plus' 하드코딩

// After (planState 활용)
const remaining = state.planState?.daysUntilExpiry ?? 0;
const planName = PLAN_NAMES[state.planState?.plan ?? 'free'];
```

변경 포인트:
- `new Date('2027-01-15')` → `state.planState.daysUntilExpiry`
- `'Plus'` 하드코딩 → `<PlanBadge plan={state.planState.plan} size="sm" />`
- isAdmin 'Ultimate' → isAdmin일 경우 별도 표시 유지

### 6.3 UserProfile 변경

**파일**: `components/UserProfile.tsx`

**현재 코드 (line 21-27)** — 하드코딩 제거:

```typescript
// Before (하드코딩)
const subscription = {
  plan: isAdmin ? 'Ultimate' : 'Plus',
  startDate: '2026-01-15',
  endDate: '2027-01-15',
  billing: '연간',
  price: '39,000',
};

// After (props로 수신)
```

**Props 추가**:
```typescript
interface UserProfileProps {
  user: User;
  planState: HospitalPlanState | null;  // ← NEW
  onClose: () => void;
  onLeaveHospital: () => void;
  onDeleteAccount?: () => void;
  onChangePlan?: () => void;            // ← NEW (플랜 변경 페이지로 이동)
}
```

**플랜 탭 표시 내용**:
- 현재 플랜: `PlanBadge` + 플랜명
- 만료일: `planState.expiresAt` (없으면 "무기한")
- 결제 주기: `planState.billingCycle` ("월간"/"연간")
- 사용량: 품목 수 / 제한, 사용자 수 / 제한
- 체험 상태: 체험 중이면 남은 일수 표시
- [플랜 변경] 버튼 → `onChangePlan()` 호출

---

## 7. 플랜 변경 UI (P-06)

### 7.1 PricingPage.tsx 변경

기존 `PricingPage.tsx`는 **퍼블릭 페이지** (비로그인 사용자용)로 유지합니다.

로그인 사용자가 대시보드에서 "플랜 변경"을 누르면:
- **비로그인**: `currentView: 'pricing'` → 기존 PricingPage (가입 유도)
- **로그인**: `currentView: 'pricing'` → PricingPage에 `currentPlan` props 전달

**Props 확장**:
```typescript
interface PricingPageProps {
  onGetStarted: () => void;
  currentPlan?: PlanType;              // ← NEW (로그인 시 전달)
  onSelectPlan?: (plan: PlanType, billing: BillingCycle) => void; // ← NEW
}
```

**로그인 상태에서의 동작**:
- 현재 플랜에 "현재 사용 중" 배지 표시
- CTA 버튼 텍스트 변경:
  - 현재 플랜: "현재 플랜" (비활성)
  - 상위 플랜: "업그레이드"
  - 하위 플랜: "다운그레이드"
- 버튼 클릭 시 `onSelectPlan(plan, billingCycle)` 호출

### 7.2 플랜 변경 확인 모달

플랜 변경 시 App.tsx에서 확인 모달 표시:

```
┌──────────────────────────────────┐
│  플랜 변경 확인                  │
│                                  │
│  Free → Plus (월 49,000원)      │
│  결제 주기: 연간 (39,000원/월)   │
│                                  │
│  ⚠️ Phase 2에서 실제 결제가      │
│     연동됩니다. 현재는 플랜만    │
│     변경됩니다.                   │
│                                  │
│  [취소]  [변경하기]             │
└──────────────────────────────────┘
```

Phase 1에서는 결제 없이 플랜만 DB에서 변경합니다.

---

## 8. 체험 기간 로직 (P-07)

### 8.1 체험 시작 조건

| 조건 | 체크 |
|------|------|
| 현재 플랜이 free | `plan === 'free'` |
| 체험 미사용 | `trial_used === false` |
| Master 역할 | `user.role === 'master'` |

### 8.2 체험 기간 플로우

```
[회원가입 완료]
  ↓
[대시보드 진입]
  ↓ trial_started_at === null && trial_used === false
  ↓
[체험 시작 배너 표시]
  "14일간 Plus 기능을 무료로 체험해보세요!"
  [무료 체험 시작]
  ↓
[planService.startTrial(hospitalId)]
  ↓ plan = 'plus', trial_started_at = now()
  ↓
[14일간 Plus 기능 사용]
  ↓ 매 로그인 시 checkAndExpireTrial() 호출
  ↓
[14일 경과]
  ↓ checkAndExpireTrial()
  ↓ plan = 'free', trial_used = true
  ↓
[Free 전환 알림]
  "체험 기간이 종료되었습니다. 구독하여 계속 사용하세요."
  [플랜 선택하기]
```

### 8.3 체험 배너 컴포넌트

`DashboardOverview`에 표시되는 인라인 배너 (별도 컴포넌트 X, DashboardOverview 내부):

**체험 전** (trial_started_at === null && trial_used === false):
```
┌─────────────────────────────────────────────────┐
│  🎁 14일 무료 체험                               │
│  Plus 기능을 무료로 체험해보세요!                │
│  고급 분석, 자동 알림, 팀 기능 등               │
│  [무료 체험 시작] (Master만 표시)               │
└─────────────────────────────────────────────────┘
```

**체험 중** (isTrialActive === true):
```
┌─────────────────────────────────────────────────┐
│  🎉 Plus 체험 중 (11일 남음)                    │
│  ██████████░░░░ 78%                             │
│  체험 종료 후 Free로 전환됩니다                  │
│  [지금 구독하기]                                │
└─────────────────────────────────────────────────┘
```

**체험 종료** (trial_used === true && plan === 'free'):
```
┌─────────────────────────────────────────────────┐
│  ⏰ 체험이 종료되었습니다                        │
│  Plus 기능을 계속 사용하려면 구독하세요          │
│  [플랜 선택하기]                                │
└─────────────────────────────────────────────────┘
```

---

## 9. 기능 게이팅 적용 포인트

### 9.1 게이팅 트리거 매핑

Plan 문서 Section 5.2 기준:

| 트리거 | 위치 | 게이팅 방식 | 필요 플랜 |
|--------|------|------------|:---------:|
| 재고 50개 초과 | `InventoryManager` → 품목 추가 시 | `canAddItem()` 체크 → UpgradeModal | basic |
| 소모량 분석 접근 | `DashboardOverview` → BrandChart | `<FeatureGate feature="brand_analytics">` | basic |
| 자동 재고 알림 | Sidebar → 알림 설정 메뉴 | `<FeatureGate feature="auto_stock_alert">` | plus |
| 스태프 초대 2명+ | `MemberManager` → 초대 버튼 | `canAddUser()` 체크 → UpgradeModal | plus |
| AI 수요 예측 | 미래 기능 (현재 미구현) | `<FeatureGate feature="ai_forecast">` | business |
| 6개월 초과 데이터 | 수술기록 업로드 시 | 업로드는 허용, 조회 시 기간 제한 안내 | plus |

### 9.2 컴포넌트별 게이팅 적용

#### App.tsx

```typescript
// loadHospitalData에 planService 호출 추가
const loadHospitalData = async (user: User) => {
  // ... 기존 데이터 로드 ...

  // 플랜 상태 로드 (체험 만료 자동 체크 포함)
  const planState = await planService.checkAndExpireTrial(user.hospitalId);

  setState(prev => ({
    ...prev,
    user,
    planState,          // ← NEW
    currentView: 'dashboard',
    // ... 기존 데이터 ...
  }));
};
```

#### InventoryManager (품목 추가 게이팅)

```typescript
// 품목 추가 버튼 클릭 핸들러
const handleAddItem = () => {
  if (!planService.canAddItem(planState.plan, inventory.length)) {
    setShowUpgradeModal(true);
    setUpgradeTrigger(`재고 품목 ${PLAN_LIMITS[planState.plan].maxItems}개를 초과했습니다`);
    return;
  }
  // 기존 추가 로직...
};
```

#### DashboardOverview (분석 차트 게이팅)

```typescript
// BrandChart 래핑
<FeatureGate
  feature="brand_analytics"
  plan={planState?.plan ?? 'free'}
>
  <BrandChart data={...} />
</FeatureGate>
```

#### MemberManager (사용자 수 게이팅)

```typescript
// 멤버 초대 버튼
const handleInvite = () => {
  if (!planService.canAddUser(planState.plan, currentMemberCount)) {
    setShowUpgradeModal(true);
    setUpgradeTrigger(`현재 플랜에서는 최대 ${PLAN_LIMITS[planState.plan].maxUsers}명까지 사용 가능합니다`);
    return;
  }
  // 기존 초대 로직...
};
```

---

## 10. 파일 변경 목록

### 10.1 신규 파일 (5개)

| # | 파일 | 역할 | 예상 규모 |
|:-:|------|------|:---------:|
| 1 | `supabase/005_plan_schema.sql` | hospitals 플랜 필드 추가 | ~20줄 |
| 2 | `services/planService.ts` | 플랜 관리 서비스 | ~150줄 |
| 3 | `components/FeatureGate.tsx` | 기능 잠금 래퍼 + LockedOverlay | ~80줄 |
| 4 | `components/UpgradeModal.tsx` | 업그레이드 유도 모달 | ~150줄 |
| 5 | `components/PlanBadge.tsx` | 플랜 표시 배지 | ~40줄 |

### 10.2 수정 파일 (7개)

| # | 파일 | 변경 내용 | 영향도 |
|:-:|------|-----------|:------:|
| 1 | `types.ts` | PlanType, PlanLimits, PLAN_LIMITS, HospitalPlanState, DbHospital 확장, AppState 확장 | **High** |
| 2 | `App.tsx` | planState 상태 추가, loadHospitalData에 planService 호출, Header 플랜 배지 동적화, PricingPage props 전달, 플랜 변경 핸들러 | **High** |
| 3 | `components/DashboardOverview.tsx` | planState props 수신, 플랜 상태 카드 추가, BrandChart FeatureGate 래핑, 체험 배너 | **Medium** |
| 4 | `components/PricingPage.tsx` | currentPlan/onSelectPlan props 추가, 로그인 시 현재 플랜 표시/CTA 변경 | **Medium** |
| 5 | `components/UserProfile.tsx` | planState props 수신, 하드코딩 subscription 제거, 동적 플랜 정보 표시 | **Medium** |
| 6 | `components/Header.tsx` | PlanBadge 사용 (선택적: Header가 App.tsx 인라인이므로 App.tsx에서 처리) | **Low** |
| 7 | `services/mappers.ts` | dbToHospital에 plan 필드 매핑 추가 (Hospital 타입 확장 시) | **Low** |

### 10.3 미변경 파일

`services/supabaseClient.ts`, `services/authService.ts`, `services/inventoryService.ts`, `services/hospitalService.ts` 등은 변경 없음.

---

## 11. 구현 순서

```
Phase 1: DB + 타입 기반 (P-01, P-02)
  ① supabase/005_plan_schema.sql 작성
  ② types.ts에 PlanType, PlanLimits, PLAN_LIMITS 등 추가
  ③ DbHospital 타입 확장
  ④ AppState에 planState 추가

Phase 2: 서비스 레이어 (P-03)
  ⑤ services/planService.ts 작성
  ⑥ App.tsx loadHospitalData에 planService 연동

Phase 3: 기본 UI 컴포넌트 (P-04, P-05)
  ⑦ components/PlanBadge.tsx 작성
  ⑧ components/FeatureGate.tsx 작성
  ⑨ components/UpgradeModal.tsx 작성

Phase 4: 기존 컴포넌트 연동 (P-05, P-06)
  ⑩ App.tsx Header 영역 하드코딩 제거 → PlanBadge 사용
  ⑪ DashboardOverview 플랜 카드 + 체험 배너 추가
  ⑫ UserProfile 하드코딩 제거 → planState 연동
  ⑬ PricingPage currentPlan 연동

Phase 5: 게이팅 적용 (P-04 연동)
  ⑭ DashboardOverview BrandChart FeatureGate 래핑
  ⑮ InventoryManager 품목 추가 게이팅
  ⑯ MemberManager 사용자 수 게이팅

Phase 6: 체험 기간 (P-07)
  ⑰ planService.startTrial / checkAndExpireTrial 연동
  ⑱ DashboardOverview 체험 배너 UI
  ⑲ 체험 만료 → Free 전환 알림

Phase 7: 통합 테스트
  ⑳ 전체 플로우 검증
```

---

## 12. 의존성

### 12.1 외부 패키지

추가 패키지 없음. 기존 스택으로 구현 가능:
- React 19.2.3
- @supabase/supabase-js v2
- Tailwind CSS

### 12.2 환경변수

추가 환경변수 없음. 기존 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 사용.

### 12.3 Supabase 설정

- SQL Editor에서 `005_plan_schema.sql` 실행 필요
- RLS 추가 정책 불필요 (기존 정책 활용)

---

## 13. 주의사항

### 13.1 하위 호환성

- `hospitals.plan` DEFAULT 'free': 기존 병원은 자동으로 free 플랜
- 기존 사용자 데이터 유실 없음
- Phase 1에서는 결제 연동 없이 DB 플랜 변경만 수행

### 13.2 보안

- 플랜 변경은 Master 권한만 가능 (RLS `master_update_own_hospital`)
- 클라이언트 측 게이팅은 UX용, 실제 데이터 제한은 서버 RLS로 보호됨
- 품목 수 초과 INSERT는 클라이언트에서 차단 (RLS로는 못 막음, Phase 2에서 Edge Function으로 강화 가능)

### 13.3 Phase 2 연동 포인트

Phase 2 (결제 연동) 시 변경될 부분:
- `planService.changePlan()`: 결제 확인 후 호출하도록 변경
- `PricingPage`: CTA 버튼 → 결제 페이지로 이동
- `UpgradeModal`: 결제 플로우 연결
- 추가 파일: `services/paymentService.ts`, Supabase Edge Function

---

## 변경 이력

| 날짜 | 내용 | 작성자 |
|------|------|--------|
| 2026-02-15 | 초안 작성 | Claude |
