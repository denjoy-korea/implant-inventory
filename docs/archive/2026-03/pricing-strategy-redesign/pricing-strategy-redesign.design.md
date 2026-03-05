# pricing-strategy-redesign Design Document

> **Summary**: 요금제 차별화 전략 재설계의 구체적 구현 설계.
> Plan 문서의 Must/Should 요구사항을 파일별·변경 단위별로 상세화한다.
>
> **Author**: Claude Code
> **Created**: 2026-03-05
> **Last Modified**: 2026-03-05
> **Status**: Draft

---

## 0. 현재 구현 상태 사전 진단

Plan 작성 이후 이미 구현된 항목을 확인한 결과:

| 항목 | Plan 요구 | 현재 상태 | 처리 |
|------|-----------|-----------|------|
| `brand_analytics` Free 제거 | R-01 | ✅ 이미 적용 (`types/plan.ts` L101) | Skip |
| Free `maxItems` → 50 | R-02 | ✅ 이미 적용 (`types/plan.ts` L98) | Skip |
| `fail_management` PlanFeature 추가 | R-03 | ✅ 이미 존재 | Skip |
| `order_execution` PlanFeature 추가 | R-03 | ✅ 이미 존재 | Skip |
| `audit_history` PlanFeature 추가 | R-03 | ⚠️ `audit_log`만 존재 (Business+) | 신규 추가 |
| FailManager FeatureGate 적용 | R-04 | ❓ 확인 필요 | 구현 |
| OrderManager 발주 버튼 게이팅 | R-05 | ❓ 확인 필요 | 구현 |
| Basic `maxUsers` = 1 | Plan §2.2 | ❌ 현재 3 | 수정 |
| PricingPage Plus 강조 | R-06 | ❓ 확인 필요 | 구현 |

---

## 1. 변경 파일 목록

```
types/plan.ts                              ← PLAN_LIMITS.basic.maxUsers 수정, audit_history 추가
components/FailManager.tsx                 ← FeatureGate 래핑
components/app/AppUserOverlayStack.tsx     ← FAIL 탭 접근 게이팅 확인
components/OrderManager.tsx                ← 발주 생성 버튼 게이팅
components/PricingPage.tsx                 ← Plus 카드 앵커링 강화 (R-06, Should)
```

---

## 2. 상세 변경 설계

### 2-A. `types/plan.ts` — 상수 수정

#### 2-A-1. `PlanFeature` 타입에 `audit_history` 추가

```typescript
// 현재 (L27 부근)
| 'audit_log'

// 변경 후: audit_log 위에 추가
| 'audit_history'   // 재고실사 이력 + 분석 (Plus+)
| 'audit_log'       // 전체 작업 감사 로그 (Business+)
```

#### 2-A-2. `PLAN_LIMITS` 수정

```typescript
// basic: maxUsers 3 → 1
basic: {
  maxItems: 200,
  maxUsers: 1,       // 3 → 1 ("혼자 쓰는 병원" 타겟 명확화)
  maxBaseStockEdits: Infinity,  // 5 → Infinity (Basic 킬러: 기초재고 무제한 편집)
  retentionMonths: 12,           // 6 → 12
  features: [
    'dashboard_basic', 'excel_upload', 'realtime_stock',
    'brand_analytics', 'fail_management', 'order_execution',
    'inventory_audit',  // 실사 기능 허용 (이력 없이)
  ],
},

// plus: audit_history 추가
plus: {
  maxItems: 500,
  maxUsers: 5,
  maxBaseStockEdits: Infinity,
  retentionMonths: 24,           // 12 → 24
  features: [
    'dashboard_basic', 'dashboard_advanced', 'excel_upload', 'realtime_stock',
    'brand_analytics', 'fail_management', 'order_execution',
    'inventory_audit', 'return_management', 'audit_history',  // + audit_history
    'auto_stock_alert', 'monthly_report', 'role_management',
    'email_support', 'integrations',
  ],
},

// business: audit_history + audit_log 모두 포함
business: {
  // ... 기존 유지, features에 'audit_history' 추가
  features: [
    // ... 기존 features ...
    'audit_history', 'audit_log',
    // ...
  ],
},
```

