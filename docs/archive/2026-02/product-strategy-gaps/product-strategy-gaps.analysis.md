# product-strategy-gaps Gap Analysis Report

> **Analysis Type**: Gap Analysis (Design vs Implementation)
>
> **Project**: DenJOY (implant-inventory)
> **Analyst**: Claude Code (gap-detector)
> **Date**: 2026-02-24
> **Design Doc**: [product-strategy-gaps.design.md](../02-design/features/product-strategy-gaps.design.md)
> **Plan Doc**: [product-strategy-gaps.plan.md](../01-plan/features/product-strategy-gaps.plan.md)

---

## 1. Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| G4: retentionDaysLeft | 100% | PASS |
| G5: uploadLimitExceeded | 100% | PASS |
| G2: D1 Dead Code Annotation | 100% | PASS |
| Pre-conditions (types.ts) | 100% | PASS |
| **전체 Match Rate** | **100%** | **PASS** |

---

## 2. G4: `retentionDaysLeft` 비교

### 2.1 설계 요구사항

| # | 요구사항 |
|---|---------|
| G4-1 | `_buildPlanState()`가 `retentionDaysLeft: number \| undefined` 반환 |
| G4-2 | 조건: `plan === 'free' && expiresAt !== null` |
| G4-3 | `PLAN_LIMITS.free.retentionMonths` (=3) 사용 |
| G4-4 | `retentionEnd = expiresAt + (retentionMonths × 30days)` |
| G4-5 | `Math.max(0, Math.ceil((retentionEnd - now) / 1day))` |
| G4-6 | `plan_expires_at === null` → `retentionDaysLeft = undefined` |
| G4-7 | `// G4:` 주석 포함 |

### 2.2 구현 검증 (`services/planService.ts:507-517`)

```typescript
// G4: retentionDaysLeft — 유료 만료 후 Free 전환 유저에게만 의미 있음
// plan_expires_at === null (항상 free or 진행 중인 trial) → undefined (T1 넛지 불발)
let retentionDaysLeft: number | undefined;
if (data.plan === 'free' && expiresAt !== null) {
  const RETENTION_DAYS = PLAN_LIMITS.free.retentionMonths * 30;
  const retentionEnd = new Date(expiresAt.getTime() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
  retentionDaysLeft = Math.max(
    0,
    Math.ceil((retentionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
}
```

반환: `L535: retentionDaysLeft,`

### 2.3 항목별 매칭

| # | 요구사항 | 구현 | Status |
|---|---------|------|:------:|
| G4-1 | `retentionDaysLeft: number \| undefined` | L509: `let retentionDaysLeft: number \| undefined` | MATCH |
| G4-2 | `plan === 'free' && expiresAt !== null` | L510: 동일 조건 | MATCH |
| G4-3 | `PLAN_LIMITS.free.retentionMonths` | L511: 사용됨 | MATCH |
| G4-4 | retentionEnd 계산 | L512: `new Date(expiresAt.getTime() + RETENTION_DAYS * 24*60*60*1000)` | MATCH |
| G4-5 | `Math.max(0, Math.ceil(...))` | L513-516: 동일 | MATCH |
| G4-6 | null → undefined | 암묵적 (if 블록 밖에서 undefined 초기화) | MATCH |
| G4-7 | `// G4:` 주석 | L507 존재 | MATCH |

> **경미한 차이**: 설계는 `RETENTION_MONTHS` × 30 × 24 × 60 × 60 × 1000, 구현은 `RETENTION_DAYS` = retentionMonths × 30 후 × 24 × 60 × 60 × 1000. 수학적으로 동일, 기능 차이 없음.

**G4: 7/7 MATCH (100%)**

---

## 3. G5: `uploadLimitExceeded` 비교

### 3.1 설계 요구사항

| # | 요구사항 |
|---|---------|
| G5-1 | `getHospitalPlan()` SELECT에 `base_stock_edit_count` 포함 |
| G5-2 | `_buildPlanState()` 파라미터: `base_stock_edit_count?: number` |
| G5-3 | 조건: `plan === 'free' && !isTrialActive && base_stock_edit_count !== undefined` |
| G5-4 | 계산: `(base_stock_edit_count ?? 0) >= PLAN_LIMITS.free.maxBaseStockEdits` |
| G5-5 | 반환: `uploadLimitExceeded: boolean \| undefined` |
| G5-6 | RPC 호환: optional 파라미터, 없으면 undefined |
| G5-7 | `// G5:` 주석 포함 |

### 3.2 구현 검증

**getHospitalPlan() SELECT** (`L20`):
```typescript
.select('plan, plan_expires_at, billing_cycle, trial_started_at, trial_used, base_stock_edit_count')
```

**_buildPlanState() 파라미터** (`L487`):
```typescript
base_stock_edit_count?: number; // G5: optional — RPC 반환값에 없을 수 있음
```

