# Design: product-strategy-gaps

> **Feature**: product-strategy-gaps
> **Project**: DenJOY (implant-inventory)
> **Level**: Dynamic
> **Date**: 2026-02-24
> **Plan Doc**: [product-strategy-gaps.plan.md](../../01-plan/features/product-strategy-gaps.plan.md)

---

## 1. 개요

product-strategy Gap Analysis P0 항목 3건 수정 설계.

| Gap | 작업 유형 | 핵심 변경 |
|-----|-----------|-----------|
| G2 | 설계 문서 반영 (코드 없음) | D1 공식 수용, dead code 주석 정리 |
| G4 | 코드 수정 | `_buildPlanState()`에 `retentionDaysLeft` 계산 추가 |
| G5 | 코드 수정 | SELECT 확장 + `_buildPlanState()`에 `uploadLimitExceeded` 계산 추가 |

---

## 2. G4: `retentionDaysLeft` 설계

### 2.1 개념

유료 플랜 만료 후 Free로 다운그레이드된 유저에게, 기존 데이터(수술기록)가 삭제되기 까지 남은 일수를 반환.
- Free 플랜의 `retentionMonths = 3` → 유료 만료일로부터 3개월 뒤 오래된 데이터가 정리됨
- D-7(7일 이내) 시 T1 넛지(`data_expiry_warning`) 발동

### 2.2 발동 조건

```
plan === 'free'
  AND plan_expires_at !== null   ← 유료 플랜을 쓴 적 있는 유저에만 적용
  → retentionDaysLeft = ceil((plan_expires_at + 90days) - now) / 1day

plan === 'free' AND plan_expires_at === null
  → retentionDaysLeft = undefined  (항상 free → 데이터 만료 개념 없음)

plan !== 'free' (active paid / trial active)
  → retentionDaysLeft = undefined  (걱정 불필요)
```

### 2.3 코드 변경: `_buildPlanState()`

**현재 반환 객체:**
```typescript
return {
  plan, expiresAt, billingCycle, trialStartedAt, trialUsed,
  isTrialActive, trialDaysRemaining, daysUntilExpiry,
};
```

**변경 후:**
```typescript
// G4: retentionDaysLeft 계산
// 유료 만료 후 free 전환 유저에게만 의미 있음
const RETENTION_MONTHS = PLAN_LIMITS.free.retentionMonths; // 3
let retentionDaysLeft: number | undefined;
if (data.plan === 'free' && expiresAt !== null) {
  const retentionEnd = new Date(
    expiresAt.getTime() + RETENTION_MONTHS * 30 * 24 * 60 * 60 * 1000
  );
  retentionDaysLeft = Math.max(
    0,
    Math.ceil((retentionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
}

return {
  plan, expiresAt, billingCycle, trialStartedAt, trialUsed,
  isTrialActive, trialDaysRemaining, daysUntilExpiry,
  retentionDaysLeft,      // G4: undefined이면 T1 넛지 불발 (정상)
};
```

> **참고**: `expiresAt`는 `_buildPlanState()` 내에서 이미 `new Date(data.plan_expires_at)` 또는 `null`로 처리된 변수. 그 변수를 그대로 재사용.

---

## 3. G5: `uploadLimitExceeded` 설계

### 3.1 개념

Free 플랜에서 월별 기초재고 업로드 한도(`maxBaseStockEdits = 3`)를 초과했는지 여부.
- `hospitals.base_stock_edit_count` 컬럼을 읽어 계산
- 초과 시 T3 넛지(`upload_limit`) 발동

### 3.2 발동 조건

```
plan === 'free' AND !isTrialActive
  AND base_stock_edit_count >= PLAN_LIMITS.free.maxBaseStockEdits (3)
  → uploadLimitExceeded = true

그 외 → uploadLimitExceeded = undefined (넛지 불발)
```

### 3.3 코드 변경 1: `getHospitalPlan()` SELECT 확장

**현재:**
```typescript
.select('plan, plan_expires_at, billing_cycle, trial_started_at, trial_used')
```

**변경 후:**
```typescript
.select('plan, plan_expires_at, billing_cycle, trial_started_at, trial_used, base_stock_edit_count')
```

### 3.4 코드 변경 2: `_buildPlanState()` 파라미터 확장

**현재 파라미터:**
```typescript
_buildPlanState(data: {
  plan: string;
  plan_expires_at: string | null;
  billing_cycle: string | null;
  trial_started_at: string | null;
  trial_used: boolean;
}): HospitalPlanState
```