**변경 이유**:
- `basic.maxUsers 1`: "혼자 쓰는 원장님/실장님" 타겟. 팀 공유(=Plus)와 명확한 차별화.
- `basic.maxBaseStockEdits Infinity`: Free(3회 제한) → Basic(무제한) 전환 동기 생성.
- `basic.retentionMonths 12`: 수술기록 보관 12개월 (Free 3개월 대비 4배).
- `audit_history` (Plus): 재고실사 이력 분석. `audit_log`(Business, 작업 감사로그)와 분리.

---

### 2-B. `components/FailManager.tsx` — FeatureGate 래핑

FailManager가 렌더링되는 구조를 확인 후 아래 두 곳에 게이팅 적용:

#### 2-B-1. 컴포넌트 상단 접근 차단 (전체 탭 레벨)

FailManager 컴포넌트 JSX 최상단 return에 FeatureGate 래핑:

```tsx
// FailManager.tsx props에 plan, onOpenPaymentModal 추가 (이미 있으면 활용)
import FeatureGate from './FeatureGate';

// return 최상단:
return (
  <FeatureGate
    feature="fail_management"
    plan={plan}
    onOpenPaymentModal={onOpenPaymentModal}
  >
    {/* 기존 JSX 전체 */}
  </FeatureGate>
);
```

#### 2-B-2. props 인터페이스 확인

FailManager가 `plan: PlanType`과 `onOpenPaymentModal?: (plan: PlanType) => void`를 props로 받는지 확인. 없으면 추가.

---

### 2-C. `components/app/AppUserOverlayStack.tsx` — FAIL 탭 확인

DashboardOperationalTabs에서 FAIL 탭이 plan에 따라 이미 숨겨지는지 확인.
FeatureGate가 이미 탭 레벨에 있으면 2-B 작업 간소화.

구조 파악 후:
- **탭 메뉴에는 노출** (잠금 UI로): 존재 인식 → Feature Discovery
- **탭 내부 콘텐츠에 FeatureGate 적용**: 접근 시 잠금 오버레이

---

### 2-D. `components/OrderManager.tsx` — 발주 실행 버튼 게이팅

발주 생성/실행 버튼(새 발주 생성, 수동 발주 등)에 `order_execution` 게이팅:

```tsx
import { planService } from '../services/planService';

// 발주 버튼 렌더링 부분:
const canOrder = planService.canAccess(plan, 'order_execution');

// 버튼에 적용:
<button
  onClick={canOrder ? handleCreateOrder : () => setShowUpgradeModal(true)}
  disabled={!canOrder}
  className={canOrder ? 'bg-indigo-600 ...' : 'bg-slate-200 cursor-not-allowed ...'}
>
  {canOrder ? '발주 생성' : '🔒 발주 생성 (Basic+)'}
</button>

// UpgradeModal 트리거:
{showUpgradeModal && (
  <UpgradeModal
    feature="order_execution"
    currentPlan={plan}
    requiredPlan="basic"
    ...
  />
)}
```

**읽기 전용 허용**: 발주 권장 목록(OrderHistoryPanel)은 Free에서도 표시.
**차단 대상**: 발주 생성 버튼, 수령 처리 버튼.

---

### 2-E. `components/PricingPage.tsx` — Plus 앵커링 강화 (R-06 Should)

Plus 카드를 시각적으로 가장 강조:

```tsx
// Plus 카드 클래스 변경:
// 기존: 일반 카드
// 변경: 더 큰 패딩, 인디고 테두리, "가장 인기" 배지, ring 효과

// Plus 카드 예시:
<div className="relative border-2 border-indigo-500 rounded-2xl p-8 shadow-lg shadow-indigo-100 scale-[1.03] z-10 bg-white">
  {/* "가장 인기" 배지 */}
  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow">
      가장 인기
    </span>
  </div>
  {/* 카드 내용 */}
</div>
```