**계산** (`L519-524`):
```typescript
// G5: uploadLimitExceeded — Free 비트라이얼 유저에게만 의미 있음
let uploadLimitExceeded: boolean | undefined;
if (data.plan === 'free' && !isTrialActive && data.base_stock_edit_count !== undefined) {
  uploadLimitExceeded = (data.base_stock_edit_count ?? 0) >= PLAN_LIMITS.free.maxBaseStockEdits;
}
```

반환: `L536: uploadLimitExceeded,`

### 3.3 항목별 매칭

| # | 요구사항 | 구현 | Status |
|---|---------|------|:------:|
| G5-1 | SELECT `base_stock_edit_count` | L20: 포함됨 | MATCH |
| G5-2 | 파라미터 `base_stock_edit_count?: number` | L487: 정의됨 | MATCH |
| G5-3 | 조건 일치 | L522: 동일 | MATCH |
| G5-4 | `>= maxBaseStockEdits` | L523: 동일 | MATCH |
| G5-5 | `uploadLimitExceeded` 반환 | L536 | MATCH |
| G5-6 | RPC 호환 optional | L487 optional + 암묵적 undefined | MATCH |
| G5-7 | `// G5:` 주석 | L519 존재 | MATCH |

**G5: 7/7 MATCH (100%)**

---

## 4. G2: Dead Code 주석 비교

### 4.1 설계 요구사항

| # | 파일 | 요구사항 |
|---|------|---------|
| G2-1 | `onboardingService.ts` | D1 관련 주석 추가 |
| G2-2 | `Step2BrandSelect.tsx` | V2 보존 주석 추가 |
| G2-3 | `Step3StockInput.tsx` | V2 보존 주석 추가 |
| G2-4 | `Step5Complete.tsx` | V2 보존 주석 추가 |

### 4.2 항목별 매칭

| # | 파일 | 구현 | Status |
|---|------|------|:------:|
| G2-1 | `onboardingService.ts:7-8` | `// G2/D1: 현재 온보딩은 fixture-upload 방식으로 대체됨.` | MATCH |
| G2-2 | `Step2BrandSelect.tsx:1` | `// G2/D1 — V2 온보딩 전용 (현재 미사용)...` | MATCH |
| G2-3 | `Step3StockInput.tsx:1` | `// G2/D1 — V2 온보딩 전용 (현재 미사용)...` | MATCH |
| G2-4 | `Step5Complete.tsx:1` | `// G2/D1 — V2 온보딩 전용 (현재 미사용)...` | MATCH |

**G2: 4/4 MATCH (100%)**

---

## 5. 사전 조건 검증 (`types.ts`)

설계 섹션 5: `types.ts` 변경 없음 주장 — `HospitalPlanState`에 이미 optional 필드 정의됨.

| 항목 | 기대값 | 실제 (Line) | Status |
|------|--------|------------|:------:|
| `HospitalPlanState.retentionDaysLeft?: number` | 존재 | L319 | MATCH |
| `HospitalPlanState.uploadLimitExceeded?: boolean` | 존재 | L321 | MATCH |
| `PLAN_LIMITS.free.maxBaseStockEdits` | 3 | L329 | MATCH |
| `PLAN_LIMITS.free.retentionMonths` | 3 | L330 | MATCH |

**Pre-conditions: 4/4 MATCH (100%)**

---

## 6. 다운스트림 통합 검증 (`App.tsx`)

설계: `App.tsx` 변경 불필요 (T1/T3 트리거 로직 이미 구현됨).

**`App.tsx:337-341`**:
```typescript
// T1: 데이터 보관 만료 D-7
if (ps.plan === 'free' && !ps.isTrialActive && ps.retentionDaysLeft !== undefined && ps.retentionDaysLeft <= 7)
  return 'data_expiry_warning';
// T3: 업로드 한도 초과
if (ps.plan === 'free' && !ps.isTrialActive && ps.uploadLimitExceeded === true)
  return 'upload_limit';
```

T1/T3 양쪽 모두 `_buildPlanState()`가 값을 채워주므로 자동 활성화. 추가 변경 불필요.

---

## 7. Match Rate 계산

```
총 검증 항목: 24
  G4: 7항목 × MATCH
  G5: 7항목 × MATCH
  G2: 4항목 × MATCH
  Pre-conditions: 4항목 × MATCH
  Downstream: 2항목 × MATCH (암묵)

Match Rate = 24/24 × 100 = 100%  ✅ PASS
```

---

## 8. 완료 기준 체크 (Plan 섹션 5)

| 기준 | Status |
|------|:------:|
| T1 넛지: `retentionDaysLeft <= 7` → `data_expiry_warning` 발동 | READY |
| T3 넛지: `base_stock_edit_count >= maxBaseStockEdits` → `upload_limit` 발동 | READY |
| G2 dead code D1 문서화 | DONE |

---

## Version History

| Version | Date | Author |
|---------|------|--------|
| 1.0 | 2026-02-24 | Claude Code (gap-detector) |