**변경 후:**
```typescript
_buildPlanState(data: {
  plan: string;
  plan_expires_at: string | null;
  billing_cycle: string | null;
  trial_started_at: string | null;
  trial_used: boolean;
  base_stock_edit_count?: number;   // G5: optional — RPC 반환값에 없을 수 있음
}): HospitalPlanState
```

**계산 추가 (return 직전):**
```typescript
// G5: uploadLimitExceeded 계산
// free 플랜 비트라이얼 유저에게만 의미 있음
let uploadLimitExceeded: boolean | undefined;
if (data.plan === 'free' && !isTrialActive && data.base_stock_edit_count !== undefined) {
  const maxEdits = PLAN_LIMITS.free.maxBaseStockEdits; // 3
  uploadLimitExceeded = (data.base_stock_edit_count ?? 0) >= maxEdits;
}

return {
  plan, expiresAt, billingCycle, trialStartedAt, trialUsed,
  isTrialActive, trialDaysRemaining, daysUntilExpiry,
  retentionDaysLeft,
  uploadLimitExceeded,    // G5: undefined이면 T3 넛지 불발 (정상)
};
```

### 3.5 RPC 호환성

`checkAndExpireTrial()` / `checkPlanExpiry()`의 RPC(`expire_trial_if_needed`, `check_plan_expiry`)는 `base_stock_edit_count`를 반환하지 않을 수 있음.
- `_buildPlanState()` 파라미터가 `optional`이므로 RPC 반환값에 없으면 `uploadLimitExceeded = undefined` (넛지 불발) — **허용 가능한 동작**
- 실제 넛지 발동 경로는 `App.tsx` 마운트 시 `getHospitalPlan()` 호출 → 여기서 `base_stock_edit_count` 포함됨

---

## 4. G2: D1 공식 수용 설계

### 4.1 방침

`createStockFromTemplate()` 구현 불필요. 현재 구현(fixture-upload)이 더 실용적.

### 4.2 작업 내용

**`services/onboardingService.ts` (확인 필요):**
- dead code로 표시된 `createStockFromTemplate()` 타입/스텁 존재 시 주석 처리 또는 삭제

**`components/onboarding/` (확인 필요):**
- `Step2BrandSelect`, `Step3StockInput`, `Step5Complete` — V2 보존 주석 추가 또는 파일 구조 정리

---

## 5. 영향 범위

| 파일 | 변경 내용 |
|------|-----------|
| `services/planService.ts` | `getHospitalPlan()` SELECT +1 컬럼, `_buildPlanState()` 파라미터 +1 (optional), G4/G5 계산 추가 |
| `types.ts` | 변경 없음 (`HospitalPlanState`에 이미 optional 필드 정의됨) |
| `App.tsx` | 변경 없음 (T1/T3 트리거 로직 이미 구현됨) |

**의도적으로 변경하지 않는 것:**
- `types.ts` — `HospitalPlanState.retentionDaysLeft` / `uploadLimitExceeded`는 이미 정의됨
- `UpgradeNudge.tsx` — 이미 두 넛지 타입을 처리함

---

## 6. 검증 시나리오

### T1 넛지 검증
- 테스트 병원: `plan = 'free'`, `plan_expires_at = '2026-01-24'` (30일 전 만료)
- `retentionDaysLeft = ceil((Jan24 + 90days) - now) = ceil(Apr24 - Feb24) = ~59`
- 7일 이내로 설정하려면: `plan_expires_at = now - 83days` → `retentionDaysLeft = 7` → 넛지 발동

### T3 넛지 검증
- 테스트 병원: `plan = 'free'`, `trial_used = true`, `base_stock_edit_count = 3`
- `uploadLimitExceeded = (3 >= 3) = true` → T3 넛지 발동
- `base_stock_edit_count = 2` → `uploadLimitExceeded = false` → 넛지 없음

---

## 7. 구현 순서

```
1. planService.ts — getHospitalPlan() SELECT 확장 (1줄)
2. planService.ts — _buildPlanState() 파라미터 + G4 계산 (10줄)
3. planService.ts — _buildPlanState() G5 계산 (8줄)
4. 설계 문서 G2 처리 (onboardingService.ts dead code 확인)
```

---

## Version History

| Version | Date | Author |
|---------|------|--------|
| 1.0 | 2026-02-24 | Claude Code |