**연간 결제 절약 문구** (R-11 Could):
- Plus 카드 하단: "연간 결제 시 월 **55,000원** · 연간 **138,000원 절약**"

---

## 3. 구현 순서 (Do Phase 체크리스트)

```
Step 1: types/plan.ts 수정
  [ ] PlanFeature에 'audit_history' 추가
  [ ] PLAN_LIMITS.basic.maxUsers: 3 → 1
  [ ] PLAN_LIMITS.basic.maxBaseStockEdits: 5 → Infinity
  [ ] PLAN_LIMITS.basic.retentionMonths: 6 → 12
  [ ] PLAN_LIMITS.plus.features에 'audit_history' 추가
  [ ] PLAN_LIMITS.plus.retentionMonths: 12 → 24
  [ ] PLAN_LIMITS.business.features에 'audit_history' 추가
  [ ] PLAN_LIMITS.ultimate.features에 'audit_history' 추가

Step 2: FailManager FeatureGate 적용
  [ ] FailManager.tsx 현재 구조 확인 (plan prop 수신 여부)
  [ ] plan prop 없으면 추가 + 부모 컴포넌트 prop 체인 추가
  [ ] FeatureGate('fail_management') 래핑
  [ ] DashboardOperationalTabs 탭 메뉴 노출 확인 (탭은 보이되 내부 잠금)

Step 3: OrderManager 발주 버튼 게이팅
  [ ] 발주 생성 버튼 위치 파악
  [ ] canAccess('order_execution') 체크 추가
  [ ] 잠금 시 UpgradeModal 연동

Step 4: PricingPage Plus 앵커링 (Should)
  [ ] Plus 카드 시각 강조 (scale, border, 배지)
  [ ] 연간 결제 절약 문구 추가
```

---

## 4. 영향 범위 분석

### 기존 Free 사용자 영향

| 변경 | 영향 사용자 | 처리 방안 |
|------|------------|-----------|
| `brand_analytics` Free 제거 | Free 사용자 | 이미 적용됨, 기존 사용자는 확인 필요 |
| Free `maxItems` 50 | 품목 > 50개인 Free 사용자 | 읽기 전용 전환 (`isReadOnly` 로직 기존 존재) |
| `fail_management` Basic+ 잠금 | Free 사용자 | FeatureGate 잠금 화면 + 데모 미리보기 |
| `order_execution` Basic+ 잠금 | Free 사용자 | 발주 목록 표시, 버튼만 잠금 |

### 하위 호환성

- `planService.canAccess()`, `planService.getRequiredPlan()` 변경 없음
- `FeatureGate` 컴포넌트 변경 없음 (이미 `fail_management` 데모 지원)
- TypeScript 타입 추가만 (기존 코드 깨짐 없음)

---

## 5. 테스트 시나리오

| 시나리오 | 기대 결과 |
|---------|----------|
| Free 플랜에서 FAIL 탭 접근 | 잠금 오버레이 + "데모 미리보기" 버튼 |
| Free 플랜에서 데모 미리보기 클릭 | FailManagementDemo 컴포넌트 1회 표시 |
| Free 플랜에서 발주 생성 버튼 클릭 | UpgradeModal(order_execution) 표시 |
| Free 플랜에서 발주 권장 목록 | 정상 표시 (읽기 전용) |
| Basic 플랜에서 FAIL 탭 접근 | 정상 동작 |
| Basic 플랜에서 구성원 초대 | 잠금 (role_management는 Plus+) |
| Plus 플랜에서 재고실사 이력 | 정상 (audit_history 포함) |

---

## 6. 관련 문서

- Plan: `docs/01-plan/features/pricing-strategy-redesign.plan.md`
- 현재 구현: `types/plan.ts`, `components/FeatureGate.tsx`
- 아카이브된 설계: `docs/archive/2026-02/pricing-policy/`

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-05 | Initial draft | Claude Code |
