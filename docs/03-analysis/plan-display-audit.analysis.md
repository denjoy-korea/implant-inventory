# Plan Display Audit - Gap Analysis Report

> **Summary**: Verify 10 plan-display items against actual implementation
>
> **Author**: gap-detector
> **Created**: 2026-03-18
> **Status**: Approved

---

## Analysis Overview

- **Analysis Target**: plan-display-audit
- **Specification**: Inline plan table (no formal design doc)
- **Analysis Date**: 2026-03-18

## Overall Scores

| Category | Score | Status |
|----------|:-----:|:------:|
| Design Match | 100% | PASS |
| Lint Guard Coverage | 100% | PASS |
| **Overall** | **10/10** | **PASS** |

## Item-by-Item Verification

### P0-1a -- `Plan` interface has NO `limit` field

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| `limit` field in `Plan` interface | Absent | Absent | PASS |

**Evidence**: `components/pricing/pricingData.tsx` lines 5-14. Interface fields: `name`, `description`, `monthlyPrice`, `yearlyPrice`, `highlight`, `cta`, `features`, `tag?`. No `limit` field. No plan object references `limit`.

---

### P0-1b -- "한정 N곳" badge removed from PricingPage

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| No `한정.*곳` pattern | Absent | Absent | PASS |
| No `plan.limit` reference | Absent | Absent | PASS |

**Evidence**: `rg` search for `한정.*곳` and `plan\.limit` in `components/PricingPage.tsx` returned zero matches.

---

### P0-2 -- Current subscription card uses `billingCycle`, not `pickerCycle`

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| Price selection | `planState?.billingCycle` | `planState?.billingCycle ?? 'monthly'` | PASS |

**Evidence**: `components/profile/UserPlanPickerPanel.tsx` lines 113-117:
```tsx
{((planState?.billingCycle ?? 'monthly') === 'yearly'
  ? PLAN_PRICING[currentPlanId].yearlyPrice
  : PLAN_PRICING[currentPlanId].monthlyPrice
).toLocaleString('ko-KR')}
```
The current-card section correctly uses `planState?.billingCycle`, not `pickerCycle`.

---

### P1-1 -- authSignupConfig uses `viewMonths`, not `retentionMonths`

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| Destructuring | `viewMonths` | `viewMonths` (line 9) | PASS |
| String label | "조회" | "조회" (line 12) | PASS |
| `retentionMonths` absent | Absent | Absent | PASS |

**Evidence**: `components/auth/authSignupConfig.ts` line 9: `const { maxItems, maxUsers, viewMonths } = PLAN_LIMITS[plan];`, line 12: `` `${viewMonths}개월 조회` ``.

---

### P1-2a -- Business features: "기본 10인 + 추가 가능"

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| Business features array | "기본 10인 + 추가 가능" | "기본 10인 + 추가 가능" | PASS |

**Evidence**: `components/profile/UserPlanPickerPanel.tsx` line 22:
```tsx
{ plan: 'business', label: 'Business', features: ['무제한 품목', '기본 10인 + 추가 가능', 'AI 예측 발주', '감사 로그'] },
```

---

### P1-2b -- Business plan: `tag: '추천'` removed

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| No `tag: '추천'` on Business | Absent | Absent | PASS |

**Evidence**: `PLAN_PICKER_ITEMS` lines 19-23. Business entry has no `tag` field at all. Only the "other plan cards" section (line 166) uses a `tag === '추천'` conditional for styling, but no PLAN_PICKER_ITEMS entry for Business has that tag.

---

### P2-1 -- `팀용` dead code removed, `기업용` has violet style

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| No `팀용` branch | Absent | Absent | PASS |
| `기업용` style | `bg-violet-50 text-violet-600 border border-violet-200` | `bg-violet-50 text-violet-600 border border-violet-200` | PASS |

**Evidence**: `components/auth/AuthSignupPlanSelect.tsx` line 128:
```tsx
: plan.tag === '기업용' ? 'bg-violet-50 text-violet-600 border border-violet-200'
```
`rg` search for `팀용` returned zero matches.

---

### P3-1a -- lint guard: authSignupConfig viewMonths check

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| `checkPlanDisplayConsistency()` exists | Yes | Yes (line 410) | PASS |
| Checks `retentionMonths` not used | Yes | Yes (line 414) | PASS |
| Checks `viewMonths` present | Yes | Yes (line 417) | PASS |

**Evidence**: `scripts/lint-check.mjs` lines 410-420:
```js
function checkPlanDisplayConsistency() {
  const signupConfig = read('components/auth/authSignupConfig.ts');
  if (signupConfig) {
    if (/retentionMonths/.test(signupConfig)) {
      failures.push('...must use viewMonths instead of retentionMonths...');
    }
    if (!signupConfig.includes('viewMonths')) {
      failures.push('...viewMonths not found...');
    }
  }
```

---

### P3-1b -- lint guard: "한정.*곳" pattern ban

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| Checks `한정.*곳` in PricingPage | Yes | Yes (line 424) | PASS |

**Evidence**: `scripts/lint-check.mjs` line 424:
```js
if (pricingPage && /한정.*곳/.test(pricingPage)) {
  failures.push('...한정 N곳 label must not appear...');
}
```

---

### P3-1c -- lint guard: billingCycle price check

| Aspect | Expected | Actual | Verdict |
|--------|----------|--------|---------|
| Detects `pickerCycle` bug pattern | Yes | Yes (line 433) | PASS |

**Evidence**: `scripts/lint-check.mjs` lines 433-435:
```js
if (/pickerCycle\s*===\s*'yearly'\s*\?\s*PLAN_PRICING\[currentPlanId\]/.test(pickerPanel)) {
  failures.push('...current subscription card price must use billingCycle (not pickerCycle)');
}
```

---

## Summary Table

| # | Item | File | Verdict |
|---|------|------|:-------:|
| P0-1a | `Plan` interface has NO `limit` field | `pricingData.tsx` | PASS |
| P0-1b | "한정 N곳" badge removed | `PricingPage.tsx` | PASS |
| P0-2 | Current card uses `billingCycle` | `UserPlanPickerPanel.tsx` | PASS |
| P1-1 | `viewMonths` not `retentionMonths` | `authSignupConfig.ts` | PASS |
| P1-2a | Business "기본 10인 + 추가 가능" | `UserPlanPickerPanel.tsx` | PASS |
| P1-2b | Business `tag: '추천'` removed | `UserPlanPickerPanel.tsx` | PASS |
| P2-1 | `팀용` removed, `기업용` violet | `AuthSignupPlanSelect.tsx` | PASS |
| P3-1a | lint: viewMonths check | `lint-check.mjs` | PASS |
| P3-1b | lint: 한정곳 ban | `lint-check.mjs` | PASS |
| P3-1c | lint: billingCycle check | `lint-check.mjs` | PASS |

**Match Rate: 10/10 (100%)**

## Recommended Actions

None required. All 10 specification items are fully implemented and lint-guarded against regression.
